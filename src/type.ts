/**
 * The tags for each kind of Type defined here.
 */
export const enum TypeKind {
  PRIMITIVE,
  ANY,
  VOID,
  FUN,
  VARIADIC_FUN,
  CODE,
  CONSTRUCTOR,
  INSTANCE,
  QUANTIFIED,
  VARIABLE,
  OVERLOADED,
  TUPLE,
}

/**
 * The base type for all types.
 */
interface BaseType {
  kind: TypeKind;
}

/**
 * Primitive types. Each primitive type is a (shared) instance of this class.
 */
export class PrimitiveType implements BaseType {
  public kind: TypeKind.PRIMITIVE;
  constructor(public name: string) { }
}
PrimitiveType.prototype.kind = TypeKind.PRIMITIVE;

/**
 * A "top" type: a supertype of everything.
 */
export class AnyType implements BaseType {
  public kind: TypeKind.ANY;
}
AnyType.prototype.kind = TypeKind.ANY;
export const ANY = new AnyType();

/**
 * A "bottom" type: a subtype of everything.
 */
export class VoidType implements BaseType {
  public kind: TypeKind.VOID;
}
VoidType.prototype.kind = TypeKind.VOID;
export const VOID = new VoidType();

abstract class BaseFunType {
  constructor(
    /**
     * The parameter types.
     */
    public params: Type[],

    /**
     * The return type.
     */
    public ret: Type
  ) {}
}

/**
 * Function types.
 */
export class FunType extends BaseFunType implements BaseType {
  public kind: TypeKind.FUN;
}
FunType.prototype.kind = TypeKind.FUN;

/**
 * Variadic function types. These functions can take any number of arguments
 * of a single type: the `params` array must have length 1.
 */
export class VariadicFunType extends BaseFunType implements BaseType {
  public kind: TypeKind.VARIADIC_FUN;
}
VariadicFunType.prototype.kind = TypeKind.VARIADIC_FUN;


/**
 * Code types.
 */
export class CodeType implements BaseType {
  public kind: TypeKind.CODE;
  constructor(
    public inner: Type,
    public annotation: string,
    public snippet: number | null = null,  // Corresponding escape ID.
    public snippet_var: TypeVariable | null = null  // Snippet polymorphism.
  ) {}
}
CodeType.prototype.kind = TypeKind.CODE;

/**
 * Type constructors: the basic element of parametricity.
 */
export class ConstructorType implements BaseType {
  public kind: TypeKind.CONSTRUCTOR;
  constructor(public name: string) { }
  instance(arg: Type) {
    return new InstanceType(this, arg);
  }
}
ConstructorType.prototype.kind = TypeKind.CONSTRUCTOR;

export class InstanceType implements BaseType {
  public kind: TypeKind.INSTANCE;
  constructor(public cons: ConstructorType, public arg: Type) { }
}
InstanceType.prototype.kind = TypeKind.INSTANCE;

/**
 * Slightly more general parametricity with a universal quantifier.
 */
export class QuantifiedType implements BaseType {
  public kind: TypeKind.QUANTIFIED;
  constructor(public variable: TypeVariable, public inner: Type) { }
}
QuantifiedType.prototype.kind = TypeKind.QUANTIFIED;

export class VariableType implements BaseType {
  public kind: TypeKind.VARIABLE;
  constructor(public variable: TypeVariable) { }
}
VariableType.prototype.kind = TypeKind.VARIABLE;

/**
 * Simple overloading.
 */
export class OverloadedType implements BaseType {
  public kind: TypeKind.OVERLOADED;
  constructor(public types: Type[]) { }
}
OverloadedType.prototype.kind = TypeKind.OVERLOADED;

/**
 * Tuple (product) types.
 */
export class TupleType implements BaseType {
  public kind: TypeKind.TUPLE;
  constructor(public components: Type[]) { }
}
TupleType.prototype.kind = TypeKind.TUPLE;

/**
 * The type for all types.
 *
 * Using a union here, unlike using `BaseType` itself as the type for types,
 * lets us take advantage of TypeScript's "tagged union" functionality: for
 * example, the type checker can help us avoid non-exhaustive matches.
 */
export type Type = PrimitiveType | AnyType | VoidType | FunType |
  VariadicFunType | CodeType | ConstructorType | InstanceType | QuantifiedType |
  VariableType | OverloadedType | TupleType;

// Type variables.

// `TypeVariable` represents type-level variables of *any* kind.
export class TypeVariable {
  constructor(public name: string) {}
  _brand_TypeVariable: void;
}


// Type-related data structures and built-in types.

// Type maps are used all over the place: most urgently, as "frames" in the
// type checker's environment.
export interface TypeMap {
  readonly [name: string]: Type;
}

// The built-in primitive types.
export const INT = new PrimitiveType("Int");
export const FLOAT = new PrimitiveType("Float");
export const STRING = new PrimitiveType("String");
export const BOOLEAN = new PrimitiveType("Bool");
export const BUILTIN_TYPES: TypeMap = {
  "Int": INT,
  "Float": FLOAT,
  "Void": VOID,
  "String": STRING,
  "Bool": BOOLEAN,
  "Any": ANY,
};


// Visiting type trees.

export interface TypeVisit<P, R> {
  visit_primitive(type: PrimitiveType, param: P): R;
  visit_fun(type: FunType, param: P): R;
  visit_code(type: CodeType, param: P): R;
  visit_any(type: AnyType, param: P): R;
  visit_void(type: VoidType, param: P): R;
  visit_constructor(type: ConstructorType, param: P): R;
  visit_instance(type: InstanceType, param: P): R;
  visit_quantified(type: QuantifiedType, param: P): R;
  visit_variable(type: VariableType, param: P): R;
  visit_overloaded(type: OverloadedType, param: P): R;
  visit_tuple(type: TupleType, param: P): R;
}

export function type_visit<P, R>(visitor: TypeVisit<P, R>,
                          type: Type, param: P): R {
  switch (type.kind) {
    case TypeKind.PRIMITIVE:
      return visitor.visit_primitive(type, param);
    case TypeKind.FUN:
      return visitor.visit_fun(type, param);
    case TypeKind.CODE:
      return visitor.visit_code(type, param);
    case TypeKind.ANY:
      return visitor.visit_any(type, param);
    case TypeKind.VOID:
      return visitor.visit_void(type, param);
    case TypeKind.CONSTRUCTOR:
      return visitor.visit_constructor(type, param);
    case TypeKind.INSTANCE:
      return visitor.visit_instance(type, param);
    case TypeKind.QUANTIFIED:
      return visitor.visit_quantified(type, param);
    case TypeKind.VARIABLE:
      return visitor.visit_variable(type, param);
    case TypeKind.OVERLOADED:
      return visitor.visit_overloaded(type, param);
    case TypeKind.TUPLE:
      return visitor.visit_tuple(type, param);
    default:
      throw "error: unknown type kind " + typeof(type);
  }
}

// Format a type as a string.
let pretty_type_rules: TypeVisit<void, string> = {
  visit_primitive(type: PrimitiveType, param: void): string {
    return type.name;
  },
  visit_fun(type: FunType, param: void): string {
    let s = "";
    for (let pt of type.params) {
      s += pretty_type(pt) + " ";
    }
    s += "-> " + pretty_type(type.ret);
    return s;
  },
  visit_code(type: CodeType, param: void): string {
    let out = "<" + pretty_type(type.inner) + ">";
    if (type.annotation) {
      out = type.annotation + out;
    }
    if (type.snippet) {
      out = "$" + type.snippet + out;
    } else if (type.snippet_var) {
      out = "$" + type.snippet_var.name + out;
    }
    return out;
  },
  visit_any(type: AnyType, param: void): string {
    return "Any";
  },
  visit_void(type: VoidType, param: void): string {
    return "Void";
  },
  visit_constructor(type: ConstructorType, param: void): string {
    return type.name;
  },
  visit_instance(type: InstanceType, param: void): string {
    return pretty_type(type.arg) + " " + type.cons.name;
  },
  visit_quantified(type: QuantifiedType, param: void): string {
    return pretty_type(type.inner);
  },
  visit_variable(type: VariableType, param: void): string {
    return type.variable.name;
  },
  visit_overloaded(type: OverloadedType, param: void): string {
    let out = "";
    for (let i = 0; i < type.types.length; i++) {
      out += pretty_type(type.types[i]);
      if (i !== type.types.length - 1) {
        out += " | ";
      }
    }
    return out;
  },
  visit_tuple(type: TupleType, param: void): string {
    return type.components.map(pretty_type).join(" * ");
  },
};

export function pretty_type(type: Type) {
  return type_visit(pretty_type_rules, type, null);
}
