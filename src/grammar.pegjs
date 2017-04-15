{
  // From the PEG.js examples.
  function build_list(first, rest, index) {
    return [first].concat(extractList(rest, index));
  }

  function setLocation(obj) {
    obj.location = location();
    return obj;
  }
}

Program
  = _ e:SeqExpr _
  { return e; }


// Expression syntax.

Expr
  = Var / Extern / Fun / CDef / If / While / Binary / Unary / Assign / TypeAlias /
  CCall / Call / MacroCall / TermExpr

SeqExpr
  = Seq / HalfSeq / Expr

// Expressions that usually don't need parenthesization.
TermExpr
  = Quote / CCall / Escape / Run / FloatLiteral / IntLiteral /
  StringLiteral / BooleanLiteral / Paren / Lookup

// Expressions that can be operands to binary/unary operators.
Operand
  = If / Call / MacroCall / TermExpr

Seq
  = lhs:Expr _ seq _ rhs:SeqExpr
  { return {tag: "seq", lhs: lhs, rhs: rhs}; }

// Allow (and ignore) a trailing semicolon.
HalfSeq
  = lhs:Expr _ seq
  { return lhs; }

IntLiteral
  = n:int
  { return setLocation({tag: "literal", type: "int", value: n}); }

FloatLiteral
  = n:float
  { return setLocation({tag: "literal", type: "float", value: n}); }

BooleanLiteral
  = BooleanLiteralTrue / BooleanLiteralFalse

BooleanLiteralTrue
  = b:boolean_true
  { return setLocation({tag: "literal", type: "boolean", value: b}); }

BooleanLiteralFalse
  = b:boolean_false
  { return setLocation({tag: "literal", type: "boolean", value: b}); }

StringLiteral "string"
  = strquote chars:StringChar* strquote
  { return setLocation({tag: "literal", type: "string", value: chars.join("")}); }

StringChar
  = !strquote .
  { return text(); }

Lookup
  = i:ident
  { return setLocation({tag: "lookup", ident: i}); }

Var
  = var _ i:ident _ eq _ e:Expr
  { return setLocation({tag: "let", ident: i, expr: e}); }

Unary
  = op:unop _ e:Operand
  { return setLocation({tag: "unary", expr: e, op: op}); }

Binary
  = AddBinary / MulBinary
AddBinary
  = lhs:(MulBinary / Operand) _ op:addbinop _ rhs:(Binary / Operand)
  { return setLocation({tag: "binary", lhs: lhs, op: op, rhs: rhs}); }
MulBinary
  = lhs:Operand _ op:mulbinop _ rhs:(MulBinary / Operand)
  { return setLocation({tag: "binary", lhs: lhs, rhs: rhs, op: op}); }

Quote
  = s:snippet_marker? a:ident? quote_open _ e:SeqExpr _ quote_close
  { return setLocation({tag: "quote", expr: e, annotation: a || "", snippet: !!s}); }

// Our three kinds of escapes.
Escape
  = Splice / Persist / Snippet
Splice "splice escape"
  = n:int? escape_open _ e:SeqExpr _ escape_close sn:int?
  { return setLocation({tag: "escape", expr: e, count: n || sn || 1, kind: "splice"}); }
Persist "persist escape"
  = persist_marker n:int? escape_open _ e:SeqExpr _ escape_close sn:int?
  { return setLocation({tag: "escape", expr: e, count: n || sn || 1, kind: "persist"}); }
Snippet "snippet escape"
  = snippet_marker n:int? escape_open _ e:SeqExpr _ escape_close sn:int?
  { return setLocation({tag: "escape", expr: e, count: n || sn || 1, kind: "snippet"}); }

Run
  = run _ e:TermExpr
  { return setLocation({tag: "run", expr: e}); }

Fun
  = fun _ ps:Param* _ arrow _ e:Expr
  { return setLocation({tag: "fun", params: ps, body: e}); }
Param
  = i:ident _ typed _ t:TermType _
  { return setLocation({tag: "param", name: i, type: t}); }

CDef
  = def _ i:ident _ paren_open _ ps:CParamList _ paren_close _ e:Expr
  { return setLocation({tag: "let", ident: i, expr: {tag: "fun", params: ps, body: e} }); }
CParamList
  = first:CParam rest:CParamMore*
  { return [first].concat(rest); }
CParamMore
  = comma _ p:CParam
  { return p; }
CParam
  = i:ident _ typed _ t:Type _
  { return setLocation({tag: "param", name: i, type: t}); }

// This is a little hacky, but we currently require whitespace when the callee
// is an identifier (a lookup). This resolves a grammar ambiguity with quote
// annotations, e.g., `js<1>` vs. `js <1>`.
Call
  = OtherCall / IdentCall
IdentCall
  = i:Lookup ws _ as:Arg+
  { return setLocation({tag: "call", fun: i, args: as}); }
OtherCall
  = i:(CCall / Escape / Run / Paren) _ as:Arg+
  { return setLocation({tag: "call", fun: i, args: as}); }
Arg
  = e:TermExpr _
  { return e; }

CCall
  = i:Lookup paren_open _ as:CArgList? _ paren_close
  { return setLocation({tag: "call", fun: i, args: as || []}); }
CArgList
  = first:Expr rest:CArgMore*
  { return [first].concat(rest); }
CArgMore
  = _ comma _ e:Expr
  { return e; }

MacroCall
  = macromark i:ident _ as:Arg+
  { return setLocation({tag: "macrocall", macro: i, args: as}); }

Extern
  = extern _ i:ident _ typed _ t:Type e:ExternExpansion?
  { return setLocation({tag: "extern", name: i, type: t, expansion: e}); }
ExternExpansion
  = _ eq _ s:string
  { return s; }

Paren
  = paren_open _ e:SeqExpr _ paren_close
  { return e; }

Assign
  = i:ident _ eq _ e:Expr
  { return setLocation({tag: "assign", ident: i, expr: e}); }

If
  = if _ c:TermExpr _ t:TermExpr _ f:TermExpr
  { return setLocation({tag: "if", cond: c, truex: t, falsex: f}); }

While
  = while _ c:TermExpr _ b:TermExpr
  { return setLocation({tag: "while", cond: c, body: b}); }


// Type syntax.

Type
  = OverloadedType / FunType / InstanceType / TermType

NonOverloadedType
  = FunType / InstanceType / TermType

TermType
  = CodeType / PrimitiveType / ParenType

PrimitiveType
  = i:ident
  { return setLocation({tag: "type_primitive", name: i}); }

InstanceType
  = t:TermType _ i:ident
  { return setLocation({tag: "type_instance", name: i, arg: t}); }

ParenType
  = paren_open _ t:Type _ paren_close
  { return t; }

FunType
  = p:FunTypeParam* arrow _ r:TermType
  { return setLocation({tag: "type_fun", params: p, ret: r}); }

CodeType
  = s:snippet_marker? a:ident? quote_open _ t:Type _ quote_close
  { return setLocation({tag: "type_code", inner: t, annotation: a || "", snippet: !!s}); }

FunTypeParam
  = t:TermType _
  { return t; }

OverloadedType
  = t:NonOverloadedType _ other_types:(OverloadedTypeElement)+
  { return setLocation({tag: "type_overloaded", types: [t].concat(other_types)}); }

OverloadedTypeElement
  = _ pipe_operator _ t:NonOverloadedType
  { return t; }

TypeAlias
  = type _ i:ident _ eq _ t:Type
  { return setLocation({tag: "type_alias", ident:i, type:t}); }

// Tokens.

int "integer"
  = DIGIT+
  { return parseInt(text()); }

float "float"
  = DIGIT+ [.] DIGIT+
  { return parseFloat(text()); }

boolean_true "boolean_true"
  = "true"
  { return true; }

boolean_false "boolean_false"
  = "false"
  { return false; }

ident "identifier"
  = (ALPHA / [_]) (ALPHA / DIGIT / [_.])* SUFFIX*
  { return text(); }

string "string"
  = ["] [^"]* ["]
  { return text().slice(1, -1); }

var
  = "var"

eq
  = "="

seq
  = ";"

addbinop
  = [+\-]
mulbinop
  = [*/]

unop "unary operator"
  = [+\-\~]

quote_open "quote start"
  = "<"

quote_close "quote end"
  = ">"

escape_open
  = "["

escape_close
  = "]"

persist_marker
  = "%"

run "run operator"
  = "!"

fun
  = "fun"

arrow "arrow"
  = "->"

typed "type marker"
  = ":"

comma "comma"
  = ","

paren_open
  = "("

paren_close
  = ")"

pipe_operator
  = "|"

extern
  = "extern"

def
  = "def"

quote
  = ["]

snippet_marker
  = "$"

if
  = "if"

while
  = "while"

type
  = "type"

macromark
  = "@"

strquote
  = '"'


// Empty space.

comment "comment"
  = "#" (!NEWLINE .)*

ws "whitespace"
  = SPACE

_
  = (ws / comment)*


// Character classes.

SPACE = [ \t\r\n\v\f]
ALPHA = [A-Za-z]
DIGIT = [0-9]
SUFFIX = [\?\!]
NEWLINE = [\r\n]
