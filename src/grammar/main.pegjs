{{
  import { Root, Block, Function, Initialization, Declaration } from "../ast/nodes";
}}

program = arr:translation_unit { return new Root(arr); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
	= statement whitespace* translation_unit
    / function 	whitespace* translation_unit
    / s:statement { return [s];}
    / f:function { return [f]; } 
    
statement
	= @declaration ";"
  / @initialization ";"
    
block
	= "{" whitespace* s:compound_statement whitespace* "}" { return new Block(s); }
    
// returns an array of Statements
compound_statement
	= statement|.., whitespace*|

function
	= type:type _ name:identifier whitespace*  "(" parameters:declaration_list ")" _ body:block { return new Function(type, name, parameters, body); }

declaration 
  = type:type _ variable:identifier { return new Declaration(type, variable); }

initialization
	= type:type _ variable:identifier whitespace* "=" whitespace* value:expression { return new Initialization(type, variable, value); }

// returns an array of Declaration
declaration_list
	= declaration|.., whitespace* "," whitespace*|
    
expression
	= constant

type 
	= $"int"

// identifiers must not start with a digit
// can only contain letters, digits or underscore
identifier
	= $([a-z_]i[a-z0-9_]i*)
    
constant
	= integer
    
integer
	= $[0-9]+
 
// match at least 1 whitespace
_ "whitespace"
	= whitespace+

// any ignorable whitespace character
whitespace
	= [ \t\n]
    


