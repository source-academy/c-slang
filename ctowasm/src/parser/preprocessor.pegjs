/*
 * Simple Preprocessor.
 * - Reduces comments to single whitespaces
 * - Removes backslash-newlines
 * - Reduces consecutive separators (comments and whitespace chars) to single whitespace for simplicity
 */

source_code = character:c_source_character_set* { return character.reduce((prv, c) => prv + c, ""); }

c_source_character_set 
	= string_literal // strings should be left untouched
	/ backslash_newline { return ""; }
	/ _+ { return " "; } // reduce consecutive separator characters to a single whitespace for simplicity
    / c_source_characters // characters that can be present anywhere in the program and are returned as is

string_literal
	= $('"' (!'"' .)* '"')
    
_ "separator"
  = single_line_comment
  / multi_line_comment
  / whitespace

backslash_newline = "\\\n" 

whitespace
	= [ \t\n\v\f]+

// for use at end of program. There a single-line-comment need not end with newline
single_line_comment
  = "//" (!"\n" .)* "\n" { return " "; }

multi_line_comment
  = "/*" (!"*/" .)* "*/" { return " "; }
  
c_source_characters
  = $[a-z0-9!"#%&'()*+,\-./:;<=>?[\]^_{|}~]i