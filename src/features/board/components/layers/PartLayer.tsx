import type { PointerEvent as ReactPointerEvent } from "react";
import type { Selection, Tool } from "../../../../app/store";
import { getPartPins, isWithinBoard, type Board, type Part } from "../../../../model";
import { buildSchematicSymbol } from "../../../render/schematicSymbols";
import { holeCenterPx } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

type PartLayerProps = Readonly<{
  parts: readonly Part[];
  ghostPart: Part | null;
  selection: Selection;
  tool: Tool;
  board: Board;
  fixedPartIds: ReadonlySet<string>;
  onDeletePart: (id: string) => void;
  onSelectPart: (id: string) => void;
  onStartPartDrag: (part: Part, event: ReactPointerEvent<SVGGElement>) => void;
  onStartInline2Stretch: (
    part: Part,
    movingPinId: "1" | "2",
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
}>;

export function PartLayer({
  parts,
  ghostPart,
  selection,
  tool,
  board,
  fixedPartIds,
  onDeletePart,
  onSelectPart,
  onStartPartDrag,
  onStartInline2Stretch,
}: PartLayerProps) {
  function validatePart(part: Part): boolean {
    for (const pin of getPartPins(part)) {
      if (!isWithinBoard(board, pin.hole)) return false;
    }
    return true;
  }

  function renderPart(part: Part, ghost: boolean) {
    const selected = selection.type === "part" && selection.id === part.id;
    const canHit = !ghost && (tool.type === "select" || tool.type === "erase");
    const locked = fixedPartIds.has(part.id);

    const pins = getPartPins(part);
    const pinGeometries = pins.map((pin) => ({
      pinId: pin.pinId,
      pinLabel: pin.pinLabel,
      center: holeCenterPx(pin.hole),
    }));
    const valid = validatePart(part);

    const bodyClass = selected
      ? styles.partBodySelected
      : valid
        ? styles.partBody
        : styles.partBodyInvalid;
    const symbol = buildSchematicSymbol(part, pinGeometries);
    const fallbackLabelX =
      pinGeometries.reduce((sum, pin) => sum + pin.center.x, 0) / Math.max(1, pinGeometries.length);
    const fallbackLabelY =
      pinGeometries.reduce((sum, pin) => sum + pin.center.y, 0) /
        Math.max(1, pinGeometries.length) -
      10;
    const labelAnchor = symbol.refAnchor ?? { x: fallbackLabelX, y: fallbackLabelY };
    const partValue = part.value?.trim();
    const isDip = part.footprint.type === "dip";
    const refLabelY = isDip && partValue ? labelAnchor.y - 5 : labelAnchor.y;
    const valueLabelY = isDip ? labelAnchor.y + 5 : labelAnchor.y + 10;
    const lockPos = { x: labelAnchor.x + 10, y: labelAnchor.y - 10 };

    return (
      <g
        key={part.id}
        opacity={ghost ? 0.55 : 1}
        pointerEvents={canHit ? "all" : "none"}
        onPointerDown={(event) => {
          if (!canHit || event.button !== 0) return;
          event.stopPropagation();
          if (tool.type === "erase") {
            onDeletePart(part.id);
            return;
          }
          onSelectPart(part.id);
          onStartPartDrag(part, event);
        }}
      >
        {symbol.primitives.map((primitive, idx) => {
          const className = primitive.role === "pin1" ? styles.partPin1Marker : bodyClass;
          switch (primitive.type) {
            case "line":
              return (
                <line
                  key={`prim-${idx}`}
                  x1={primitive.x1}
                  y1={primitive.y1}
                  x2={primitive.x2}
                  y2={primitive.y2}
                  className={className}
                />
              );
            case "rect":
              return (
                <rect
                  key={`prim-${idx}`}
                  x={primitive.x}
                  y={primitive.y}
                  width={primitive.width}
                  height={primitive.height}
                  rx={primitive.rx ?? 0}
                  className={className}
                />
              );
            case "circle":
              return (
                <circle
                  key={`prim-${idx}`}
                  cx={primitive.cx}
                  cy={primitive.cy}
                  r={primitive.r}
                  className={className}
                />
              );
            case "polyline":
              return (
                <polyline
                  key={`prim-${idx}`}
                  points={primitive.points}
                  className={className}
                  style={{ fill: "none" }}
                />
              );
            case "polygon":
              return (
                <polygon key={`prim-${idx}`} points={primitive.points} className={className} />
              );
          }
        })}

        <text x={labelAnchor.x} y={refLabelY} textAnchor="middle" className={styles.partLabel}>
          {part.ref}
        </text>
        {partValue ? (
          <text
            x={labelAnchor.x}
            y={valueLabelY}
            textAnchor="middle"
            className={styles.partValueLabel}
          >
            {partValue}
          </text>
        ) : null}
        {locked ? (
          <circle cx={lockPos.x} cy={lockPos.y} r={3.5} className={styles.partLockMarker} />
        ) : null}
        {symbol.texts.map((text, idx) => (
          <text
            key={`pt-${idx}`}
            x={text.x}
            y={text.y}
            textAnchor={text.textAnchor}
            className={styles.partPinLabel}
            pointerEvents="none"
          >
            {text.text}
          </text>
        ))}
        {pins.map((pin) => {
          const center = holeCenterPx(pin.hole);
          return (
            <circle
              key={pin.pinId}
              cx={center.x}
              cy={center.y}
              r={3}
              className={styles.partPin}
              pointerEvents="none"
            />
          );
        })}
        {!ghost &&
        (part.footprint.type === "inline2" || part.footprint.type === "free2") &&
        tool.type === "select"
          ? (() => {
              const pin1 = pins.find((pin) => pin.pinId === "1") ?? pins[0];
              const pin2 = pins.find((pin) => pin.pinId === "2") ?? pins[1];
              if (!pin1 || !pin2) return null;
              const c1 = holeCenterPx(pin1.hole);
              const c2 = holeCenterPx(pin2.hole);
              return (
                <>
                  <circle
                    cx={c1.x}
                    cy={c1.y}
                    r={6}
                    className={styles.partPinHandle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartInline2Stretch(part, "1", event);
                    }}
                  />
                  <circle
                    cx={c2.x}
                    cy={c2.y}
                    r={6}
                    className={styles.partPinHandle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartInline2Stretch(part, "2", event);
                    }}
                  />
                </>
              );
            })()
          : null}
      </g>
    );
  }

  return (
    <>
      {parts.map((part) => renderPart(part, false))}
      {ghostPart ? renderPart(ghostPart, true) : null}
    </>
  );
}
