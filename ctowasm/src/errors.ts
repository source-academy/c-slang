/**
 * This file contains all the error classes that can be thrown by the compiler.
 */

import { Position } from "~src/parser/c-ast/misc";

/**
 * An error that occured in relation to the C source code during compilation.
 * Contains positional information for debugging purposes.
 */
export class SourceCodeError extends Error {
  position: Position | undefined;
  constructor(message: string, position?: Position) {
    super();
    this.message = message;
    this.position = position;
  }

  addPositionInfo(position: Position) {
    this.position = position;
  }

  /**
   * Add sourcecode and generate full error message with position info if available.
   * @param sourceCode
   * @param position
   */
  generateFullErrorMessage(sourceCode: string) {
    if (typeof this.position !== "undefined") {
      this.message = `\n${this.message}\n${this.position.start.line} | `;
      let currLine = this.position.start.line;
      for (
        let i = this.position.start.offset;
        i < this.position.end.offset;
        ++i
      ) {
        if (sourceCode[i] === "\n") {
          this.message += `\n${++currLine} | `;
        } else {
          this.message += sourceCode[i];
        }
      }
      this.message += "\n";
    }
  }
}

export class ProcessingError extends SourceCodeError {
  constructor(message: string, position?: Position) {
    super(`Processing Error: ${message}`, position);
  }
}

export class SemanticAnalysisError extends SourceCodeError {
  constructor(message: string, position?: Position) {
    super(`Semantic Analysis Error: ${message}`, position);
  }
}

export class TranslationError extends Error {
  constructor(message: string) {
    super("Translation Error: " + message);
  }
}

export class WatGeneratorError extends Error {
  constructor(message: string) {
    super("WAT Generator Error: " + message);
  }
}

/**
 * Helper error to indicate features not yet supported by the compiler.
 */
export class UnsupportedFeatureError extends Error {
  constructor(message: string) {
    super("Unsupported Feature Error: " + message);
  }
}

/**
 * Convert aribtrary object to json string. Needed to support bigints.
 */
export function toJson(obj: any) {
  function recursionHelper(obj: any) {
    if ((typeof obj !== "object" && !Array.isArray(obj)) || obj === null) {
      return;
    }
    for (const fieldName of Object.keys(obj)) {
      if (typeof obj[fieldName] === "bigint") {
        obj[fieldName] = obj[fieldName].toString() + "n"; // stringify bigints first
      } else {
        recursionHelper(obj[fieldName]);
      }
    }
  }
  recursionHelper(obj);
  return JSON.stringify(obj, null, 2);
}
