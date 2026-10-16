import { assert } from "chai";
import { describe, it } from "mocha";
import cviz from "../src/index";

describe("integer conversion arithmetic overflow guards", () => {
  for (const [type, maximum] of [
    ["int", "2147483647"],
    ["long", "2147483647L"],
    ["long long", "9223372036854775807LL"],
  ])
    for (const expression of [
      "max + 1",
      "min - 1",
      "max * 2",
      "min / -1",
      "-min",
      "max << 1",
      "max += 1",
      "++max",
      "--min",
    ])
      it(`still rejects ${type} overflow in ${expression}`, () => {
        assert.throws(() => {
          const rt = cviz.run(`int main(void) {
            ${type} max = ${maximum};
            ${type} min = -max - 1;
            ${expression};
            return 0;
          }`);
          while (rt.exitCode === undefined) rt.next();
        }, /undefined behaviour: .* out of range for type/);
      });
});
