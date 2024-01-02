/**
 * This file contains all the error classes that can be thrown by the compiler.
 */

import { Position } from "~src/c-ast/types";

/**
 * An error that occured in relation to the C source code during compilation.
 * Contains positional information for debugging purposes.
 */
export class SourceCodeError extends Error {
  constructor(message: string, sourceCode?: string, position?: Position) {
    super();

    if (typeof sourceCode === "undefined" || typeof position === "undefined") {
      this.message = message;
      return;
    }

    this.message = `\n${message}\n${position.start.line} | `;
    let currLine = position.start.line;
    for (let i = position.start.offset; i < position.end.offset; ++i) {
      if (sourceCode[i] === "\n") {
        this.message += `\n${++currLine} | `;
      } else {
        this.message += sourceCode[i];
      }
    }
    this.message += "\n";
  }
}

export class ProcessingError extends SourceCodeError {
  constructor(message: string, sourceCode?: string, position?: Position) {
    super(`Processing Error: ${message}`, sourceCode, position);
  }
}

export class SemanticAnalysisError extends SourceCodeError {
  constructor(message: string, sourceCode?: string, position?: Position) {
    super(`Semantic Analysis Error: ${message}`, sourceCode, position);
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
    super("Unsupported Feature Error: " + message)
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
        obj[fieldName] = obj[fieldName].toString(); // stringify bigints first
      } else {
        recursionHelper(obj[fieldName]);
      }
    }
  }
  recursionHelper(obj);
  return JSON.stringify(obj);
}
