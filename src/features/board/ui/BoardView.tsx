import type {
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
  WheelEventHandler,
} from "react";
import type { Board, Hole, NetIndex, NetLabel, Part, Trace } from "../../../model";
import type { Selection, Tool, TraceDraft, Viewport } from "../../../app/store";
import {
  BoardBackdropLayer,
  BoardHolesLayer,
  ConnectDraftMarker,
  NetLabelLayer,
  PartLayer,
  TraceDraftLayer,
  TraceLayer,
} from "../components/BoardSvgLayers";
import * as styles from "../BoardView.css";

type BoardViewUiProps = Readonly<{
  board: Board;
  viewport: Viewport;
  viewSize: { w: number; h: number };
  holes: readonly Hole[];
  fixedHoles: readonly Hole[];
  fixedPartIds: ReadonlySet<string>;
  netIndex: NetIndex;
  selection: Selection;
  tool: Tool;
  hoverHole: Hole | null;
  traceDraft: TraceDraft | null;
  hoverText: string;
  connectHint: string | null;
  activeNetId: string | null;
  activeNetName?: string;
  activeNetColor: string | null;
  selectedNetHoles: readonly Hole[];
  selectedNetColor: string | null;
  tracesToRender: readonly Trace[];
  partsToRender: readonly Part[];
  labelsToRender: readonly NetLabel[];
  ghostPart: Part | null;
  labelDraftId: string | null;
  connectDraftHole: Hole | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onWheel: WheelEventHandler<SVGSVGElement>;
  onPointerDown: PointerEventHandler<SVGSVGElement>;
  onPointerMove: PointerEventHandler<SVGSVGElement>;
  onPointerUp: PointerEventHandler<SVGSVGElement>;
  onDoubleClick: () => void;
  onDeleteTrace: (id: string) => void;
  onSelectTrace: (id: string) => void;
  onStartTraceDrag: (
    trace: Trace,
    endpoint: "start" | "end",
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onStartTraceSegmentDrag: (
    trace: Trace,
    segmentIndex: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onStartTraceNodeDrag: (
    trace: Trace,
    nodeIndex: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onDeletePart: (id: string) => void;
  onSelectPart: (id: string) => void;
  onStartPartDrag: (part: Part, event: ReactPointerEvent<SVGGElement>) => void;
  onStartInline2Stretch: (
    part: Part,
    movingPinId: "1" | "2",
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onDeleteNetLabel: (id: string) => void;
  onSelectNetLabel: (id: string) => void;
  onStartLabelDrag: (label: NetLabel, event: ReactPointerEvent<SVGGElement>) => void;
}>;

export function BoardViewUi({
  board,
  viewport,
  viewSize,
  holes,
  fixedHoles,
  fixedPartIds,
  netIndex,
  selection,
  tool,
  hoverHole,
  traceDraft,
  hoverText,
  connectHint,
  activeNetId,
  activeNetName,
  activeNetColor,
  selectedNetHoles,
  selectedNetColor,
  tracesToRender,
  partsToRender,
  labelsToRender,
  ghostPart,
  labelDraftId,
  connectDraftHole,
  svgRef,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onDeleteTrace,
  onSelectTrace,
  onStartTraceDrag,
  onStartTraceSegmentDrag,
  onStartTraceNodeDrag,
  onDeletePart,
  onSelectPart,
  onStartPartDrag,
  onStartInline2Stretch,
  onDeleteNetLabel,
  onSelectNetLabel,
  onStartLabelDrag,
}: BoardViewUiProps) {
  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <span className={styles.title}>Board</span>
          <span className={styles.meta}>
            {board.height}×{board.width} ({hoverText})
          </span>
        </div>
        <span className={styles.meta}>
          {traceDraft
            ? `Trace: ${traceDraft.nodes.length} nodes (Enter=finish, Esc=cancel, Del=undo)`
            : connectHint
              ? connectHint
              : activeNetId
                ? `Net: ${activeNetName ?? "-"}`
                : " "}
          {"  "}·{"  "}Zoom: {Math.round(viewport.scale * 100)}%
        </span>
      </div>

      <div className={styles.viewport}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.scale})`}>
            <BoardBackdropLayer
              board={board}
              activeNetId={activeNetId}
              activeNetColor={activeNetColor}
              selectedNetHoles={selectedNetHoles}
              selectedNetColor={selectedNetColor}
              fixedHoles={fixedHoles}
              netIndex={netIndex}
            />

            <TraceLayer
              traces={tracesToRender}
              selection={selection}
              tool={tool}
              activeNetId={activeNetId}
              netIndex={netIndex}
              onDeleteTrace={onDeleteTrace}
              onSelectTrace={onSelectTrace}
              onStartTraceDrag={onStartTraceDrag}
              onStartTraceSegmentDrag={onStartTraceSegmentDrag}
              onStartTraceNodeDrag={onStartTraceNodeDrag}
            />

            <TraceDraftLayer traceDraft={traceDraft} hoverHole={hoverHole} tool={tool} />

            <PartLayer
              parts={partsToRender}
              ghostPart={ghostPart}
              selection={selection}
              tool={tool}
              board={board}
              fixedPartIds={fixedPartIds}
              onDeletePart={onDeletePart}
              onSelectPart={onSelectPart}
              onStartPartDrag={onStartPartDrag}
              onStartInline2Stretch={onStartInline2Stretch}
            />

            <NetLabelLayer
              labels={labelsToRender}
              labelDraftId={labelDraftId}
              selection={selection}
              tool={tool}
              netIndex={netIndex}
              onDeleteNetLabel={onDeleteNetLabel}
              onSelectNetLabel={onSelectNetLabel}
              onStartLabelDrag={onStartLabelDrag}
            />

            <ConnectDraftMarker hole={connectDraftHole} />

            <BoardHolesLayer holes={holes} hoverHole={hoverHole} selection={selection} />
          </g>
        </svg>
      </div>
    </div>
  );
}
