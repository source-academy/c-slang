/**
 * Utilty to help run tests.
 */

import {
  compile,
  compileWithLogStatements,
  compileToWat,
  compileToWatWithLogStatements,
} from "../build/index.js";
import * as fs from "fs";
import * as path from "path";
import testLog from "./testLog.js";

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMP_DIRECTORY = path.resolve(__dirname, "temp");
const getExpectedCodeFilePath = (subset, fileName) => {
  return path.resolve(
    __dirname,
    `samples/subset${subset.toString()}/valid/expected/${fileName}.wat`
  );
};

export const COMPILATION_SUCCESS = "success";

export async function compileFile({
  subset,
  testType,
  testFileName,
  logValues,
}) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${subset.toString()}/${
        testType === "assertCorrectness" ? "valid" : "error"
      }/${testFileName}.c`
    ),
    "utf-8"
  );

  const output = logValues
    ? await compileWithLogStatements(input)
    : await compile(input);
  return output;
}

export function compileAndSaveFileToWat({
  subset,
  testType,
  testFileName,
  logValues,
}) {
  const watFilePath = path.resolve(
    TEMP_DIRECTORY,
    `subset${subset.toString()}${
      logValues ? "/log-values/" : "/"
    }wat/${testFileName}.wat`
  );
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${subset.toString()}/${
        testType === "assertCorrectness" ? "valid" : "error"
      }/${testFileName}.c`
    ),
    "utf-8"
  );

  const output = logValues
    ? compileToWatWithLogStatements(input)
    : compileToWat(input);

  fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
  fs.writeFileSync(watFilePath, output);
  return output;
}

/**
 * Helper function to run a test defined by the given information.
 */
export async function testFileCompilationError(subset, testFileName) {
  await compileFile({ subset, testType: "assertError", testFileName });
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
        "utf-8"
      );
      if (expected === output) {
        return COMPILATION_SUCCESS;
      } else {
        return `WAT DOES NOT MATCH EXPECTED:\nexpected file: ${getExpectedCodeFilePath(
          subset,
          testFileName
        )}\nactual file: ${watFilePath}`;
      }
    } else {
      // Test 2: checks that the file is is compilable to WASM, with logging statements, and runs fine
      if (
        "expectedValues" in testLog[`subset${subset.toString()}`][testFileName]
      ) {
        try {
          // save the WAT in case needed for debugging
          compileAndSaveFileToWat({
            subset,
            testType: "assertCorrectness",
            testFileName,
            logValues: true,
          });
        } catch (e) {
          return "COMPILATION WITH LOG TO WAT ERROR:\n" + e;
        }

        try {
          // recompile file with the logging statements
          const wasmBinary = await compileFile({
            subset,
            testType: "assertCorrectness",
            testFileName,
            logValues: true,
          });

          const programVariableValues = [];
          function log(value) {
            programVariableValues.push(value);
          }
          try {
            // if there is a expectedValues for variables in the file, check that they are equal
            await WebAssembly.instantiate(wasmBinary, { console: { log } });
            const expectedValues =
              testLog[`subset${subset.toString()}`][
                testFileName
              ].expectedValues.toString();
            const actualValues = programVariableValues.toString();
            if (expectedValues !== actualValues) {
              return `VALUES OF VARIABLES DO NOT MATCH EXPECTED\nExpected values: ${expectedValues}\nActual values: ${actualValues}`;
            }
          } catch (e) {
            return "WASM EXECUTION ERROR:\n" + e;
          }
        } catch (e) {
          return "COMPILATION WITH LOG TO WASM ERROR:\n" + e;
        }
      } else {
        // if no expected values to match against, simply try running the file
        try {
          const wasmBinary = await compileFile({
            subset,
            testType: "assertCorrectness",
            testFileName,
          });
          await WebAssembly.instantiate(wasmBinary, {});
          try {
          } catch (e) {
            return "WASM EXECUTION ERROR:\n" + e;
          }
        } catch (e) {
          return "COMPILATION TO WASM ERROR:\n" + e;
        }
      }
    }
  } catch (e) {
    return "C COMPILATION ERROR:\n" + e;
  }

  return COMPILATION_SUCCESS;
}
