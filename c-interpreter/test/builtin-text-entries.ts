import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { RuntimeView, isFunctionDesignator } from "../src/interpreter/runtime";
import { isTemporaryObject } from "../src/interpreter/stash";
import { bytesToBigint } from "../src/typing/representation";
import { isFunctionTypeInfo, isPointer } from "../src/typing/types";
import { DEFAULT_CONFIG } from "../src/config";

// Runs to completion, handing every intermediate view to `visit`.
const runViews = (source: string, visit: (view: RuntimeView) => void = () => {}) => {
  const rt = cviz.run(source);
  for (let steps = 0; steps < 20000 && rt.exitCode === undefined; steps++) {
    rt.next();
    visit(new RuntimeView(rt));
  }
  assert.isDefined(rt.exitCode, "program did not finish");
  return { rt, view: new RuntimeView(rt) };
};

const textFunctions = (view: RuntimeView) =>
  view.textAndData.filter(isFunctionDesignator).map(d => d.identifier);

describe("builtin functions in the text segment view", () => {
  it("gives every stashed function pointer a text entry at its address, builtins included", () => {
    const source =
      "#include <string.h>\n" +
      "int twice(int x) { return 2 * x; }\n" +
      "int main(void) { int *p = malloc(sizeof(int)); *p = (int)strlen(\"abc\"); print(twice(*p)); free(p); return 0; }";
    let checked = 0;
    runViews(source, view => {
      for (const item of view.stash) {
        if (!isTemporaryObject(item) || !isPointer(item.typeInfo) || !isFunctionTypeInfo(item.typeInfo.referencedType))
          continue;
        const address = Number(bytesToBigint(item.bytes, false, DEFAULT_CONFIG.endianness));
        assert.include(view.textAndData.filter(isFunctionDesignator).map(d => d.address), address);
        checked++;
      }
    });
    assert.isAbove(checked, 0);
  });

  it("adds each builtin once, however often the program calls it", () => {
    const { view } = runViews("int main(void) { for (int i = 0; i < 3; i++) print(i); return 0; }");
    assert.deepEqual(textFunctions(view), ["main", "print"]);
  });

  it("never adds a builtin the program does not refer to", () => {
    const { view } = runViews("int main(void) { if (0) print(1); return 0; }");
    assert.deepEqual(textFunctions(view), ["main"]);
  });

  it("adds a builtin whose address is taken without calling it", () => {
    const { rt, view } = runViews(
      "int main(void) { void (*f)(void *) = &free; void (*g)(void *) = free; return f == g ? 0 : 1; }",
    );
    assert.strictEqual(rt.exitCode, 0);
    assert.deepEqual(textFunctions(view), ["main", "free"]);
    const free = view.textAndData.filter(isFunctionDesignator).find(d => d.identifier === "free");
    assert.strictEqual(free?.address, view.fileScope.free);
  });

  it("keeps user functions at their definitions, ahead of builtins added on first use", () => {
    const { view } = runViews(
      "int twice(int x) { return 2 * x; } int main(void) { print(twice(2)); return 0; }",
    );
    assert.deepEqual(textFunctions(view), ["twice", "main", "print"]);
  });
});
