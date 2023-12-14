/**
 * This file exports a JS object containing information on all tests.
 */
const testLog = {
  subset1: {
    fn_call_1: {
      title: "Function call 1",
      expectedCode: false, // whether there exists a verified expect WAT for the given test
      expectedValues: [1],
    },
    fn_def_1: {
      title: "Function definition 1",
      expectedCode: false,
    },
    fn_return_1: {
      title: "Function return 1",
      expectedCode: false,
    },
    var_assign_1: {
      title: "Variable assignment 1",
      expectedCode: false,
      expectedValues: [2, 5],
    },
    var_dec_1: {
      title: "Variable declaration 1",
      expectedCode: false,
    },
    var_init_1: {
      title: "Variable initialization 1",
      expectedCode: false,
      expectedValues: [10],
    },
    var_global_1: {
      title: "Global variable declaration, initialization & assignment 1",
      expectedCode: false,
      expectedValues: [20, 30, 20, 30],
    },
  },
  subset2: {
    add_1: {
      title: "Addition expression 1",
      expectedCode: false,
      expectedValues: [10],
    },
    arithmetic_1: {
      title: "Complex arithmetic expression 1",
      expectedCode: false,
      expectedValues: [33, 10],
    },
    brackets_1: {
      title: "Bracketed arithmetic expression 1",
      expectedCode: false,
      expectedValues: [20, 4],
    },
    divide_1: {
      title: "Divide expression 1",
      expectedCode: false,
      expectedValues: [3],
    },
    multiply_1: {
      title: "Multiply expression 1",
      expectedCode: false,
      expectedValues: [20],
    },
    postfix_add_1: {
      title: "Postfix addition expression 1 - postfix as statement",
      expectedCode: false,
      expectedValues: [2, 3],
    },
    postfix_subtract_1: {
      title: "Postfix subtraction expression 1 - postfix as statement",
      expectedCode: false,
      expectedValues: [2, 1],
    },
    prefix_add_1: {
      title: "Prefix addition expression 1 - prefix as statement",
      expectedCode: false,
      expectedValues: [2, 3],
    },
    prefix_subtract_1: {
      title: "Prefix subtraction expression 1 - prefix as statement",
      expectedCode: false,
      expectedValues: [4, 3],
    },
    remainder_1: {
      title: "Remainder expression 1",
      expectedCode: false,
      expectedValues: [2],
    },
    subtract_1: {
      title: "Subtract expression 1",
      expectedCode: false,
      expectedValues: [4],
    },
    prefix_subtract_2: {
      title: "Prefix subtraction expression 2 - prefix as expression",
      expectedCode: false,
      expectedValues: [10, 9],
    },
    prefix_add_2: {
      title: "Prefix addition expression 2 - prefix as expression",
      expectedCode: false,
      expectedValues: [10, 11],
    },
    postfix_add_2: {
      title: "Postfix addition expression 2 - postfix as expression",
      expectedCode: false,
      expectedValues: [10, 11],
    },
    postfix_subtract_2: {
      title: "Postfix subtraction expression 2 - postfix as expression",
      expectedCode: false,
      expectedValues: [10, 9],
    },
    and_1: {
      title: "And expression 1",
      expectedCode: false,
      expectedValues: [1, 1],
    },
    or_1: {
      title: "Or expression 1",
      expectedCode: false,
      expectedValues: [0, 1],
    },
    conditional_1: {
      title: "Conditional expression 1",
      expectedCode: false,
      expectedValues: [12, 1],
    },
    compound_add_1: {
      title: "Compound add expression 1",
      expectedCode: false,
      expectedValues: [2, 3],
    },
    compound_subtract_1: {
      title: "Compound subtract expression 1",
      expectedCode: false,
      expectedValues: [10, 8],
    },
    compound_multiply_1: {
      title: "Compound multiply expression 1",
      expectedCode: false,
      expectedValues: [10, 20],
    },
    compound_divide_1: {
      title: "Compound divide expression 1",
      expectedCode: false,
      expectedValues: [10, 5],
    },
    compound_remainder_1: {
      title: "Compound remainder expression 1",
      expectedCode: false,
      expectedValues: [10, 0],
    },
  },
  subset3: {
    eq_comparison_statement_1: {
      title: "Equals comparison expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 1],
    },
    ne_comparison_statement_1: {
      title: "Not equals expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 0],
    },
    lt_comparison_statement_1: {
      title: "Less than expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 0],
    },
    le_comparison_statement_1: {
      title: "Less than or equals expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 1],
    },
    gt_comparison_statement_1: {
      title: "Greater than expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 0],
    },
    ge_comparison_statement_1: {
      title: "Greater than or equals expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 1],
    },
    comparison_1: {
      title: "Complex comparison expression 1",
      expectedCode: false,
      expectedValues: [2, 2, 0],
    },
    select_statement_1: {
      title: "Select statement (if else-if else blocks) 1",
      expectedCode: false,
      expectedValues: [100, 2],
    },
    assign_expr_1: {
      title: "Assignment expression 1",
      expectedCode: false,
      expectedValues: [19, 19, 19],
    },
    compound_assign_expr_1: {
      title: "Compound assignment expression 1",
      expectedCode: false,
      expectedValues: [2, 0, 2],
    },
    do_while_loop_1: {
      title: "Do while loop 1",
      expectedCode: false,
      expectedValues: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10],
    },
    while_loop_1: {
      title: "While loop 1",
      expectedCode: false,
      expectedValues: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    for_loop_1: {
      title: "For loop 1",
      expectedCode: false,
      expectedValues: [11],
    },
    single_line_comments_1: {
      title: "Single-line comments 1",
      expectedCode: false,
      expectedValues: [2, 4],
    },
    multi_line_comments_1: {
      title: "Multi-line comments 1",
      expectedCode: false,
      expectedValues: [1],
    },
    overall_1: {
      title: "Overall feature test 1 - Pow function",
      expectedCode: false,
      expectedValues: [1024],
    },
    array_declaration_1: {
      title: "Array declaration 1",
      expectedCode: false,
    },
    array_initialization_1: {
      title:
        "Array initialization 1 - Initialize with inferred size from initializer list",
      expectedCode: false,
      expectedValues: [1, 2, 3],
    },
    array_initialization_2: {
      title: "Array intialization 2 - Initialize with defined size",
      expectedCode: false,
      expectedValues: [1, 2, 3, 4, 5],
    },
    array_element_assignment_1: {
      title: "Array element assignment 1 - Assign value to element in array",
      expectedCode: false,
      expectedValues: [10, 2],
    },
    array_global_1: {
      title: "Array global declaration & assignment 1",
      expectedCode: false,
      expectedValues: [1, 10, 3, 4, 5, 10, 20],
    },
    merge_sort: {
      title: "Overall test of array features using mergesort algorithm",
      expectedCode: false,
      expectedValues: [2, 2, 4, 4, 5, 6, 7, 10, 23, 199],
    },
    array_indexing_1: {
      title: "Test more complicated array indexing 1",
      expectedCode: false,
      expectedValues: [1, 1, 2, 0],
    },
    recursion_test_1: {
      title: "Recursion test 1",
      expectedCode: false,
      expectedValues: [0, 3, 0, 2, 0, 1, 2],
    },
    if_statement_1: {
      title: "If statement test 1",
      expectedCode: false,
      expectedValues: [10],
    },
  },
  subset4: {
    char_1: {
      title: "Char type - global and local initialization 1",
      expectedCode: false,
      expectedValues: [10, 'a', 20, 'b']
    }
  }
};

export default testLog;
