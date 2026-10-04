import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";

const run = (source: string): void => {
  const rt = cviz.run(source);
  while (rt.exitCode === undefined) rt.next();
};

describe("union rejection reasons", () => {
  for (const [name, source, reason] of [
    [
      "object with an incomplete union type",
      "union U; int main() { union U u; return 0; }",
      /object of incomplete struct or union type/,
    ],
    [
      "array with incomplete union elements",
      "union U; int main() { union U u[2]; return 0; }",
      /array from incomplete type/,
    ],
    [
      "sizeof an incomplete union",
      "union U; int main() { return sizeof(union U); }",
      /sizeof operator requires complete object type/,
    ],
    [
      "repeated definition of the same union tag",
      "union U { int x; }; union U { int x; }; int main() { return 0; }",
      /redefinition of union U/,
    ],
    [
      "struct tag used as a union",
      "struct T { int x; }; union T u; int main() { return 0; }",
      /tag T.*(struct|union)/,
    ],
    [
      "union tag used as a struct",
      "union T { int x; }; struct T s; int main() { return 0; }",
      /tag T.*(struct|union)/,
    ],
    [
      "struct and union definitions share the tag namespace",
      "struct T { int x; }; union T { int x; }; int main() { return 0; }",
      /tag T.*(struct|union)/,
    ],
    [
      "enum and union definitions share the tag namespace",
      "enum T { A }; union T { int x; }; int main() { return 0; }",
      /tag T/,
    ],
    [
      "anonymous struct and union values are incompatible",
      "int main() { struct { int x; } s = {1}; union { int x; } u = {2}; s = u; return 0; }",
      /assignment/,
    ],
    [
      "excess positional initializers",
      "int main() { union U { int x; int y; } u = {1, 2}; return 0; }",
      /excess initializers/,
    ],
    [
      "positional entry after a designated member",
      "int main() { union U { int x; int y; } u = {.x = 1, 2}; return 0; }",
      /excess initializers/,
    ],
    [
      "unknown designated member",
      "int main() { union U { int x; } u = {.missing = 1}; return 0; }",
      /member missing does not exist on union/,
    ],
    [
      "const union member access",
      "int main() { const union U { int x; } u = {1}; u.x = 2; return 0; }",
      /modifiable lvalue/,
    ],
    [
      "const array member access",
      "int main() { const union U { int a[2]; } u = {{1, 2}}; u.a[1]++; return 0; }",
      /modifiable lvalue/,
    ],
    [
      "assignment of a union containing a const member",
      "int main() { union U { const int fixed; int other; } a = {1}, b = {2}; a = b; return 0; }",
      /modifiable lvalue/,
    ],
    [
      "write through a cast to a const union",
      "int main() { const union U { int x; int a[2]; } u = {.a = {1, 2}}; int *p = (int *)&u.a[1]; *p = 3; return 0; }",
      /write|read.only/i,
    ],
    [
      "unrelated pointer cast at a union address",
      "int main() { union U { int x; long long y; } u = {1}; short *p = (short *)&u; *p = 2; return 0; }",
      /strict aliasing/,
    ],
  ] as const)
    it(name, () => assert.throws(() => run(source), reason));
});
