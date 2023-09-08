import { describe, expect, test } from "@jest/globals";
import { testFileCompilationError } from "./util";

describe("Subset 1 Tests", () => {
  describe("Processor Semantic Error Tests", () => {
    test("Function redeclaration throws error", () => {
      expect(() => testFileCompilationError(1, "fn_redeclaration")).toThrow(
        "Redeclaration error"
      );
    });
    test("Variable redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "variable_redeclaration")
      ).toThrow("Redeclaration error");
    });
    test("Function parameter redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "fn_param_redeclaration")
      ).toThrow("Redeclaration of function parameter");
    });
    test("Use of undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var")).toThrow(
        "Undeclared variable"
      );
    });
    test("Call of undeclared function throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_fn")).toThrow(
        "Undeclared function"
      );
    });
  });
});
