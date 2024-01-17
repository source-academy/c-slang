/*
 * Simple Preprocessor.
 * - Reduces comments to single whitespaces
 * - Removes backslash-newlines
 * - Reduces consecutive separators (comments and whitespace chars) to single whitespace for simplicity
 */


// separate all tokens by a space, unless if was backslash-newline
source_code = tokens:token* { return tokens.join("").trim(); }

// wrap each possible token with whitespace, this way the C preprocessor functions something like a "lexer" to produce "tokens" in one single string
token
	= s:string_literal { return s + " "} // strings should be left untouched
  / c:constant { return c +  " "; }
  / s:identifier_or_keyword { return s + " "; }
  / _* p:punctuator _* { return p + " "; }
  / _+ { return ""; } // reduce consecutive separator characters to a single whitespace for simplicity
  

string_literal
	= '"' chars:string_char* '"' { return '"' + chars.join("") + '"'; }

string_char
	= $(!'"'!backslash_newline .)
    / backslash_newline
    
_ "separator"
  = single_line_comment
  / multi_line_comment
  / whitespace

backslash_newline 
  = "\\\n" { return ""; }

whitespace
	= [ \t\n\v\f]+

// for use at end of program.
// tehnically a single_line_comment should end with a newline, but the end of the program is allowed to have a single-line comment without ending with newline.
single_line_comment
  = "//" (!"\n" .)*

multi_line_comment
  = "/*" (!"*/" .)* "*/"
  
punctuator // non alphanumeric (and no underscore) characters, these will be separated into separate tokens by surrounding with whitespace
// match on multi char punctuators first as per C standard of generating the longest possible lexeme (no backtracking)
  = multi_char_punctuator
  / $[!"#%&'()*+,\-./:;<=>?[\]^{|}~]
  / $extended_punctuator

extended_punctuator
  = "@"

multi_char_punctuator 
  // specifically match specific operator chars together
  = "%:%:"
  / "..." / "<<=" / ">>=" 
  / "++" / "--" / "+=" / "-=" / "*=" / "/=" / "%="  / "&=" / "^=" / "|=" / "==" / "!=" / "<=" / ">=" / ">>" / "<<" / "->" / "&&" / "||"
  / "##" / "%:" / "<:" / ":>" / "<%" / "%>"

// all the characters that may be grouped together to form a valid identifier or keyword token
identifier_or_keyword
  = $identifier_char+
  
identifier_char
  = $[a-z0-9_]i
  / backslash_newline { return "" }


//=========== Constants =============
// need to include constant rules both here and in parser.pegjs, as constant characters must be kept together as one token, thus they must be recognised by the preprocessor.

constant
	= floating_constant // must come first as floating and integer constant both can start with digit, but float more specific
  / integer_constant
  / character_constant
    
floating_constant
  = $(decimal_floating_constant ("f" / "F" / "l" / "L" / "")) 

integer_constant
	= $(integer ("ul" / "Ul" / "UL" / "uL" / "l" / "L" / "u" / "U" / "ll" / "LL" / ""))

integer
  = $[0-9]+

character_constant
  = $("'" c_char "'")


c_char 
  = $[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i 
  / extended_c_char_set
  / escape_sequence

escape_sequence 
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

// Characters not required to be in the basic character set, but should be supported.
extended_c_char_set
  = "@"

// =============== Floating constants ===============

decimal_floating_constant
  = scientific_notation_floating_constant
  / fractional_constant

scientific_notation_floating_constant
  = $(fractional_constant ("E" / "e") ("+" / "-" / "") [0-9]+)
  / $([0-9]+ ("E" / "e") ("+" / "-" / "") [0-9]+)

fractional_constant
  = $([0-9]* "." $[0-9]+)



