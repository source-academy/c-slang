{
  /**
   * Helper function to create and return a Node with position and type information
   */
  function generateNode(type, data) {
    const loc = location();
    return {
      type: type,
      position: {
        start: loc.start,
        end: loc.end,
        offset: loc.offset
      },
      ...data
    };
  }

  const C_Keywords = new Set([
    "auto", "float", "break", "short", "switch", "void", "const", "if", "else", "for", "long", "signed", "typedef", "int", "continue", "volatile", "enum", "while", "rigester", "static", "union", "case", "sizeof", "goto", "extern", "double", "return", "struct ", "unsigned", "char", "do", "default"
  ])

  /**
   * Builds and returns a tree of binary operations which involves the 2 operaands (left and right expressions), and a operator
   * @param firstExpr first expression in the operation expression e.g. "2" in "2 + 3 + 4"
   * @param exprsWithOperatorArr an array of arrays of size 2 which contain an operator in first index and the expr in 2nd index. e.g: [["+", 3], ["+", 4]]
   */
  function createLeftToRightBinaryExpressionTree(firstExpr, exprsWithOperatorArr) {
    let currNode = firstExpr;
    for (const operation of exprsWithOperatorArr) {
      // create a new operation node
      currNode = {
        type: "BinaryExpression",
        leftExpr: currNode,
        rightExpr: operation[1],
        operator: operation[0]
      }
    }
    return currNode
    // return {
    //   type: "BinaryExpression",
    //   leftExpr: currNode,
    //   rightExpr: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][1],
    //   operator: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][0]
    // }
  }

  function createUnaryExpressionNode(expr, operator) {
    // special handling for negated constants, just negate the value of constant
    if (operator === "-" && (expr.type === "IntegerConstant" || expr.type === "FloatConstant")) {
      return {
        ...expr,
        value: -expr.value
      }
    }

    return {
      type: "UnaryExpression",
      operator,
      expression: expr
    }
  }

  // Creates a PrimaryDataType object.
  function createPrimaryDataType(primaryDataType) {
    return {
      type: "primary",
      primaryDataType
    };
  } 

  function createArrayDataType(elementDataType, numElements) {
    return {
      type: "array",
      elementDataType: elementDataType,
      numElements
    }
  }

  function createInitializerList(values) {
    return {
      type: "InitializerList",
      values
    };
  }

  function createInitializerSingle(value) {
    return {
      type: "InitializerSingle",
      value
    };
  }

  // Evaluates the string of postfix expressions to generate a complete tree of unary expression nodes
  // Follows left to right associativity.
  // TODO: add struct & pointer operation handling
  function createPostfixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (const operation of operations) {
      currNode = {
        ...operation,
        expr: currNode
      }
    }
    return currNode;
  }

  // Evaluates the string of prefix expressions to generate a complete tree of unary expression nodes
  // Follows right to left associativity
  // TODO: add struct & pointer operation handling
  // @param firstExpr refers to the rightmost expression
  function createPrefixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (let i = operations.length - 1; i >= 0; --i) {
      currNode = {
        ...(operations[i]),
        expr: currNode
      }
    }
    return currNode;
  } 

  /**
   * Evaluates a string of assignment expressions from right to left.
   * The resultant node does not consists of "BinaryExpression" nodes, as they consist of unique nodes depending on the expression (unlike regular arithmetic binary expressions).
   * This is used for assignment and compound assignment expressions.
   * @param firstExpr refers to the rightmost expression
   */
  function createAssignmentTree(firstExpr, assignmentOperations) {
    let currNode = firstExpr;
    for (let i = operations.length - 1; i >= 0; --i) {
      const operation = assignmentOperations[i]
      if (operation.type === "CompoundAssignment") {
        currNode = {
          type: "Assignment",
          lvalue: operation.lvalue,
          expr: {
            type: "BinaryExpression",
            leftExpr: operation.lvalue,
            rightExpr: currNode,
            operator: operation.operator
          }
        }
      } else {
        currNode = {
          type: "Assignment",
          lvalue: operation.lvalue,
          expr: currNode
        }
      }
    }
    return currNode; 
  }
}

program = arr:translation_unit  { return generateNode("Root", {children: arr}); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = _* i:initialization _* statement_end _* t:translation_unit { return [i, ...t]; }
  / _* s:declaration _* statement_end _* t:translation_unit { return [s, ...t]; }
  / _* f:function_definition _* t:translation_unit { return [f, ...t]; }
  / single_line_comment_body { return []; } // match a single line comment at end of program without newline ending it. this rule must come before the next as it is more specific
  / _* { return []; }
   
block
	= "{" _* children:block_item_list _* "}" { return generateNode("Block", { children }); }
    
block_item_list
  = items:block_item|.., _*| { return items.filter(item => item !== null ); } // filter out empty statements

block_item
  = _* @return_statement _* statement_end // need to put return statement first, as it may be confused with keywords 
  / _* @select_statement // select statement must come before functon call as it is more specific
  / _* @iteration_statement
	/ _* @statement _* statement_end
  / block

statement
  = initialization // initialization must come before declaration as it is more specific
	/ declaration 
  / expression
  / _* { return null }  // empty statement

// ========== Loops ============

iteration_statement
  = "do" _* body:block _* "while" _* "(" _* condition:expression _* ")" _* statement_end { return generateNode("DoWhileLoop", { condition, body }); } // dowhile loops need to end with a ';'
  / "while" _* "(" _* condition:expression _* ")" _* body:block { return generateNode("WhileLoop", { condition, body }); }
  / "for" _* "(" _* initialization:(statement)? _* ";" _* condition:expression? _* ";" _* update:expression? _* ")" _* body:block { return generateNode("ForLoop", { initialization, condition, update, body }); }


// ===========  Select Statement ===========

select_statement
  = ifBlock:if_block _* elseIfBlocks:(@else_if_block _*)* _* elseBlock:else_block? { return generateNode("SelectStatement", { ifBlock, elseIfBlocks, elseBlock }); }

if_block 
  = "if" _* "(" _* condition:expression _* ")" _* block:block { return generateNode("ConditionalBlock", { condition, block }); }

else_if_block 
  = "else" _+ @if_block

else_block
  = "else" _* @block


// ======== Declarations ========

declaration
  = function_declaration // function declaration must come first, as the first few symbols of func and var declarations are exactly the same, meaning var will always be
  / variable_declaration 

// returns an array of variable declarations 
declaration_list
	= variable_declaration|.., _* "," _*|

variable_declaration 
  = array_declaration
  / primaryDataType:type _+ name:identifier { return generateNode("VariableDeclaration", { dataType: createPrimaryDataType(primaryDataType), name }); }

array_declaration
  = primaryDataType:type _+ name:identifier _* "[" _* numElements:integer _*"]" { return generateNode("VariableDeclaration", { dataType: createArrayDataType(createPrimaryDataType(primaryDataType), parseInt(numElements)), name }); }  // match on array first as it is a more specific expression 


// ========= Function related nodes ==========

function_definition
	= returnType:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _* ")" _* body:block _* ";"* { return generateNode("FunctionDefinition", { returnType, name, parameters, body }); }
 
function_declaration
  = type:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _*")" { return generateNode("FunctionDeclaration", { returnType: type, name: name, parameters: parameters }); } 

function_return_type
  = type
  / "void" { return null; }

return_statement 
  = "return" _* expr:expression { return generateNode("ReturnStatement", { value: expr}); }
  / "return" { return generateNode("ReturnStatement"); } // can also return nothing 



// ========== Initializations ============

initialization
  = array_initialization // match on array first as it is a more specific expression
	/ primaryDataType:type _+ name:identifier _* "=" _* initializer:initializer { return generateNode("Initialization", { dataType: createPrimaryDataType(primaryDataType), name, initializer }); }

array_initialization
  = primaryDataType:type _+ name:identifier _* "[" _* numElements:integer _* "]" _* "=" _* initializer:list_initializer { return generateNode("Initialization", { dataType: createArrayDataType(createPrimaryDataType(primaryDataType), numElements), name, initializer }); }  
  / primaryDataType:type _+ name:identifier _* "[" _* "]" _* "=" _* initializer:list_initializer { return generateNode("Initialization", { dataType: createArrayDataType(createPrimaryDataType(primaryDataType), initializer.values.length), name, initializer }); }  

initializer
  = list_initializer
  / value:expression  { return createInitializerSingle(value); }

list_initializer
  = "{" _* list:list_initializer|.., _* "," _* | _* ("," / "") "}" { return createInitializerList(list); } // list initializer can end with extra comma


// ========== Expressions ========

expression
  = assignment

assignment
  = assignmentOperations:(@assignment_operation _*)+ _* "=" _* firstExpr:logical_or_expression { return createAssignmentTree(firstExpr, assignmentOperations); } 

assignment_operation
  = lvalue:logical_or_expression _* operator:("+" / "-" / "*" / "/" / "%" / "<<" / ">>" / "&" / "^" / "|") "=" { return { type: "CompoundAssignment", lvalue, operator }; }
  / lvalue:logical_or_expression _* "=" { return { type: "Assignment", lvalue }; }

// ======= Binary Expressions =======

// binary expressions are ordered by operator precedence (top is least precedence, bottom is highest precedence)
logical_or_expression
  = firstExpr:logical_and_expression tail:(_* @"||" _* @logical_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / logical_and_expression

logical_and_expression
  = firstExpr:bitwise_or_expression tail:(_* @"&&" _* @bitwise_or_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_or_expression

bitwise_or_expression
  = firstExpr:bitwise_xor_expression tail:(_* @("|") _* @bitwise_xor_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_xor_expression

bitwise_xor_expression 
  = firstExpr:bitwise_and_expression tail:(_* @("^") _* @bitwise_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_and_expression

bitwise_and_expression 
  = firstExpr:equality_relational_expression tail:(_* @("&") _* @equality_relational_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / equality_relational_expression

equality_relational_expression
  = firstExpr:relative_relational_expression tail:(_* @("!="/"==") _* @relative_relational_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / relative_relational_expression

relative_relational_expression
  = firstExpr:bitwise_shift_expression tail:(_* @("<="/">="/"<"/">") _* @bitwise_shift_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_shift_expression

bitwise_shift_expression
  = firstExpr:add_subtract_expression tail:(_* @("<<" / ">>") _* @add_subtract_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); } 
  / add_subtract_expression

add_subtract_expression
  = firstExpr:multiply_divide_expression tail:(_* @[+\-] _* @multiply_divide_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / multiply_divide_expression

multiply_divide_expression
  = firstExpr:prefix_expression tail:(_* @[%/*] _* @prefix_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / prefix_expression // as the last binary expression (highest precedence), this rule is needed

prefix_expression 
  = operations:(_* @prefix_operation)+ firstExpr:postfix_expression { return createPrefixExpressionNode(firstExpr, operations); }
  / postfix_expression

prefix_operation
  = operator:("++" / "--"){ return { type: "PrefixArithmeticExpression", operator }; }
  / operator:("+" / "-" / "!" / "~") { return { type: "PrefixExpression", operator }; }
  //TODO: add pointer stuff (& *) when pointer done, and sizeof

postfix_expression
  = firstExpr:primary_expression operations:(_* @postfix_operation)+ { return createPostfixExpressionNode(firstExpr, operations); }
  / primary_expression

// all the postfix operations
postfix_operation
  = operator:("++" / "--") { return { type: "PostfixArithmeticExpression", operator }; }
  / "(" _* args:function_argument_list _* ")" { return { type: "FunctionCall", args }; }
  / "[" _* index:expression _* "]" { return { type: "ArrayElementExpr", index }; }
//  / "." _* field:identifier { return } TODO: when doing structs
//  / "->" _* TODO: when structs and pointers are done

function_argument_list
  = expression|.., _* "," _*|

primary_expression
  = name:identifier { return generateNode("VariableExpr", { name }); } // for variables 
  / constant
  / "(" _* @expression _* ")"

single_line_comment
	= single_line_comment_body "\n" // this rule must be first as it is more specific

// for use at end of program. There a single-line-comment need not end with newline
single_line_comment_body
  = "//" (!"\n" source_c_set)* 

multi_line_comment
  = "/*" (!"*/" source_c_set)* "*/"

//=========== Constants =============

constant
	= floating_constant // must come first as floating and integer constant both can start with digit, but float more specific
  / integer_constant
  / character_constant
    
floating_constant
  = value:decimal_floating_constant suffix:("f" / "F" / "l" / "L" / "") { return generateNode("FloatConstant", { value: Number(value), suffix: suffix === "f" || suffix === "F" ? "f" : undefined }); }

integer_constant
	= value:integer suffix:("ul" / "Ul" / "UL" / "uL" / "l" / "L" / "u" / "U" / "ll" / "LL" / "") { return generateNode("IntegerConstant", { value: BigInt(value), suffix: suffix.length > 0 ? (suffix.toLowerCase() === "ll" ? "l" : suffix.toLowerCase()) : undefined }); } 

character_constant
  = "'" value:c_char "'" {return generateNode("IntegerConstant", { value }); } // value should already be a number

//=========== Characters ============

// All the possible C characters that can be in a source file
source_c_set
  = [a-z0-9!"#%&\'()*+,-./: ;<=>?\[\\\]^_{|}~ \n\t\v\f]i
  / extended_c_char
// 
c_char
  = char:[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i { return char.charCodeAt(0); }
  / extended_c_char
  / escape_sequence

// Characters not required to be in the basic character set, but should be supported.
extended_c_char
  = char:[@] { return char.charCodeAt(0); }

escape_sequence
  = simple_escape_sequence
  
simple_escape_sequence 
  = "\\\'"  { return 39; } 
  / "\\\""  { return 34; }
  / "\\?"   { return 63; }
  / "\\\\"  { return 92; }
  / "\\a"   { return 7; }
  / "\\b"   { return 8; }
  / "\\f"   { return 12; }
  / "\\n"   { return 10; }
  / "\\t"   { return 9; }
  / "\\v"   { return 11; }
  / "\\0"   { return 0; }

// =========== Misc ================

type 
	= float_type // check for float type first, due to "long double" needing to be checked before "long" by itself
  / signed_integer
  / unsigned_integer

signed_integer 
  = ("char" / "signed char") { return "signed char"; }
  / ("short" / "signed short") { return "signed short"; }
  / ("int" / "signed int") { return "signed int"; } 
  / (long_type / "signed " long_type) { return "signed long"; }

unsigned_integer
  = $"unsigned char"
  / $"unsigned short"
  / $"unsigned int"
  / $"unsigned long"

// long can be matched by multiple type keywords - all 8 bytes long in this compiler
long_type
  = "long long int"
  / "long long" 
  / "long int" 
  / "long"

float_type
  = "float"
  / ("double" / "long double") { return "double"; }

// identifiers must not start with a digit
// can only contain letters, digits or underscore
identifier
	= $([a-z_]i[a-z0-9_]i*)
    
// separator, must be at least whitespace or some comments
_ "separator"
  = single_line_comment
  / multi_line_comment
	/ whitespace

whitespace
	= [ \t\n]
  
// any continous space character that is not a newline
spaces
  = [ \t]*

statement_end
  = ";"+

integer
  = $[0-9]+

// =============== Floating constant related rules ===============

decimal_floating_constant
  = scientific_notation_floating_constant
  / fractional_constant

scientific_notation_floating_constant
  = $(fractional_constant ("E" / "e") ("+" / "-" / "") [0-9]+)
  / $([0-9]+ ("E" / "e") ("+" / "-" / "") [0-9]+)

fractional_constant
  = $([0-9]* "." $[0-9]+)

