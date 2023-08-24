{{
  import {Root} from "../ast/nodes";
}}
// a translation unit represents a complete c program
translation_unit 
	= statement whitespace* translation_unit
    / function 	whitespace* translation_unit {return new Root()}
    / statement
    / function {return new Root()} 
    
statement
	= declaration ";"
    
block
	= "{" whitespace* compound_statement whitespace* "}"
    
compound_statement
	= statement|.., whitespace*|

function
	= type _ identifier whitespace*  "(" declaration_list ")" _ block

declaration 
	= type _ identifier whitespace* "=" whitespace* expression
    / type _ identifier

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
    


