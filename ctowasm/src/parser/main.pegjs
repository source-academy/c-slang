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
  / whitespace* @initialization whitespace* statement_end
  / whitespace* @expression whitespace* statement_end
  / whitespace* @assignment whitespace* statement_end
  / whitespace* @return_statement whitespace* statement_end

return_statement 
  = "return" whitespace* expr:expression { return generateNode("ReturnStatement", { value: expr}) } 

assignment
  = name:identifier whitespace* "=" whitespace* expr:expression { return generateNode("Assignment", { name: name, value: expr }) }
    
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

expression
	= literal 
  / function_call
  / name:identifier { return generateNode("VariableExpr", { name: name }); } // for variables

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

