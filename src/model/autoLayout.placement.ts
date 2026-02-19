import { getPartPins } from "./footprints";
import { holeKey, isWithinBoard } from "./hole";
import { ROTATIONS } from "./autoLayout.constants";
import { pinCenter } from "./autoLayout.common";
import type { Candidate } from "./autoLayout.types";
import type { Part, Placement, Project } from "./types";

export function placementsForPart(
  part: Part,
  board: Project["board"],
  fixedHoleSet: ReadonlySet<string>,
  allowRotate: boolean,
): readonly Candidate[] {
  const rotations = allowRotate ? ROTATIONS : [part.placement.rotation];
  const candidates: Candidate[] = [];
  const flip = part.placement.flip;

  for (const rotation of rotations) {
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const placement: Placement = { origin: { x, y }, rotation, flip };
        const nextPart: Part = { ...part, placement };
        const pins = getPartPins(nextPart).map((pin) => pin.hole);
        let valid = true;

        for (const hole of pins) {
          if (!isWithinBoard(board, hole)) {
            valid = false;
            break;
          }
          if (fixedHoleSet.has(holeKey(hole))) {
            valid = false;
            break;
          }
        }

        if (!valid) continue;
        const center = pinCenter(pins);
        candidates.push({ placement, pins, center });
      }
    }
  }

  return candidates;
}

export function isPlacementValid(
  board: Project["board"],
  fixedHoleSet: ReadonlySet<string>,
  part: Part,
  placement: Placement,
): boolean {
  const next = { ...part, placement };
  for (const pin of getPartPins(next)) {
    if (!isWithinBoard(board, pin.hole)) return false;
    if (fixedHoleSet.has(holeKey(pin.hole))) return false;
  }
  return true;
}
