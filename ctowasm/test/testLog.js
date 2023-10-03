/**
 * This file exports a JS object containing information on all tests.
 */
const testLog = {
  subset1: {
    fn_call_1: {
      expected: true, // whether there exists a verified expect WAT for the given test
    },
    fn_def_1: {
      expected: true,
    },
    fn_return_1: {
      expected: true,
    },
    var_assign_1: {
      expected: true,
    },
    var_dec_1: {
      expected: true,
    },
    var_init_1: {
      expected: true,
    },
  },
  subset2: {
    add_1: {
      expected: true,
    },
    arithmetic_1: {
      expected: false,
    },
    brackets_1: {
      expected: true,
    },
    divide_1: {
      expected: true,
    },
    multiply_1: {
      expected: true,
    },
    postfix_add_1: {
      expected: true,
    },
    postfix_subtract_1: {
      expected: true,
    },
    prefix_add_1: {
      expected: true,
    },
    prefix_subtract_1: {
      expected: true,
    },
    remainder_1: {
      expected: true,
    },
    subtract_1: {
      expected: true,
    },
  },
};

export default testLog;
