{
  function isObject(value) {
    return (
      typeof value === "object" &&
      !Array.isArray(value) &&
      value !== null &&
      !("type" in value)
    );
  }

  function makeNode(type, value = null) {
    const l = location();
    const node = {
      start: l["start"],
      end: l["end"],
      src: text(),
      type,
    };
    if (isObject(value)) {
      return { ...node, ...value };
    }
    return { ...node, value };
  }

  function makeBinaryExpNode(a, b) {
    if (b.length == 0) return a;
    const [op, right] = b.pop();
    return makeNode("BinaryExpr", {
      left: makeBinaryExpNode(a, b),
      op,
      right,
    });
  }

  function throwNotImplemented(details = "") {
    error("not implemented" + (details ? ": " + details : ""));
  }

  const typedefNames = [[]];

  function enterBlock() {
    typedefNames.push([]);
  }

  function exitBlock() {
    typedefNames.pop();
  }

  function addTypedefName(name) {
    typedefNames[typedefNames.length - 1].push(name);
  }

  function isTypedefName(name) {
    for (let i = typedefNames.length - 1; i >= 0; i--) {
      for (const j of typedefNames[i]) {
        if (name === j) return true;
      }
    }
    return false;
  }
}

start
  = TranslationUnit 

// ==========
// A.1.1 Lexical elements
// ==========

// (6.4.1) token
Token
  = (
        Keyword
      / Identifier
      / Constant
      / StringLiteral
      / Punctuator
    )
    _

// (6.4.3) ...tokens can be separated by white space; this consists of comments, or white-space characters, or both...
_ "whitespace"
  = (WhiteSpace / LongComment / LineComment)*

// (6.4.3) ...white-space characters (space, horizontal tab, new-line, vertical tab, and formfeed)...
WhiteSpace
  = [ \n\r\t\u000B\u000C]

// (6.4.9.1)
LongComment
  = "/*" (!"*/".)* "*/"

// (6.4.9.2)
LineComment
  = "//" (!"\n" .)*

// ==========
// A.1.2 Keywords
// ==========

// (6.4.1) keyword
Keyword
  = (   
        "auto"
      / "break"
      / "case"
      / "char"
      / "const"
      / "continue"
      / "default"
      / "do"
      / "double"
      / "else"
      / "enum"
      / "extern"
      / "float"
      / "for"
      / "goto"
      / "if"
      / "inline"
      / "int"
      / "long"
      / "register"
      / "restrict"
      / "return"
      / "short"
      / "signed"
      / "sizeof"
      / "static"
      / "struct"
      / "switch"
      / "typedef"
      / "union"
      / "unsigned"
      / "void"
      / "volatile"
      / "while"
      / "_Alignas"
      / "_Alignof"
      / "_Atomic"
      / "_Bool"
      / "_Complex"
      / "_Generic"
      / "_Imaginary"
      / "_Noreturn"
      / "_Static_assert"
      / "_Thread_local"
    )
    !(IdentifierNondigit / Digit)
    _

AUTO          = a:"auto"            !(IdentifierNondigit / Digit) _ { return a; }
BREAK         = a:"break"           !(IdentifierNondigit / Digit) _ { return a; }
CASE          = a:"case"            !(IdentifierNondigit / Digit) _ { return a; }
CHAR          = a:"char"            !(IdentifierNondigit / Digit) _ { return a; }
CONST         = a:"const"           !(IdentifierNondigit / Digit) _ { return a; }
CONTINUE      = a:"continue"        !(IdentifierNondigit / Digit) _ { return a; }
DEFAULT       = a:"default"         !(IdentifierNondigit / Digit) _ { return a; }
DO            = a:"do"              !(IdentifierNondigit / Digit) _ { return a; }
DOUBLE        = a:"double"          !(IdentifierNondigit / Digit) _ { return a; }
ELSE          = a:"else"            !(IdentifierNondigit / Digit) _ { return a; }
ENUM          = a:"enum"            !(IdentifierNondigit / Digit) _ { return a; }
EXTERN        = a:"extern"          !(IdentifierNondigit / Digit) _ { return a; }
FLOAT         = a:"float"           !(IdentifierNondigit / Digit) _ { return a; }
FOR           = a:"for"             !(IdentifierNondigit / Digit) _ { return a; }
GOTO          = a:"goto"            !(IdentifierNondigit / Digit) _ { return a; }
IF            = a:"if"              !(IdentifierNondigit / Digit) _ { return a; }
INLINE        = a:"inline"          !(IdentifierNondigit / Digit) _ { return a; }
INT           = a:"int"             !(IdentifierNondigit / Digit) _ { return a; }
LONG          = a:"long"            !(IdentifierNondigit / Digit) _ { return a; }
REGISTER      = a:"register"        !(IdentifierNondigit / Digit) _ { return a; }
RESTRICT      = a:"restrict"        !(IdentifierNondigit / Digit) _ { return a; }
RETURN        = a:"return"          !(IdentifierNondigit / Digit) _ { return a; }
SHORT         = a:"short"           !(IdentifierNondigit / Digit) _ { return a; }
SIGNED        = a:"signed"          !(IdentifierNondigit / Digit) _ { return a; }
SIZEOF        = a:"sizeof"          !(IdentifierNondigit / Digit) _ { return a; }
STATIC        = a:"static"          !(IdentifierNondigit / Digit) _ { return a; }
STRUCT        = a:"struct"          !(IdentifierNondigit / Digit) _ { return a; }
SWITCH        = a:"switch"          !(IdentifierNondigit / Digit) _ { return a; }
TYPEDEF       = a:"typedef"         !(IdentifierNondigit / Digit) _ { return a; }
UNION         = a:"union"           !(IdentifierNondigit / Digit) _ { return a; }
UNSIGNED      = a:"unsigned"        !(IdentifierNondigit / Digit) _ { return a; }
VOID          = a:"void"            !(IdentifierNondigit / Digit) _ { return a; }
VOLATILE      = a:"volatile"        !(IdentifierNondigit / Digit) _ { return a; }
WHILE         = a:"while"           !(IdentifierNondigit / Digit) _ { return a; }
ALIGNAS       = a:"_Alignas"        !(IdentifierNondigit / Digit) _ { return a; }
ALIGNOF       = a:"_Alignof"        !(IdentifierNondigit / Digit) _ { return a; }
ATOMIC        = a:"_Atomic"         !(IdentifierNondigit / Digit) _ { return a; }
BOOL          = a:"_Bool"           !(IdentifierNondigit / Digit) _ { return a; }
COMPLEX       = a:"_Complex"        !(IdentifierNondigit / Digit) _ { return a; }
GENERIC       = a:"_Generic"        !(IdentifierNondigit / Digit) _ { return a; }
IMAGINARY     = a:"_Imaginary"      !(IdentifierNondigit / Digit) _ { return a; }
NORETURN      = a:"_Noreturn"       !(IdentifierNondigit / Digit) _ { return a; }
STATICASSERT  = a:"_Static_assert"  !(IdentifierNondigit / Digit) _ { return a; }
THREADLOCAL   = a:"_Thread_local"   !(IdentifierNondigit / Digit) _ { return a; }

// ==========
// A.1.3 Identifiers
// ==========

// (6.4.2.1) identifier
Identifier
  = !Keyword
    a:IdentifierNondigit
    b:(IdentifierNondigit / Digit)*
    _
    { return a + b.join(""); }

// (6.4.2.1) identifier-nondigit
IdentifierNondigit
  = Nondigit
  / UniversalCharacterName

// (6.4.2.1) nondigit
Nondigit
  = [a-z]
  / [A-Z]
  / [_]

// (6.4.2.1) digit
Digit
  = [0-9]

// ==========
// A.1.4 Universal character names
// ==========

// (6.4.3) universal-character-name
UniversalCharacterName
  = "\\u" a:HexQuad
    { return eval('"\\u' + a.join('') + '"'); }
  / "\\U" a:HexQuad b:HexQuad
    { return eval('"\\U' + a.join('') + b.join('') + '"'); }

// (6.4.3) hex-quad
HexQuad
  = HexadecimalDigit HexadecimalDigit HexadecimalDigit HexadecimalDigit

// ==========
// A.1.5 Constants
// ==========

// (6.4.4) constant
Constant
  = a:(
        FloatingConstant
      / IntegerConstant
      / EnumerationConstant
      / CharacterConstant
    )
    _
    { return a; }

// (6.4.4.1) integer-constant
IntegerConstant
  = a:(DecimalConstant / HexadecimalConstant / OctalConstant)
    b:IntegerSuffix?
    {
      return makeNode("IntegerConstant", {
        value: a.value,
        isDecimal: a.isDecimal,
        suffix: b || {}
      });
    }

// (6.4.4.1) decimal-constant
DecimalConstant
  = a:NonzeroDigit b:Digit*
    { return { isDecimal: true, value: BigInt(a + b.join("")) }; }

// (6.4.4.1) octal-constant
OctalConstant
  = "0" a:OctalDigit*
    {
      if (a.length == 0) return { isDecimal: false, value: BigInt(0) };
      return { isDecimal: false, value: BigInt("0o" + a.join("")) };
    }

// (6.4.4.1) hexadecimal-constant
HexadecimalConstant
  = HexadecimalPrefix a:HexadecimalDigit+
    { return { isDecimal: false, value: BigInt("0x" + a.join("")) }; }

// (6.4.4.1) hexadecimal-prefix
HexadecimalPrefix
  = "0x"
  / "0X"

// (6.4.4.1) nonzero-digit:
NonzeroDigit
  = [1-9]

// (6.4.4.1) octal-digit
OctalDigit
  = [0-7]

// (6.4.4.1) hexadecimal-digit
HexadecimalDigit 
  = [0-9]
  / [a-f]
  / [A-F]

// (6.4.4.1) integer-suffix
IntegerSuffix
  = a:UnsignedSuffix b:(LongLongSuffix / LongSuffix)?
    { 
      if (b) return { ...a, ...b };
      return a;
    }
  / a:(LongLongSuffix / LongSuffix) b:UnsignedSuffix?
    { 
      if (b) return { ...a, ...b };
      return a;
    }

// (6.4.4.1) unsigned-suffix
UnsignedSuffix
  = [uU]
    { return { unsigned: true }; }

// (6.4.4.1) long-suffix
LongSuffix
  = [lL]
    { return { long: true }; }

// (6.4.4.1) long-long-suffix
LongLongSuffix
  = "ll"
    { return { longLong: true }; }
  / "LL"
    { return { longLong: true }; }

// (6.4.4.2) floating-constant
FloatingConstant
  = DecimalFloatingConstant
    { throwNotImplemented("decimal floating constant"); }
  / HexadecimalFloatingConstant
    { throwNotImplemented("hex floating constant"); }

// (6.4.4.2) decimal-floating-constant
DecimalFloatingConstant
  = a:FractionalConstant b:ExponentPart? FloatingSuffix?
    { return Number(a + (b || '')); }
  / a:DigitSequence b:ExponentPart FloatingSuffix?
    { return Number(a.join('') + b); }

// (6.4.4.2) hexadecimal-floating-constant
HexadecimalFloatingConstant
  = a:HexadecimalPrefix
    b:HexadecimalFractionalConstant
    c:BinaryExponentPart
    FloatingSuffix?
    { return makeNode("HexadecimalFloatingConstant", a + b + c); }
  / a:HexadecimalPrefix
    b:HexadecimalDigitSequence
    c:BinaryExponentPart
    FloatingSuffix?
    { return makeNode("HexadecimalFloatingConstant", a + b + c); }

// (6.4.4.2) fractional-constant
FractionalConstant
  = a:DigitSequence? "." b:DigitSequence
    { return a.join('') + '.' + b.join(''); }
  / a:DigitSequence "."
    { return a.join(''); }

// (6.4.4.2) exponent-part
ExponentPart
  = a:[eE] b:Sign? c:DigitSequence
    { return a + (b || "") + c.join(''); }

// (6.4.4.2) sign
Sign
  = [+-]

// (6.4.4.2) digit-sequence
DigitSequence
  = Digit+

// (6.4.4.2) hexadecimal-fractional-constant
HexadecimalFractionalConstant
  = a:HexadecimalDigitSequence? "." b:HexadecimalDigitSequence
    { return a.join("") + "." + b.join(""); }
  / a:HexadecimalDigitSequence "."
    { return a.join(""); }

// (6.4.4.2) binary-exponent-part
BinaryExponentPart
  = a:[pP] b:Sign? c:DigitSequence
    { return a + b + c.join(""); }

// (6.4.4.2) hexadecimal-digit-sequence
HexadecimalDigitSequence
  = HexadecimalDigit+

// (6.4.4.2) floating-suffix
FloatingSuffix
  = [flFL]

// (6.4.4.3) enumeration-constant
EnumerationConstant
  = a:Identifier
    {
      throwNotImplemented("enums");
      return makeNode("EnumerationConstant", a);
    }

// (6.4.4.4) character-constant
CharacterConstant
  = a:[LuU]? "'" b:CCharSequence "'"
    { 
      if (a) throwNotImplemented("char constant prefix");
      if (b.length > 1) throwNotImplemented("multi char constant")
      return b[0];
    }

// (6.4.4.4) c-char-sequence
CCharSequence
  = CChar+

// (6.4.4.4) c-char
CChar
  = EscapeSequence
  / ![\'\n\\] a:.
    { return a; }

// (6.4.4.4) escape-sequence
EscapeSequence
  = SimpleEscapeSequence
  / OctalEscapeSequence
  / HexadecimalEscapeSequence
  / UniversalCharacterName

// (6.4.4.4) simple-escape-sequence
SimpleEscapeSequence
  = "\\" a:[\'\"?\\abfnrtv]
    { return eval('"\\' + a + '"'); }

// (6.4.4.4) octal-escape-sequence
OctalEscapeSequence
  = "\\" a:OctalDigit b:OctalDigit? c:OctalDigit?
    { return eval("\"\\" + a + (b || "") + (c || "") + "\""); }  

// (6.4.4.4) hexadecimal-escape-sequence
HexadecimalEscapeSequence
  = "\\x" a:HexadecimalDigit+
    { return eval('"\\x' + a.join("") + '"'); }

// ==========
// A.1.6 String Literals
// ==========

// (6.4.5) string-literal
StringLiteral
  = a:EncodingPrefix? '"' b:SCharSequence? '"' _
    {
      if (a) throwNotImplemented("encoding prefixes for string literal");
      return b || [];
    }

// (6.4.5) encoding-prefix
EncodingPrefix
  = "u8"
  / [uUL]

// (6.4.5) s-char-sequence
SCharSequence
  = SChar+

// (6.4.5) s-char
SChar
  = EscapeSequence
  / ![\"\n\\] a:.
    { return a; }

// ==========
// A.1.7 Punctuators
// ==========

// (6.4.6) punctuator
Punctuator
  = (
        "["
      / "]"
      / "("
      / ")"
      / "{"
      / "}"
      / "."
      / "->"
      / "++"
      / "--"
      / "&"
      / "*"
      / "+"
      / "-"
      / "~"
      / "!"
      / "/"
      / "%"
      / "<<"
      / ">>"
      / "<"
      / ">"
      / "<="
      / ">="
      / "=="
      / "!="
      / "^"
      / "|"
      / "&&"
      / "||"
      / "?"
      / ":"
      / ";"
      / "..."
      / "="
      / "*="
      / "/="
      / "%="
      / "+="
      / "-="
      / "<<="
      / ">>="
      / "&="
      / "^="
      / "|="
      / ","
      / "#"
      / "##"
      / "<:"
      / ":>"
      / "<%"
      / "%>"
      / "%:"
      / "%:%:"
    )
    _ 

LBRC    = a:("[" / "<:")           _ { return a; }
RBRC    = a:("]" / ":>")           _ { return a; }
LPAR    = a:"("                    _ { return a; }
RPAR    = a:")"                    _ { return a; }
LCUR    = a:("{" / "<%")           _ { return a; }
RCUR    = a:("}" / "%>")           _ { return a; }
DOT     = a:"."            !".."   _ { return a; }
ARRW    = a:"->"                   _ { return a; }
INCR    = a:"++"                   _ { return a; }
DECR    = a:"--"                   _ { return a; }
AND     = a:"&"            ![&=]   _ { return a; }
STAR    = a:"*"            ![=]    _ { return a; }
PLUS    = a:"+"            ![+=]   _ { return a; }
MINUS   = a:"-"            ![-=>]  _ { return a; }
TILDE   = a:"~"                    _ { return a; }
BANG    = a:"!"            ![=]    _ { return a; }
DIV     = a:"/"            ![=]    _ { return a; }
MOD     = a:"%"            ![>:=]  _ { return a; }
LSHFT   = a:"<<"           ![=]    _ { return a; }
RSHFT   = a:">>"           ![=]    _ { return a; }
LT      = a:"<"            ![:%<=] _ { return a; }
GT      = a:">"            ![:%>=] _ { return a; }
LEQ     = a:"<="                   _ { return a; }
GEQ     = a:">="                   _ { return a; }
EQEQ    = a:"=="                   _ { return a; }
BANGEQ  = a:"!="                   _ { return a; }
CARET   = a:"^"            ![=]    _ { return a; }
OR      = a:"|"            ![=|]   _ { return a; }
ANDAND  = a:"&&"                   _ { return a; }
OROR    = a:"||"                   _ { return a; }
QN      = a:"?"                    _ { return a; }
COLON   = a:":"            ![>]    _ { return a; }
SEMI    = a:";"                    _ { return a; }
ELLIP   = a:"..."                  _ { return a; }
EQ      = a:"="            ![=]    _ { return a; }
STAREQ  = a:"*="                   _ { return a; }
DIVEQ   = a:"/="                   _ { return a; }
MODEQ   = a:"%="                   _ { return a; }
PLUSEQ  = a:"+="                   _ { return a; }
MINUSEQ = a:"-="                   _ { return a; }
LSHFTEQ = a:"<<="                  _ { return a; }
RSHFTEQ = a:">>="                  _ { return a; }
ANDEQ   = a:"&="                   _ { return a; }
CARETEQ = a:"^="                   _ { return a; }
OREQ    = a:"|="                   _ { return a; }
COMMA   = a:","                    _ { return a; }
PND     = a:("#" / "%:")   ![#]    _ { return a; }
PNDPND  = a:("##" / "%:%:")        _ { return a; }

// ==========
// A.2.1 Expressions
// ==========

// (6.5.1) primary-expression
PrimaryExpression
  = a:Identifier
    { return makeNode('PrimaryExprIdentifier', a); }
  / a:Constant
    { return makeNode('PrimaryExprConstant', a); }
  / a:StringLiteral
    { return makeNode('PrimaryExprString', a); }
  / LPAR a:Expression RPAR
    { return makeNode('PrimaryExprParenthesis', a); }
  / GenericSelection
    { throwNotImplemented("generic selection"); }

// (6.5.1.1) generic-selection
GenericSelection
  = GENERIC LPAR AssignmentExpression
    COMMA GenericAssocList RPAR

// (6.5.1.1) generic-assoc-list
GenericAssocList
  = GenericAssociation
    (
      COMMA a:GenericAssociation
      { return a; }
    )*

// (6.5.1.1) generic-association
GenericAssociation
  = TypeName COLON AssignmentExpression
  / DEFAULT COLON AssignmentExpression

// (6.5.2) postfix-expression
PostfixExpression
  = a:(
        PrimaryExpression
      / LPAR a:TypeName RPAR
        LCUR b:InitializerList COMMA? RCUR
        {
          throwNotImplemented("compound literals");
          // 6.5.2.5 Compound Literals
          return makeNode("CompoundLiteral", {
            type: a,
            initList: b
          });
        }
    )
    b:(
        LBRC x:Expression RBRC
        { return makeNode("ArraySubscripting", x); }
      / LPAR x:ArgumentExpressionList? RPAR
        { return makeNode("FunctionCall", x || []); }
      / DOT x:Identifier
        { return makeNode("StructMember", x); }
      / ARRW x:Identifier
        { return makeNode("PointerMember", x); }
      / INCR
        { return makeNode("PostfixIncrement"); }
      / DECR
        { return makeNode("PostfixDecrement"); }
    )*
    {
      if (!b.length) return a;
      return makeNode("PostfixExpression", {
        expr: a,
        ops: b
      });
    }

// (6.5.2) argument-expression-list
ArgumentExpressionList
  = a:AssignmentExpression
    b:(
      COMMA c:AssignmentExpression
      { return c; }
    )*
    { return [a].concat(b); }

// (6.5.3) unary-expression
UnaryExpression
  = PostfixExpression
  / INCR a:UnaryExpression
    { return makeNode("UnaryExpressionIncr", a); }
  / DECR a:UnaryExpression
    { return makeNode("UnaryExpressionDecr", a); }
  / a:UnaryOperator b:CastExpression
    {
      return makeNode("UnaryExpression", {
        op: a,
        expr: b
      });
    }
  / SIZEOF LPAR a:TypeName RPAR
    {
      return makeNode("UnaryExpressionSizeof", { value: a });
    }
  / SIZEOF a:UnaryExpression
    { 
      return makeNode("UnaryExpressionSizeof", { value: a });
    }
  / ALIGNOF LPAR a:TypeName RPAR
    {
      throwNotImplemented("alignof");
      return makeNode("UnaryExpressionAlignof", a);
    }

// (6.5.3) unary-operator
UnaryOperator
  = AND
  / STAR
  / PLUS
  / MINUS
  / TILDE
  / BANG

// (6.5.4) cast-expression
CastExpression
  = UnaryExpression
  / LPAR a:TypeName RPAR b:CastExpression
    {
      return makeNode("CastExpression", {
        targetType: a,
        expr: b
      });
    }

// (6.5.5) multiplicative-expression
MultiplicativeExpression
  = a:CastExpression
    // parsing of ambiguous "A * B"
    &{ return !(a.type === "PrimaryExprIdentifier" && isTypedefName(a.value)); }
    b:((STAR / DIV / MOD) CastExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.6) additive-expression
AdditiveExpression
  = a:MultiplicativeExpression
    b:((PLUS / MINUS) MultiplicativeExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.7) shift-expression
ShiftExpression
  = a:AdditiveExpression
    b:((LSHFT / RSHFT) AdditiveExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.8) relational-expression
RelationalExpression
  = a:ShiftExpression
    b:((LT / GT / LEQ / GEQ) ShiftExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.9) equality-expression
EqualityExpression
  = a:RelationalExpression
    b:((EQEQ / BANGEQ) RelationalExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.10) AND-expression
ANDExpression
  = a:EqualityExpression
    b:(AND EqualityExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.11) exclusive-OR-expression
ExclusiveORExpression
  = a:ANDExpression
    b:(CARET ANDExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.12) inclusive-OR-expression
InclusiveORExpression
  = a:ExclusiveORExpression
    b:(OR ExclusiveORExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.13) logical-AND-expression
LogicalANDExpression
  = a:InclusiveORExpression
    b:(ANDAND InclusiveORExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.14) logical-OR-expression
LogicalORExpression
  = a:LogicalANDExpression
    b:(OROR LogicalANDExpression)*
    { return makeBinaryExpNode(a, b); }

// (6.5.15) conditional-expression
ConditionalExpression
  = a:LogicalORExpression
    b:(
      QN c:Expression COLON d:ConditionalExpression
      { return { exprIfTrue: c, exprIfFalse: d }; }
    )?
    {
      if (!b) return a;
      return makeNode("ConditionalExpression", {
        cond: a,
        exprIfTrue: b.exprIfTrue,
        exprIfFalse: b.exprIfFalse
      });
    }

// (6.5.16) assignment-expression
AssignmentExpression
  = a:UnaryExpression b:AssignmentOperator c:AssignmentExpression
    {
      return makeNode("AssignmentExpression", {
        left: a,
        op: b,
        right: c
      });
    }
  / ConditionalExpression

// (6.5.16) assignment-operator
AssignmentOperator
  = EQ
  / STAREQ
  / DIVEQ
  / MODEQ
  / PLUSEQ
  / MINUSEQ
  / LSHFTEQ
  / RSHFTEQ
  / ANDEQ
  / CARETEQ
  / OREQ

// (6.5.17) expression
Expression
  = a:AssignmentExpression
    b:(
      COMMA c:AssignmentExpression
      { return c; }
    )*
    {
      if (!b.length) return a;
      // 6.5.17 Comma operator
      return makeNode("CommaOperator", [a].concat(b));
    }

// (6.6) constant-expression
ConstantExpression
  = ConditionalExpression
    { throwNotImplemented("constant expressions"); }

// ==========
// A.2.2 Declarations
// ==========

// (6.7) declaration
Declaration
  = a:DeclarationSpecifiers b:InitDeclaratorList? SEMI
    {
      if (a.includes("typedef")) {
        b.forEach(i => i.declarator.forEach(j => {
          if (j.partType === "identifier") addTypedefName(j.name);
        }))
      }
      return makeNode("Declaration", {
        specifiers: a,
        declaratorList: b || []
      });
    }
  / a:StaticAssertDeclaration
    { throwNotImplemented("StaticAssertDeclaration"); }

// (6.7) declaration-specifiers
// Note the change from the standard to handle the TypedefName case
DeclarationSpecifiers
  = a:(
        StorageClassSpecifier
      / TypeQualifier
      / FunctionSpecifier
      / AlignmentSpecifier
    )*
    b:TypedefName
    c:(
        StorageClassSpecifier
      / TypeQualifier
      / FunctionSpecifier
      / AlignmentSpecifier
    )*
    { return a.concat([b]).concat(c); }
  / (
        StorageClassSpecifier
      / TypeSpecifier
      / TypeQualifier
      / FunctionSpecifier
      / AlignmentSpecifier
    )+

// (6.7) init-declarator-list
InitDeclaratorList
  = a:InitDeclarator
    b:(
      COMMA c:InitDeclarator
      { return c; }
    )*
    { return [a].concat(b); }

// (6.7) init-declarator
InitDeclarator
  = a:Declarator
    b:(
      EQ c:Initializer
      { return c; }
    )?
  {
    return makeNode("InitDeclarator", {
      declarator: a,
      initializer: b  
    });
  }

// (6.7.1) storage-class-specifier
StorageClassSpecifier
  = TYPEDEF
  / EXTERN
    { throwNotImplemented("extern storage class"); }
  / STATIC
    { throwNotImplemented("static storage class"); }
  / THREADLOCAL
    { throwNotImplemented("threadlocal storage class"); }
  / AUTO
    { throwNotImplemented("auto storage class"); }
  / REGISTER
    { throwNotImplemented("register storage class"); }

// (6.7.2) type-specifier
// Note that TypedefName has been removed as it leads to ambiguity in the grammar.
// Instead, we change the grammar for DeclarationSpecifiers and SpecifierQualifierList
// to handle the case of TypedefName
TypeSpecifier
  = VOID
  / CHAR
  / SHORT
  / INT
  / LONG
  / FLOAT
    { throwNotImplemented("floating type"); }
  / DOUBLE
    { throwNotImplemented("floating type"); }
  / SIGNED
  / UNSIGNED
  / BOOL
  / COMPLEX
    { throwNotImplemented("complex type"); }
  / AtomicTypeSpecifier
    { throwNotImplemented("atomic type"); }
  / StructOrUnionSpecifier
  / EnumSpecifier
    { throwNotImplemented("enum type"); }

// (6.7.2.1) struct-or-union-specifier
StructOrUnionSpecifier
  = StructOrUnion a:Identifier? LCUR b:StructDeclarationList RCUR
    {
      return makeNode("StructSpecifier", {
        identifier: a,
        declarationList: b
      });
    }
  / StructOrUnion a:Identifier
    {
      return makeNode("StructSpecifier", {
        identifier: a,
        declarationList: []
      });
    }

// (6.7.2.1) struct-or-union
StructOrUnion
  = STRUCT
  / UNION
    { throwNotImplemented("union"); }

// (6.7.2.1) struct-declaration-list
StructDeclarationList
  = StructDeclaration+

// (6.7.2.1) struct-declaration
StructDeclaration
  = a:SpecifierQualifierList b:StructDeclaratorList? SEMI
    {
      return makeNode("Declaration", {
        specifiers: a,
        declaratorList: b || []
      });
    }
  / StaticAssertDeclaration
    { throwNotImplemented("static assert declaration"); }

// (6.7.2.1) specifier-qualifier-list
// Note the change from the standard to handle the TypedefName case
SpecifierQualifierList
  = a:(TypeQualifier / AlignmentSpecifier)*
    b:TypedefName
    c:(TypeQualifier / AlignmentSpecifier)*
    { return a.concat([b]).concat(c); }
  / (
        TypeSpecifier
      / TypeQualifier
      / AlignmentSpecifier
    )+

// (6.7.2.1) struct-declarator-list
StructDeclaratorList
  = a:StructDeclarator b:(COMMA b:StructDeclarator { return b; })*
    { return [a].concat(b || []); }

// (6.7.2.1) struct-declarator
StructDeclarator
  = a:Declarator
    {
      return makeNode("InitDeclarator", {
        declarator: a,
        initializer: null
      });
    }
  / Declarator? COLON ConstantExpression
    { throwNotImplemented("bitfield"); }

// (6.7.2.2) enum-specifier
EnumSpecifier
  = ENUM Identifier? LCUR EnumeratorList RCUR
  / ENUM Identifier? LCUR EnumeratorList COMMA RCUR
  / ENUM Identifier

// (6.7.2.2) enumerator-list
EnumeratorList
  = Enumerator (COMMA Enumerator)*

// (6.7.2.2) enumerator
Enumerator
  = EnumerationConstant (EQ ConstantExpression)?

// (6.7.2.4) atomic-type-specifier
AtomicTypeSpecifier
  = ATOMIC LPAR TypeName RPAR

// (6.7.3) type-qualifier
TypeQualifier
  = CONST
    { throwNotImplemented("const type qualifier"); }
  / RESTRICT
    { throwNotImplemented("restrict type qualifier"); }
  / VOLATILE
    { throwNotImplemented("volatile type qualifier"); }
  / ATOMIC
    { throwNotImplemented("atomic type qualifier"); }

// (6.7.4) function-specifier
FunctionSpecifier
  = INLINE
    { throwNotImplemented("inline function specifier"); }
  / NORETURN
    { throwNotImplemented("noreturn function specifier"); }

// (6.7.5) alignment-specifier
AlignmentSpecifier
  = ALIGNAS LPAR (TypeName / ConstantExpression) RPAR
    { throwNotImplemented("alignment specifier"); }

// (6.7.6) declarator
Declarator
  = a:Pointer? b:DirectDeclarator
    {
      return b.concat(a ? a.reverse() : []);
    }

// (6.7.6) direct-declarator
DirectDeclarator
  = a:(
        a:Identifier { return [{ partType: "identifier", name: a }]; }
      / LPAR a:Declarator RPAR
        { return a; }
    )
    b:(
        LBRC c:IntegerConstant? RBRC
        {
          if (c === null) throwNotImplemented("unknown size array");
          return { partType: "array", length: c };
        }
      / LBRC c:ConstantExpression RBRC
      / LBRC c:TypeQualifierList? d:AssignmentExpression? RBRC
        {
          throwNotImplemented("variable length array");
        }
      / LBRC STATIC c:TypeQualifierList? d:AssignmentExpression RBRC
        {
          throwNotImplemented("ISO/IEC 9899:TC3 6.7.5.3.7");
        }
      / LBRC c:TypeQualifierList STATIC d:AssignmentExpression RBRC
        {
          throwNotImplemented("ISO/IEC 9899:TC3 6.7.5.3.7");
        }
      / LBRC c:TypeQualifierList? STAR RBRC
        {
          throwNotImplemented("variable length array type of unspecified size");
        }
      / LPAR c:ParameterTypeList RPAR
        {
          return { partType: "function", argTypes: c };
        }
      / LPAR c:IdentifierList? RPAR
        {
          if (c) throwNotImplemented("K & R C Style Function Declarations");
          return { partType: "function", argTypes: [] };
        }
    )*
    {
      return a.concat(b);
    }

// (6.7.6) pointer
Pointer
  = (
      STAR a:TypeQualifierList?
      { return { partType: "ptr" }; }
    )+

// (6.7.6) type-qualifier-list
TypeQualifierList
  = TypeQualifier+

// (6.7.6) parameter-type-list
ParameterTypeList
  = a:ParameterList b:(COMMA ELLIP)?
    {
      if (b) throwNotImplemented("variadic arguments");
      return a;
    }

// (6.7.6) parameter-list
ParameterList
  = a:ParameterDeclaration
    b:(
      COMMA c:ParameterDeclaration
      { return c; }
    )*
    { return [a].concat(b); }

// (6.7.6) parameter-declaration
ParameterDeclaration
  = a:DeclarationSpecifiers
    b:(Declarator / AbstractDeclarator)?
    {
      return {
        specifiers: a,
        declarator: b || []
      };
    }

// (6.7.6) identifier-list
IdentifierList
  = a:Identifier
    b:(
      COMMA c:Identifier
      { return c; }
    )*
    { return [a].concat(b); }

// (6.7.7) type-name
TypeName
  = a:SpecifierQualifierList b:AbstractDeclarator?
    {
      return {
        specifierQualifierList: a,
        abstractDeclarator: b || []
      };
    }

// (6.7.7) abstract-declarator
AbstractDeclarator
  = a:Pointer? b:DirectAbstractDeclarator
    {
      return b.concat(a ? a.reverse() : []);
    }
  / a:Pointer
    { return a.reverse(); }

// (6.7.7) direct-abstract-declarator
DirectAbstractDeclarator
  = LPAR a:AbstractDeclarator RPAR
    { return a; }
  / a:(
      LPAR a:AbstractDeclarator RPAR
      { return a; }
    )?
    b:(
        LBRC c:IntegerConstant? RBRC
        { return { partType: "array", length: c }; }
      / LBRC TypeQualifierList? AssignmentExpression? RBRC
        { throwNotImplemented("variable length array"); }
      / LBRC STATIC TypeQualifierList? AssignmentExpression RBRC
        { throwNotImplemented("ISO/IEC 9899:TC3 6.7.5.3.7"); }
      / LBRC TypeQualifierList STATIC AssignmentExpression RBRC
        { throwNotImplemented("ISO/IEC 9899:TC3 6.7.5.3.7"); }
      / LBRC STAR RBRC
        { throwNotImplemented("variable length array type of unspecified size"); }
      / LPAR c:ParameterTypeList? RPAR
        { return { partType: "function", argTypes: c || [] }; }
    )+
    {
      if (!a) return b;
      return a.concat(b);
    }

// (6.7.8) typedef-name
TypedefName
  = Identifier

// (6.7.9) initializer
Initializer
  = a:AssignmentExpression
    { return a; }
  / LCUR a:InitializerList COMMA? RCUR
    { return a; }

// (6.7.9) initializer-list
InitializerList
  = a:Designation? b:Initializer
    c:(COMMA d:Designation? e:Initializer { return { designation: d || [], initializer: e }; })*
    {
      const i = { designation: a || [], initializer: b };
      return makeNode("InitializerList", [i].concat(c || []));
    }

// (6.7.9) designation
Designation
  = a:DesignatorList EQ
    { return a; }

// (6.7.9) designator-list
DesignatorList
  = a:Designator+
    { return a; }

// (6.7.9) designator
Designator
  = LBRC a:IntegerConstant RBRC
    { return { type: "arrayDesignator", idx: a }; }
  / LBRC ConstantExpression RBRC
  / DOT a:Identifier
    { return { type: "structDesignator", identifier: a }; }

// (6.7.10) static_assert-declaration
StaticAssertDeclaration
  = STATICASSERT LPAR ConstantExpression
    COMMA StringLiteral RPAR SEMI

// ==========
// A.2.3 Statements
// ==========

// (6.8) statement
Statement
  = LabeledStatement
    { throwNotImplemented("goto and switch"); }
  / CompoundStatement
  / ExpressionStatement
  / SelectionStatement
  / IterationStatement
  / JumpStatement

// (6.8.1) labeled-statement
LabeledStatement
  = Identifier COLON Statement
  / CASE ConstantExpression COLON Statement
  / DEFAULT COLON Statement

// (6.8.2) compound-statement
CompoundStatement
  = LCUR &{ enterBlock(); return true; } a:BlockItemList? RCUR
    { 
      exitBlock();
      return makeNode("CompoundStatement", a || []);
    }

// (6.8.2) block-item-list
BlockItemList
  = BlockItem+

// (6.8.2) block-item
BlockItem
  = Statement
  / Declaration

// (6.8.3) expression-statement
ExpressionStatement
  = a:Expression? SEMI
    {
      return makeNode("ExpressionStatement",
        a === null ? makeNode("EmptyExpressionStatement") : a);
    }

// (6.8.4) selection-statement
SelectionStatement
  = IF LPAR a:Expression RPAR b:Statement
    c:(
      ELSE d:Statement
      { return d; }
    )?
    {
      return makeNode("SelectionStatementIf", {
        cond: a,
        consequent: b,
        alternative: c
      });
    }
  / SWITCH LPAR a:Expression RPAR b:Statement
    {
      throwNotImplemented("switch statements");
    }

// (6.8.5) iteration-statement
IterationStatement
  = WHILE LPAR a:Expression RPAR b:Statement
    {
      return makeNode("IterationStatementWhile", {
        cond: a,
        body: b
      });
    }
  / DO a:Statement WHILE
    LPAR b:Expression RPAR SEMI
    {
      return makeNode("IterationStatementDoWhile", {
        cond: b,
        body: a
      });
    }
  / FOR LPAR a:Expression? SEMI b:Expression?
    SEMI c:Expression? RPAR d:Statement
    {
      return makeNode("IterationStatementFor", {
        init: a,
        controlExpr: b,
        afterIterExpr: c,
        body: d
      });
    }
  / FOR LPAR a:Declaration b:Expression?
    SEMI c:Expression? RPAR d:Statement
    {
      return makeNode("IterationStatementFor", {
        init: a,
        controlExpr: b,
        afterIterExpr: c,
        body: d
      });
    }

// (6.8.6) jump-statement
JumpStatement
  = GOTO a:Identifier SEMI
    { throwNotImplemented("goto"); }
  / CONTINUE SEMI
    { return makeNode("JumpStatementContinue"); }
  / BREAK SEMI
    { return makeNode("JumpStatementBreak"); }
  / RETURN a:Expression? SEMI
    { return makeNode("JumpStatementReturn", a); }

// ==========
// A.2.4 External Definitions
// ==========

// (6.9) translation-unit
TranslationUnit
  = _ a:ExternalDeclaration+
    { return makeNode("TranslationUnit", a); }

// (6.9) external-declaration
ExternalDeclaration
  = FunctionDefinition
  / Declaration

// (6.9.1) function-definition
FunctionDefinition
  = a:DeclarationSpecifiers
    b:Declarator
    c:DeclarationList?
    d:CompoundStatement
    {
      if (c) throwNotImplemented("K & R C Style Function Declarations");
      return makeNode("FunctionDefinition", {
        specifiers: a,
        declarator: b,
        body: d
      });
    }

// (6.9.1) declaration-list
DeclarationList
  = a:Declaration+
    { return makeNode("DeclarationList", a); }
