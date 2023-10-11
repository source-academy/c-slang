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
}

program = arr:translation_unit { return generateNode("Root", {children: arr}); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = s:statement whitespace* t:translation_unit { return [s, ...t]; }
  / f:function_definition whitespace* t:translation_unit { return [f, ...t]; }
  / whitespace* { return []; }
    
statement
	= whitespace* @declaration whitespace* statement_end
  / whitespace* @compound_assignment whitespace* statement_end
  / whitespace* @initialization whitespace* statement_end
  / whitespace* fn:function_call statement_end { return generateNode("FunctionCallStatement", { name: fn.name, args: fn.args }); } // match a lone function call statement. Needed to generate a different C node.
  / whitespace* @expression whitespace* statement_end
  / whitespace* @assignment whitespace* statement_end
  / whitespace* @return_statement whitespace* statement_end

return_statement 
  = "return" whitespace* expr:expression { return generateNode("ReturnStatement", { value: expr}) } 

assignment
  = variable:variable_term whitespace* "=" whitespace* value:expression { return generateNode("Assignment", { variable, value }) }
    
block
	= "{" whitespace* s:block_item_list whitespace* "}" { return generateNode("Block", {children: s}); }
    
block_item_list
  = block_item |.., whitespace*|

block_item
	= statement
  / block

function_definition
	= whitespace* type:function_return_type _ name:identifier whitespace*  "(" whitespace* parameters:declaration_list whitespace* ")" whitespace* body:block whitespace* ";"* { return generateNode("FunctionDefinition", { returnType: type, name: name, parameters: parameters, body: body }); }

// returns an array of Declaration
declaration_list
	= declaration|.., whitespace* "," whitespace*|

declaration
  = function_declaration //function declaration must come first, as the first few symbols of func and var declarations are exactly the same, meaning var will always be
  / variable_declaration 

variable_declaration 
  = type:type _ name:identifier { return generateNode("VariableDeclaration", { variableType: type, name: name }); }

function_declaration
  = type:function_return_type _ name:identifier whitespace*  "(" whitespace* parameters:declaration_list whitespace*")" { return generateNode("FunctionDeclaration", { returnType: type, name: name, parameters: parameters }); } 

function_call
  = name:identifier whitespace* "(" whitespace* args:function_argument_list whitespace* ")" { return generateNode("FunctionCall", { name: name, args: args}); }

function_argument_list
  = expression|.., whitespace* "," whitespace*|

initialization
	= type:type _ name:identifier whitespace* "=" whitespace* value:expression { return generateNode("Initialization", { variableType: type, name: name, value: value }); }

compound_assignment
  = variable:variable_term whitespace* operator:[%/*+\-] "=" whitespace* value:expression { return generateNode("CompoundAssignment", { variable, operator, value }); }

expression
  = conditional_expression // try to match on conditonal first to ensure that a conditional is recognised when it exists
  / arithmetic_expression

conditional_expression 
  = or_conditional_expression
  / and_conditional_expression

or_conditional_expression
  = left:and_conditional_expression tail:(_ "||" _ @and_conditional_expression)+ { return generateNode("OrConditionalExpression", { exprs: [left, ...tail] }); }

and_conditional_expression
  = left:arithmetic_expression tail:(_ "&&" _ @arithmetic_expression)+ { return generateNode("AndConditionalExpression", { exprs: [left, ...tail] }); }
  / arithmetic_expression

arithmetic_expression
  = add_subtract_expression // match on add and subtract first, to ensure multiply/divide precedence 
  / multiply_divide_expression

add_subtract_expression
  = left:multiply_divide_expression tail:(_ @[+\-] _ @multiply_divide_expression)+ { return generateNode("ArithmeticExpression", { firstExpr: left, exprs: tail.map(arr => ({ type: "ArithmeticSubExpression", operator: arr[0], expr: arr[1] })) } )}
  
multiply_divide_expression
  = left:term tail:(_ @[%/*] _ @multiply_divide_expression)+ { return generateNode("ArithmeticExpression", { firstExpr: left, exprs: tail.map(arr => ({ type: "ArithmeticSubExpression", operator: arr[0], expr: arr[1] })) }); }
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
 
// match at least 1 whitespace
_ "whitespace"
	= whitespace+

// any ignorable whitespace character
whitespace
	= [ \t\n]
    
statement_end
  = ";"+