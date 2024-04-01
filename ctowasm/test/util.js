/**
 * Utilty to help run tests.
 */

import { compileToWat, compileAndRun } from "../dist/index.js";
import * as fs from "fs";
import * as path from "path";
import testLog from "./testLog.js";

import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMP_DIRECTORY = path.resolve(__dirname, "temp");
const getExpectedCodeFilePath = (testGroup, fileName) => {
  return path.resolve(
    __dirname,
    `samples/${testGroup}/valid/expected/${fileName}.wat`,
  );
};

export const COMPILATION_SUCCESS = "success";

export async function compileAndRunFile({
  testGroup,
  testFileName,
  modulesConfig,
}) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/${testGroup}/${testFileName}.c`,
    ),
    "utf-8",
  );
  
  await compileAndRun(input, modulesConfig);
}

class CompilationFailure extends Error {
  constructor(message) {
    super(message);
  }
}

export function compileAndSaveFileToWat({ testGroup, testFileName }) {
  const watFilePath = path.resolve(
    TEMP_DIRECTORY,
    `${testGroup}/wat/${testFileName}.wat`,
  );
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/${testGroup}/${testFileName}.c`,
    ),
    "utf-8",
  );

  const { watOutput, status, warnings, errorMessage } = compileToWat(input);
  if (status === "failure") {
    throw new CompilationFailure(`Compilation failed due to following errors:\n${errorMessage}`);
  }
  if (warnings.length > 0) {
    console.log(`${testFileName}: Compilation succeeded with warnings:\n${warnings.join("\n")}`)
  }
  fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
  fs.writeFileSync(watFilePath, watOutput);
  return watOutput;
}

export const COMPILATION_FAILURE_TEST_SUCCESS = true;

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilationError(testFileName, expectedMessages) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/error/${testFileName}.c`,
    ),
    "utf-8",
  );
  const { status, errorMessage } = compileToWat(input);
  if (status !== "failure") {
    throw new Error("Test compilation error failed: No compilation error occured.")
  }
  return checkErrorMessages(errorMessage, expectedMessages);
}

/**
 * Checks that the actual error message given by compilation error contain only the expected messages given.
 * Each expected error message is assumed to be unique.
 */
export function checkErrorMessages(actual, expectedMsgs) {
  const errorMsgRegex = /Error:.*\n/g;
  const actualErrors = [...actual.match(errorMsgRegex)].map(s => s.trim());
  const extraErrors = [];
  const missingErrors = [];

  const actualErrorSet = new Set(actualErrors);
  for (const expectedMsg of expectedMsgs) {
    if (!actualErrorSet.has(expectedMsg)) {
      missingErrors.push(expectedMsg);
    }
  }

  const expectedErrorSet = new Set(expectedMsgs);
  for (const actualMsg of actualErrors) {
    if (!expectedErrorSet.has(actualMsg)) {
      extraErrors.push(actualMsg);
    }
  }
  
  if (extraErrors.length > 0 || missingErrors.length > 0) {
    return {
      extraErrors: extraErrors,
      missingErrors: missingErrors
    }
  }
  
  return COMPILATION_FAILURE_TEST_SUCCESS;
}

export async function testFileCompilationSuccess(testGroup, testFileName) {
  // Test 1: checks that C program is compilable to WAT
  try {
    const output = compileAndSaveFileToWat({
      testGroup,
      testFileName,
    });

    // if there already exists a verified expected output for this file, simply check that the output WAT is the same as expected
    if (
      testLog[testGroup][testFileName].expectedCode === true
    ) {
      const expected = fs.readFileSync(
        getExpectedCodeFilePath(testGroup, testFileName),
        "utf-8",
      );
      if (expected === output) {
        return COMPILATION_SUCCESS;
      } else {
        return `WAT DOES NOT MATCH EXPECTED:\nexpected file: ${getExpectedCodeFilePath(
          testGroup,
          testFileName,
        )}\nactual file: ${path
          .resolve(
            TEMP_DIRECTORY,
            `${testGroup}/wat/${testFileName}.wat`,
          )
          .toString()}`;
      }
    } else {
      // Test 2: checks that the file is runnable, and outputs the correct values
      try {
        const programOutput = [];
        // configuration for the modules
        const modulesConfig = {
          printFunction: (str) => programOutput.push(str), // custom print function, add to the programOutput instead of print to console
        };
        try {
          // if there is a expectedValues for variables in the file, check that they are equal
          await compileAndRunFile({
            testGroup,
            testFileName,
            modulesConfig,
          });
          if (
            "customTest" in testLog[testGroup][testFileName]
          ) {
            // if a custom test has been defined for this test case, use that instead
            if (
              !testLog[testGroup][testFileName].customTest(
                programOutput,
              )
            ) {
              return `CUSTOM TEST FAILED. Actual values: ${programOutput.toString()}`;
            }
          } else {
            const actualValues = programOutput.toString();
            const expectedValues =
              "expectedValues" in
              testLog[testGroup][testFileName]
                ? testLog[testGroup][
                    testFileName
                  ].expectedValues.toString()
                : [].toString();

            if (expectedValues !== actualValues) {
              return `VALUES OF VARIABLES DO NOT MATCH EXPECTED\nExpected values: ${expectedValues}\nActual values: ${actualValues}`;
            }
          }
        } catch (e) {
          return "WASM EXECUTION ERROR:\n" + e;
        }
      } catch (e) {
        return "COMPILATION TO WASM ERROR:\n" + e;
      }
    }
  } catch (e) {
    return "C COMPILATION ERROR:\n" + e;
  }

  return COMPILATION_SUCCESS;
}
