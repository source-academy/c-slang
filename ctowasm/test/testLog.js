/**
 * This file exports a JS object containing information on all tests.
 */
const testLog = {
  subset1: {
    fn_call_1: {
      title: "Function call 1",
      expected: true, // whether there exists a verified expect WAT for the given test
    },
    fn_def_1: {
      title: "Function definition 1",
      expected: true,
    },
    fn_return_1: {
      title: "Function return 1",
      expected: true,
    },
    var_assign_1: {
      title: "Variable assignment 1",
      expected: true,
    },
    var_dec_1: {
      title: "Variable declaration 1",
      expected: true,
    },
    var_init_1: {
      title: "Variable initialization 1",
      expected: true,
    },
  },
  subset2: {
    add_1: {
      title: "Addition expression 1",
      expected: true,
    },
    arithmetic_1: {
      title: "Complex arithmetic expression 1",
      expected: true,
    },
    brackets_1: {
      title: "Bracketed arithmetic expression 1",
      expected: true,
    },
    divide_1: {
      title: "Divide expression 1",
      expected: true,
    },
    multiply_1: {
      title: "Multiply expression 1",
      expected: true,
    },
    postfix_add_1: {
      title: "Postfix addition expression 1 - postfix as expression",
      expected: true,
    },
    postfix_subtract_1: {
      title: "Postfix subtraction expression 1 - postfix as expression",
      expected: true,
    },
    prefix_add_1: {
      title: "Prefix addition expression 1 - prefix as expression",
      expected: true,
    },
    prefix_subtract_1: {
      title: "Prefix subtraction expression 1 - prefix as expression",
      expected: true,
    },
    remainder_1: {
      title: "Remainder expression 1",
      expected: true,
    },
    subtract_1: {
      expected: true,
    },
    prefix_subtract_2: {
      title: "Prefix subtraction expression 2 - prefix as statement",
      expected: true,
    },
    prefix_add_2: {
      title: "Prefix addition expression 2 - prefix as statement",
      expected: true,
    },
    postfix_add_2: {
      title: "Postfix addition expression 2 - postfix as statement",
      expected: true,
    },
    postfix_subtract_2: {
      title: "Postfix subtraction expression 2 - postfix as statement",
      expected: true,
    },
    and_1: {
      title: "And expression 1",
      expected: true,
    },
    or_1: {
      title: "Or expression 1",
      expected: true,
    },
    conditional_1: {
      tile: "Conditional expression 1",
      expected: true,
    },
  },
};

export default testLog;
