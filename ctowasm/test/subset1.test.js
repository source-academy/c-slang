import { describe, expect, test } from "@jest/globals";
import { COMPILATION_SUCCESS, testFileCompilationError, testFileCompilationSuccess } from "./util";



describe("Subset 1 Tests", () => {
  describe("Compilation Success Tests", () => {
    test("Function Definition 1", async () => {
      const result = await testFileCompilationSuccess(1, "fn_def_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Function Call 1", async () => {
      const result = await testFileCompilationSuccess(1, "fn_call_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Function Return 1", async () => {
      const result = await testFileCompilationSuccess(1, "fn_return_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Variable Declaration 1", async () => {
      const result = await testFileCompilationSuccess(1, "var_dec_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });

    test("Variable Initialization 1", async () => {
      const result = await testFileCompilationSuccess(1, "var_init_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    })

    test("Variable Assignment 1", async () => {
      const result = await testFileCompilationSuccess(1, "var_assign_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    });
  })

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

    test("Bracketed arithmetic expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "brackets_1");
      expect(result).toBe(COMPILATION_SUCCESS);
    })

    test("Prefix addition expression 1 - prefix as statement", async () => {
      const result = await testFileCompilationSuccess(2, "prefix_add_1");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Prefix addition expression 2 - prefix as expression", async () => {
      const result = await testFileCompilationSuccess(2, "prefix_add_2");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Prefix subtraction expression 1 - prefix as statement", async () => {
      const result = await testFileCompilationSuccess(2, "prefix_subtract_1");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Prefix subtraction expression 2 - prefix as expression", async () => {
      const result = await testFileCompilationSuccess(2, "prefix_subtract_2");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Postfix addition expression 1 - postfix as statement", async () => {
      const result = await testFileCompilationSuccess(2, "postfix_add_1");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Postfix addition expression 2 - postfix as expression", async () => {
      const result = await testFileCompilationSuccess(2, "postfix_add_2");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Postfix subtraction expression 1 - postfix as statement", async () => {
      const result = await testFileCompilationSuccess(2, "postfix_subtract_1");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Postfix subtraction expression 2 - postfix as expression", async () => {
      const result = await testFileCompilationSuccess(2, "postfix_subtract_2");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })

    test("Complex arithmetic expression 1", async () => {
      const result = await testFileCompilationSuccess(2, "arithmetic_1");
      expect(result).toBe(COMPILATION_SUCCESS); 
    })
  })
})
