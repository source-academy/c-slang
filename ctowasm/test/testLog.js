/**
 * This file exports a JS object containing information on all tests.
 */
const testLog = {
  subset1: {
    fn_call_1: {
      title: "Function call 1",
      expected: false, // whether there exists a verified expect WAT for the given test
    },
    fn_def_1: {
      title: "Function definition 1",
      expected: false,
    },
    fn_return_1: {
      title: "Function return 1",
      expected: false,
    },
    var_assign_1: {
      title: "Variable assignment 1",
      expected: false,
    },
    var_dec_1: {
      title: "Variable declaration 1",
      expected: false,
    },
    var_init_1: {
      title: "Variable initialization 1",
      expected: false,
    },
  },
  subset2: {
    add_1: {
      title: "Addition expression 1",
      expected: false,
    },
    arithmetic_1: {
      title: "Complex arithmetic expression 1",
      expected: false,
    },
    brackets_1: {
      title: "Bracketed arithmetic expression 1",
      expected: false,
    },
    divide_1: {
      title: "Divide expression 1",
      expected: false,
    },
    multiply_1: {
      title: "Multiply expression 1",
      expected: false,
    },
    postfix_add_1: {
      title: "Postfix addition expression 1 - postfix as statement",
      expected: false,
    },
    postfix_subtract_1: {
      title: "Postfix subtraction expression 1 - postfix as statement",
      expected: false,
    },
    prefix_add_1: {
      title: "Prefix addition expression 1 - prefix as statement",
      expected: false,
    },
    prefix_subtract_1: {
      title: "Prefix subtraction expression 1 - prefix as statement",
      expected: false,
    },
    remainder_1: {
      title: "Remainder expression 1",
      expected: false,
    },
    subtract_1: {
      expected: false,
    },
    prefix_subtract_2: {
      title: "Prefix subtraction expression 2 - prefix as expression",
      expected: false,
    },
    prefix_add_2: {
      title: "Prefix addition expression 2 - prefix as expression",
      expected: false,
    },
    postfix_add_2: {
      title: "Postfix addition expression 2 - postfix as expression",
      expected: false,
    },
    postfix_subtract_2: {
      title: "Postfix subtraction expression 2 - postfix as expression",
      expected: false,
    },
    and_1: {
      title: "And expression 1",
      expected: false,
    },
    or_1: {
      title: "Or expression 1",
      expected: false,
    },
    conditional_1: {
      title: "Conditional expression 1",
      expected: false,
    },
    compound_add_1: {
      title: "Compound add expression 1",
      expected: false,
    },
    compound_subtract_1: {
      title: "Compound subtract expression 1",
      expected: false,
    },
    compound_multiply_1: {
      title: "Compound multiply expression 1",
      expected: false,
    },
    compound_divide_1: {
      title: "Compound divide expression 1",
      expected: false,
    },
    compound_remainder_1: {
      title: "Compound remainder expression 1",
      expected: false
    }
  },
  subset3: {
    eq_comparison_statement_1: {
      title: "Equals comparison expression 1",
      expected: false
    },
    ne_comparison_statement_1: {
      title: "Not equals expression 1",
      expected: false
    },
    lt_comparison_statement_1: {
      title: "Less than expression 1",
      expected: false
    },
    le_comparison_statement_1: {
      title: "Less than or equals expression 1",
      expected: false
    },
    gt_comparison_statement_1: {
      title: "Greater than expression 1",
      expected: false
    },
    ge_comparison_statement_1: {
      title: "Greater than or equals expression 1",
      expected: false
    },
    comparison_1: {
      title: "Complex comparison expression 1",
      expected: false
    },
    select_statement_1: {
      title: "Select statement (if else-if else blocks) 1",
      expected: false
    },
    assign_expr_1: {
      title: "Assignment expression 1",
      expected: false
    },
    compound_assign_expr_1: {
      title: "Compound assignment expression 1",
      expected: false
    },
    do_while_loop_1: {
      title: "Do while loop 1",
      expected: false
    },
    while_loop_1: {
      title: "While loop 1",
      expected: false
    }, 
    for_loop_1: {
      title: "For loop 1",
      expected: false
    },
    single_line_comments_1: {
      title: "Single-line comments 1",
      expected: false
    },
    multi_line_comments_1: {
      title: "Multi-line comments 1",
      expected: false
    },
    overall_1: {
      title: "Overall feature test 1 - Pow function",
      expected: false
    }
  }
};

export default testLog;
