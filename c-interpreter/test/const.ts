import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { TypeCheckingError } from "../src/typing/errors";

const run = (source: string): number => {
  const rt = cviz.run(source);
  while (rt.exitCode === undefined) rt.next();
  return rt.exitCode;
};

describe("const write rejection", () => {
  const bodies = [
    "const int x = 1; x = 2;",
    "const int x = 1; x += 2;",
    "const int x = 1; ++x;",
    "const int x = 1; x--;",
    "int x = 1; const int *p = &x; *p = 2;",
    "int x = 1; int * const p = &x; p = &x;",
    "const int a[] = {1, 2}; a[1] = 3;",
    "struct S { int x; }; const struct S s = {1}; s.x = 2;",
    "struct S { int x; }; struct S s = {1}; const struct S *p = &s; p->x = 2;",
    "struct S { int a[2]; }; const struct S s = {{1, 2}}; s.a[1] = 3;",
    "struct S { const int x; int y; }; struct S a = {1, 2}, b = {3, 4}; a = b;",
  ];
  for (const body of bodies)
    it(body, () =>
      assert.throws(
        () => run(`int main() { ${body} return 0; }`),
        /modifiable lvalue/,
      ),
    );

  it("const parameter", () => {
    assert.throws(
      () =>
        run(
          "int f(const int n) { n++; return n; } int main() { return f(1); }",
        ),
      /modifiable lvalue/,
    );
  });
});

describe("const conversion rejection", () => {
  for (const [name, source, reason] of [
    [
      "initializer",
      "int main() { const int x = 1; int *p = &x; return 0; }",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "assignment",
      "int main() { const int x = 1; int *p; p = &x; return 0; }",
      /assignment/,
    ],
    [
      "argument",
      "void f(int *p) {} int main() { const int x = 1; f(&x); return 0; }",
      /mismatch in argument type/,
    ],
    [
      "return",
      "const int x = 1; int *f() { return &x; } int main() { return 0; }",
      /wrong return type/,
    ],
    [
      "to void pointer",
      "int main() { const int x = 1; void *p = &x; return 0; }",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "from const void pointer",
      "int main() { const void *v = 0; int *p = v; return 0; }",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "nested pointer",
      "int main() { int *p = 0; const int **q = &p; return 0; }",
      /invalid initializer type for scalar/,
    ],
    [
      "conditional preserves const",
      "int main() { int x = 1; const int *p = &x; int *q = 1 ? &x : p; return 0; }",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "member address",
      "struct S { int x; }; int main() { const struct S s = {1}; int *p = &s.x; return 0; }",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "prototype pointee qualifiers",
      "int f(int *p); int f(const int *p) { return *p; } int main() { return 0; }",
      /conflicting types/,
    ],
  ] as const)
    it(name, () => assert.throws(() => run(source), reason));
});

describe("const initializer diagnostics", () => {
  it("reports the global object's qualifier loss at the initializer", () => {
    const source = `const int a = 4;
int b = 5;
int main() {
  int *x = &a;
  *x = 10;
  return a;
}`;
    let error: unknown;
    try {
      cviz.run(source);
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, TypeCheckingError);
    assert.include(
      (error as TypeCheckingError).message,
      "pointer initializer discards const qualifier from pointed-to type",
    );
    assert.propertyVal(error, "line", 4);
    assert.propertyVal(error, "column", 12);
  });

  for (const [name, body, reason] of [
    [
      "braced initializer",
      "const int a = 4; int *x = {&a};",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "const pointer still discards the pointee qualifier",
      "const int a = 4; int *const x = &a;",
      /pointer initializer discards const qualifier from pointed-to type/,
    ],
    [
      "unrelated pointer mismatch keeps its own diagnostic",
      "int a = 4; char *x = &a;",
      /invalid initializer type for scalar/,
    ],
  ] as const)
    it(name, () =>
      assert.throws(() => run(`int main() { ${body} return 0; }`), reason),
    );
});

describe("const runtime protection", () => {
  for (const [name, source] of [
    [
      "scalar after an explicit cast",
      "int main() { const int x = 1; int *p = (int *)&x; *p = 2; return 0; }",
    ],
    [
      "array bytes",
      "int main() { const char a[] = \"hi\"; char *p = (char *)a; p[1] = 'x'; return 0; }",
    ],
    [
      "struct member",
      "struct S { const int x; int y; }; int main() { struct S s = {1, 2}; int *p = (int *)&s.x; *p = 3; return 0; }",
    ],
    [
      "parameter storage",
      "int f(const int n) { int *p = (int *)&n; *p = 2; return n; } int main() { return f(1); }",
    ],
    [
      "uninitialized const object",
      "int main() { const int x; int *p = (int *)&x; *p = 2; return 0; }",
    ],
  ] as const)
    it(name, () => assert.throws(() => run(source), /write|read.only/i));
});
