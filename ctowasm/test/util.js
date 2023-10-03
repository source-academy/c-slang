/**
 * Utilty to help run tests.
 */

import { compile } from "index.js";
import * as fs from "fs";
import * as path from "path";
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const WAT2WASM_PATH = path.resolve(
  __dirname + "/../external/wabt/build/wat2wasm"
);
const WASMINTERP_PATH = path.resolve(
  __dirname + "/../external/wabt/build/wasm-interp"
);
const TEMP_DIRECTORY = path.resolve(__dirname, "temp");
export const COMPILATION_SUCCESS = "success";

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilation(info) {
  const input = fs.readFileSync(
    path.resolve(
      __dirname,
      `samples/subset${info.subset.toString()}/${
        info.testType === "assertCorrectness" ? "valid" : "error"
      }/${info.testFileName}.c`
    ),
    "utf-8"
  );

  // geneerate the WAT, and place into temp file
  const output = compile(input);
  return output;
}

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilationError(subset, testFileName) {
  testFileCompilation({ subset, testType: "assertError", testFileName });
}

export async function testFileCompilationSuccess(subset, testFileName) {
  const watFilePath = path.resolve(TEMP_DIRECTORY, `subset${subset.toString()}/wat/${testFileName}.wat`)
  const wasmFilePath = path.resolve(TEMP_DIRECTORY, `subset${subset.toString()}/wasm/${testFileName}.wat`)
  // Test 1: chceks that C program is compilable
  try {
    const output = testFileCompilation({
      subset,
      testType: "assertCorrectness",
      testFileName,
    });
    fs.mkdirSync(path.dirname(watFilePath), { recursive: true });
    fs.writeFileSync(watFilePath, output);

    // Test 2: checks that the file is compilable from WAT to WASM - valid WAT
    try {
      fs.mkdirSync(path.dirname(wasmFilePath), { recursive: true });
      const { stdout, stderr } = await exec(
        `${WAT2WASM_PATH} ${watFilePath} -o ${wasmFilePath}`
      );
      
      // Test 3: checks that the translated WASM code is runnable without errors
      try {
        const { stdout, stderr } = await exec(
          `${WASMINTERP_PATH} ${wasmFilePath}`
        );
      } catch (e) {
        return "WASM EXECUTION ERROR:\n" + e;
      }
    } catch (e) {
      return "WAT2WASM ERROR:\n" + e;
    }
  } catch (e) {
    return "C COMPILATION ERROR:\n" + e;
  }

  return COMPILATION_SUCCESS;
}
