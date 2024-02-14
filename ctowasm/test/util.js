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
const getExpectedCodeFilePath = (subset, fileName) => {
  return path.resolve(
    __dirname,
    `samples/subset${subset.toString()}/valid/expected/${fileName}.wat`,
  );
};

export const COMPILATION_SUCCESS = "success";

export async function compileAndRunFile({
  subset,
  testType,
  testFileName,
  modulesConfig,
}) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${subset.toString()}/${
        testType === "assertCorrectness" ? "valid" : "error"
      }/${testFileName}.c`,
    ),
    "utf-8",
  );

  await compileAndRun(input, modulesConfig);
}

export function compileAndSaveFileToWat({ subset, testType, testFileName }) {
  const watFilePath = path.resolve(
    TEMP_DIRECTORY,
    `subset${subset.toString()}/wat/${testFileName}.wat`,
  );
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${subset.toString()}/${
        testType === "assertCorrectness" ? "valid" : "error"
      }/${testFileName}.c`,
    ),
    "utf-8",
  );

  const output = compileToWat(input);

  fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
  fs.writeFileSync(watFilePath, output);
  return output;
}

/**
 * Helper function to run a test defined by the given information.
 */
export async function testFileCompilationError(subset, testFileName) {
  await compileAndRunFile({ subset, testType: "assertError", testFileName });
}

export async function testFileCompilationSuccess(subset, testFileName) {
  // Test 1: checks that C program is compilable to WAT
  try {
    const output = compileAndSaveFileToWat({
      subset,
      testType: "assertCorrectness",
      testFileName,
    });

    // if there already exists a verified expected output for this file, simply check that the output WAT is the same as expected
    if (
      testLog[`subset${subset.toString()}`][testFileName].expectedCode === true
    ) {
      const expected = fs.readFileSync(
        getExpectedCodeFilePath(subset, testFileName),
        "utf-8",
      );
      if (expected === output) {
        return COMPILATION_SUCCESS;
      } else {
        return `WAT DOES NOT MATCH EXPECTED:\nexpected file: ${getExpectedCodeFilePath(
          subset,
          testFileName,
        )}\nactual file: ${path
          .resolve(
            TEMP_DIRECTORY,
            `subset${subset.toString()}/wat/${testFileName}.wat`,
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
            subset,
            testType: "assertCorrectness",
            testFileName,
            modulesConfig,
          });
          if (
            "customTest" in testLog[`subset${subset.toString()}`][testFileName]
          ) {
            // if a custom test has been defined for this test case, use that instead
            if (
              !testLog[`subset${subset.toString()}`][testFileName].customTest(
                programOutput,
              )
            ) {
              return `CUSTOM TEST FAILED. Actual values: ${programOutput.toString()}`;
            }
          } else {
            const actualValues = programOutput.toString();
            const expectedValues =
              "expectedValues" in
              testLog[`subset${subset.toString()}`][testFileName]
                ? testLog[`subset${subset.toString()}`][
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
