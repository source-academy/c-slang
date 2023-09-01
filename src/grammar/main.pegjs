{{
  /**
   * Helper function to create and return a unist Node with position information.
   */
  function generateNode(type, data) {
    const loc = location();
    return {
      type: type,
      data: data,
      position: {
        start: loc.start,
        end: loc.end
      }
    };
  }

  /**
   * Similar to generateNode, but generates a unist Parent node instead (a node that has children).
   */
  function generateParent(type, children, data) {
    const loc = location();
    return {
      type: type,
      children: children,
      data: data,
      position: {
        start: loc.start,
        end: loc.end
      }
    }; 
  }

  /**
   * Generates a unist Literal.
   */
  function generateLiteral(type, value, data) {
    const loc = location();
    return {
      type: type,
      value: value,
      data: data,
      position: {
        start: loc.start,
        end: loc.end
      }
    }; 
  }
}}

program = arr:translation_unit { return generateParent("Root", arr); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
	= s:statement whitespace* t:translation_unit { return [s, ...t] }
    / f:function_definition whitespace* t:translation_unit { return [f, ...t] }
    / whitespace* { return [] }
    
statement
	= whitespace* @declaration whitespace* ";"
  / whitespace* @initialization whitespace* ";"
  / whitespace* @expression whitespace* ";"
    
block
	= "{" whitespace* s:block_item_list whitespace* "}" { return generateParent("Block", s); }
    
block_item_list
  = block_item |.., whitespace*|

block_item
	= statement
  / block

function_definition
	= whitespace* type:type _ name:identifier whitespace*  "(" parameters:declaration_list ")" whitespace* "{" whitespace* body:block whitespace* "}" { return generateNode("FunctionDefinition", data: { returnType: type, name: name, parameters: parameters, body: body }); }

declaration
  = variable_declaration
  / function_declaration

variable_declaration 
  = type:type _ name:identifier { return generateNode("VariableDeclaration", data: { variableType: type, name: name }); }

function_declaration
  = type:type _ name:identifier whitespace*  "(" whitespace* parameters:declaration_list whitespace*")" { return generateNode("FunctionDeclaration", { returnType: type, name: name, parameters: parameters }); } 

function_call
  = name:identifier whitespace* "(" whitespace* args:function_argument_list whitespace* ")" { return generateNode("FunctionCall", { name: name, args: args}); }

function_argument_list
  = expression|.., whitespace* "," whitespace*|

initialization
	= type:type _ name:identifier whitespace* "=" whitespace* value:expression { return generateNode("Initialization", { variableType: type, name: name, value: value }); }

// returns an array of Declaration
declaration_list
	= declaration|.., whitespace* "," whitespace*|
    
expression
	= literal 
  / function_call

type 
	= $"int"

// identifiers must not start with a digit
// can only contain letters, digits or underscore
identifier
	= $([a-z_]i[a-z0-9_]i*)
    
literal
	= i:integer { return generateLiteral("Integer", i) }
    
integer
	= $[0-9]+
 
// match at least 1 whitespace
_ "whitespace"
	= whitespace+

// any ignorable whitespace character
whitespace
	= [ \t\n]
    


