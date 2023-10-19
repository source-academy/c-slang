/**
 * This file exports a JS object containing information on all tests.
 */
const testLog = {
  subset1: {
    fn_call_1: {
      title: "Function call 1",
      expectedCode: true, // whether there exists a verified expect WAT for the given test
      expectedValues: [1]
    },
    fn_def_1: {
      title: "Function definition 1",
      expectedCode: true,
    },
    fn_return_1: {
      title: "Function return 1",
      expectedCode: true,
    },
    var_assign_1: {
      title: "Variable assignment 1",
      expectedCode: true,
      expectedValues: [5]
    },
    var_dec_1: {
      title: "Variable declaration 1",
      expectedCode: true,
    },
    var_init_1: {
      title: "Variable initialization 1",
      expectedCode: true,
      expectedValues: [10]
    },
  },
  subset2: {
    add_1: {
      title: "Addition expression 1",
      expectedCode: true,
      expectedValues: [10]
    },
    arithmetic_1: {
      title: "Complex arithmetic expression 1",
      expectedCode: true,
      expectedValues: [10, 33]
    },
    brackets_1: {
      title: "Bracketed arithmetic expression 1",
      expectedCode: true,
      expectedValues: [4, 20]
    },
    divide_1: {
      title: "Divide expression 1",
      expectedCode: true,
      expectedValues: [3]
    },
    multiply_1: {
      title: "Multiply expression 1",
      expectedCode: true,
      expectedValues: [20]
    },
    postfix_add_1: {
      title: "Postfix addition expression 1 - postfix as statement",
      expectedCode: true,
      expectedValues: [3]
    },
    postfix_subtract_1: {
      title: "Postfix subtraction expression 1 - postfix as statement",
      expectedCode: true,
      expectedValues: [1]
    },
    prefix_add_1: {
      title: "Prefix addition expression 1 - prefix as statement",
      expectedCode: true,
      expectedValues: [3]
    },
    prefix_subtract_1: {
      title: "Prefix subtraction expression 1 - prefix as statement",
      expectedCode: true,
      expectedValues: [3]
    },
    remainder_1: {
      title: "Remainder expression 1",
      expectedCode: true,
      expectedValues: [2]
    },
    subtract_1: {
      title: "Subtract expression 1",
      expectedCode: true,
      expectedValues: [4]
    },
    prefix_subtract_2: {
      title: "Prefix subtraction expression 2 - prefix as expression",
      expectedCode: true,
      expectedValues: [9]
    },
    prefix_add_2: {
      title: "Prefix addition expression 2 - prefix as expression",
      expectedCode: true,
      expectedValues: [11]
    },
    postfix_add_2: {
      title: "Postfix addition expression 2 - postfix as expression",
      expectedCode: true,
      expectedValues: [10]
    },
    postfix_subtract_2: {
      title: "Postfix subtraction expression 2 - postfix as expression",
      expectedCode: true,
      expectedValues: [10]
    },
    and_1: {
      title: "And expression 1",
      expectedCode: true,
      expectedValues: [1, 1]
    },
    or_1: {
      title: "Or expression 1",
      expectedCode: true,
      expectedValues: [0, 1]
    },
    conditional_1: {
      title: "Conditional expression 1",
      expectedCode: true,
      expectedValues: [12, 1]
    },
    compound_add_1: {
      title: "Compound add expression 1",
      expectedCode: true,
      expectedValues: [3]
    },
    compound_subtract_1: {
      title: "Compound subtract expression 1",
      expectedCode: true,
      expectedValues: [8]
    },
    compound_multiply_1: {
      title: "Compound multiply expression 1",
      expectedCode: true,
      expectedValues: [20]
    },
    compound_divide_1: {
      title: "Compound divide expression 1",
      expectedCode: true,
      expectedValues: [5]
    },
    compound_remainder_1: {
      title: "Compound remainder expression 1",
      expectedCode: true,
      expectedValues: [0]
    }
  },
  subset3: {
    eq_comparison_statement_1: {
      title: "Equals comparison expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 1]
    },
    ne_comparison_statement_1: {
      title: "Not equals expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 0] 
    },
    lt_comparison_statement_1: {
      title: "Less than expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 0] 
    },
    le_comparison_statement_1: {
      title: "Less than or equals expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 1] 
    },
    gt_comparison_statement_1: {
      title: "Greater than expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 0] 
    },
    ge_comparison_statement_1: {
      title: "Greater than or equals expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 1] 
    },
    comparison_1: {
      title: "Complex comparison expression 1",
      expectedCode: true,
      expectedValues: [2, 2, 0] 
    },
    select_statement_1: {
      title: "Select statement (if else-if else blocks) 1",
      expectedCode: true,
      expectedValues: [100] 
    },
    assign_expr_1: {
      title: "Assignment expression 1",
      expectedCode: true,
      expectedValues: [19, 19, 19] 
    },
    compound_assign_expr_1: {
      title: "Compound assignment expression 1",
      expectedCode: true,
      expectedValues: [2, 0, 2] 
    },
    do_while_loop_1: {
      title: "Do while loop 1",
      expectedCode: true,
      expectedValues: [0, 10] 
    },
    while_loop_1: {
      title: "While loop 1",
      expectedCode: true,
      expectedValues: [10] 
    }, 
    for_loop_1: {
      title: "For loop 1",
      expectedCode: true,
      expectedValues: [11] 
    },
    single_line_comments_1: {
      title: "Single-line comments 1",
      expectedCode: true,
      expectedValues: [2, 4] 
    },
    multi_line_comments_1: {
      title: "Multi-line comments 1",
      expectedCode: true,
      expectedValues: [1] 
    },
    overall_1: {
      title: "Overall feature test 1 - Pow function",
      expectedCode: true,
      expectedValues: [1024] 
    }
  }
};

export default testLog;
