/**
 * This file contains all the error classes that can be thrown by the compiler.
 */

import { Position } from "~src/parser/c-ast/misc";

function generateCompilationMessage(
  message: string,
  sourceCode: string,
  position: Position
) {
  let errorMessage = `${message}\n${position.start.line} | `;
  let currLine = position.start.line;
  for (let i = position.start.offset; i < position.end.offset; ++i) {
    if (sourceCode[i] === "\n") {
      errorMessage += `\n${++currLine} | `;
    } else {
      errorMessage += sourceCode[i];
    }
  }
  errorMessage += "\n";
  return errorMessage;
}

/**
 * Generates a compilation error message with positional information.
 * @param message
 * @param sourceCode
 * @param position
 * @returns
 */
function generateCompilationErrorMessage(
  message: string,
  sourceCode: string,
  position: Position
): string {
  return `Error: ${generateCompilationMessage(message, sourceCode, position)}`;
}

/**
 * Generates a compilation warning message with positional information.
 * @param message
 * @param sourceCode
 * @param position
 * @returns
 */
export function generateCompilationWarningMessage(
  message: string,
  sourceCode: string,
  position: Position
): string {
  return `Warning: ${generateCompilationMessage(
    message,
    sourceCode,
    position
  )}`;
}

/**
 * An error that occured in relation to the C source code during compilation.
 * Contains positional information for debugging purposes.
 */
export class SourceCodeError extends Error {
  position: Position | null;
  constructor(message: string, position?: Position) {
    super();
    this.message = message;
    this.position = position ?? null;
  }

  addPositionInfo(position: Position) {
    this.position = position;
  }

  /**
   * Add sourcecode and generate full error message with position info if available.
   * @param sourceCode preprocessed C program where comments are removed
   * @param position
   */
  generateCompilationErrorMessage(sourceCode: string): string {
    if (this.position !== null) {
      this.message = generateCompilationErrorMessage(
        this.message,
        sourceCode,
        this.position
      );
    } else {
      this.message = `Error: ${this.message}\n`;
    }
    return this.message;
  }
}

/**
 * Represents an error thrown by
 */
export class ParserCompilationErrors extends Error {
  constructor(
    sourceCode: string,
    errors: { message: string; position: Position }[]
  ) {
    super(
      errors
        .map((e) =>
          generateCompilationErrorMessage(e.message, sourceCode, e.position)
        )
        .join("\n")
    );
  }
}

export class ProcessingError extends SourceCodeError {
  constructor(message: string, position?: Position) {
    super(message, position);
  }
}

export class SemanticAnalysisError extends SourceCodeError {
  constructor(message: string, position?: Position) {
    super(message, position);
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
  const clone = structuredClone(obj)
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
  recursionHelper(clone);
  return JSON.stringify(clone, null, 2);
}
