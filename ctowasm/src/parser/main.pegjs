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
   * Builds and returns a tree of operations which involves the 2 operaands (left and right expressions), and a operator 
   * @param firstExpr first expression in the operation expression e.g. "2" in "2 + 3 + 4"
   * @param exprsWithOperatorArr an array of arrays of size 2 which contain an operator in first index and the expr in 2nd index. e.g: [["+", 3], ["+", 4]]
   */
  function createBinaryExpressionNode(firstExpr, exprsWithOperatorArr) {
    let currNode = firstExpr;
    for (let i = 0; i < exprsWithOperatorArr.length - 1; ++i) {
      // create a new operation node
      currNode = {
        type: "BinaryOperationNode",
        leftExpr: currNode,
        rightExpr: exprsWithOperatorArr[i][1],
        operator: exprsWithOperatorArr[i][0]
      }
    }
    return {
      type: "BinaryOperationNode",
      leftExpr: currNode,
      rightExpr: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][1],
      operator: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][0]
    }
  }
}

program = arr:translation_unit  { return generateNode("Root", {children: arr}); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = _* s:declaration _* statement_end _* t:translation_unit { return [s, ...t]; }
  / _* i:initialization _* statement_end _* t:translation_unit { return [i, ...t]; }
  / _* f:function_definition _* t:translation_unit { return [f, ...t]; }
  / single_line_comment_body { return []; } // match a single line comment at end of program without newline ending it. this rule must come before the next as it is more specific
  / _* { return []; }


function_definition
	= returnType:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _* ")" _* body:block _* ";"* { return generateNode("FunctionDefinition", { returnType, name, parameters, body }); }
    
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
  = @initialization // initialization must come before declaration as it is more specific
	/ @declaration 
  / @compound_assignment 
  / @assignment
  / fn:function_call  { return generateNode("FunctionCallStatement", { name: fn.name, args: fn.args }); } // match a lone function call statement. Needed to generate a different C node.
  / expression // match on expression last so it does not interfere with other things like assignment
  / _* { return null }  // empty statement

iteration_statement
  = "do" _* body:block _* "while" _* "(" _* condition:expression _* ")" _* statement_end { return generateNode("DoWhileLoop", { condition, body }); } // dowhile loops need to end with a ';'
  / "while" _* "(" _* condition:expression _* ")" _* body:block { return generateNode("WhileLoop", { condition, body }); }
  / "for" _* "(" _* initialization:(statement)? _* ";" _* condition:expression? _* ";" _* update:expression? _* ")" _* body:block { return generateNode("ForLoop", { initialization, condition, update, body }); }

select_statement
  = ifBlock:if_block _* elseIfBlocks:(@else_if_block _*)* _* elseBlock:else_block? { return generateNode("SelectStatement", { ifBlock, elseIfBlocks, elseBlock }); }

if_block 
  = "if" _* "(" _* condition:expression _* ")" _* block:block { return generateNode("ConditionalBlock", { condition, block }); }

else_if_block 
  = "else" _+ @if_block

else_block
  = "else" _* @block

return_statement 
  = "return" _* expr:expression { return generateNode("ReturnStatement", { value: expr}); }
  / "return" { return generateNode("ReturnStatement"); } // can also return nothing 

assignment
  = variable:variable_term _* "=" _* value:expression { return generateNode("Assignment", { variable, value }); }

array_index_assignment
  = arrayElement:array_element_term _* "=" _* value:expression { return generateNode("ArrayIndexAssignment", { ...arrayElement, value }); }    

// returns an array of variable declarations 
declaration_list
	= variable_declaration|.., _* "," _*|

declaration
  = function_declaration //function declaration must come first, as the first few symbols of func and var declarations are exactly the same, meaning var will always be
  / variable_declaration 

variable_declaration 
  = array_declaration
  / variableType:type _+ name:identifier { return generateNode("VariableDeclaration", { variableType, name }); }

array_declaration
  = variableType:type _+ name:identifier _* "[" _* numElements:integer _*"]" { return generateNode("ArrayDeclaration", { variableType, name, numElements }); }  // match on array first as it is a more specific expression 

function_declaration
  = type:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _*")" { return generateNode("FunctionDeclaration", { returnType: type, name: name, parameters: parameters }); } 

function_call
  = name:identifier _* "(" _* args:function_argument_list _* ")" { return generateNode("FunctionCall", { name: name, args: args}); }

function_argument_list
  = expression|.., _* "," _*|

initialization
  = array_initialization // match on array first as it is a more specific expression
	/ type:type _+ name:identifier _* "=" _* value:expression { return generateNode("Initialization", { variableType: type, name: name, value: value }); }

array_initialization
  = variableType:type _+ name:identifier _* "[" _* numElements:integer _* "]" _* "=" _* elements:list_initializer { return generateNode("ArrayInitialization", { variableType, name, numElements, elements }); }  
  / variableType:type _+ name:identifier _* "[" _* "]" _* "=" _* elements:list_initializer { return generateNode("ArrayInitialization", { variableType, name, numElements: elements.length, elements }); }  

list_initializer
  = "{" _* @expression|.., _* "," _* | _* "}"

compound_assignment
  = variable:variable_term _* operator:[%/*+\-] "=" _* value:expression { return generateNode("Assignment", { variable, value: { type: "BinaryExpression", leftExpr: variable, rightExpr: value, operator } }); }

compound_assignment_expression
  = variable:variable_term _* operator:[%/*+\-] "=" _* value:expression { return generateNode("AssignmentExpression", { variable, value: { type: "BinaryExpression", leftExpr: variable, rightExpr: value, operator } }); }

expression = expr:expression_helper { return {...expr, isExpr: true }; } // helper rule to add "isExpr" to all expression nodes

expression_helper
  = assignment_expression 
  / compound_assignment_expression
  / logical_expression // start trying to match on conditional expression since && and || have lowest precedence

assignment_expression
  = variable:variable_term _* "=" _* value:expression { return generateNode("AssignmentExpression", { variable, value }); } 

logical_expression 
  = or_logical_expression
  / and_logical_expression

or_logical_expression
  = firstExpr:and_logical_expression tail:(_+ @"||" _+ @and_logical_expression)+ { createBinaryExpressionNode(firstExpr, tail); }

and_logical_expression
  = firstExpr:relational_expression tail:(_+ @"&&" _+ @relational_expression)+ { createBinaryExpressionNode(firstExpr, tail); }
  / relational_expression

relational_expression
  = equality_relational_expression
  / relative_relational_expression

equality_relational_expression
  = firstExpr:relative_relational_expression _* tail:(_* @("!="/"==") _* @relative_relational_expression)+ { createBinaryExpressionNode(firstExpr, tail); }

relative_relational_expression
  = firstExpr:arithmetic_expression _* tail:(_* @("<="/">="/"<"/">") _* @arithmetic_expression)+ { createBinaryExpressionNode(firstExpr, tail); }
  / arithmetic_expression

arithmetic_expression
  = add_subtract_expression // match on add and subtract first, to ensure multiply/divide precedence 
  / multiply_divide_expression

add_subtract_expression
  = firstExpr:multiply_divide_expression tail:(_+ @[+\-] _+ @multiply_divide_expression)+ { createBinaryExpressionNode(firstExpr, tail); }
  
multiply_divide_expression
  = firstExpr:term tail:(_+ @[%/*] _+ @multiply_divide_expression)+ { createBinaryExpressionNode(firstExpr, tail); }
  / term

term
  = prefix_expression
  / postfix_expression // must come before variable term as this is more specific
  / "(" @expression ")"
	/ constant
  / function_call
  / variable_term

variable_term
  = array_element_term
  / name:identifier { return generateNode("VariableExpr", { name }); } // for variables

// array element used as an experssion. like a[2]
array_element_term
  = name:identifier _* "[" _* index:expression _* "]" { return generateNode("ArrayElementExpr", { name, index }); } 

prefix_expression
  = "--" variable:variable_term { return generateNode("PrefixExpression", { operator: "--", variable: variable }); }
  / "++" variable:variable_term { return generateNode("PrefixExpression", { operator: "++", variable: variable }); }

postfix_expression
  = variable:variable_term "--" { return generateNode("PostfixExpression", { operator: "--", variable: variable }); } 
  / variable:variable_term "++" { return generateNode("PostfixExpression", { operator: "++", variable: variable }); }


function_return_type
  = type
  / "void" { return null; }

single_line_comment
	= single_line_comment_body "\n" // this rule must be first as it is more specific

// for use at end of program. There a single-line-comment need not end with newline
single_line_comment_body
  = "//" (!"\n" source_c_set)* 

multi_line_comment
  = "/*" (!"*/" source_c_set)* "*/"

//=========== Constants =============

constant
	= integer_constant
  / character_constant
    
integer_constant
  //TODO: add handling of unsigned and long constants
	= value:integer { return generateNode("Constant", { value } ); }

character_constant
  = "'" value:c_char "'" {return generateNode("Constant", { value }); } // value should already be a number

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
	= ("int" / "signed int") {return "signed int"; } 
  / ("char" / "signed char") { return "signed char"; }
  / (long_type / "signed " long_type) { return "signed long"; }

// long can be matched by multiple type keywords - all 8 bytes long in this compiler
long_type
  = "long long int"
  / "long long" 
  / "long int" 
  / "long"

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
  = value:$[0-9]+ { return parseInt(value); }