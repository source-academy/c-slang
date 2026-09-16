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
function generateSuccessTests(testGroup) {
  describe("Compilation Success Tests", () => {
    for (const [testFile, testDetails] of Object.entries(testLog[testGroup])) {
      test(testDetails.title, async () => {
        const result = await testFileCompilationSuccess(testGroup, testFile);
        expect(result).toBe(COMPILATION_SUCCESS);
      });
    }
  });
}

describe("Compilation Error Tests", () => {
  for (const [testFile, testDetails] of Object.entries(testLog["error"])) {
    test(testDetails.title, async () => {
      expect(
        testFileCompilationError(testFile, testDetails.expectedErrorMessages),
      ).toBe(COMPILATION_FAILURE_TEST_SUCCESS);
    });
  }
});

/**
 * Test all valid code.
 */
Object.keys(testLog)
  .filter((s) => s !== "error") // ignore error test group
  .forEach((testGroup) => {
    describe(testGroup, () => {
      generateSuccessTests(testGroup);
    });
  });
