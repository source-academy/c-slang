import { load } from "js-yaml";
import { readFileSync } from "fs";
import cviz from "../src/index";
import { assert } from "chai";
import { describe, it } from "mocha";
import "../src/types";
import "./const";
import "./union";
import "./floating-representation";
import "./floating-literals";
import "./floating-arithmetic";
import "./floating-conversions";
import "./floating-updates";

const TEST_FOLDER_PATH = "./test/";
// const TEST_OUTPUT_PATH = TEST_FOLDER_PATH + "out/";

interface TestCase {
  in?: string;
  out?: string;
  stdout?: string;
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

const execute = (source: string): { exitCode: number; stdout: string } => {
  const rt = cviz.run(source)
  while (rt.exitCode === undefined) rt.next();
  return { exitCode: rt.exitCode, stdout: rt.stdout };
}

const run = (source: string): number => execute(source).exitCode;

const runForStdout = (source: string): string => execute(source).stdout;

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
          const result = execute(source);
          // writeFileSync(
          //   TEST_OUTPUT_PATH + testName + i + ".json",
          //   JSON.stringify(out),
          // );
          assert.equal(result.exitCode.toString(), expectedOutput);
          if (testCase.stdout !== undefined)
            assert.equal(result.stdout, testCase.stdout);
        }
      });
    }
  });
}

describe("incomplete array rejection reasons", () => {
  for (const [source, reason] of [
    ["int main() { int a[]; return 0; }", /array size missing/],
    [
      "int main() { int a[2][] = {{1}, {2}}; return 0; }",
      /cannot construct array from incomplete type/,
    ],
    [
      "int main() { return sizeof(int []); }",
      /sizeof operator requires complete object type/,
    ],
    [
      "int main() { int a[] = 7; return 0; }",
      /array initializer requires a brace-enclosed list or string literal/,
    ],
  ] as const) {
    it(source, () => assert.throws(() => run(source), reason));
  }
});

describe("enum rejection reasons", () => {
  for (const [file, reason] of [
    ["enum-duplicate.c", /redeclaration of identifier FIRST/],
    ["enum-tag-collision.c", /tag Shared/],
    ["enum-out-of-range.c", /enumerator .*out of int range/],
    ["enum-not-modifiable.c", /require a modifiable lvalue/],
  ] as const) {
    it(file, () => {
      const source = readFileSync(TEST_FOLDER_PATH + file, "utf-8");
      assert.throws(() => run(source), reason);
    });
  }
});

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

describe("print renders a char* as its string content, not its address", () => {
  it("a string literal argument", () => {
    assert.equal(
      runForStdout(`int main() { print("hi"); return 0; }`),
      '"hi"\n',
    );
  });

  it("a char* variable holding the same literal", () => {
    assert.equal(
      runForStdout(`int main() { char *p = "hi"; print(p); return 0; }`),
      '"hi"\n',
    );
  });

  it("a NULL char* still prints NULL, not an empty string or a crash", () => {
    assert.equal(
      runForStdout(`int main() { char *p = 0; print(p); return 0; }`),
      "NULL\n",
    );
  });

  it("a non-char pointer still prints its address, unaffected by this fix", () => {
    const out = runForStdout(
      `int main() { int x = 5; int *p = &x; print(p); return 0; }`,
    );
    assert.match(out, /^0x[0-9A-F]+\n$/);
  });

  it("byte content, not source text, is what gets walked - an escape sequence renders as its actual character", () => {
    assert.equal(
      runForStdout(`int main() { print("a\\nb"); return 0; }`),
      '"a\\nb"\n',
    );
  });
});
