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
    / _* p:punctuator _* { return p + " "; }
    / s:identifier_or_keyword { return s + " "; }
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

// for use at end of program. There a single-line-comment need not end with newline
single_line_comment
  = "//" (!"\n" .)* "\n"

multi_line_comment
  = "/*" (!"*/" .)* "*/"
  
punctuator // non alphanumeric (and no underscore) characters, these will be separated into separate tokens by surrounding with whitespace
// match on multi char punctuators first as per C standard of generating the longest possible lexeme (no backtracking)
  = multi_char_punctuator
  / $[!"#%&'()*+,\-./:;<=>?[\]^_{|}~]

multi_char_punctuator 
  // specifically match specific operator chars together
  = "%:%:"
  / "..." / "<<=" / ">>=" 
  / "++" / "--" / "+=" / "-=" / "*=" / "/=" / "%="  / "&=" / "^=" / "|=" / "==" / "!=" / "<=" / ">=" / ">>" / "<<" / "->" / "&&" / "||"
  / "##" / "%:" / "<:" / ":>" / "<%" / "%>"

// all the characters that may be grouped together to form a valid identifier or keyword token
identifier_or_keyword
  = chars:identifier_char+ { return chars.join(""); }
  
identifier_char
  = $[a-z0-9_]i
  / backslash_newline { return "" }