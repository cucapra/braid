/**
 * The base type for all types.
 */
export abstract class Type {
  _brand_Type: void;
}

/**
 * Primitive types. Each primitive type is a (shared) instance of this class.
 */
export class PrimitiveType extends Type {
  constructor(public name: string) { super() };

  // A workaround to compensate for TypeScript's structural subtyping:
  // https://github.com/Microsoft/TypeScript/issues/202
  _brand_PrimitiveType: void;
};

/**
 * A "top" type: a supertype of everything.
 */
export class AnyType extends Type {
  _brand_AnyType: void;
};
export const ANY = new AnyType();

/**
 * A "bottom" type: a subtype of everything.
 */
export class VoidType extends Type {
  _brand_AnyType: void;
};
export const VOID = new VoidType();

/**
 * Function types.
 */
export class FunType extends Type {
  constructor(
    /**
     * The parameter types.
     */
    public params: Type[],

    /**
     * The return type.
     */
    public ret: Type
  ) { super() };
  _brand_FunType: void;
};

/**
 * Variadic function types. These functions can take any number of arguments
 * of a single type: the `params` array must have length 1.
 */
export class VariadicFunType extends FunType {
  _brand_VariadicFunType: void;
}

/**
 * Code types.
 */
export class CodeType extends Type {
  constructor(
    public inner: Type,
    public annotation: string,
    public snippet: number | null = null,  // Corresponding escape ID.
    public snippet_var: TypeVariable | null = null  // Snippet polymorphism.
  ) { super() };
  _brand_CodeType: void;
};

// Type constructors: the basic element of parametricity.
export class ConstructorType extends Type {
  constructor(public name: string) { super() };
  instance(arg: Type) {
    return new InstanceType(this, arg);
  };
  _brand_ConstructorType: void;
}
export class InstanceType extends Type {
  constructor(public cons: ConstructorType, public arg: Type) { super() };
  _brand_InstanceType: void;
}

// Slightly more general parametricity with a universal quantifier.
export class QuantifiedType extends Type {
  constructor(public variable: TypeVariable, public inner: Type) { super() };
  _brand_QuantifiedType: void;
}
export class VariableType extends Type {
  constructor(public variable: TypeVariable) { super() };
  _brand_VariableType: void;
}

// Simple overloading.
export class OverloadedType extends Type {
  constructor(public types: Type[]) { super() };
  _brand_OverloadedType: void;
}


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
  [name: string]: Type;
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
}

export function type_visit<P, R>(visitor: TypeVisit<P, R>,
                          type: Type, param: P): R {
  if (type instanceof PrimitiveType) {
    return visitor.visit_primitive(type, param);
  } else if (type instanceof FunType) {
    return visitor.visit_fun(type, param);
  } else if (type instanceof CodeType) {
    return visitor.visit_code(type, param);
  } else if (type instanceof AnyType) {
    return visitor.visit_any(type, param);
  } else if (type instanceof VoidType) {
    return visitor.visit_void(type, param);
  } else if (type instanceof ConstructorType) {
    return visitor.visit_constructor(type, param);
  } else if (type instanceof InstanceType) {
    return visitor.visit_instance(type, param);
  } else if (type instanceof QuantifiedType) {
    return visitor.visit_quantified(type, param);
  } else if (type instanceof VariableType) {
    return visitor.visit_variable(type, param);
  } else if (type instanceof OverloadedType) {
    return visitor.visit_overloaded(type, param);
  } else {
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
    let out:string = "";
    for (var i = 0; i < type.types.length; i++) {
      out += pretty_type(type.types[i]);
      if (i !== type.types.length - 1) out += " | ";
    }
    return out;
  },
}

export function pretty_type(type: Type) {
  return type_visit(pretty_type_rules, type, null);
}
