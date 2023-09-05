/**
 * Utilty to help run tests.
 */

import { compile } from "index.js";
import * as fs from "fs";
import * as path from "path";

/*
export interface TestInformation {
  subset: number; // the C subset that is being tested
  testType: "assertCorrectness" | "assertError";
  testFileName: string;
}
* /

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

  compile(input);
  //TODO: add the checking of correctness later
}

/**
 * Helper function to run a test defined by the given information.
 */
export function testFileCompilationError(subset, testFileName) {
  testFileCompilation({ subset, testType: "assertError", testFileName });
}
