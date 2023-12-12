import { jest } from "@jest/globals";
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

/**
 * Test all valid code for each subset.
 */
Object.keys(testLog).forEach((subset) => {
  const subsetNumber = subset.match(/\d+/)[0];
  describe(`Subset ${subsetNumber}`, () => {
    generateSuccessTests(parseInt(subsetNumber));
  });
});

describe("Processor Semantic Error Tests", () => {
  test("Function redeclaration throws error", async () => {
    await expect(
      testFileCompilationError(1, "fn_redeclaration"),
    ).rejects.toThrow("Redeclaration error");
  });
  test("Variable redeclaration throws error", async () => {
    await expect(
      testFileCompilationError(1, "variable_redeclaration"),
    ).rejects.toThrow("Redeclaration error");
  });
  test("Function parameter redeclaration throws error", async () => {
    await expect(() =>
      testFileCompilationError(1, "fn_param_redeclaration"),
    ).rejects.toThrow("Redeclaration error: function parameter");
  });
  test("Assignment to undeclared variable throws error", async () => {
    await expect(
      testFileCompilationError(1, "undeclared_var_assignment"),
    ).rejects.toThrow("Undeclared variable");
  });
  test("Calling undeclared function throws error", async () => {
    await expect(testFileCompilationError(1, "undeclared_fn")).rejects.toThrow(
      "Undeclared function",
    );
  });
  test("Usage of undeclared variable throws error", async () => {
    await expect(
      testFileCompilationError(1, "undeclared_var_usage"),
    ).rejects.toThrow("Undeclared variable");
  });
});
