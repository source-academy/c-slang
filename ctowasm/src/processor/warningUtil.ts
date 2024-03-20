import { Position } from "~src/parser/c-ast/misc";

export interface Warning {
  message: string,
  position: Position
}

export const warnings: Warning[] = [];

export function addWarning(message: string, position: Position) {
  warnings.push({message, position});
}
