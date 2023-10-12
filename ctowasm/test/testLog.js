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
      title: "Conditional expression 1",
      expected: true,
    },
    compound_add_1: {
      title: "Compound add expression 1",
      expected: true,
    },
    compound_subtract_1: {
      title: "Compound subtract expression 1",
      expected: true,
    },
    compound_multiply_1: {
      title: "Compound multiply expression 1",
      expected: true,
    },
    compound_divide_1: {
      title: "Compound divide expression 1",
      expected: true,
    },
    compound_remainder_1: {
      title: "Compound remainder expression 1",
      expected: true
    }
  },
  subset3: {
    eq_comparison_statement_1: {
      title: "Equals comparison expression 1",
      expected: true
    },
    ne_comparison_statement_1: {
      title: "Not equals expression 1",
      expected: true
    },
    lt_comparison_statement_1: {
      title: "Less than expression 1",
      expected: true
    },
    le_comparison_statement_1: {
      title: "Less than or equals expression 1",
      expected: true
    },
    gt_comparison_statement_1: {
      title: "Greater than expression 1",
      expected: true
    },
    ge_comparison_statement_1: {
      title: "Greater than or equals expression 1",
      expected: true
    },
    comparison_1: {
      title: "Complex comparison expression 1",
      expected: true
    },
    select_statement_1: {
      title: "Select statement (if else-if else blocks) 1",
      expected: true
    },
    assign_expr_1: {
      title: "Assignment expression 1",
      expected: true
    },
    compound_assign_expr_1: {
      title: "Compound assignment expression 1",
      expected: true
    },
    do_while_loop_1: {
      title: "Do while loop 1",
      expected: true
    },
    while_loop_1: {
      title: "While loop 1",
      expected: true
    }, 
    for_loop_1: {
      title: "For loop 1",
      expected: true
    }
  }
};

export default testLog;
