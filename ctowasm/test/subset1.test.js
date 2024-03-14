import {
  COMPILATION_FAILURE_TEST_SUCCESS,
  COMPILATION_SUCCESS,
  testFileCompilationError,
  testFileCompilationSuccess,
} from "./util";
import testLog from "./testLog";

function checkSubstrsPresent(errorMessage, substrings) {
  for (const str of substrings) {
    if (!errorMessage.includes(str)) {
      return false;
    }
  }
  return true;
}

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

describe("Compilation Error Tests", () => {
  for (const [testFile, testDetails] of Object.entries(
    testLog["error"],
  )) {
    test(testDetails.title, async () => {
      expect(testFileCompilationError(testFile, testDetails.expectedErrorMessages)).toBe(COMPILATION_FAILURE_TEST_SUCCESS);
    });
  }
});

/**
 * Test all valid code for each subset.
 */
Object.keys(testLog).filter(s => s.includes("subset")).forEach((subset) => {
  const subsetNumber = subset.match(/\d+/)[0];
  describe(`Subset ${subsetNumber}`, () => {
    generateSuccessTests(parseInt(subsetNumber));
  });
});

// describe("Processor Semantic Error Tests", () => {
//   test("Function redeclaration throws error", async () => {
//     await expect(
//       testFileCompilationError(1, "fn_redeclaration"),
//     ).rejects.toThrow("Redeclaration error");
//   });
//   test("Variable redeclaration throws error", async () => {
//     await expect(
//       testFileCompilationError(1, "variable_redeclaration"),
//     ).rejects.toThrow("Redeclaration error");
//   });
//   test("Function parameter redeclaration throws error", async () => {
//     await expect(() =>
//       testFileCompilationError(1, "fn_param_redeclaration"),
//     ).rejects.toThrow("Redeclaration error: function parameter");
//   });
//   test("Assignment to undeclared variable throws error", async () => {
//     await expect(
//       testFileCompilationError(1, "undeclared_var_assignment"),
//     ).rejects.toThrow("Undeclared variable");
//   });
//   test("Calling undeclared function throws error", async () => {
//     await expect(testFileCompilationError(1, "undeclared_fn")).rejects.toThrow(
//       "Undeclared function",
//     );
//   });
//   test("Usage of undeclared variable throws error", async () => {
//     await expect(
//       testFileCompilationError(1, "undeclared_var_usage"),
//     ).rejects.toThrow("Undeclared variable");
//   });
// });
