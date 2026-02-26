import { useRef } from "react";
import { alphaLabel } from "../../../model";
import type { Board, Net, NetLabel, Part, Trace } from "../../../model";
import {
  BOARD_MAX,
  BOARD_MIN,
  convertPartKind,
  formatTerminal,
  netDisplayName,
} from "../../../app/appUtils";
import * as styles from "../../../app/App.css";
import { rotatePart, type Action, type Selection } from "../../../app/store";
import { PART_KIND_OPTIONS } from "../../../app/components/toolDefinitions";

type InspectorDetailsViewProps = Readonly<{
  board: Board;
  selection: Selection;
  selectedPart: Part | null;
  selectedTrace: Trace | null;
  selectedNetLabel: NetLabel | null;
  selectedNet: Net | null;
  selectedPartFixed: boolean;
  selectedTraceNetId: string | null;
  selectedTraceNetName: string | null;
  selectedTraceDisplayColor: string | null;
  projectParts: readonly Part[];
  projectNets: readonly Net[];
  fixedPartCount: number;
  fixedHoleCount: number;
  onAction: (action: Action) => void;
  onUpdateBoardSize: (nextWidth: number, nextHeight: number) => void;
  onToggleBoardLabeling: () => void;
}>;

function defaultTo92PinNames(kind: Part["kind"]): readonly [string, string, string] {
  switch (kind) {
    case "transistor":
      return ["E", "B", "C"];
    case "potentiometer":
      return ["1", "2", "3"];
    case "jack":
      return ["T", "R", "S"];
    default:
      return ["1", "2", "3"];
  }
}

export function InspectorDetailsView({
  board,
  selection,
  selectedPart,
  selectedTrace,
  selectedNetLabel,
  selectedNet,
  selectedPartFixed,
  selectedTraceNetId,
  selectedTraceNetName,
  selectedTraceDisplayColor,
  projectParts,
  projectNets,
  fixedPartCount,
  fixedHoleCount,
  onAction,
  onUpdateBoardSize,
  onToggleBoardLabeling,
}: InspectorDetailsViewProps) {
  const traceColorInputRef = useRef<HTMLInputElement | null>(null);

  return (
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
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onUpdateBoardSize(next, board.height);
            }}
            aria-label="Board width"
          />
          <input
            className={styles.input}
            type="number"
            min={BOARD_MIN}
            max={BOARD_MAX}
            value={board.height}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onUpdateBoardSize(board.width, next);
            }}
            aria-label="Board height"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={styles.smallButton} onClick={onToggleBoardLabeling}>
            Toggle labels
          </button>
          <span className={styles.chip}>
            {board.labeling.rows === "alpha" ? "Rows A.." : "Rows 1.."} ·{" "}
            {board.labeling.cols === "alpha" ? "Columns A.." : "Columns 1.."}
          </span>
          <span className={styles.chip}>
            {board.height}×{board.width}
          </span>
        </div>
      </div>

      <div className={styles.inspectorRow}>
        <div className={styles.label}>Nets</div>
        {projectNets.length === 0 ? (
          <span className={styles.chip}>No nets</span>
        ) : (
          <div className={styles.netList}>
            {projectNets.map((net, index) => {
              const active = selectedNet?.id === net.id;
              return (
                <button
                  key={net.id}
                  type="button"
                  className={active ? styles.netButtonActive : styles.netButton}
                  onClick={() =>
                    onAction({ type: "SELECT", selection: { type: "net", id: net.id } })
                  }
                >
                  <span>{netDisplayName(net, index)}</span>
                  <span className={styles.netCount}>{net.terminals.length}</span>
                </button>
              );
            })}
          </div>
        )}
        <span className={styles.chip}>Tip: use Connect (C) to create/add nets</span>
      </div>

      <div className={styles.inspectorRow}>
        <div className={styles.label}>Constraints</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={styles.chip}>Fixed parts: {fixedPartCount}</span>
          <span className={styles.chip}>Fixed holes: {fixedHoleCount}</span>
        </div>
        <span className={styles.chip}>Tip: use Fixed Point (F)</span>
      </div>

      {selection.type === "none" ? <span className={styles.chip}>No selection</span> : null}

      {selectedPart ? (
        <>
          <div className={styles.inspectorRow}>
            <div className={styles.label}>Ref</div>
            <input
              className={styles.input}
              value={selectedPart.ref}
              onChange={(event) =>
                onAction({
                  type: "UPDATE_PART",
                  part: { ...selectedPart, ref: event.target.value },
                })
              }
            />
          </div>

          <div className={styles.inspectorRow}>
            <div className={styles.label}>Type</div>
            <select
              className={styles.input}
              value={selectedPart.kind}
              onChange={(event) =>
                onAction({
                  type: "UPDATE_PART",
                  part: convertPartKind(selectedPart, event.target.value as Part["kind"]),
                })
              }
            >
              {PART_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inspectorRow}>
            <div className={styles.label}>Value</div>
            <input
              className={styles.input}
              value={selectedPart.value ?? ""}
              onChange={(event) =>
                onAction({
                  type: "UPDATE_PART",
                  part: { ...selectedPart, value: event.target.value },
                })
              }
            />
          </div>

          {selectedPart.footprint.type === "dip" ? (
            <div className={styles.inspectorRow}>
              <div className={styles.label}>Pins</div>
              <select
                className={styles.input}
                value={selectedPart.footprint.pins}
                onChange={(event) =>
                  onAction({
                    type: "UPDATE_PART",
                    part: {
                      ...selectedPart,
                      footprint: {
                        type: "dip",
                        pins: Number(event.target.value),
                        rowSpan: 3,
                      },
                    },
                  })
                }
              >
                {Array.from({ length: 16 }).map((_, index) => {
                  const pins = (index + 1) * 2;
                  return (
                    <option key={pins} value={pins}>
                      {pins}
                    </option>
                  );
                })}
              </select>
              <div className={styles.chip}>rowSpan fixed: 3</div>
            </div>
          ) : null}

          {selectedPart.footprint.type === "to92_inline3"
            ? (() => {
                const pinNames = selectedPart.footprint.pinNames;
                const defaults = defaultTo92PinNames(selectedPart.kind);
                const current: [string, string, string] = [
                  pinNames?.[0] ?? defaults[0],
                  pinNames?.[1] ?? defaults[1],
                  pinNames?.[2] ?? defaults[2],
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
                          onChange={(event) => {
                            const next: [string, string, string] = [...current];
                            next[idx] = event.target.value;
                            onAction({
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
            {selectedPart.placement.origin.x + 1} - Rot {selectedPart.placement.rotation}°
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={selectedPartFixed ? styles.smallButtonActive : styles.smallButton}
              onClick={() => onAction({ type: "TOGGLE_FIXED_PART", id: selectedPart.id })}
            >
              {selectedPartFixed ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => onAction({ type: "UPDATE_PART", part: rotatePart(selectedPart) })}
            >
              Rotate (R)
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => onAction({ type: "DELETE_PART", id: selectedPart.id })}
            >
              Delete
            </button>
          </div>
        </>
      ) : null}

      {selectedTrace ? (
        <>
          <span className={styles.chip}>
            Trace: {selectedTrace.kind} - {selectedTrace.nodes.length} nodes
          </span>
          <div className={styles.traceColorRow}>
            <span className={styles.label}>Net: {selectedTraceNetName ?? "-"}</span>
            <button
              type="button"
              className={styles.traceColorButton}
              onClick={() => traceColorInputRef.current?.click()}
              aria-label="Choose wire color"
              title="Wire color"
            >
              <span
                className={styles.traceColorDot}
                style={{ backgroundColor: selectedTraceDisplayColor ?? "#6ea8fe" }}
              />
            </button>
            <input
              ref={traceColorInputRef}
              type="color"
              value={selectedTrace.color ?? selectedTraceDisplayColor ?? "#6ea8fe"}
              className={styles.traceColorInput}
              onChange={(event) => {
                const color = event.target.value;
                if (selectedTraceNetId) {
                  onAction({
                    type: "UPDATE_NET_TRACE_COLOR",
                    netId: selectedTraceNetId,
                    color,
                  });
                  return;
                }
                onAction({
                  type: "UPDATE_TRACE_COLOR",
                  id: selectedTrace.id,
                  color,
                });
              }}
            />
          </div>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => onAction({ type: "DELETE_TRACE", id: selectedTrace.id })}
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
              onChange={(event) =>
                onAction({
                  type: "UPDATE_NETLABEL",
                  id: selectedNetLabel.id,
                  name: event.target.value,
                })
              }
            />
          </div>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => onAction({ type: "DELETE_NETLABEL", id: selectedNetLabel.id })}
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
              onChange={(event) =>
                onAction({ type: "UPDATE_NET_NAME", id: selectedNet.id, name: event.target.value })
              }
            />
          </div>
          <div className={styles.inspectorRow}>
            <div className={styles.label}>Terminals</div>
            {selectedNet.terminals.length === 0 ? (
              <span className={styles.chip}>No terminals</span>
            ) : (
              <div className={styles.netTerminalList}>
                {selectedNet.terminals.map((terminal, index) => {
                  const info = formatTerminal(terminal, projectParts, board.labeling);
                  return (
                    <div key={`${selectedNet.id}-${index}`} className={styles.netTerminalRow}>
                      <div>
                        <div className={styles.netTerminalLabel}>{info.title}</div>
                        {info.meta ? (
                          <div className={styles.netTerminalMeta}>{info.meta}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() =>
                          onAction({ type: "DELETE_NET_TERMINAL", id: selectedNet.id, index })
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
            onClick={() => onAction({ type: "DELETE_NET", id: selectedNet.id })}
          >
            Delete net
          </button>
        </>
      ) : null}
    </div>
  );
}
