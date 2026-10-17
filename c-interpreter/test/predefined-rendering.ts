import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";
import { TypeCheckingError } from "../src/typing/errors";

describe("predefined macro rendering without directives", () => {
  it("renders predefined macros without directives through preprocess()", () => {
    const { text } = cviz.preprocess(
      "__DATE__\n__TIME__\n\n__LINE__\n__FILE__\n__STDC__\n__STDC_VERSION__",
      { fileName: "clock.c" },
    );
    const lines = text.split("\n");
    assert.match(lines[0], /^"[A-Za-z]{3} [ 0-9][0-9] [0-9]{4}"$/);
    assert.match(lines[1], /^"[0-9]{2}:[0-9]{2}:[0-9]{2}"$/);
    assert.deepEqual(lines.slice(2), ["4", '"clock.c"', "1", "201710L"]);
  });

  it("preserves quoted predefined names, comments, and similar identifiers verbatim", () => {
    const source =
      '  /* __DATE__ */\n"__DATE__ __TIME__ __FILE__"\t__DATE_suffix\n// __LINE__\n';
    assert.equal(cviz.preprocess(source).text, source);
  });

  it("maps a rejection after predefined macros to its original position", () => {
    const line = "  __DATE__; __TIME__; return missing;";
    let caught: unknown;
    try {
      cviz.run("int main(void) {\n" + line + "\n}");
    } catch (error) {
      caught = error;
    }
    assert.instanceOf(caught, TypeCheckingError);
    const error = caught as TypeCheckingError;
    assert.match(error.message, /identifier missing not declared/);
    assert.equal(error.line, 2);
    assert.equal(error.column, line.indexOf("missing") + 1);
  });
});
