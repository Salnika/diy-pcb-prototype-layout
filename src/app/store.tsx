import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import {
  createId,
  createNewProject,
  autoLayout,
  computeNetIndex,
  moveConnectedTraceEndpoints,
  movedPartPinMap,
  tracesFromNetlist,
  getPartPins,
  holeKey,
  isWithinBoard,
  parseProject,
  serializeProject,
  withUpdatedAt,
} from "../model";
import type {
  BoardLabeling,
  Hole,
  Net,
  NetLabel,
  NetTerminal,
  Part,
  PartKind,
  Placement,
  Project,
  Rotation,
  Trace,
  TraceKind,
} from "../model";

export type Tool =
  | { type: "select" }
  | { type: "placePart"; kind: PartKind }
  | { type: "connect" }
  | { type: "fixedPoint" }
  | { type: "wire" }
  | { type: "jumper" }
  | { type: "label" }
  | { type: "erase" };

export type Selection =
  | { type: "none" }
  | { type: "net"; id: string }
  | { type: "part"; id: string }
  | { type: "trace"; id: string }
  | { type: "netLabel"; id: string };

export type TraceDraft = Readonly<{
  kind: TraceKind;
  layer: "top" | "bottom";
  nodes: readonly Hole[];
}>;

export type Viewport = Readonly<{
  scale: number;
  pan: { x: number; y: number };
}>;

export type TabState = Readonly<{
  id: string;
  projectKey: string;
  project: Project;
  history: Readonly<{
    past: readonly Project[];
    future: readonly Project[];
  }>;
  ui: Readonly<{
    tool: Tool;
    selection: Selection;
    hoverHole: Hole | null;
    traceDraft: TraceDraft | null;
    viewport: Viewport;
    lastError: string | null;
  }>;
}>;

export type AppState = Readonly<{
  tabs: readonly TabState[];
  activeTabId: string;
}>;

export type ActiveAppState = Readonly<
  AppState & {
    activeTab: TabState;
    project: Project;
    history: TabState["history"];
    ui: TabState["ui"];
  }
>;

export type Action =
  | { type: "NEW_PROJECT" }
  | { type: "IMPORT_PROJECT"; project: Project }
  | { type: "ADD_TAB"; name?: string }
  | { type: "SET_ACTIVE_TAB"; id: string }
  | { type: "UPDATE_BOARD"; width: number; height: number }
  | { type: "UPDATE_BOARD_LABELING"; labeling: BoardLabeling }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SET_HOVER_HOLE"; hole: Hole | null }
  | { type: "SELECT"; selection: Selection }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_ERROR"; message: string }
  | { type: "ADD_PART"; part: Part }
  | { type: "UPDATE_PART"; part: Part }
  | { type: "DELETE_PART"; id: string }
  | { type: "ADD_NETLABEL"; label: NetLabel }
  | { type: "UPDATE_NETLABEL"; id: string; name: string }
  | { type: "UPDATE_NETLABEL_POSITION"; id: string; offset?: Readonly<{ dx: number; dy: number }> }
  | { type: "DELETE_NETLABEL"; id: string }
  | { type: "ADD_NET"; net: Net }
  | { type: "UPDATE_NET_NAME"; id: string; name: string }
  | { type: "ADD_NET_TERMINAL"; id: string; terminal: NetTerminal }
  | { type: "DELETE_NET_TERMINAL"; id: string; index: number }
  | { type: "DELETE_NET"; id: string }
  | { type: "TOGGLE_FIXED_PART"; id: string }
  | { type: "TOGGLE_FIXED_HOLE"; hole: Hole }
  | {
      type: "RUN_AUTO_LAYOUT";
      options?: { seed?: number; iterations?: number; allowRotate?: boolean; restarts?: number };
    }
  | { type: "START_TRACE"; kind: TraceKind; start: Hole }
  | { type: "ADD_TRACE_NODE"; hole: Hole }
  | { type: "POP_TRACE_NODE" }
  | { type: "CANCEL_TRACE" }
  | { type: "FINISH_TRACE" }
  | { type: "UPDATE_TRACE"; id: string; nodes: readonly Hole[] }
  | { type: "DELETE_TRACE"; id: string }
  | { type: "SET_VIEWPORT"; viewport: Viewport }
  | { type: "CLEAR_ERROR" };

const STORAGE_KEY = "diypcbprototype.project.v1";
const STORAGE_TABS_KEY = "diypcbprototype.tabs.v1";
const STORAGE_PROJECT_PREFIX = "diypcbprototype.project.";

function defaultUiState(): TabState["ui"] {
  return {
    tool: { type: "select" },
    selection: { type: "none" },
    hoverHole: null,
    traceDraft: null,
    viewport: { scale: 1, pan: { x: 0, y: 0 } },
    lastError: null,
  };
}

function makeTabState(project: Project, projectKey: string, id: string): TabState {
  return {
    id,
    projectKey,
    project,
    history: { past: [], future: [] },
    ui: defaultUiState(),
  };
}

function nextTabName(existing: readonly TabState[]): string {
  const used = new Set<string>();
  for (const tab of existing) {
    if (tab.project.meta.name) used.add(tab.project.meta.name);
  }
  let idx = 1;
  while (used.has(`Projet ${idx}`)) idx += 1;
  return `Projet ${idx}`;
}

function createTab(existing: readonly TabState[], name?: string): TabState {
  const id = createId("tab");
  const projectKey = `${STORAGE_PROJECT_PREFIX}${id}`;
  const project = createNewProject(name ?? nextTabName(existing));
  return makeTabState(project, projectKey, id);
}

function loadProjectFromStorage(key: string): Project | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return parseProject(raw);
  } catch {
    return null;
  }
}

function createInitialState(): AppState {
  let tabs: TabState[] = [];
  let activeTabId = "";

  try {
    const rawTabs = localStorage.getItem(STORAGE_TABS_KEY);
    if (rawTabs) {
      const data = JSON.parse(rawTabs) as unknown;
      if (typeof data === "object" && data && "tabs" in data && Array.isArray((data as any).tabs)) {
        const records = (data as any).tabs as { id?: string; projectKey?: string }[];
        for (let i = 0; i < records.length; i += 1) {
          const record = records[i];
          if (!record?.id || !record?.projectKey) continue;
          const project = loadProjectFromStorage(record.projectKey);
          if (project) tabs.push(makeTabState(project, record.projectKey, record.id));
          else tabs.push(makeTabState(createNewProject(nextTabName(tabs)), record.projectKey, record.id));
        }
        if (typeof (data as any).activeTabId === "string") {
          activeTabId = (data as any).activeTabId;
        }
      }
    }
  } catch {
    // ignore
  }

  if (tabs.length === 0) {
    let project = createNewProject("DiyPCBPrototype");
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) project = parseProject(raw);
    } catch {
      // ignore
    }
    const id = createId("tab");
    const projectKey = `${STORAGE_PROJECT_PREFIX}${id}`;
    tabs = [makeTabState(project, projectKey, id)];
    activeTabId = id;
  }

  if (!tabs.find((t) => t.id === activeTabId)) {
    activeTabId = tabs[0]?.id ?? "";
  }

  return { tabs, activeTabId };
}

function nextRef(kind: PartKind, parts: readonly Part[]): string {
  const prefix: Record<PartKind, string> = {
    resistor: "R",
    capacitor: "C",
    capacitor_ceramic: "C",
    capacitor_electrolytic: "C",
    capacitor_film: "C",
    diode: "D",
    transistor: "Q",
    potentiometer: "RV",
    jack: "J",
    power_pos: "PWR",
    power_neg: "PWR",
    power_gnd: "PWR",
    dip: "U",
  };

  const p = prefix[kind];
  const re = new RegExp(`^${p}(\\d+)$`, "i");
  let max = 0;
  for (const part of parts) {
    const m = part.ref.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${p}${max + 1}`;
}

export function makeDefaultPart(kind: PartKind, origin: Hole): Part {
  const placement: Placement = { origin, rotation: 0, flip: false };
  const base = {
    id: createId("p"),
    ref: "",
    kind,
    placement,
    value: "",
    properties: {},
  } satisfies Omit<Part, "ref" | "footprint"> & { ref: string };

  switch (kind) {
    case "resistor":
      return { ...base, ref: "R?", footprint: { type: "inline2", span: 6 } };
    case "diode":
      return { ...base, ref: "D?", footprint: { type: "inline2", span: 4 } };
    case "capacitor":
      return { ...base, ref: "C?", footprint: { type: "inline2", span: 2 } };
    case "capacitor_ceramic":
      return { ...base, ref: "C?", footprint: { type: "inline2", span: 2 } };
    case "capacitor_electrolytic":
      return { ...base, ref: "C?", footprint: { type: "inline2", span: 3, pinLabels: ["+", "-"] } };
    case "capacitor_film":
      return { ...base, ref: "C?", footprint: { type: "inline2", span: 2 } };
    case "transistor":
      return { ...base, ref: "Q?", footprint: { type: "to92_inline3" } };
    case "potentiometer":
      return { ...base, ref: "RV?", footprint: { type: "to92_inline3", pinNames: ["1", "2", "3"] } };
    case "jack":
      return { ...base, ref: "J?", footprint: { type: "to92_inline3", pinNames: ["T", "R", "S"] } };
    case "power_pos":
      return { ...base, ref: "PWR?", footprint: { type: "single", pinLabel: "V+" } };
    case "power_neg":
      return { ...base, ref: "PWR?", footprint: { type: "single", pinLabel: "V-" } };
    case "power_gnd":
      return { ...base, ref: "PWR?", footprint: { type: "single", pinLabel: "GND" } };
    case "dip":
      return { ...base, ref: "U?", footprint: { type: "dip", pins: 8, rowSpan: 3 } };
  }
}

function validatePartPlacement(project: Project, part: Part): string | null {
  const pins = getPartPins(part);
  for (const pin of pins) {
    if (!isWithinBoard(project.board, pin.hole)) {
      return `Placement invalide: ${part.ref} sort de la board.`;
    }
  }
  return null;
}

function validateBoardUpdate(project: Project, width: number, height: number): string | null {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    return "Dimensions de board invalides.";
  }
  const nextBoard = { ...project.board, width, height };
  for (const part of project.parts) {
    for (const pin of getPartPins(part)) {
      if (!isWithinBoard(nextBoard, pin.hole)) {
        return `Redimensionnement invalide: ${part.ref} sort de la board.`;
      }
    }
  }
  for (const trace of project.traces) {
    for (const hole of trace.nodes) {
      if (!isWithinBoard(nextBoard, hole)) {
        return "Redimensionnement invalide: une trace sort de la board.";
      }
    }
  }
  for (const label of project.netLabels) {
    if (!isWithinBoard(nextBoard, label.at)) {
      return "Redimensionnement invalide: un label sort de la board.";
    }
  }
  for (const hole of project.layoutConstraints.fixedHoles) {
    if (!isWithinBoard(nextBoard, hole)) {
      return "Redimensionnement invalide: un point fixe sort de la board.";
    }
  }
  return null;
}

function sameHoles(a: readonly Hole[], b: readonly Hole[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  }
  return true;
}

function isValidTraceNodes(board: Project["board"], nodes: readonly Hole[]): boolean {
  if (nodes.length < 2) return false;
  for (const hole of nodes) {
    if (!isWithinBoard(board, hole)) return false;
  }
  return true;
}

function uniqueHoles(holes: readonly Hole[]): Hole[] {
  const map = new Map<string, Hole>();
  for (const hole of holes) {
    map.set(holeKey(hole), hole);
  }
  return [...map.values()];
}

function movedPinsForVacatedHoles(
  nextParts: readonly Part[],
  movedPins: ReadonlyMap<string, Hole>,
): ReadonlyMap<string, Hole> {
  if (movedPins.size === 0) return movedPins;

  // Keep endpoint remap only for old holes that become empty after the move.
  const occupiedAfterMove = new Set<string>();
  for (const part of nextParts) {
    for (const pin of getPartPins(part)) {
      occupiedAfterMove.add(holeKey(pin.hole));
    }
  }

  const filtered = new Map<string, Hole>();
  for (const [fromKey, toHole] of movedPins.entries()) {
    if (occupiedAfterMove.has(fromKey)) continue;
    filtered.set(fromKey, toHole);
  }
  return filtered;
}

function autoZeroLengthWiresForPlacedPart(project: Project, part: Part): readonly Trace[] {
  const existingPinHoles = new Set<string>();
  for (const existingPart of project.parts) {
    for (const pin of getPartPins(existingPart)) {
      existingPinHoles.add(holeKey(pin.hole));
    }
  }

  const candidateHoles = uniqueHoles(
    getPartPins(part)
      .map((pin) => pin.hole)
      .filter((hole) => existingPinHoles.has(holeKey(hole))),
  );
  if (candidateHoles.length === 0) return [];

  return candidateHoles
    .filter((hole) => {
      const key = holeKey(hole);
      return !project.traces.some((trace) => {
        if (trace.nodes.length < 2) return false;
        const start = trace.nodes[0];
        const end = trace.nodes[trace.nodes.length - 1];
        return holeKey(start) === key && holeKey(end) === key;
      });
    })
    .map(
      (hole): Trace => ({
        id: createId("t"),
        kind: "wire",
        layer: "bottom",
        nodes: [hole, hole],
      }),
    );
}

function insertJunctionsInTrace(trace: Trace, junctions: readonly Hole[]): Trace {
  if (trace.nodes.length < 2 || junctions.length === 0) return trace;
  const existing = new Set(trace.nodes.map(holeKey));
  const remaining = new Map<string, Hole>();
  for (const hole of junctions) {
    const key = holeKey(hole);
    if (!existing.has(key)) remaining.set(key, hole);
  }
  if (remaining.size === 0) return trace;

  const nodes = [...trace.nodes];
  let changed = false;

  for (let i = 0; i < nodes.length - 1; i += 1) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (a.x === b.x) {
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      const candidates: Hole[] = [];
      for (const hole of remaining.values()) {
        if (hole.x === a.x && hole.y > minY && hole.y < maxY) candidates.push(hole);
      }
      if (candidates.length > 0) {
        candidates.sort((h1, h2) => (a.y < b.y ? h1.y - h2.y : h2.y - h1.y));
        nodes.splice(i + 1, 0, ...candidates);
        for (const hole of candidates) remaining.delete(holeKey(hole));
        i += candidates.length;
        changed = true;
      }
      continue;
    }

    if (a.y === b.y) {
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const candidates: Hole[] = [];
      for (const hole of remaining.values()) {
        if (hole.y === a.y && hole.x > minX && hole.x < maxX) candidates.push(hole);
      }
      if (candidates.length > 0) {
        candidates.sort((h1, h2) => (a.x < b.x ? h1.x - h2.x : h2.x - h1.x));
        nodes.splice(i + 1, 0, ...candidates);
        for (const hole of candidates) remaining.delete(holeKey(hole));
        i += candidates.length;
        changed = true;
      }
    }
  }

  return changed ? { ...trace, nodes } : trace;
}

function insertJunctions(
  traces: readonly Trace[],
  junctions: readonly Hole[],
  skipTraceId?: string,
): readonly Trace[] {
  if (junctions.length === 0) return traces;
  let changed = false;
  const next = traces.map((trace) => {
    if (trace.id === skipTraceId) return trace;
    const updated = insertJunctionsInTrace(trace, junctions);
    if (updated !== trace) changed = true;
    return updated;
  });
  return changed ? next : traces;
}

function sameTerminal(a: NetTerminal, b: NetTerminal): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "pin" && b.kind === "pin") {
    return a.partId === b.partId && a.pinId === b.pinId;
  }
  if (a.kind === "hole" && b.kind === "hole") {
    return a.hole.x === b.hole.x && a.hole.y === b.hole.y;
  }
  return false;
}

function addTerminal(net: Net, terminal: NetTerminal): Net {
  if (net.terminals.some((t) => sameTerminal(t, terminal))) return net;
  return { ...net, terminals: [...net.terminals, terminal] };
}

type InferredNetlistResult = Readonly<{
  netlist: readonly Net[];
  warnings: readonly string[];
}>;

function inferNetlistFromCurrentConnectivity(project: Project): InferredNetlistResult {
  const netIndex = computeNetIndex(project);
  const pinTerminalsByHole = new Map<string, NetTerminal[]>();
  for (const part of project.parts) {
    for (const pin of getPartPins(part)) {
      const key = holeKey(pin.hole);
      const list = pinTerminalsByHole.get(key) ?? [];
      list.push({ kind: "pin", partId: part.id, pinId: pin.pinId });
      pinTerminalsByHole.set(key, list);
    }
  }

  const endpointByKey = new Map<string, Hole>();
  for (const trace of project.traces) {
    if (trace.nodes.length < 2) continue;
    const start = trace.nodes[0];
    const end = trace.nodes[trace.nodes.length - 1];
    endpointByKey.set(holeKey(start), start);
    endpointByKey.set(holeKey(end), end);
  }

  const endpointByNetId = new Map<string, Hole[]>();
  for (const [key, hole] of endpointByKey.entries()) {
    const netId = netIndex.holeToNetId.get(key);
    if (!netId) continue;
    const list = endpointByNetId.get(netId) ?? [];
    list.push(hole);
    endpointByNetId.set(netId, list);
  }

  const netlist: Net[] = [];
  for (const [rawNetId, holes] of netIndex.netIdToHoles.entries()) {
    let net: Net = {
      id: createId("net"),
      name: netIndex.netIdToName.get(rawNetId),
      terminals: [],
    };

    for (const hole of holes) {
      const key = holeKey(hole);
      const pinTerminals = pinTerminalsByHole.get(key) ?? [];
      for (const terminal of pinTerminals) {
        net = addTerminal(net, terminal);
      }
    }

    for (const hole of endpointByNetId.get(rawNetId) ?? []) {
      const key = holeKey(hole);
      if ((pinTerminalsByHole.get(key) ?? []).length > 0) continue;
      net = addTerminal(net, { kind: "hole", hole });
    }

    if (net.terminals.length >= 2) {
      netlist.push(net);
    }
  }

  if (netlist.length === 0) {
    return {
      netlist,
      warnings: [
        "Auto-layout: netlist vide et aucune connectivite exploitable trouvee dans les traces existantes.",
      ],
    };
  }

  return {
    netlist,
    warnings: [`Auto-layout: netlist inferee depuis les traces existantes (${netlist.length} nets).`],
  };
}

function toggleFixedPartIds(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id];
}

function toggleFixedHoles(holes: readonly Hole[], hole: Hole): readonly Hole[] {
  const key = holeKey(hole);
  const exists = holes.find((h) => holeKey(h) === key);
  if (exists) return holes.filter((h) => holeKey(h) !== key);
  return [...holes, hole];
}

function commit(state: AppState, nextProject: Project): AppState {
  const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
  if (activeIndex < 0) return state;
  const active = state.tabs[activeIndex];
  if (nextProject === active.project) return state;
  const withMeta = withUpdatedAt(nextProject);
  const nextTab: TabState = {
    ...active,
    project: withMeta,
    history: { past: [...active.history.past, active.project], future: [] },
    ui: { ...active.ui, lastError: null },
  };
  const tabs = [...state.tabs];
  tabs[activeIndex] = nextTab;
  return { ...state, tabs };
}

function setActiveTabError(state: AppState, message: string): AppState {
  const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
  if (activeIndex < 0) return state;
  const tab = state.tabs[activeIndex];
  const tabs = [...state.tabs];
  tabs[activeIndex] = {
    ...tab,
    ui: { ...tab.ui, traceDraft: null, lastError: message },
  };
  return { ...state, tabs };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "NEW_PROJECT":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = {
          ...tab,
          project: createNewProject(tab.project.meta.name ?? nextTabName(state.tabs)),
          history: { past: [], future: [] },
          ui: defaultUiState(),
        };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "IMPORT_PROJECT":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = {
          ...tab,
          project: action.project,
          history: { past: [], future: [] },
          ui: { ...tab.ui, selection: { type: "none" }, traceDraft: null, lastError: null },
        };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "ADD_TAB": {
      const tab = createTab(state.tabs, action.name);
      return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id };
    }
    case "SET_ACTIVE_TAB":
      return state.tabs.find((t) => t.id === action.id) ? { ...state, activeTabId: action.id } : state;
    case "UPDATE_BOARD": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const err = validateBoardUpdate(active.project, action.width, action.height);
      if (err) {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const tabs = [...state.tabs];
        tabs[activeIndex] = { ...tab, ui: { ...tab.ui, lastError: err } };
        return { ...state, tabs };
      }
      return commit(state, {
        ...active.project,
        board: { ...active.project.board, width: action.width, height: action.height },
      });
    }
    case "UPDATE_BOARD_LABELING": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      return commit(state, {
        ...active.project,
        board: { ...active.project.board, labeling: action.labeling },
      });
    }
    case "SET_TOOL":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = {
          ...tab,
          ui: { ...tab.ui, tool: action.tool, traceDraft: null, lastError: null },
        };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "SET_HOVER_HOLE":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, hoverHole: action.hole } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "SELECT":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, selection: action.selection } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "SET_ERROR":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, lastError: action.message } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "CLEAR_ERROR":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, lastError: null } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "UNDO": {
      const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (activeIndex < 0) return state;
      const tab = state.tabs[activeIndex];
      const past = tab.history.past;
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const nextTab: TabState = {
        ...tab,
        project: previous,
        history: { past: past.slice(0, -1), future: [tab.project, ...tab.history.future] },
        ui: { ...tab.ui, traceDraft: null, lastError: null },
      };
      const tabs = [...state.tabs];
      tabs[activeIndex] = nextTab;
      return { ...state, tabs };
    }
    case "REDO": {
      const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (activeIndex < 0) return state;
      const tab = state.tabs[activeIndex];
      const future = tab.history.future;
      if (future.length === 0) return state;
      const next = future[0];
      const nextTab: TabState = {
        ...tab,
        project: next,
        history: { past: [...tab.history.past, tab.project], future: future.slice(1) },
        ui: { ...tab.ui, traceDraft: null, lastError: null },
      };
      const tabs = [...state.tabs];
      tabs[activeIndex] = nextTab;
      return { ...state, tabs };
    }
    case "ADD_PART": {
      const part = action.part.ref.endsWith("?")
        ? (() => {
            const active = state.tabs.find((t) => t.id === state.activeTabId);
            return active ? { ...action.part, ref: nextRef(action.part.kind, active.project.parts) } : action.part;
          })()
        : action.part;
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const err = validatePartPlacement(active.project, part);
      if (err) {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const tabs = [...state.tabs];
        tabs[activeIndex] = { ...tab, ui: { ...tab.ui, lastError: err } };
        return { ...state, tabs };
      }
      const autoWires = autoZeroLengthWiresForPlacedPart(active.project, part);
      return commit(state, {
        ...active.project,
        parts: [...active.project.parts, part],
        traces: [...active.project.traces, ...autoWires],
      });
    }
    case "UPDATE_PART": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.parts.find((p) => p.id === action.part.id);
      if (!current) return state;
      if (current === action.part) return state;
      const err = validatePartPlacement(active.project, action.part);
      if (err) {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const tabs = [...state.tabs];
        tabs[activeIndex] = { ...tab, ui: { ...tab.ui, lastError: err } };
        return { ...state, tabs };
      }
      const parts = active.project.parts.map((p) => (p.id === action.part.id ? action.part : p));
      const movedPinsRaw = movedPartPinMap(current, action.part);
      const movedPins = movedPinsForVacatedHoles(parts, movedPinsRaw);
      const movedPinTargets = uniqueHoles([...movedPins.values()]);
      const movedTraces = moveConnectedTraceEndpoints(active.project.traces, movedPins);
      const traces = insertJunctions(movedTraces, movedPinTargets);
      return commit(state, { ...active.project, parts, traces });
    }
    case "DELETE_PART": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const parts = active.project.parts.filter((p) => p.id !== action.id);
      const fixedPartIds = active.project.layoutConstraints.fixedPartIds.filter((id) => id !== action.id);
      const layoutConstraints = { ...active.project.layoutConstraints, fixedPartIds };
      const next = commit(state, { ...active.project, parts, layoutConstraints });
      const selection =
        active.ui.selection.type === "part" && active.ui.selection.id === action.id
          ? { type: "none" as const }
          : (next.tabs.find((t) => t.id === next.activeTabId)?.ui.selection ?? { type: "none" as const });
      const activeIndex = next.tabs.findIndex((t) => t.id === next.activeTabId);
      if (activeIndex < 0) return next;
      const tab = next.tabs[activeIndex];
      const tabs = [...next.tabs];
      tabs[activeIndex] = { ...tab, ui: { ...tab.ui, selection } };
      return { ...next, tabs };
    }
    case "ADD_NETLABEL": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const netLabels = [...active.project.netLabels, action.label];
      return commit(state, { ...active.project, netLabels });
    }
    case "UPDATE_NETLABEL": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.netLabels.find((l) => l.id === action.id);
      if (!current) return state;
      if (current.name === action.name) return state;
      const netLabels = active.project.netLabels.map((l) =>
        l.id === action.id ? { ...l, name: action.name } : l,
      );
      return commit(state, { ...active.project, netLabels });
    }
    case "UPDATE_NETLABEL_POSITION": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.netLabels.find((l) => l.id === action.id);
      if (!current) return state;
      const currentOffset = current.offset;
      const nextOffset = action.offset;
      const same =
        (!currentOffset && !nextOffset) ||
        (currentOffset &&
          nextOffset &&
          currentOffset.dx === nextOffset.dx &&
          currentOffset.dy === nextOffset.dy);
      if (same) return state;
      const netLabels = active.project.netLabels.map((l) =>
        l.id === action.id ? { ...l, offset: nextOffset } : l,
      );
      return commit(state, { ...active.project, netLabels });
    }
    case "DELETE_NETLABEL": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const netLabels = active.project.netLabels.filter((l) => l.id !== action.id);
      const next = commit(state, { ...active.project, netLabels });
      const selection =
        active.ui.selection.type === "netLabel" && active.ui.selection.id === action.id
          ? { type: "none" as const }
          : (next.tabs.find((t) => t.id === next.activeTabId)?.ui.selection ?? { type: "none" as const });
      const activeIndex = next.tabs.findIndex((t) => t.id === next.activeTabId);
      if (activeIndex < 0) return next;
      const tab = next.tabs[activeIndex];
      const tabs = [...next.tabs];
      tabs[activeIndex] = { ...tab, ui: { ...tab.ui, selection } };
      return { ...next, tabs };
    }
    case "ADD_NET": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      if (active.project.netlist.find((n) => n.id === action.net.id)) return state;
      const netlist = [...active.project.netlist, action.net];
      return commit(state, { ...active.project, netlist });
    }
    case "UPDATE_NET_NAME": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.netlist.find((n) => n.id === action.id);
      if (!current) return state;
      if ((current.name ?? "") === action.name) return state;
      const netlist = active.project.netlist.map((n) =>
        n.id === action.id ? { ...n, name: action.name } : n,
      );
      return commit(state, { ...active.project, netlist });
    }
    case "ADD_NET_TERMINAL": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.netlist.find((n) => n.id === action.id);
      if (!current) return state;
      const updated = addTerminal(current, action.terminal);
      if (updated === current) return state;
      const netlist = active.project.netlist.map((n) => (n.id === action.id ? updated : n));
      return commit(state, { ...active.project, netlist });
    }
    case "DELETE_NET_TERMINAL": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.netlist.find((n) => n.id === action.id);
      if (!current) return state;
      if (action.index < 0 || action.index >= current.terminals.length) return state;
      const terminals = current.terminals.filter((_, idx) => idx !== action.index);
      const netlist = active.project.netlist.map((n) =>
        n.id === action.id ? { ...n, terminals } : n,
      );
      return commit(state, { ...active.project, netlist });
    }
    case "DELETE_NET": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const netlist = active.project.netlist.filter((n) => n.id !== action.id);
      const next = commit(state, { ...active.project, netlist });
      const selection =
        active.ui.selection.type === "net" && active.ui.selection.id === action.id
          ? { type: "none" as const }
          : (next.tabs.find((t) => t.id === next.activeTabId)?.ui.selection ?? { type: "none" as const });
      const activeIndex = next.tabs.findIndex((t) => t.id === next.activeTabId);
      if (activeIndex < 0) return next;
      const tab = next.tabs[activeIndex];
      const tabs = [...next.tabs];
      tabs[activeIndex] = { ...tab, ui: { ...tab.ui, selection } };
      return { ...next, tabs };
    }
    case "TOGGLE_FIXED_PART": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const fixedPartIds = toggleFixedPartIds(active.project.layoutConstraints.fixedPartIds, action.id);
      const layoutConstraints = { ...active.project.layoutConstraints, fixedPartIds };
      return commit(state, { ...active.project, layoutConstraints });
    }
    case "TOGGLE_FIXED_HOLE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const fixedHoles = toggleFixedHoles(active.project.layoutConstraints.fixedHoles, action.hole);
      const layoutConstraints = { ...active.project.layoutConstraints, fixedHoles };
      return commit(state, { ...active.project, layoutConstraints });
    }
    case "RUN_AUTO_LAYOUT": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      let sourceProject = active.project;
      const preWarnings: string[] = [];

      if (sourceProject.netlist.length === 0) {
        const inferred = inferNetlistFromCurrentConnectivity(sourceProject);
        preWarnings.push(...inferred.warnings);
        if (inferred.netlist.length === 0) {
          return setActiveTabError(state, `Auto-layout: ${preWarnings.join(" ")}`);
        }
        sourceProject = { ...sourceProject, netlist: inferred.netlist };
      }

      const { project, warnings } = autoLayout(sourceProject, action.options);
      const traceBuild = tracesFromNetlist(project);
      const combinedWarnings = [...preWarnings, ...warnings, ...traceBuild.warnings];

      if (traceBuild.totalNetCount === 0) {
        return setActiveTabError(
          state,
          `Auto-layout annule: aucun net routable (au moins 2 terminaux) n'a ete trouve.`,
        );
      }

      if (traceBuild.totalNetCount > 0 && !traceBuild.complete) {
        const message = `Auto-layout annule: routage incomplet (${traceBuild.routedNetCount}/${traceBuild.totalNetCount} nets). ${combinedWarnings.join(" ")}`;
        return setActiveTabError(state, message);
      }

      const updatedProject = { ...project, traces: traceBuild.traces };
      const next = commit(state, updatedProject);
      const activeIndex = next.tabs.findIndex((t) => t.id === next.activeTabId);
      if (activeIndex < 0) return next;
      const tab = next.tabs[activeIndex];
      const selection =
        tab.ui.selection.type === "trace" ? { type: "none" as const } : tab.ui.selection;
      const message =
        combinedWarnings.length > 0 ? `Auto-layout: ${combinedWarnings.join(" ")}` : null;
      const tabs = [...next.tabs];
      tabs[activeIndex] = {
        ...tab,
        ui: { ...tab.ui, selection, traceDraft: null, lastError: message },
      };
      return { ...next, tabs };
    }
    case "START_TRACE": {
      const layer = action.kind === "wire" ? "bottom" : "top";
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = {
          ...tab,
          ui: {
            ...tab.ui,
            traceDraft: { kind: action.kind, layer, nodes: [action.start] },
            selection: { type: "none" },
            lastError: null,
          },
        };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    }
    case "ADD_TRACE_NODE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const draft = active.ui.traceDraft;
      if (!draft) return state;
      const last = draft.nodes[draft.nodes.length - 1];
      // Autorise [A, A] pour representer un fil de longueur 0.
      if (last && last.x === action.hole.x && last.y === action.hole.y && draft.nodes.length > 1) return state;
      const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
      const tab = state.tabs[activeIndex];
      const nextTab: TabState = {
        ...tab,
        ui: { ...tab.ui, traceDraft: { ...draft, nodes: [...draft.nodes, action.hole] } },
      };
      const tabs = [...state.tabs];
      tabs[activeIndex] = nextTab;
      return { ...state, tabs };
    }
    case "POP_TRACE_NODE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const draft = active.ui.traceDraft;
      if (!draft) return state;
      const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
      const tab = state.tabs[activeIndex];
      const nextTraceDraft = draft.nodes.length <= 1 ? null : { ...draft, nodes: draft.nodes.slice(0, -1) };
      const nextTab: TabState = {
        ...tab,
        ui: { ...tab.ui, traceDraft: nextTraceDraft },
      };
      const tabs = [...state.tabs];
      tabs[activeIndex] = nextTab;
      return { ...state, tabs };
    }
    case "CANCEL_TRACE":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, traceDraft: null } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    case "FINISH_TRACE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const draft = active.ui.traceDraft;
      if (!draft) return state;
      if (draft.nodes.length < 2) {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, traceDraft: null } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      }
      const trace: Trace = {
        id: createId("t"),
        kind: draft.kind,
        layer: draft.layer,
        nodes: draft.nodes,
      };
      const junctions = uniqueHoles(trace.nodes);
      const updated = insertJunctions(active.project.traces, junctions);
      return commit(state, {
        ...active.project,
        traces: [...updated, trace],
      });
    }
    case "UPDATE_TRACE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const current = active.project.traces.find((t) => t.id === action.id);
      if (!current) return state;
      if (!isValidTraceNodes(active.project.board, action.nodes)) return state;
      if (sameHoles(current.nodes, action.nodes)) return state;
      const updatedTrace = { ...current, nodes: action.nodes };
      const traces = active.project.traces.map((t) => (t.id === action.id ? updatedTrace : t));
      const junctions = uniqueHoles(action.nodes);
      const withJunctions = insertJunctions(traces, junctions, action.id);
      return commit(state, { ...active.project, traces: withJunctions });
    }
    case "DELETE_TRACE": {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active) return state;
      const traces = active.project.traces.filter((t) => t.id !== action.id);
      const next = commit(state, { ...active.project, traces });
      const selection =
        active.ui.selection.type === "trace" && active.ui.selection.id === action.id
          ? { type: "none" as const }
          : (next.tabs.find((t) => t.id === next.activeTabId)?.ui.selection ?? { type: "none" as const });
      const activeIndex = next.tabs.findIndex((t) => t.id === next.activeTabId);
      if (activeIndex < 0) return next;
      const tab = next.tabs[activeIndex];
      const tabs = [...next.tabs];
      tabs[activeIndex] = { ...tab, ui: { ...tab.ui, selection } };
      return { ...next, tabs };
    }
    case "SET_VIEWPORT":
      return (() => {
        const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (activeIndex < 0) return state;
        const tab = state.tabs[activeIndex];
        const nextTab: TabState = { ...tab, ui: { ...tab.ui, viewport: action.viewport } };
        const tabs = [...state.tabs];
        tabs[activeIndex] = nextTab;
        return { ...state, tabs };
      })();
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<React.Dispatch<Action> | null>(null);

export function AppStoreProvider(props: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const persistToken = useMemo(
    () =>
      state.tabs
        .map((t) => t.project.meta.updatedAt ?? t.project.meta.createdAt ?? "")
        .join("|"),
    [state.tabs],
  );

  useEffect(() => {
    try {
      const index = {
        activeTabId: state.activeTabId,
        tabs: state.tabs.map((t) => ({ id: t.id, projectKey: t.projectKey })),
      };
      localStorage.setItem(STORAGE_TABS_KEY, JSON.stringify(index));
      for (const tab of state.tabs) {
        localStorage.setItem(tab.projectKey, serializeProject(tab.project));
      }
    } catch {
      // ignore
    }
  }, [persistToken, state.activeTabId, state.tabs.length]);

  const stableState = useMemo(() => state, [state]);

  return (
    <AppStateContext.Provider value={stableState}>
      <AppDispatchContext.Provider value={dispatch}>{props.children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): ActiveAppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used within AppStoreProvider");
  const active =
    state.tabs.find((t) => t.id === state.activeTabId) ??
    state.tabs[0];
  if (!active) throw new Error("No active tab");
  return {
    ...state,
    activeTab: active,
    project: active.project,
    history: active.history,
    ui: active.ui,
  };
}

export function useAppDispatch(): React.Dispatch<Action> {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) throw new Error("useAppDispatch must be used within AppStoreProvider");
  return dispatch;
}

export function rotatePart(part: Part): Part {
  const rot: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 };
  return { ...part, placement: { ...part.placement, rotation: rot[part.placement.rotation] } };
}
