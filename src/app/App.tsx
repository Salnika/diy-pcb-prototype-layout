import { useEffect, useRef, useState } from "react";
import { BoardView } from "../features/board/BoardView";
import { alphaLabel, holeLabel, parseProject, serializeProject } from "../model";
import type { Net, NetTerminal, Part, PartKind } from "../model";
import { downloadText } from "../features/export/download";
import { downloadPng } from "../features/export/exportPng";
import { renderProjectSvg } from "../features/export/renderProjectSvg";
import {
  makeDefaultPart,
  rotatePart,
  useAppDispatch,
  useAppState,
  type Tool,
} from "./store";
import { featureFlags } from "./featureFlags";
import * as styles from "./App.css";

function isToolActive(current: Tool, candidate: Tool): boolean {
  if (current.type !== candidate.type) return false;
  if (current.type === "placePart" && candidate.type === "placePart") {
    return current.kind === candidate.kind;
  }
  return true;
}

type IconName =
  | "select"
  | "connect"
  | "fixedPoint"
  | "wire"
  | "jumper"
  | "label"
  | "erase"
  | "resistor"
  | "diode"
  | "capacitor"
  | "capacitor_ceramic"
  | "capacitor_electrolytic"
  | "capacitor_film"
  | "transistor"
  | "potentiometer"
  | "jack"
  | "power_pos"
  | "power_neg"
  | "power_gnd"
  | "dip";

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case "select":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="5,4 5,20 9,16 13,22 16,20 12,14 18,14 5,4" />
        </svg>
      );
    case "connect":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );
    case "fixedPoint":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="21" />
          <line x1="3" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "wire":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="4,18 9,13 13,15 20,8" />
          <circle cx="4" cy="18" r="1.8" />
          <circle cx="20" cy="8" r="1.8" />
        </svg>
      );
    case "jumper":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 16c3-6 13-6 16 0" />
          <circle cx="4" cy="16" r="1.8" />
          <circle cx="20" cy="16" r="1.8" />
        </svg>
      );
    case "label":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 9h9l5 5-8 8-6-6z" />
          <circle cx="9" cy="9" r="1.5" />
        </svg>
      );
    case "erase":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 16l7-7 7 7-4 4H7z" />
          <line x1="12" y1="20" x2="20" y2="20" />
        </svg>
      );
    case "resistor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="2,12 5,12 7,9 10,15 13,9 16,15 18,12 22,12" />
        </svg>
      );
    case "diode":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="8" y2="12" />
          <polygon points="8,7 15,12 8,17" />
          <line x1="15" y1="7" x2="15" y2="17" />
          <line x1="15" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "capacitor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="18" />
          <line x1="15" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "capacitor_ceramic":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="18" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <rect x="10.5" y="8" width="3" height="8" />
        </svg>
      );
    case "capacitor_electrolytic":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <path d="M15 6c2 2 2 10 0 12" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <line x1="6" y1="6" x2="6" y2="9" />
          <line x1="4.5" y1="7.5" x2="7.5" y2="7.5" />
        </svg>
      );
    case "capacitor_film":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="8" y2="12" />
          <rect x="8" y="7" width="8" height="10" rx="1.5" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "transistor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="18" x2="18" y2="22" />
          <polyline points="12,18 13.5,18.5 12.5,17" />
        </svg>
      );
    case "potentiometer":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="2,12 6,12 8,9 10,15 12,9 14,15 16,12 22,12" />
          <line x1="12" y1="5" x2="12" y2="10" />
          <polyline points="10,7 12,5 14,7" />
        </svg>
      );
    case "jack":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="8" cy="12" r="4" />
          <line x1="12" y1="12" x2="21" y2="12" />
          <line x1="15" y1="8" x2="15" y2="16" />
          <line x1="18" y1="9" x2="18" y2="15" />
        </svg>
      );
    case "power_pos":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "power_neg":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "power_gnd":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="12" y1="4" x2="12" y2="10" />
          <line x1="7" y1="10" x2="17" y2="10" />
          <line x1="8.5" y1="13" x2="15.5" y2="13" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      );
    case "dip":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <rect x="7" y="5" width="10" height="14" rx="2" />
          <line x1="7" y1="7" x2="4" y2="7" />
          <line x1="7" y1="10" x2="4" y2="10" />
          <line x1="7" y1="13" x2="4" y2="13" />
          <line x1="7" y1="16" x2="4" y2="16" />
          <line x1="17" y1="7" x2="20" y2="7" />
          <line x1="17" y1="10" x2="20" y2="10" />
          <line x1="17" y1="13" x2="20" y2="13" />
          <line x1="17" y1="16" x2="20" y2="16" />
        </svg>
      );
  }
}

function refPrefix(kind: PartKind): string {
  switch (kind) {
    case "resistor":
      return "R";
    case "capacitor":
    case "capacitor_ceramic":
    case "capacitor_electrolytic":
    case "capacitor_film":
      return "C";
    case "diode":
      return "D";
    case "transistor":
      return "Q";
    case "potentiometer":
      return "RV";
    case "jack":
      return "J";
    case "power_pos":
    case "power_neg":
    case "power_gnd":
      return "PWR";
    case "dip":
      return "U";
  }
}

function convertRef(oldRef: string, nextKind: PartKind): string {
  const m = oldRef.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return oldRef;
  return `${refPrefix(nextKind)}${m[2]}`;
}

function convertPartKind(part: Part, nextKind: PartKind): Part {
  const defaults = makeDefaultPart(nextKind, part.placement.origin);
  return {
    ...defaults,
    id: part.id,
    ref: convertRef(part.ref, nextKind),
    placement: part.placement,
    value: part.value,
  };
}

function safeFilename(base: string): string {
  const trimmed = base.trim() || "project";
  const safe = trimmed.replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/^-+|-+$/g, "");
  return safe || "project";
}

function netDisplayName(net: Net, index: number): string {
  const name = net.name?.trim();
  return name && name.length > 0 ? name : `Net ${index + 1}`;
}

function formatTerminal(
  terminal: NetTerminal,
  parts: readonly Part[],
  labeling: { rows: "alpha" | "numeric"; cols: "alpha" | "numeric" },
): { title: string; meta?: string } {
  if (terminal.kind === "hole") {
    return { title: holeLabel(terminal.hole, labeling), meta: "hole" };
  }
  const part = parts.find((p) => p.id === terminal.partId);
  if (!part) return { title: `pin ${terminal.pinId}`, meta: "part manquant" };
  return { title: `${part.ref}.${terminal.pinId}`, meta: part.kind };
}

const BOARD_MIN = 1;
const BOARD_MAX = 64;
const INSPECTOR_COLLAPSE_KEY = "diypcbprototype.ui.inspectorCollapsed";

function clampBoardSize(value: number): number {
  return Math.max(BOARD_MIN, Math.min(BOARD_MAX, Math.round(value)));
}

export function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => {
    try {
      return localStorage.getItem(INSPECTOR_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { tool, selection, traceDraft } = state.ui;

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const showAutoLayout = featureFlags.autoLayout;

  async function importJsonFile(file: File) {
    try {
      const text = await file.text();
      const project = parseProject(text);
      dispatch({ type: "IMPORT_PROJECT", project });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: "SET_ERROR", message: `Import failed: ${message}` });
    }
  }

  function exportJson() {
    const name = safeFilename(state.project.meta.name ?? "project");
    const json = serializeProject(state.project);
    downloadText(`${name}.diypcb.json`, json, "application/json;charset=utf-8");
  }

  function exportSvg() {
    const name = safeFilename(state.project.meta.name ?? "project");
    const { svg } = renderProjectSvg(state.project);
    downloadText(`${name}.svg`, svg, "image/svg+xml;charset=utf-8");
  }

  async function exportPng() {
    try {
      const name = safeFilename(state.project.meta.name ?? "project");
      const { svg, width, height } = renderProjectSvg(state.project);
      await downloadPng(`${name}.png`, svg, width, height);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: "SET_ERROR", message: `PNG export failed: ${message}` });
    }
  }

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      const target = ev.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        dispatch({ type: ev.shiftKey ? "REDO" : "UNDO" });
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (ev.key === "Escape") {
        if (traceDraft) {
          dispatch({ type: "CANCEL_TRACE" });
          return;
        }
        dispatch({ type: "SELECT", selection: { type: "none" } });
        dispatch({ type: "SET_TOOL", tool: { type: "select" } });
        return;
      }

      if (ev.key === "Enter") {
        if (traceDraft) {
          dispatch({ type: "FINISH_TRACE" });
        }
        return;
      }

      if (ev.key === "Backspace" || ev.key === "Delete") {
        if (traceDraft) {
          ev.preventDefault();
          dispatch({ type: "POP_TRACE_NODE" });
          return;
        }
        if (selection.type === "part") dispatch({ type: "DELETE_PART", id: selection.id });
        if (selection.type === "trace") dispatch({ type: "DELETE_TRACE", id: selection.id });
        if (selection.type === "netLabel") dispatch({ type: "DELETE_NETLABEL", id: selection.id });
        if (selection.type === "net") dispatch({ type: "DELETE_NET", id: selection.id });
        return;
      }

      if (ev.key.toLowerCase() === "r" && selection.type === "part") {
        const part = state.project.parts.find((p) => p.id === selection.id);
        if (part) dispatch({ type: "UPDATE_PART", part: rotatePart(part) });
        return;
      }

      switch (ev.key.toLowerCase()) {
        case "v":
          dispatch({ type: "SET_TOOL", tool: { type: "select" } });
          break;
        case "c":
          dispatch({ type: "SET_TOOL", tool: { type: "connect" } });
          break;
        case "f":
          dispatch({ type: "SET_TOOL", tool: { type: "fixedPoint" } });
          break;
        case "w":
          dispatch({ type: "SET_TOOL", tool: { type: "wire" } });
          break;
        case "j":
          dispatch({ type: "SET_TOOL", tool: { type: "jumper" } });
          break;
        case "l":
          dispatch({ type: "SET_TOOL", tool: { type: "label" } });
          break;
        case "e":
          dispatch({ type: "SET_TOOL", tool: { type: "erase" } });
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selection, state.project.parts, traceDraft]);

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_COLLAPSE_KEY, inspectorCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [inspectorCollapsed]);

  const selectedPart = selection.type === "part" ? state.project.parts.find((p) => p.id === selection.id) : null;
  const selectedTrace = selection.type === "trace" ? state.project.traces.find((t) => t.id === selection.id) : null;
  const selectedNetLabel =
    selection.type === "netLabel" ? state.project.netLabels.find((l) => l.id === selection.id) : null;
  const selectedNet = selection.type === "net" ? state.project.netlist.find((n) => n.id === selection.id) : null;
  const selectedPartFixed =
    !!selectedPart && state.project.layoutConstraints.fixedPartIds.includes(selectedPart.id);
  const board = state.project.board;

  function updateBoardSize(nextWidth: number, nextHeight: number) {
    dispatch({
      type: "UPDATE_BOARD",
      width: clampBoardSize(nextWidth),
      height: clampBoardSize(nextHeight),
    });
  }

  function toggleBoardLabeling() {
    const next =
      board.labeling.rows === "alpha" && board.labeling.cols === "numeric"
        ? { rows: "numeric" as const, cols: "alpha" as const }
        : { rows: "alpha" as const, cols: "numeric" as const };
    dispatch({ type: "UPDATE_BOARD_LABELING", labeling: next });
  }
  return (
    <div className={styles.app}>
      <header className={styles.topBar}>
        <div className={styles.brand}>DiyPCBPrototype</div>
        <div className={styles.topHint}>Perfboard (A–X) × 18 — MVP placement + wires/jumpers</div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => {
              if (!window.confirm("Créer un nouveau projet ? (le projet actuel restera en autosave)")) return;
              dispatch({ type: "NEW_PROJECT" });
            }}
          >
            New
          </button>
          <button
            type="button"
            className={styles.smallButton}
            disabled={!canUndo}
            onClick={() => dispatch({ type: "UNDO" })}
          >
            Undo
          </button>
          <button
            type="button"
            className={styles.smallButton}
            disabled={!canRedo}
            onClick={() => dispatch({ type: "REDO" })}
          >
            Redo
          </button>
          {showAutoLayout ? (
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => {
                const ok = window.confirm(
                  "Auto-layout: optimisation du placement et régénération des traces à partir des connexions. Continuer ?",
                );
                if (!ok) return;
                dispatch({ type: "RUN_AUTO_LAYOUT" });
              }}
            >
              Auto-Layout
            </button>
          ) : null}

          <button type="button" className={styles.smallButton} onClick={exportJson}>
            Export JSON
          </button>

          <button
            type="button"
            className={styles.smallButton}
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void importJsonFile(file);
              e.target.value = "";
            }}
          />

          <button type="button" className={styles.smallButton} onClick={exportSvg}>
            Export SVG
          </button>
          <button type="button" className={styles.smallButton} onClick={() => void exportPng()}>
            Export PNG
          </button>

          {state.ui.lastError ? <div className={styles.errorBar}>{state.ui.lastError}</div> : null}
        </div>
      </header>

      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {state.tabs.map((tab, index) => {
            const name = tab.project.meta.name?.trim() || `Projet ${index + 1}`;
            const active = tab.id === state.activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                className={active ? styles.tabButtonActive : styles.tabButton}
                onClick={() => dispatch({ type: "SET_ACTIVE_TAB", id: tab.id })}
              >
                {name}
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.tabAdd} onClick={() => dispatch({ type: "ADD_TAB" })}>
          +
        </button>
      </div>

      <div
        className={styles.main}
        style={{ gridTemplateColumns: `max-content 1fr ${inspectorCollapsed ? "44px" : "300px"}` }}
      >
        <aside className={styles.leftPane}>
          <h2 className={styles.paneTitle}>Palette</h2>
          <div className={styles.paneSection}>
            <div className={styles.toolGroup}>
              <button
                type="button"
                className={isToolActive(tool, { type: "select" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "select" } })}
                aria-label="Select (V)"
                title="Select (V)"
              >
                <Icon name="select" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "connect" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "connect" } })}
                aria-label="Connecter (C)"
                title="Connecter (C)"
              >
                <Icon name="connect" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "fixedPoint" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "fixedPoint" } })}
                aria-label="Point fixe (F)"
                title="Point fixe (F)"
              >
                <Icon name="fixedPoint" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "wire" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "wire" } })}
                aria-label="Wire (W)"
                title="Wire (W)"
              >
                <Icon name="wire" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "jumper" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "jumper" } })}
                aria-label="Jumper (J)"
                title="Jumper (J)"
              >
                <Icon name="jumper" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "label" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "label" } })}
                aria-label="Label net (L)"
                title="Label net (L)"
              >
                <Icon name="label" />
              </button>
              <button
                type="button"
                className={isToolActive(tool, { type: "erase" }) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "erase" } })}
                aria-label="Erase (E)"
                title="Erase (E)"
              >
                <Icon name="erase" />
              </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolGroup}>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "resistor" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "resistor" } })}
                aria-label="Résistance"
                title="Résistance"
              >
                <Icon name="resistor" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "diode" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "diode" } })}
                aria-label="Diode"
                title="Diode"
              >
                <Icon name="diode" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "capacitor" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "capacitor" } })}
                aria-label="Condensateur"
                title="Condensateur"
              >
                <Icon name="capacitor" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "capacitor_ceramic" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() =>
                  dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "capacitor_ceramic" } })
                }
                aria-label="Condensateur céramique"
                title="Condensateur céramique"
              >
                <Icon name="capacitor_ceramic" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "capacitor_electrolytic" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() =>
                  dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "capacitor_electrolytic" } })
                }
                aria-label="Condensateur polarisé"
                title="Condensateur polarisé"
              >
                <Icon name="capacitor_electrolytic" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "capacitor_film" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() =>
                  dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "capacitor_film" } })
                }
                aria-label="Condensateur film"
                title="Condensateur film"
              >
                <Icon name="capacitor_film" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "transistor" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "transistor" } })}
                aria-label="Transistor"
                title="Transistor"
              >
                <Icon name="transistor" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "potentiometer" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "potentiometer" } })}
                aria-label="Potentiomètre"
                title="Potentiomètre"
              >
                <Icon name="potentiometer" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "jack" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "jack" } })}
                aria-label="Jack (TRS)"
                title="Jack (TRS)"
              >
                <Icon name="jack" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "power_pos" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "power_pos" } })}
                aria-label="Alim +"
                title="Alim +"
              >
                <Icon name="power_pos" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "power_neg" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "power_neg" } })}
                aria-label="Alim -"
                title="Alim -"
              >
                <Icon name="power_neg" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "power_gnd" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "power_gnd" } })}
                aria-label="GND"
                title="GND"
              >
                <Icon name="power_gnd" />
              </button>
              <button
                type="button"
                className={
                  isToolActive(tool, { type: "placePart", kind: "dip" })
                    ? styles.toolButtonActive
                    : styles.toolButton
                }
                onClick={() => dispatch({ type: "SET_TOOL", tool: { type: "placePart", kind: "dip" } })}
                aria-label="CI (DIP)"
                title="CI (DIP)"
              >
                <Icon name="dip" />
              </button>
            </div>
          </div>
        </aside>

        <main className={styles.centerPane}>
          <BoardView />
        </main>

        <aside
          className={`${styles.rightPane} ${inspectorCollapsed ? styles.rightPaneCollapsed : ""}`}
        >
          <div className={styles.inspectorHeader}>
            {!inspectorCollapsed ? <h2 className={styles.paneTitle}>Inspector</h2> : <span />}
            <button
              type="button"
              className={styles.inspectorToggle}
              onClick={() => setInspectorCollapsed((prev) => !prev)}
              aria-label={inspectorCollapsed ? "Ouvrir l'inspecteur" : "Réduire l'inspecteur"}
              title={inspectorCollapsed ? "Ouvrir l'inspecteur" : "Réduire l'inspecteur"}
            >
              {inspectorCollapsed ? "⟨" : "⟩"}
            </button>
          </div>
          {inspectorCollapsed ? null : (
            <div className={styles.paneSection}>
              <div className={styles.inspectorRow}>
                <div className={styles.label}>Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  className={styles.input}
                  type="number"
                  min={BOARD_MIN}
                  max={BOARD_MAX}
                  value={board.width}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    updateBoardSize(next, board.height);
                  }}
                  aria-label="Board width"
                />
                <input
                  className={styles.input}
                  type="number"
                  min={BOARD_MIN}
                  max={BOARD_MAX}
                  value={board.height}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    updateBoardSize(board.width, next);
                  }}
                  aria-label="Board height"
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={toggleBoardLabeling}
                >
                  Inverser labels
                </button>
                <span className={styles.chip}>
                  {board.labeling.rows === "alpha" ? "Lignes A.." : "Lignes 1.."} ·{" "}
                  {board.labeling.cols === "alpha" ? "Colonnes A.." : "Colonnes 1.."}
                </span>
                <span className={styles.chip}>
                  {board.height}×{board.width}
                </span>
              </div>
            </div>

            <div className={styles.inspectorRow}>
              <div className={styles.label}>Nets</div>
              {state.project.netlist.length === 0 ? (
                <span className={styles.chip}>Aucun net</span>
              ) : (
                <div className={styles.netList}>
                  {state.project.netlist.map((net, index) => {
                    const active = selectedNet?.id === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        className={active ? styles.netButtonActive : styles.netButton}
                        onClick={() => dispatch({ type: "SELECT", selection: { type: "net", id: net.id } })}
                      >
                        <span>{netDisplayName(net, index)}</span>
                        <span className={styles.netCount}>{net.terminals.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <span className={styles.chip}>Astuce: outil Connect (C) pour créer/ajouter</span>
            </div>

            <div className={styles.inspectorRow}>
              <div className={styles.label}>Contraintes</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={styles.chip}>
                  Parts fixes: {state.project.layoutConstraints.fixedPartIds.length}
                </span>
                <span className={styles.chip}>
                  Points fixes: {state.project.layoutConstraints.fixedHoles.length}
                </span>
              </div>
              <span className={styles.chip}>Astuce: outil Point fixe (F)</span>
            </div>

            {selection.type === "none" ? <span className={styles.chip}>Aucune sélection</span> : null}

            {selectedPart ? (
              <>
                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Ref</div>
                  <input
                    className={styles.input}
                    value={selectedPart.ref}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_PART", part: { ...selectedPart, ref: e.target.value } })
                    }
                  />
                </div>

                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Type</div>
                  <select
                    className={styles.input}
                    value={selectedPart.kind}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PART",
                        part: convertPartKind(selectedPart, e.target.value as PartKind),
                      })
                    }
                  >
                    <option value="resistor">Résistance</option>
                    <option value="diode">Diode</option>
                    <option value="capacitor">Condensateur</option>
                    <option value="capacitor_ceramic">Condensateur céramique</option>
                    <option value="capacitor_electrolytic">Condensateur polarisé</option>
                    <option value="capacitor_film">Condensateur film</option>
                    <option value="transistor">Transistor</option>
                    <option value="potentiometer">Potentiomètre</option>
                    <option value="jack">Jack (TRS)</option>
                    <option value="power_pos">Alim +</option>
                    <option value="power_neg">Alim -</option>
                    <option value="power_gnd">GND</option>
                    <option value="dip">CI (DIP)</option>
                  </select>
                </div>

                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Value</div>
                  <input
                    className={styles.input}
                    value={selectedPart.value ?? ""}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_PART", part: { ...selectedPart, value: e.target.value } })
                    }
                  />
                </div>

                {selectedPart.footprint.type === "dip" ? (
                  <div className={styles.inspectorRow}>
                    <div className={styles.label}>Pins</div>
                    <select
                      className={styles.input}
                      value={selectedPart.footprint.pins}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PART",
                          part: {
                            ...selectedPart,
                            footprint: {
                              type: "dip",
                              pins: Number(e.target.value),
                              rowSpan: 3,
                            },
                          },
                        })
                      }
                    >
                      {Array.from({ length: 16 }).map((_, i) => {
                        const pins = (i + 1) * 2;
                        return (
                          <option key={pins} value={pins}>
                            {pins}
                          </option>
                        );
                      })}
                    </select>
                    <div className={styles.chip}>rowSpan fixé: 3</div>
                  </div>
                ) : null}

                {selectedPart.footprint.type === "to92_inline3"
                  ? (() => {
                      const pinNames = selectedPart.footprint.pinNames;
                      const current: [string, string, string] = [
                        pinNames?.[0] ?? "E",
                        pinNames?.[1] ?? "B",
                        pinNames?.[2] ?? "C",
                      ];

                      return (
                        <div className={styles.inspectorRow}>
                          <div className={styles.label}>Pins (labels)</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            {([0, 1, 2] as const).map((idx) => (
                              <input
                                key={idx}
                                className={styles.input}
                                value={current[idx]}
                                onChange={(e) => {
                                  const next: [string, string, string] = [...current];
                                  next[idx] = e.target.value;
                                  dispatch({
                                    type: "UPDATE_PART",
                                    part: {
                                      ...selectedPart,
                                      footprint: { type: "to92_inline3", pinNames: next },
                                    },
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  : null}

                <div className={styles.chip}>
                  Origin: {alphaLabel(selectedPart.placement.origin.y)}
                  {selectedPart.placement.origin.x + 1} — Rot {selectedPart.placement.rotation}°
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={selectedPartFixed ? styles.smallButtonActive : styles.smallButton}
                    onClick={() => dispatch({ type: "TOGGLE_FIXED_PART", id: selectedPart.id })}
                  >
                    {selectedPartFixed ? "Unlock" : "Lock"}
                  </button>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => dispatch({ type: "UPDATE_PART", part: rotatePart(selectedPart) })}
                  >
                    Rotate (R)
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => dispatch({ type: "DELETE_PART", id: selectedPart.id })}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : null}

            {selectedTrace ? (
              <>
                <span className={styles.chip}>
                  Trace: {selectedTrace.kind} — {selectedTrace.nodes.length} nodes
                </span>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => dispatch({ type: "DELETE_TRACE", id: selectedTrace.id })}
                >
                  Delete trace
                </button>
              </>
            ) : null}

            {selectedNetLabel ? (
              <>
                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Net name</div>
                  <input
                    className={styles.input}
                    value={selectedNetLabel.name}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_NETLABEL", id: selectedNetLabel.id, name: e.target.value })
                    }
                  />
                </div>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => dispatch({ type: "DELETE_NETLABEL", id: selectedNetLabel.id })}
                >
                  Delete label
                </button>
              </>
            ) : null}

            {selectedNet ? (
              <>
                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Net name</div>
                  <input
                    className={styles.input}
                    value={selectedNet.name ?? ""}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_NET_NAME", id: selectedNet.id, name: e.target.value })
                    }
                  />
                </div>
                <div className={styles.inspectorRow}>
                  <div className={styles.label}>Terminals</div>
                  {selectedNet.terminals.length === 0 ? (
                    <span className={styles.chip}>Aucun terminal</span>
                  ) : (
                    <div className={styles.netTerminalList}>
                      {selectedNet.terminals.map((terminal, index) => {
                        const info = formatTerminal(terminal, state.project.parts, board.labeling);
                        return (
                          <div key={`${selectedNet.id}-${index}`} className={styles.netTerminalRow}>
                            <div>
                              <div className={styles.netTerminalLabel}>{info.title}</div>
                              {info.meta ? <div className={styles.netTerminalMeta}>{info.meta}</div> : null}
                            </div>
                            <button
                              type="button"
                              className={styles.smallButton}
                              onClick={() =>
                                dispatch({ type: "DELETE_NET_TERMINAL", id: selectedNet.id, index })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => dispatch({ type: "DELETE_NET", id: selectedNet.id })}
                >
                  Delete net
                </button>
              </>
            ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
