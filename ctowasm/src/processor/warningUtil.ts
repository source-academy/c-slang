import { Position } from "~src/parser/c-ast/misc";

export interface Warning {
  message: string,
  position: Position
}

export let warnings: Warning[] = [];

export function clearWarnings() {
  warnings = [];
}

export function addWarning(message: string, position: Position) {
  warnings.push({message, position});
}
