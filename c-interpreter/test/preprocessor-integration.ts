import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { CSyntaxError } from "../src/errors";
import { TypeCheckingError } from "../src/typing/errors";

const execute = (source: string): { exitCode: number; stdout: string } => {
  const rt = cviz.run(source);
  while (rt.exitCode === undefined) rt.next();
  return { exitCode: rt.exitCode, stdout: rt.stdout };
};

describe("A7.6: preprocessor wiring and end-to-end verification", () => {
  it("preprocess() is its own standalone export, independent of actually running the program", () => {
    const { text } = cviz.preprocess("#define X 1\nX");
    assert.equal(text.replace(/\s+/g, " ").trim(), "1");
  });

  it("a header guard and a system include run end to end", () => {
    const source = [
      "#ifndef FOO_H",
      "#define FOO_H",
      "#include <stdio.h>",
      "int main() {",
      "  return 7;",
      "}",
      "#endif",
    ].join("\n");
    assert.equal(execute(source).exitCode, 7);
  });

  it("a non-trivial function-like macro, used in real code, runs end to end", () => {
    const source = [
      "#define MAX(a, b) ((a) > (b) ? (a) : (b))",
      "int main() {",
      "  int x = 3;",
      "  int y = 9;",
      "  return MAX(x, y);",
      "}",
    ].join("\n");
    assert.equal(execute(source).exitCode, 9);
  });

  it("a guarded include, an object-like macro, a function-like ## macro, and a #if block all combine", () => {
    const source = [
      "#ifndef GUARD_H",
      "#define GUARD_H",
      "#include <stdlib.h>",
      "#define BASE 10",
      "#define CONCAT(a, b) a##b",
      "#if BASE > 5",
      "int CONCAT(my, Value) = BASE;",
      "#else",
      "int CONCAT(my, Value) = 0;",
      "#endif",
      "int main() {",
      "  return myValue;",
      "}",
      "#endif",
    ].join("\n");
    assert.equal(execute(source).exitCode, 10);
  });

  it("the preprocessor's own text output is plausible and readable, not a single flattened line", () => {
    const source = [
      "#define GREETING \"hi\"",
      "int main() {",
      "  print(GREETING);",
      "  return 0;",
      "}",
    ].join("\n");
    const { text } = cviz.preprocess(source);
    assert.include(text, "int main");
    assert.include(text, '"hi"');
    assert.isAbove(text.split("\n").length, 1);
  });

  it("a syntax error after several consumed directive lines still reports its real original line", () => {
    const source = [
      "#define X 1", // line 1
      "#define Y 2", // line 2
      "int main( {", // line 3 - missing ')'
      "  return 0;",
      "}",
    ].join("\n");
    let caught: unknown;
    try {
      cviz.parseProgram(source);
    } catch (e) {
      caught = e;
    }
    assert.instanceOf(caught, CSyntaxError);
    assert.equal((caught as CSyntaxError).line, 3);
  });

  it("a type error reached through a macro argument reports the invocation line, not the #define line", () => {
    // IDENTITY(x) = x is a bare parameter substitution with no fixed macro-body
    // tokens wrapping it, so the offending expression's own start traces back to
    // the call-site argument token `p` directly - genuinely a line this student
    // would recognize, not a line inside the macro definition itself.
    const source = [
      "#define IDENTITY(x) x", // line 1
      "", // line 2
      "int main() {", // line 3
      '  char *p = "hi";', // line 4
      "  int y = IDENTITY(p) * 2;", // line 5 - pointer * int is a type error
      "  return 0;",
      "}",
    ].join("\n");
    let caught: unknown;
    try {
      cviz.run(source);
    } catch (e) {
      caught = e;
    }
    assert.instanceOf(caught, TypeCheckingError);
    assert.equal((caught as TypeCheckingError).line, 5);
  });

  it("the same type error, reached through a fixed (non-parameter) macro-body token, reports the #define line - a documented limitation, not the invocation site", () => {
    // SQUARE(x) wraps x in fixed punctuation ((x) * (x)) that's part of the macro's
    // own replacement list, not the call site - see weekly-log.md's A7.5 entry on
    // why subst() can't currently re-stamp a fixed token with the invocation's
    // position. Locked in here so a future change to that behavior is noticed.
    const source = [
      "#define SQUARE(x) \\", // line 1
      "  ((x) * \\", // line 2
      "   (x))", // line 3
      "",
      "int main() {", // line 5
      '  char *p = "hi";', // line 6
      "  int y = SQUARE(p);", // line 7
      "  return 0;",
      "}",
    ].join("\n");
    let caught: unknown;
    try {
      cviz.run(source);
    } catch (e) {
      caught = e;
    }
    assert.instanceOf(caught, TypeCheckingError);
    assert.equal((caught as TypeCheckingError).line, 2);
  });

  it("a program using no directives or macros gets back exactly its own source, offsets included", () => {
    // Load-bearing: c-viz-frontend's hover-to-highlight (ASTNode.tsx) indexes
    // directly into the student's own editor buffer using an AST node's
    // start/end.offset, assuming they're exact offsets into the same string passed
    // to run(). Since every program today uses no preprocessing at all, this must
    // keep holding exactly - preprocess() must never approximate/reconstruct text
    // that never actually needed any preprocessing.
    const source = "int main() {\n  int x = 1 + 2;\n  return x;\n}\n";
    assert.equal(cviz.preprocess(source).text, source);

    const ast = cviz.parseProgram(source);
    const fn = ast.value[0];
    assert(fn.type === "FunctionDefinition");
    assert.equal(source.slice(fn.start.offset, fn.end.offset), fn.src);
  });

  it("a program that does use a directive, by contrast, does not get back its source verbatim", () => {
    const source = "#define X 1\nint main() { return X; }\n";
    assert.notEqual(cviz.preprocess(source).text, source);
  });
});
