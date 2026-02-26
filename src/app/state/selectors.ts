import { computeNetIndex, holeKey, netColor } from "../../model";
import type { Net, NetLabel, Part, Trace } from "../../model";
import { buildBomRows } from "../../features/export/bom";
import type { ActiveAppState } from "../store";

export function selectCanUndo(state: ActiveAppState): boolean {
  return state.history.past.length > 0;
}

export function selectCanRedo(state: ActiveAppState): boolean {
  return state.history.future.length > 0;
}

export function selectSelectedPart(state: ActiveAppState): Part | null {
  const selection = state.ui.selection;
  if (selection.type !== "part") return null;
  return state.project.parts.find((part) => part.id === selection.id) ?? null;
}

export function selectSelectedTrace(state: ActiveAppState): Trace | null {
  const selection = state.ui.selection;
  if (selection.type !== "trace") return null;
  return state.project.traces.find((trace) => trace.id === selection.id) ?? null;
}

export function selectSelectedNetLabel(state: ActiveAppState): NetLabel | null {
  const selection = state.ui.selection;
  if (selection.type !== "netLabel") return null;
  return state.project.netLabels.find((label) => label.id === selection.id) ?? null;
}

export function selectSelectedNet(state: ActiveAppState): Net | null {
  const selection = state.ui.selection;
  if (selection.type !== "net") return null;
  return state.project.netlist.find((net) => net.id === selection.id) ?? null;
}

export function selectSelectedPartFixed(state: ActiveAppState, selectedPart: Part | null): boolean {
  return !!selectedPart && state.project.layoutConstraints.fixedPartIds.includes(selectedPart.id);
}

export function selectNetIndex(state: ActiveAppState) {
  return computeNetIndex(state.project);
}

export function selectSelectedTraceNetData(
  selectedTrace: Trace | null,
  netIndex: ReturnType<typeof computeNetIndex>,
): Readonly<{
  netId: string | null;
  netName: string | null;
  displayColor: string | null;
}> {
  if (!selectedTrace) {
    return { netId: null, netName: null, displayColor: null };
  }

  const first = selectedTrace.nodes[0];
  const netId = first ? (netIndex.holeToNetId.get(holeKey(first)) ?? null) : null;
  const netName = netId ? (netIndex.netIdToName.get(netId) ?? null) : null;
  const displayColor =
    selectedTrace.color ?? netColor(netId ?? selectedTrace.id, netName ?? undefined);

  return { netId, netName, displayColor };
}

export function selectFixedConstraintCounts(state: ActiveAppState): Readonly<{
  fixedPartCount: number;
  fixedHoleCount: number;
}> {
  return {
    fixedPartCount: state.project.layoutConstraints.fixedPartIds.length,
    fixedHoleCount: state.project.layoutConstraints.fixedHoles.length,
  };
}

export function selectBomRows(parts: readonly Part[]) {
  return buildBomRows(parts);
}
