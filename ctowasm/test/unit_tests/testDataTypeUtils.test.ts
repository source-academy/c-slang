import {describe, expect, test} from '@jest/globals';
import { stringifyDataType } from "../../src/processor/dataTypeUtil";

describe("test", () => {
  test("test1", () => {
    expect(stringifyDataType({type: "primary", primaryDataType: "signed int"})).toBe("signed int");
  })
})