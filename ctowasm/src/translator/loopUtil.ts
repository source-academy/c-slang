export interface EnclosingLoopDetails {
  currLoopNumber: number; // loop label of the enclosing loop. branch to this label to restart loop. (continue / restart loop after condition still true)
  currBlockNumber: number; // block label of the enclosing loop. branch to this label to end the loop. (break)
}

export function createEnclosingLoopDetails(
  prv?: EnclosingLoopDetails,
): EnclosingLoopDetails {
  if (typeof prv !== "undefined") {
    return {
      currLoopNumber: prv.currLoopNumber + 1,
      currBlockNumber: prv.currBlockNumber + 1
    };
  } else {
    return {
      currLoopNumber: 0,
      currBlockNumber: 0,
    };
  }
}

/**
 * Used for generating unique names for block labels. This is needed for jumping to them in wasm.
 */

export function generateLoopLabel(
  enclosingLoopDetails: EnclosingLoopDetails | undefined,
) {
  return `loop${
    enclosingLoopDetails ? enclosingLoopDetails.currLoopNumber : 0
  }`;
}
/**
 * Used for generating unique names for loop labels. This is needed for jumping to them in wasm.
 */

export function generateBlockLabel(
  enclosingLoopDetails?: EnclosingLoopDetails | undefined,
) {
  return `block${
    enclosingLoopDetails ? enclosingLoopDetails.currBlockNumber : 0
  }`;
}
