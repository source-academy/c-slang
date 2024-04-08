import { describe, expect, test } from "@jest/globals";
import { stringifyDataType } from "../../../src/processor/dataTypeUtil";

describe("Test stringifyDataType() function", () => {
  test("Test 1 - signed int", () => {
    expect(
      stringifyDataType({ type: "primary", primaryDataType: "signed int" }),
    ).toBe("signed int");
  });
  test("Test 2 - const pointer to const signed int", () => {
    expect(
      stringifyDataType({
        type: "pointer",
        pointeeType: {
          type: "primary",
          primaryDataType: "signed int",
          isConst: true,
        },
        isConst: true,
      }),
    ).toBe("const pointer to const signed int");
  });
});
