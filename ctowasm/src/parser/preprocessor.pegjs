/*
 * Simple Preprocessor.
 * - Reduces comments to single whitespaces (leaves strings untouched)
 * - Removes backslash-newlines (replaces them with nothing)
 */
program = matches:preprocess_match* { return matches.join("").trim(); }

preprocess_match
  = comment { return " " }
  / $double_quoted_string
  / "\\\n" { return "" }
  / $(!"//" !"/*" !"\\\n" .)+

comment
  = single_line_comment
  / multi_line_comment

// for use at end of program.
// tehnically a single_line_comment should end with a newline, but the end of the program is allowed to have a single-line comment without ending with newline.
single_line_comment
  = "//" (!"\n" .)* 

multi_line_comment
  = "/*" (!"*/" .)* "*/"

double_quoted_string
	= '"' .* '"' { return '"' + chars.join("") + '"'; }

backslash_newline 
  = "\\\n" { return ""; }

whitespace
	= [ \t\n\v\f]+
