/**
 * The character position in a source file.
 */
export interface Position {
  offset: number;
  line: number;
  column: number;
}

/**
 * The source location for an AST node.
 */
export interface Location {
  start: Position;
  end: Position;
  filename: string;
}

/**
 * The base type for all nodes in the AST.
 */
interface BaseSyntaxNode {
  /**
   * A string indicating the type of AST node. Every `interface` in this type
   * hierarchy corresponds to a unique string.
   *
   * (If this seems redundant, remember that (a) the AST is raw JSON, and (b)
   * TypeScript interfaces are structurally subtyped.)
   */
  tag: string;

  /**
   * A unique node id used in some IRs to "attach" additional information to
   * the node.
   */
  id?: number;

  /**
   * The source file position of this AST node.
   */
  location?: Location;
}

/**
 * A root AST node that acts as a parent for joining several source ASTs together
 */
 export interface RootNode extends BaseSyntaxNode {
   tag: "root";
   children: ExpressionNode[];
 }

export interface LiteralNode extends BaseSyntaxNode {
  tag: "literal";
  value: number | string | boolean;
  type: "int" | "float" | "string" | "boolean";
}

export interface SeqNode extends BaseSyntaxNode {
  tag: "seq";
  lhs: ExpressionNode;
  rhs: ExpressionNode;
}

export interface LetNode extends BaseSyntaxNode {
  tag: "let";
  ident: string;
  expr: ExpressionNode;
}

export interface AssignNode extends BaseSyntaxNode {
  tag: "assign";
  ident: string;
  expr: ExpressionNode;
}

export interface LookupNode extends BaseSyntaxNode {
  tag: "lookup";
  ident: string;
}

export interface UnaryNode extends BaseSyntaxNode {
  tag: "unary";
  op: "+" | "-" | "~";
  expr: ExpressionNode;
}

export interface BinaryNode extends BaseSyntaxNode {
  tag: "binary";
  op: "+" | "-" | "*" | "/" | "==" | "!=" | ">=" | "<=";
  lhs: ExpressionNode;
  rhs: ExpressionNode;
}

export interface QuoteNode extends BaseSyntaxNode {
  tag: "quote";
  expr: ExpressionNode;
  annotation: string;
  snippet: boolean;
}

export interface EscapeNode extends BaseSyntaxNode {
  tag: "escape";
  expr: ExpressionNode;
  kind: "splice" | "persist" | "snippet";
  count: number;
}

export interface RunNode extends BaseSyntaxNode {
  tag: "run";
  expr: ExpressionNode;
}

export interface FunNode extends BaseSyntaxNode {
  tag: "fun";
  params: ParamNode[];
  body: ExpressionNode;
}

export interface ParamNode extends BaseSyntaxNode {
  tag: "param";
  name: string;
  type: TypeNode;
}

export interface CallNode extends BaseSyntaxNode {
  tag: "call";
  fun: ExpressionNode;
  args: ExpressionNode[];
}

export interface ExternNode extends BaseSyntaxNode {
  tag: "extern";
  name: string;
  type: TypeNode;
  expansion: string;  // Or null, if it should expand to the name itself.
}

export interface IfNode extends BaseSyntaxNode {
  tag: "if";
  cond: ExpressionNode;
  truex: ExpressionNode;
  falsex: ExpressionNode;
}

export interface WhileNode extends BaseSyntaxNode {
  tag: "while";
  cond: ExpressionNode;
  body: ExpressionNode;
}

export interface MacroCallNode extends BaseSyntaxNode {
  tag: "macrocall";
  macro: string;
  args: ExpressionNode[];
}

export interface TypeAliasNode extends BaseSyntaxNode {
  tag: "type_alias";
  ident: string;
  type: TypeNode;
}

export interface TupleNode extends BaseSyntaxNode {
  tag: "tuple";
  exprs: ExpressionNode[];
}

export interface TupleIndexNode extends BaseSyntaxNode {
  tag: "tupleind";
  tuple: ExpressionNode;
  index: number;
}

export interface AllocNode extends BaseSyntaxNode {
  tag: "alloc";
  ident: string;
  expr: ExpressionNode;
}

export interface OverloadedTypeNode extends BaseSyntaxNode {
  tag: "type_overloaded";
  types: TypeNode[];
}

export interface PrimitiveTypeNode extends BaseSyntaxNode {
  tag: "type_primitive";
  name: string;
}

export interface InstanceTypeNode extends BaseSyntaxNode {
  tag: "type_instance";
  name: string;
  arg: TypeNode;
}

export interface FunTypeNode extends BaseSyntaxNode {
  tag: "type_fun";
  params: TypeNode[];
  ret: TypeNode;
}

export interface CodeTypeNode extends BaseSyntaxNode {
  tag: "type_code";
  inner: TypeNode;
  annotation: string;
  snippet: boolean;
}

export interface TupleTypeNode extends BaseSyntaxNode {
  tag: "type_tuple";
  components: TypeNode[];
}

/**
 * An interpreter-specific expression kind that represents a persisted value
 * in deferred code.
 *
 * This node is not allowed to appear in source; it replaces persist
 * (materialization) escapes when they are interpreted. A "persist" has an
 * index into the value list (called a `Pers` in the interpreter) associated
 * with the `Code` that it appears inside.
 */
export interface PersistNode extends BaseSyntaxNode {
  tag: "persist";
  index: number;
}

/**
 * An AST node that's an expression. This is almost everything---just not
 * parameters and types.
 */
export type ExpressionNode = LiteralNode | SeqNode | LetNode | AssignNode |
  LookupNode | UnaryNode | BinaryNode | QuoteNode | EscapeNode | RunNode |
  FunNode | CallNode | ExternNode | IfNode | WhileNode | MacroCallNode |
  TypeAliasNode | TupleNode | TupleIndexNode | AllocNode | PersistNode;

export type TypeNode = OverloadedTypeNode | PrimitiveTypeNode |
  InstanceTypeNode | FunTypeNode | CodeTypeNode | TupleTypeNode;

export type SyntaxNode = RootNode | ExpressionNode | ParamNode | TypeNode;
