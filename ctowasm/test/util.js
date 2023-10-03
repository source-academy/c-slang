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
const TEMP_WAT_DIRECTORY = path.resolve(__dirname, "temp/wat");
const TEMP_WASM_DIRECTORY = path.resolve(__dirname, "temp/wasm");
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
  // Test 1: chceks that C program is compilable
  try {
    const output = testFileCompilation({
      subset,
      testType: "assertCorrectness",
      testFileName,
    });
    const outputFilePath = path.resolve(TEMP_WAT_DIRECTORY, testFileName + ".wat");
    fs.mkdirSync(TEMP_WAT_DIRECTORY, { recursive: true });
    fs.writeFileSync(outputFilePath, output);

    // Test 2: checks that the file is compilable from WAT to WASM - valid WAT
    try {
      const { stdout, stderr } = await exec(
        `${WAT2WASM_PATH} ${path.resolve(TEMP_WAT_DIRECTORY, testFileName + ".wat")} -o ${path.resolve(TEMP_WASM_DIRECTORY, testFileName + ".wasm")}`
      );
      
      fs.mkdirSync(TEMP_WASM_DIRECTORY, { recursive: true });
      // Test 3: checks that the translated WASM code is runnable without errors
      try {
        const { stdout, stderr } = await exec(
          `${WASMINTERP_PATH} ${path.resolve(TEMP_WASM_DIRECTORY, testFileName + ".wasm")}`
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
