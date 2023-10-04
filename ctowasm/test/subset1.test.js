import { describe, expect, test } from "@jest/globals";
import {
  COMPILATION_SUCCESS,
  testFileCompilationError,
  testFileCompilationSuccess,
} from "./util";
import testLog from "./testLog";

/**
 * Generates the test cases to test successful compilation using subset thats being tested and the testLog object.
 */
function generateSuccessTests(subset) {
  describe("Compilation Success Tests", () => {
    for (const [testFile, testDetails] of Object.entries(
      testLog[`subset${subset}`],
    )) {
      test(testDetails.title, async () => {
        const result = await testFileCompilationSuccess(subset, testFile);
        expect(result).toBe(COMPILATION_SUCCESS);
      });
    }
  });
}

describe("Subset 1 Tests", () => {
  generateSuccessTests(1);

  describe("Processor Semantic Error Tests", () => {
    test("Function redeclaration throws error", () => {
      expect(() => testFileCompilationError(1, "fn_redeclaration")).toThrow(
        "Redeclaration error",
      );
    });
    test("Variable redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "variable_redeclaration"),
      ).toThrow("Redeclaration error");
    });
    test("Function parameter redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "fn_param_redeclaration"),
      ).toThrow("Redeclaration of function parameter");
    });
    test("Assignment to undeclared variable throws error", () => {
      expect(() =>
        testFileCompilationError(1, "undeclared_var_assignment"),
      ).toThrow("Undeclared variable");
    });
    test("Calling undeclared function throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_fn")).toThrow(
        "Undeclared function",
      );
    });
    test("Usage of undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var_usage")).toThrow(
        "Undeclared variable",
      );
    });
  });
});

describe("Subset 2 Tests", () => {
  generateSuccessTests(2);
});
