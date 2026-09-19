import { load } from "js-yaml";
import { readFileSync } from "fs";
import cviz from "../src/index";
import { assert } from "chai";
import { describe, it } from "mocha";
import "../src/types";

const TEST_FOLDER_PATH = "./test/";
// const TEST_OUTPUT_PATH = TEST_FOLDER_PATH + "out/";

interface TestCase {
  in?: string;
  out?: string;
  desc?: string;
  fail?: boolean;
}

interface TestSuite {
  file: string;
  desc?: string;
  cases: TestCase[];
}

interface TestList {
  [testName: string]: TestSuite;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const tests = load(
  readFileSync(TEST_FOLDER_PATH + "test.yaml", "utf-8"),
) as TestList;

const run = (source: string): number => {
  const rt = cviz.run(source)
  while (rt.exitCode === undefined) rt.next();
  return rt.exitCode;
}

for (const [testName, testSuite] of Object.entries(tests)) {
  describe(testName, () => {
    const source = readFileSync(TEST_FOLDER_PATH + testSuite.file, "utf-8");

    for (let i = 0; i < testSuite.cases.length; i++) {
      const testCase = testSuite.cases[i];
      const expectedOutput = testCase.out;
      const toFail = testCase.fail === true;
      let caseName = "Case " + i;
      if (testCase.desc) caseName += " (" + testCase.desc + ")";

      it(caseName, () => {
        if (toFail) {
          assert.throws(() => run(source), Error) 
        } else {
          const out = run(source);
          // writeFileSync(
          //   TEST_OUTPUT_PATH + testName + i + ".json",
          //   JSON.stringify(out),
          // );
          assert.equal(out.toString(), expectedOutput);
        }
      });
    }
  });
}
