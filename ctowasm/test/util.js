/**
 * Utilty to help run tests.
 */

import { compile, testCompile } from "index.js";
import * as fs from "fs";
import * as path from "path";
const util = require("util");
const exec = util.promisify(require("child_process").exec);
import testLog from "./testLog.js";



const WAT2WASM_PATH = path.resolve(
  __dirname + "/../external/wabt/build/wat2wasm",
);
const WASMINTERP_PATH = path.resolve(
  __dirname + "/../external/wabt/build/wasm-interp",
);
const TEMP_DIRECTORY = path.resolve(__dirname, "temp");
const getExpectedCodeFilePath = (subset, fileName) => {
  return path.resolve(
    __dirname,
    `samples/subset${subset.toString()}/valid/expected/${fileName}.wat`,
  );
};

export const COMPILATION_SUCCESS = "success";

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilation(info, logValues) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${info.subset.toString()}/${
        info.testType === "assertCorrectness" ? "valid" : "error"
      }/${info.testFileName}.c`,
    ),
    "utf-8",
  );

  // geneerate the WAT, and place into temp file
  const output = logValues ? testCompile(input) : compile(input);
  return output;
}

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilationError(subset, testFileName) {
  testFileCompilation({ subset, testType: "assertError", testFileName });
}

export async function testFileCompilationSuccess(subset, testFileName) {
  const watFilePath = path.resolve(
    TEMP_DIRECTORY,
    `subset${subset.toString()}/wat/${testFileName}.wat`,
  );
  const wasmFilePath = path.resolve(
    TEMP_DIRECTORY,
    `subset${subset.toString()}/wasm/${testFileName}.wasm`,
  );
  // Test 1: chceks that C program is compilable
  try {
    const output = testFileCompilation({
      subset,
      testType: "assertCorrectness",
      testFileName,
    });
    fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
    fs.writeFileSync(watFilePath, output);

    // if there already exists a verified expected output for this file, simply check that the output WAT is the same as expected
    if (testLog[`subset${subset.toString()}`][testFileName].expectedCode === true) {
      const expected = fs.readFileSync(
        getExpectedCodeFilePath(subset, testFileName),
        "utf-8",
      );
      if (expected === output) {
        return COMPILATION_SUCCESS;
      } else {
        return `WAT DOES NOT MATCH EXPECTED:\nexpected file: ${getExpectedCodeFilePath(subset, testFileName)}\nactual file: ${watFilePath}`;
      }
    } else {
      // Test 2: checks that the file is compilable from WAT to WASM - i.e it is valid WAT
      try {
        fs.mkdirSync(path.dirname(wasmFilePath), { recursive: true });
        const { stdout, stderr } = await exec(
          `${WAT2WASM_PATH} ${watFilePath} -o ${wasmFilePath}`,
        );

        if ("expectedValues" in testLog[`subset${subset.toString()}`][testFileName]) {
          try {
            // if there is a expectedValues for variables in the file, check that they are equal
            const watFilePath = path.resolve(
              TEMP_DIRECTORY,
              `subset${subset.toString()}/log-values/wat/${testFileName}.wat`,
            );
            const wasmFilePath = path.resolve(
              TEMP_DIRECTORY,
              `subset${subset.toString()}/log-values/wasm/${testFileName}.wasm`,
            );
            // recompile file with the logging statements
            const output = testFileCompilation({
              subset,
              testType: "assertCorrectness",
              testFileName,
            }, true);
            //save recompiled wat
            fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
            fs.writeFileSync(watFilePath, output);

            // compile the recompiled WAT to WASM, save the wasm files
            fs.mkdirSync(path.dirname(wasmFilePath), { recursive: true });
            const { stdout, stderr } = await exec(
              `${WAT2WASM_PATH} ${watFilePath} -o ${wasmFilePath}`,
            );

            const programVariableValues = []
            function log(value) {
              programVariableValues.push(value)
            }
            const wasmBuffer = fs.readFileSync(wasmFilePath);
            await WebAssembly.instantiate(wasmBuffer, { console: { log } })
            const expectedValues = testLog[`subset${subset.toString()}`][testFileName].expectedValues.toString()
            const actualValues = programVariableValues.toString()
            if (expectedValues !== actualValues) {
              return `VALUES OF VARIABLES DO NOT MATCH EXPECTED\nExpected values: ${expectedValues}\nActual values: ${actualValues}`;
            }

          // Test 3: checks that the translated WASM code is runnable without errors
          } catch (e) {
            return "WASM EXECUTION ERROR:\n" + e;
          }
        } else {
          // if no expected values to match against, simply try running
          try {
            const { stdout, stderr } = await exec(
              `${WAT2WASM_PATH} ${watFilePath} -o ${wasmFilePath}`,
            );
          } catch (e) {
            return "WASM EXECUTION ERROR:\n" + e; 
          }
  }
} catch (e) {
  return "WAT2WASM ERROR:\n" + e;
}
    }

    
  } catch (e) {
    return "C COMPILATION ERROR:\n" + e;
  }

  return COMPILATION_SUCCESS;
}
