/**
 * Information about one location in the source file
 */
export interface LocationData {
  offset: number;
  line: number;
  column: number;
}

export interface Location {
  start: LocationData;
  end: LocationData;
}

/**
 * The base type for all nodes in the AST.
 */
export interface SyntaxNode {
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

  location?: Location;
}

/**
 * A root AST node that acts as a parent for joining several source ASTs together
 */
 export interface RootNode extends SyntaxNode {
   tag: "root";
   children: ExpressionNode[];
 }

/**
 * An AST node that's an expression. This is almost everything---just not
 * parameters and types.
 */
export interface ExpressionNode extends SyntaxNode {
}

export interface LiteralNode extends ExpressionNode {
  tag: "literal";
  value: number | string | boolean;
  type: "int" | "float" | "string" | "boolean";
}

export interface SeqNode extends ExpressionNode {
  tag: "seq";
  lhs: ExpressionNode;
  rhs: ExpressionNode;
}

export interface LetNode extends ExpressionNode {
  tag: "let";
  ident: string;
  expr: ExpressionNode;
}

export interface AssignNode extends ExpressionNode {
  tag: "assign";
  ident: string;
  expr: ExpressionNode;
}

export interface LookupNode extends ExpressionNode {
  tag: "lookup";
  ident: string;
}

export interface UnaryNode extends ExpressionNode {
  tag: "unary";
  op: string;
  expr: ExpressionNode;
}

export interface BinaryNode extends ExpressionNode {
  tag: "binary";
  op: string;
  lhs: ExpressionNode;
  rhs: ExpressionNode;
}

export interface QuoteNode extends ExpressionNode {
  tag: "quote";
  expr: ExpressionNode;
  annotation: string;
  snippet: boolean;
}

export interface EscapeNode extends ExpressionNode {
  tag: "escape";
  expr: ExpressionNode;
  kind: "splice" | "persist" | "snippet";
  count: number;
}

export interface RunNode extends ExpressionNode {
  tag: "run";
  expr: ExpressionNode;
}

export interface FunNode extends ExpressionNode {
  tag: "fun";
  params: ParamNode[];
  body: ExpressionNode;
}

export interface ParamNode extends SyntaxNode {
  tag: "param";
  name: string;
  type: TypeNode;
}

export interface CallNode extends ExpressionNode {
  tag: "call";
  fun: ExpressionNode;
  args: ExpressionNode[];
}

export interface ExternNode extends ExpressionNode {
  tag: "extern";
  name: string;
  type: TypeNode;
  expansion: string;  // Or null, if it should expand to the name itself.
}

export interface IfNode extends ExpressionNode {
  tag: "if";
  cond: ExpressionNode;
  truex: ExpressionNode;
  falsex: ExpressionNode;
}

export interface WhileNode extends ExpressionNode {
  tag: "while";
  cond: ExpressionNode;
  body: ExpressionNode;
}

export interface MacroCallNode extends ExpressionNode {
  tag: "macrocall";
  macro: string;
  args: ExpressionNode[];
}

export interface TypeNode extends SyntaxNode {
}

export interface TypeAliasNode extends ExpressionNode {
  tag: "type_alias";
  ident: string;
  type: TypeNode;
}

export interface OverloadedTypeNode extends TypeNode {
  tag: "type_overloaded";
  types: TypeNode[];
}

export interface PrimitiveTypeNode extends TypeNode {
  tag: "type_primitive";
  name: string;
}

export interface InstanceTypeNode extends TypeNode {
  tag: "type_instance";
  name: string;
  arg: TypeNode;
}

export interface FunTypeNode extends TypeNode {
  tag: "type_fun";
  params: TypeNode[];
  ret: TypeNode;
}

export interface CodeTypeNode extends TypeNode {
  tag: "type_code";
  inner: TypeNode;
  annotation: string;
  snippet: boolean;
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
export interface PersistNode extends ExpressionNode {
  tag: "persist";
  index: number;
}
