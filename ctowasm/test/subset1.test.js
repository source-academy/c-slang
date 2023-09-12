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
    test("Assignment to undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var_assignment")).toThrow(
        "Undeclared variable"
      );
    });
    test("Calling undeclared function throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_fn")).toThrow(
        "Undeclared function"
      );
    });
    test("Usage of undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var_usage")).toThrow(
        "Undeclared variable"
      );
    });
  });
});
