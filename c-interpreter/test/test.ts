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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findNode = (obj: any, pred: (n: any) => boolean): any => {
  if (obj === null || typeof obj !== "object") return undefined;
  if (typeof obj.type === "string" && pred(obj)) return obj;
  for (const key of Object.keys(obj)) {
    const found = findNode(obj[key], pred);
    if (found !== undefined) return found;
  }
  return undefined;
};

describe("postfix expression position tracking", () => {
  it("a chained subscript's inner sub-expression gets its own start/end/src, not the outer chain's", () => {
    const source = `int arr[2][5];\n\nint main() {\n  arr[1][2] = 99;\n  return 0;\n}\n`;
    const typed = cviz.typeCheck(cviz.parseProgram(source));

    const outer = findNode(
      typed,
      (n) => n.type === "PostfixExpression" && n.expr?.type === "PostfixExpression",
    );
    assert.exists(outer, "expected to find a chained (2-op) postfix expression");

    const inner = outer.expr;
    assert.equal(outer.src.trim(), "arr[1][2]");
    assert.equal(inner.src.trim(), "arr[1]");
    assert.isBelow(inner.end.offset, outer.end.offset);
    assert.equal(inner.start.offset, outer.start.offset);
  });
});
