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
	= type:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _* ")" _* body:block _* ";"* { return generateNode("FunctionDefinition", { returnType: type, name: name, parameters: parameters, body: body }); }
    
block
	= "{" _* s:block_item_list _* "}" { return generateNode("Block", {children: s}); }
    
block_item_list
  = block_item |.., _*|

block_item
  = _* @select_statement // select statement must come before functon call as it is more specific
  / _* @iteration_statement
	/ _* @statement _* statement_end
  / _* @return_statement _* statement_end
  / block

statement
  = @initialization // initialization must come before declaration as it is more specific
	/ @declaration 
  / @compound_assignment 
  / @assignment
  / fn:function_call  { return generateNode("FunctionCallStatement", { name: fn.name, args: fn.args }); } // match a lone function call statement. Needed to generate a different C node.
  / @expression // match on expression last so it does not interfere with other things like assignment
  / _*  // empty statement

iteration_statement
  = "do" _* body:block _* "while" _* "(" _* condition:expression _* ")" { return generateNode("DoWhileLoop", { condition, body }); }
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
  = "return" _* expr:expression { return generateNode("ReturnStatement", { value: expr}) }
  / "return" { return generateNode("ReturnStatement") } // can also return nothing 

assignment
  = variable:variable_term _* "=" _* value:expression { return generateNode("Assignment", { variable, value }) }
    
// returns an array of Declaration
declaration_list
	= declaration|.., _* "," _*|

declaration
  = function_declaration //function declaration must come first, as the first few symbols of func and var declarations are exactly the same, meaning var will always be
  / variable_declaration 

variable_declaration 
  = type:type _+ name:identifier { return generateNode("VariableDeclaration", { variableType: type, name: name }); }

function_declaration
  = type:function_return_type _+ name:identifier _*  "(" _* parameters:declaration_list _*")" { return generateNode("FunctionDeclaration", { returnType: type, name: name, parameters: parameters }); } 

function_call
  = name:identifier _* "(" _* args:function_argument_list _* ")" { return generateNode("FunctionCall", { name: name, args: args}); }

function_argument_list
  = expression|.., _* "," _*|

initialization
	= type:type _+ name:identifier _* "=" _* value:expression { return generateNode("Initialization", { variableType: type, name: name, value: value }); }

compound_assignment
  = variable:variable_term _* operator:[%/*+\-] "=" _* value:expression { return generateNode("CompoundAssignment", { variable, operator, value }); }

compound_assignment_expression
  = variable:variable_term _* operator:[%/*+\-] "=" _* value:expression { return generateNode("CompoundAssignmentExpression", { operator, variable, value }); } 

expression
  = assignment_expression 
  / compound_assignment_expression
  / conditional_expression // start trying to match on conditional expression since && and || have lowest precedence

assignment_expression
  = variable:variable_term _* "=" _* value:expression { return generateNode("AssignmentExpression", { variable, value }); } 

conditional_expression 
  = or_conditional_expression
  / and_conditional_expression

or_conditional_expression
  = left:and_conditional_expression tail:(_+ "||" _+ @and_conditional_expression)+ { return generateNode("ConditionalExpression", { conditionType: "or", exprs: [left, ...tail] }); }

and_conditional_expression
  = left:comparison_expression tail:(_+ "&&" _+ @comparison_expression)+ { return generateNode("ConditionalExpression", { conditionType: "and", exprs: [left, ...tail] }); }
  / comparison_expression

comparison_expression
  = equality_comparison_expression
  / relative_comparison_expression

equality_comparison_expression
  = firstExpr:relative_comparison_expression _* tail:(_* @("!="/"==") _* @relative_comparison_expression)+ { return generateNode("ComparisonExpression", { firstExpr, exprs: tail.map(arr => ({ type: "ComparisonSubExpression", operator: arr[0], expr: arr[1] })) }); }

relative_comparison_expression
  = firstExpr:arithmetic_expression _* tail:(_* @("<="/">="/"<"/">") _* @arithmetic_expression)+ { return generateNode("ComparisonExpression", { firstExpr, exprs: tail.map(arr => ({ type: "ComparisonSubExpression", operator: arr[0], expr: arr[1] })) }); }
  / arithmetic_expression

arithmetic_expression
  = add_subtract_expression // match on add and subtract first, to ensure multiply/divide precedence 
  / multiply_divide_expression

add_subtract_expression
  = left:multiply_divide_expression tail:(_+ @[+\-] _+ @multiply_divide_expression)+ { return generateNode("ArithmeticExpression", { firstExpr: left, exprs: tail.map(arr => ({ type: "ArithmeticSubExpression", operator: arr[0], expr: arr[1] })) } )}
  
multiply_divide_expression
  = left:term tail:(_+ @[%/*] _+ @multiply_divide_expression)+ { return generateNode("ArithmeticExpression", { firstExpr: left, exprs: tail.map(arr => ({ type: "ArithmeticSubExpression", operator: arr[0], expr: arr[1] })) }); }
  / term

term
  = prefix_expression
  / postfix_expression // must come before variable term as this is more specific
  / "(" @expression ")"
	/ literal
  / function_call
  / variable_term

variable_term
  = name:identifier { return generateNode("VariableExpr", { name: name }); } // for variables

prefix_expression
  = "--" variable:variable_term { return generateNode("PrefixExpression", { operator: "--", variable: variable }); }
  / "++" variable:variable_term { return generateNode("PrefixExpression", { operator: "++", variable: variable }); }

postfix_expression
  = variable:variable_term "--" { return generateNode("PostfixExpression", { operator: "--", variable: variable }); } 
  / variable:variable_term "++" { return generateNode("PostfixExpression", { operator: "++", variable: variable }); }

type 
	= $"int"

function_return_type
  = type
  / $"void"

// identifiers must not start with a digit
// can only contain letters, digits or underscore
identifier
	= $([a-z_]i[a-z0-9_]i*)
    
literal
	= i:integer { return generateNode("Integer", {value: Number(i)}) }
    
integer
	= $[0-9]+
 
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

single_line_comment
	= single_line_comment_body "\n" // this rule must be first as it is more specific

// for use at end of program. There a single-line-comment need not end with newline
single_line_comment_body
  = "//" (!"\n" c_char)* 

multi_line_comment
  = "/*" (!"*/" c_char)* "*/"

// all the characters im the c char set
c_char
  = [a-z0-9 \t\n\v\f\r\`\~\@\!\$\#\^\*\%\&\(\)\[\]\{\}\<\>\+\=\_\-\|\/\\\;\:\'\“\,\.\?]i