/**
 * This file contains all the error classes that can be thrown by the compiler.
 */

import { Position } from "~/src/c-ast/c-nodes";

/**
 * An error that occured in relation to the C source code during compilation.
 * Contains positional information for debugging purposes.
 */
export class SourceCodeError extends Error {
  constructor(message: string, sourceCode: string, position: Position) {
    super();
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
  constructor(message: string, sourceCode: string, position: Position) {
    super(message, sourceCode, position);
  }
}

export class TranslationError extends Error {
  constructor(message: string) {
    super("TRANSLATION ERROR\n" + message);
  }
}
