/*
 * Performs lexing functionality, producing a string of tokens separated by a single whitespace, to ease parsing.
 */


program = matches:preprocess_match* { return matches.join("").trim(); }

preprocess_match
  = token:$token { return token + " "; }
  / _+ { return ""; } // remove excess whitespaces

_ "separator" // whitespace characters that separate tokens
	= [ \t\n\v\f]+

// ======================================================
// ================= LEXICAL GRAMMAR ====================
// ======================================================

source_character_set
  = $[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i 
  / extended_source_character_set

// some additional characters to support
extended_source_character_set
  = "@"

token
  = include
  / keyword 
  / identifier
  / constant 
  / string_literal 
  / punctuator 

include  // custom keyword for specifying modules to import
  = "#include <" identifier ">"

keyword  // must be ordered in descending order of length, as longer keywords take precedence in matching
  = "_Static_assert"/"_Thread_local"/"_Imaginary"/"_Noreturn"/"continue"/"register"/"restrict"/"unsigned"/"volatile"/"_Alignas"/"_Alignof"/"_Complex"/"_Generic"/"default"/"typedef"/"_Atomic"/"extern"/"inline"/"double"/"return"/"signed"/"sizeof"/"static"/"struct"/"switch"/"break"/"float"/"const"/"short"/"union"/"while"/"_Bool"/"auto"/"case"/"char"/"goto"/"long"/"else"/"enum"/"void"/"for"/"int"/"if"/"do"
identifier
  = [a-z_]i[a-z0-9_]i*

// ====================== Constants ======================
// =======================================================

constant
  = floating_constant // floating constant must come first as it is more specific (longer match takes precedence, and start of float_constant can be an integer_constant.
  / integer_constant
  / enumeration_constant 
  / character_constant 

// ====================== Integer Constants ======================

integer_constant
  = ( decimal_constant / octal_constant / hexadecimal_constant / "0" ) integer_suffix?

decimal_constant 
  = nonzero_digit digit*

nonzero_digit
  = $[1-9]

digit 
  = $[0-9]

octal_constant
  = "0" octal_digit+

octal_digit
  = $[0-7]

hexadecimal_constant 
  = hexadecimal_prefix hexadecimal_digit+

hexadecimal_prefix 
  = "0x" / "0X"

hexadecimal_digit 
  = $[0-9A-F]i

integer_suffix
  = unsigned_suffix long_long_suffix // must come first to be as long_long_suffix is more specific than long_suffix
  / unsigned_suffix long_suffix?
  / long_long_suffix unsigned_suffix?
  / long_suffix unsigned_suffix?

unsigned_suffix
  = "u" / "U"

long_suffix 
  = "l" / "L"

long_long_suffix 
  = "ll" / "LL"

// =======================================================

// ================== Floating Constants =================

floating_constant 
  = decimal_floating_constant 

decimal_floating_constant
  = fractional_constant exponent_part? floating_suffix?
  / digit+ exponent_part floating_suffix?

fractional_constant
  = digit* "." digit+ 
  / digit+ "."

exponent_part
  = ("e" / "E") ("+" / "-")? digit+

floating_suffix 
  = [fl]i

// =======================================================

enumeration_constant
  = identifier

// ================== Character Constants =================

character_constant
  = "'" value:c_char "'"

c_char 
  = [a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i  // any member of source character set except ', \ and newline
  / escape_sequence

escape_sequence
  = simple_escape_sequence
  / octal_escape_sequence
  / hexadecimal_escape_sequence

simple_escape_sequence
  = "\\\'" / "\\\"" / "\\?" / "\\\\"  / "\\a" / "\\b"  / "\\f"   / "\\r"/ "\\n"   / "\\t"   / "\\v"   

octal_escape_sequence
  = "\\" octal_digit|1..3|

hexadecimal_escape_sequence
  = "\\x" hexadecimal_digit|1..2|

// ======================================================
  
// ================== String Literals ===================

string_literal
  = '"' s_char* '"'

s_char
  = [a-z0-9!'#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i // any member of source character set except ", \ and newline 
  / escape_sequence

// ======================================================

punctuator // ordered by number of chars in the punctuator, as longer punctuators must take precedence in matching
  = "%:%:"
  / "..." / "<<=" / ">>=" 
  / "++" / "--" / "+=" / "-=" / "*=" / "/=" / "%="  / "&=" / "^=" 
  / "|=" / "==" / "!=" / "<=" / ">=" / ">>" / "<<" / "->" / "&&" / "||"
  / "##" / "%:" / "<:" / ":>" / "<%" / "%>"
  / "[" / "]" / "(" / ")" / "{" / "}" / "." / "&" / "*" / "+" / "-" / "~" 
  / "!" / "/" / "%" / "<" / ">" / "^" / "|" / "?" / ":" / ";" / "=" / "," / "#"