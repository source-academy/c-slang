import { describe, expect, test } from "@jest/globals";
import { COMPILATION_SUCCESS, testFileCompilationError, testFileCompilationSuccess } from "./util";



describe("Subset 1 Tests", () => {
  describe("Processor Semantic Error Tests", () => {
    test("Function redeclaration throws error", () => {
      expect(() => testFileCompilationError(1, "fn_redeclaration")).toThrow(
        "Redeclaration error"
      );
    });
    test("Variable redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "variable_redeclaration")
      ).toThrow("Redeclaration error");
    });
    test("Function parameter redeclaration throws error", () => {
      expect(() =>
        testFileCompilationError(1, "fn_param_redeclaration")
      ).toThrow("Redeclaration of function parameter");
    });
    test("Assignment to undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var_assignment")).toThrow(
        "Undeclared variable"
      );
    });
    test("Calling undeclared function throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_fn")).toThrow(
        "Undeclared function"
      );
    });
    test("Usage of undeclared variable throws error", () => {
      expect(() => testFileCompilationError(1, "undeclared_var_usage")).toThrow(
        "Undeclared variable"
      );
    });
  });
});

describe("Subset 2 Tests", () => {
  describe("Compilation Success Tests", () => {
    test("Addition expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "add_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Subtract expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "subtract_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Multiply expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "multiply_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Divide expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "divide_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    })

    test("Remainder expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "remainder_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    })
  })
})
