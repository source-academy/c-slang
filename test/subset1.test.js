import { describe, expect, test } from "@jest/globals";
import { ProcessingError } from ""
import { testFileCompilationError } from "./util";

describe("Subset 1 Tests", () => {
  test("Function redeclaration throws error", () => {
    expect(() => testFileCompilationError(1, "function_redeclaration")).toThrow(
      'Redeclaration error'
    );
  });
  test("Variable redeclaration throws error", () => {
    expect(() => testFileCompilationError(1, "variable_redeclaration")).toThrow(
      'Redeclaration error'
    );
  });
  test("Function parameter redeclaration throws error", () => {
    expect(() => testFileCompilationError(1, "fn_param_redeclaration")).toThrow(
      'Redeclaration of function parameter'
    );
  });
});
