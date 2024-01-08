/*
 * Simple Preprocessor.
 * - Reduces comments to single whitespaces
 * - Removes backslash-newlines
 * - Reduces consecutive separators (comments and whitespace chars) to single whitespace for simplicity
 */

{
  function createStringOfTokens(tokens) {
    let tokenStr = "";
    let prv = null;
    for (const token of tokens) {
      if (token === "") {
        // ignore empty tokens from whitespaces
        continue;
      }
      if (prv === "\\n") {
        // join to previous token
        tokenStr += token;
      } else {
        tokenStr += " " + token; // add separating @ between tokenStr
      }
      prv = token;
    }
    return tokenStr.trim();
  }
}

// separate all tokens by a space, unless if was backslash-newline
source_code = tokens:token* { return createStringOfTokens(tokens); }

// wrap each possible token with whitespace, this way the C preprocessor functions something like a "lexer" to produce "tokens" in one single string
token
	= string_literal// strings should be left untouched
	/ backslash_newline+ { return "\\n" }
	/ _+ { return ""; } // reduce consecutive separator characters to a single whitespace for simplicity
  / identifier_or_keyword
  / punctuator

string_literal
	= $('"' (!'"' .)* '"')
    
_ "separator"
  = single_line_comment
  / multi_line_comment
  / whitespace

backslash_newline 
  = "\\\n" 

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
  = $[a-z0-9_]i+
