import { Type, TypeMap, FunType, OverloadedType, CodeType, InstanceType,
  ConstructorType, VariableType, PrimitiveType, AnyType, VoidType,
  QuantifiedType, INT, FLOAT, ANY, VOID, STRING, BOOLEAN, pretty_type, TypeVisit,
  TypeVariable, type_visit, VariadicFunType } from './type';
import * as ast from './ast';
import { Gen, overlay, merge, hd, tl, cons, stack_lookup,
  stack_put, zip, locationError } from './util';
import { ASTVisit, ast_visit, TypeASTVisit, type_ast_visit } from './visit';

/**
 * A type environment contains all the state that threads through the type
 * checker.
 */
export interface TypeEnv {
  /**
   * A map stack with the current stage at the front of the list. Prior stages
   * are to the right. Normal accesses must refer to the top environment
   * frame; subsequent ones are "auto-persists".
   */
  stack: TypeMap[],

  /**
   * A stack of *quote annotations*, which allows type system extensions to be
   * sensitive to the quote context.
   */
  anns: (string | null)[],

  /**
   * A single frame for "extern" values, which are always available without
   * any persisting.
   */
  externs: TypeMap,

  /**
   * A map for *named types*. Unlike the other maps, each entry here
   * represents a *type*, not a variable.
   */
  named: TypeMap,

  /**
   * The current *snippet escape* (or null if there is none). The tuple
   * consists of the ID of the escape and the environment at that point that
   * should be "resumed" on quote.
   */
  snip: [number, TypeEnv] | null,
};

/**
 * Push a scope onto a `TypeEnv`.
 */
function te_push(env: TypeEnv, map: TypeMap = {}, ann: string): TypeEnv {
  return merge(env, {
    // Push maps onto the front.
    stack: cons(map, env.stack),
    anns: cons(ann, env.anns),

    // New scopes have a null snippet by default.
    snip: null,
  });
}

/**
 * Pop a number of scopes off of a `TypeEnv`.
 */
function te_pop(env: TypeEnv, count: number = 1,
                snip: [number, TypeEnv] | null = null): TypeEnv {
  return merge(env, {
    // Pop one map off of each stack.
    stack: env.stack.slice(count),
    anns: env.anns.slice(count),

    // Optionally set the current snippet (if we're popping for a snippet
    // escape).
    snip: snip,
  });
}

// A utility used here, in the type checker, and also during desugaring when
// processing macro invocations.
export function unquantified_type(type: Type): Type {
  if (type instanceof QuantifiedType) {
    return type.inner;
  } else {
    return type;
  }
}


// The built-in operator types. These can be extended by providing custom
// intrinsics.
const _UNARY_TYPE = new OverloadedType([
  new FunType([INT], INT),
  new FunType([FLOAT], FLOAT),
]);
const _BINARY_TYPE = new OverloadedType([
  new FunType([INT, INT], INT),
  new FunType([FLOAT, FLOAT], FLOAT),
]);
const _UNARY_BINARY_TYPE = new OverloadedType(
  _UNARY_TYPE.types.concat(_BINARY_TYPE.types)
);
export const BUILTIN_OPERATORS: TypeMap = {
  '+': _UNARY_BINARY_TYPE,
  '-': _UNARY_BINARY_TYPE,
  '*': _BINARY_TYPE,
  '/': _BINARY_TYPE,
  '~': new FunType([BOOLEAN], BOOLEAN),
  '==': new FunType([INT, INT], BOOLEAN),
  '!==': new FunType([INT, INT], BOOLEAN),
};


// The type checker.
// The checker is written as a "function generator," and we'll later take its
// fixed point to get an ordinary type checker function (of type `TypeCheck`,
// below).

export type TypeCheck = (tree: ast.SyntaxNode, env: TypeEnv) => [Type, TypeEnv];
export let gen_check : Gen<TypeCheck> = function(check) {
  let type_rules : ASTVisit<TypeEnv, [Type, TypeEnv]> = {
    visit_literal(tree: ast.LiteralNode, env: TypeEnv): [Type, TypeEnv] {
      if (tree.type === "int") {
        return [INT, env];
      } else if (tree.type === "float") {
        return [FLOAT, env];
      } else if (tree.type === "string") {
        return [STRING, env];
      } else if (tree.type === "boolean") {
        return [BOOLEAN, env];
      } else {
        throw "error: unknown literal type";
      }
    },

    visit_seq(tree: ast.SeqNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = check(tree.lhs, env);
      return check(tree.rhs, e);
    },

    visit_let(tree: ast.LetNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the assignment expression.
      let [t, e] = check(tree.expr, env);

      // Insert the new type into the front of the map stack.
      let e2: TypeEnv = merge(e, {
        stack: stack_put(e.stack, tree.ident, t)
      });

      return [t, e2];
    },

    visit_assign(tree: ast.AssignNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the value expression.
      let [expr_t, e] = check(tree.expr, env);

      // Check that the new value is compatible with the variable's type.
      // Try a normal variable first.
      let [var_t,] = stack_lookup(env.stack, tree.ident);
      if (var_t === undefined) {
        var_t = env.externs[tree.ident];
        if (var_t === undefined) {
          throw "type error: assignment to undeclared variable " + tree.ident + locationError(tree);
        }
      }

      if (!compatible(var_t, expr_t)) {
        throw "type error: mismatched type in assigment: " +
          "expected " + pretty_type(var_t) +
          ", got " + pretty_type(expr_t) + locationError(tree);
      }

      return [var_t, e];
    },

    visit_lookup(tree: ast.LookupNode, env: TypeEnv): [Type, TypeEnv] {
      // Try a normal variable first.
      let [t,] = stack_lookup(env.stack, tree.ident);
      if (t !== undefined) {
        return [t, env];
      }

      // Next, try looking for an extern.
      let et = env.externs[tree.ident];
      if (et !== undefined) {
        return [et, env];
      }

      throw "type error: undefined variable " + tree.ident + locationError(tree);
    },

    visit_unary(tree: ast.UnaryNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = check(tree.expr, env);

      // Unary and binary operators use intrinsic functions whose names match
      // the operator. Currently, these can *only* be defined as externs; for
      // more flexible operator overloading, we could eventually also look at
      // ordinary variable.
      let fun = env.externs[tree.op];
      let ret = check_call(fun, [t]);
      if (ret instanceof Type) {
        return [ret, e];
      } else {
        throw "type error: invalid unary operation (" +
            tree.op + " " + pretty_type(t) + ")" + locationError(tree);
      }
    },

    visit_binary(tree: ast.BinaryNode, env: TypeEnv): [Type, TypeEnv] {
      let [t1, e1] = check(tree.lhs, env);
      let [t2, e2] = check(tree.rhs, e1);

      // Use extern functions, as with unary operators.
      let fun = env.externs[tree.op];
      let ret = check_call(fun, [t1, t2]);
      if (ret instanceof Type) {
        return [ret, e2];
      } else {
        throw "type error: invalid binary operation (" +
            pretty_type(t1) + " " + tree.op + " " + pretty_type(t2) + ")" + 
            locationError(tree);
      }
    },

    visit_quote(tree: ast.QuoteNode, env: TypeEnv): [Type, TypeEnv] {
      // If this is a snippet quote, we need to "resume" type context from the
      // escape point. Also, we'll record the ID from the environment in the
      // type.
      let snippet: number | null = null;
      let inner_env: TypeEnv;
      if (tree.snippet) {
        if (env.snip === null) {
          throw "type error: snippet quote without matching snippet escape";
        }

        // "Resume" the environment for the snippet quote.
        [snippet, inner_env] = env.snip;

      } else {
        // Ordinary, independent quote. Push an empty stack frame.
        inner_env = te_push(env, {}, tree.annotation);
      }

      // Check inside the quote using the empty frame.
      let [t, e] = check(tree.expr, inner_env);

      // Move the result type "down" to a code type.
      let code_type = new CodeType(t, tree.annotation, snippet);

      // Ignore any changes to the environment.
      let out_env = env;
      if (tree.snippet) {
        // Store away the updated context for any subsequent snippets.
        out_env = merge(out_env, {
          snip: [snippet, e],
        });
      }

      return [code_type, out_env];
    },

    visit_escape(tree: ast.EscapeNode, env: TypeEnv): [Type, TypeEnv] {
      // Make sure we don't escape "too far" beyond the top level.
      let level = env.stack.length;
      let count = tree.count;
      if (count > level) {
        throw `type error: can't escape ${count}x at level ${level}` + locationError(tree);
      }

      // Construct the environment for checking the escape's body. If this is
      // a snippet escape, record it. Otherwise, the nearest snippet is null.
      let snip_inner: [number, TypeEnv] | null =
        tree.kind === "snippet" ? [tree.id!, env] : null;
      let inner_env = te_pop(env, count, snip_inner);

      // Check the contents of the escape.
      let [t, e] = check(tree.expr, inner_env);

      if (tree.kind === "splice") {
        // The result of the escape's expression must be code, so it can be
        // spliced.
        if (t instanceof CodeType) {
          if (t.snippet !== null) {
            throw "type error: snippet quote in non-snippet splice" + locationError(tree);
          } else if (t.annotation !== env.anns[0]) {
            throw "type error: mismatched annotations in splice" + locationError(tree);
          }
          // The result type is the type that was quoted.
          return [t.inner, env];
        } else {
          throw "type error: splice escape produced non-code value" + locationError(tree);
        }

      } else if (tree.kind === "persist") {
        // A persist escape has the same type as the original type.
        return [t, env];

      } else if (tree.kind === "snippet") {
        if (t instanceof CodeType) {
          if (t.snippet === null) {
            throw "type error: non-snippet code in snippet splice" + locationError(tree);
          } else if (t.snippet !== tree.id) {
            throw "type error: mismatched snippet splice" + locationError(tree);
          }
          return [t.inner, env];
        } else {
          throw "type error: snippet escape produced non-code value" + locationError(tree);
        }

      } else {
        throw "error: unknown escape kind";
      }
    },

    visit_run(tree: ast.RunNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = check(tree.expr, env);
      if (t instanceof CodeType) {
        if (t.snippet) {
          throw "type error: cannot run splice quotes individually" + locationError(tree);
        }
        return [t.inner, e];
      } else {
        throw "type error: running a non-code type " + pretty_type(t) + locationError(tree);
      }
    },

    visit_fun(tree: ast.FunNode, env: TypeEnv): [Type, TypeEnv] {
      // Get the list of declared parameter types and accumulate them in an
      // environment based on the top of the environment stack.
      let param_types : Type[] = [];
      let body_env_hd = overlay(hd(env.stack));
      for (let param of tree.params) {
        let [ptype,] = check(param, env);
        param_types.push(ptype);
        body_env_hd[param.name] = ptype;
      }
      let tvar = rectify_fun_params(param_types);

      // Check the body and get the return type.
      let body_env: TypeEnv = merge(env, {
        stack: cons(body_env_hd, tl(env.stack)),
      });
      let [ret_type,] = check(tree.body, body_env);

      // Construct the function type.
      let fun_type: Type = new FunType(param_types, ret_type);
      if (tvar) {
        fun_type = new QuantifiedType(tvar, fun_type);
      }
      return [fun_type, env];
    },

    visit_param(tree: ast.ParamNode, env: TypeEnv): [Type, TypeEnv] {
      return [get_type(tree.type, env.named), env];
    },

    visit_call(tree: ast.CallNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the type of the thing we're calling.
      let [target_type, e] = check(tree.fun, env);

      // Check each argument type.
      let arg_types: Type[] = [];
      let arg_type: Type;
      for (let arg of tree.args) {
        [arg_type, e] = check(arg, e);
        arg_types.push(arg_type);
      }

      // Check the call itself.
      let ret = check_call(target_type, arg_types);
      if (ret instanceof Type) {
        return [ret, e];
      } else {
        throw ret + locationError(tree);
      }
    },

    visit_extern(tree: ast.ExternNode, env: TypeEnv): [Type, TypeEnv] {
      // Add the type to the extern map.
      let new_externs = overlay(env.externs);
      let type = get_type(tree.type, env.named);
      new_externs[tree.name] = type;
      let e: TypeEnv = merge(env, {
        externs: new_externs,
      });

      return [type, e];
    },

    visit_persist(tree: ast.PersistNode, env: TypeEnv): [Type, TypeEnv] {
      throw "error: persist cannot be type-checked in source code";
    },

    visit_if(tree: ast.IfNode, env: TypeEnv): [Type, TypeEnv] {
      let [cond_type, e] = check(tree.cond, env);
      if (cond_type !== BOOLEAN) {
        throw "type error: `if` condition must be Boolean" + locationError(tree);
      }

      let [true_type,] = check(tree.truex, e);
      let [false_type,] = check(tree.falsex, e);
      if (!(compatible(true_type, false_type) &&
            compatible(false_type, true_type))) {
        throw "type error: condition branches must have same type" + locationError(tree);
      }

      return [true_type, e];
    },

    visit_while(tree: ast.WhileNode, env: TypeEnv): [Type, TypeEnv] {
      let [cond_type, e] = check(tree.cond, env);
      if (cond_type !== BOOLEAN) {
        throw "type error: `while` condition must be boolean" + locationError(tree);
      }

      let [body_type,] = check(tree.body, e);
      return [VOID, e];
    },

    visit_macrocall(tree: ast.MacroCallNode, env: TypeEnv): [Type, TypeEnv] {
      // Look for the macro definition.
      let [macro_type, count] = stack_lookup(env.stack, tree.macro);
      if (macro_type === undefined) {
        throw `type error: macro ${tree.macro} not defined` + locationError(tree);
      }

      // Get the function type (we need its arguments).
      let unq_type = unquantified_type(macro_type);
      let fun_type: FunType;
      if (unq_type instanceof FunType) {
        fun_type = unq_type;
      } else {
        throw "type error: macro must be a function" + locationError(tree);
      }

      // Check code arguments in a fresh, quoted environment based at the
      // stage where the macro was defined.
      let arg_env = te_push(te_pop(env, count), {}, "");
      let arg_types: Type[] = [];
      for (let [param, arg] of zip(fun_type.params, tree.args)) {
        // Check whether the parameter is a snippet (open code), an ordinary
        // code type, or an eager non-code value.
        let as_snippet = false;
        if (param instanceof CodeType) {
          // Code type, either ordinary or snippet.
          let as_snippet = !!param.snippet_var;

          // Check the argument and record its code type.
          let [t,] = check(arg, as_snippet ? env : arg_env);
          let code_t = new CodeType(t, "", as_snippet ? tree.id : null);
          arg_types.push(code_t);
        } else {
          // Non-code type. Check the argument in the macro's scope.
          let [t,] = check(arg, env);
          arg_types.push(t);
        }
      }

      // Get the return type of the macro function.
      let ret = check_call(macro_type, arg_types);
      if (ret instanceof Type) {
        // Macros return code, and we splice in the result here.
        if (ret instanceof CodeType) {
          return [ret.inner, env];
        } else {
          throw "type error: macro must return code" + locationError(tree);
        }
      } else {
        throw ret;
      }
    },
  };

  // The entry point for the recursion.
  return function (tree, env) {
    return ast_visit(type_rules, tree, env);
  }
}

/**
 * An error message for argument types.
 */
function param_error(i: number, param: Type, arg: Type): string {
  return "type error: mismatched argument type at index " + i +
    ": expected " + pretty_type(param) +
    ", got " + pretty_type(arg);
}

/**
 * Check that a function call is well-typed. Return the result type or a
 * string indicating the error.
 */
function check_call(target: Type, args: Type[]): Type | string {
  // The target is a variadic function.
  if (target instanceof VariadicFunType) {
    if (target.params.length != 1) {
      return "type error: variadic function with multiple argument types";
    }
    let param = target.params[0];
    for (let i = 0; i < args.length; ++i) {
      let arg = args[i];
      if (!compatible(param, arg)) {
        return param_error(i, param, arg);
      }
    }

    return target.ret;

  // The target is an ordinary function.
  } else if (target instanceof FunType) {
    // Check that the arguments are the right type.
    if (args.length != target.params.length) {
      return "type error: mismatched argument length";
    }
    for (let i = 0; i < args.length; ++i) {
      let param = target.params[i];
      let arg = args[i];
      if (!compatible(param, arg)) {
        return param_error(i, param, arg);
      }
    }

    return target.ret;

  // An overloaded type. Try each component type.
  } else if (target instanceof OverloadedType) {
    for (let sub of target.types) {
      let ret = check_call(sub, args);
      if (ret instanceof Type) {
        return ret;
      }
    }
    return "type error: no overloaded type applies";

  // Polymorphic functions.
  } else if (target instanceof QuantifiedType) {
    // Special case for unifying polymorphic snippet function types with
    // snippet arguments.
    let snippet: number | null = null;
    let snippet_var: TypeVariable | null = null;
    for (let arg of args) {
      if (arg instanceof CodeType) {
        if (arg.snippet) {
          snippet = arg.snippet;
          break;
        } else if (arg.snippet_var) {
          snippet_var = arg.snippet_var;
          break;
        }
      }
    }
    if (snippet !== null) {
      return check_call(apply_quantified_type(target, snippet), args);
    } else if (snippet_var !== null) {
      return check_call(apply_quantified_type(target, snippet_var), args);
    } else {
      return "type error: unsupported polymorphism";
    }

  } else {
    return "type error: call of non-function";
  }
}

// Check type compatibility.
function compatible(ltype: Type, rtype: Type): boolean {
  if (ltype === rtype) {
    return true;

  } else if (ltype === FLOAT && rtype === INT) {
    return true;

  } else if (ltype === ANY) {
    return true;

  } else if (ltype instanceof FunType && rtype instanceof FunType) {
    if (ltype.params.length != rtype.params.length) {
      return false;
    }
    for (let i = 0; i < ltype.params.length; ++i) {
      let lparam = ltype.params[i];
      let rparam = rtype.params[i];
      if (!compatible(rparam, lparam)) {  // Contravariant.
        return false;
      }
    }
    return compatible(ltype.ret, rtype.ret);  // Covariant.

  } else if (ltype instanceof InstanceType && rtype instanceof InstanceType) {
    if (ltype.cons === rtype.cons) {
      // Invariant.
      return compatible(ltype.arg, rtype.arg) &&
        compatible(rtype.arg, ltype.arg);
    }

  } else if (ltype instanceof CodeType && rtype instanceof CodeType) {
    return compatible(ltype.inner, rtype.inner) &&
      ltype.annotation === rtype.annotation &&
      ltype.snippet === rtype.snippet &&
      ltype.snippet_var === rtype.snippet_var;

  }

  return false;
}

/**
 * To make these polymorphic snippet code types possible to write down, we
 * make any such type variables in function signatures "agree." This, of
 * course, means that it's impossible to write a function that uses two
 * different type variables for snippet code types.
 */
function rectify_fun_type(type: FunType): Type {
  // Rectify the parameters.
  let tvar = rectify_fun_params(type.params);

  // Do the same for the return value.
  let ret = type.ret;
  if (ret instanceof CodeType && ret.snippet_var) {
    if (tvar === null) {
      tvar = ret.snippet_var;
    } else {
      ret.snippet_var = tvar;
    }
  }

  // If there's polymorphism, wrap this in a universal quantifier type.
  if (tvar) {
    return new QuantifiedType(tvar, type);
  } else {
    return type;
  }
}

/**
 * As with `rectify_fun_type`, but just for the parameters. This is
 * necessary when checking functions, where return types are not known yet.
 */
function rectify_fun_params(params: Type[]): TypeVariable | null {
  let tvar: TypeVariable | null = null;

  for (let param of params) {
    if (param instanceof CodeType && param.snippet_var) {
      if (tvar === null) {
        // Take the first variable found.
        tvar = param.snippet_var;
      } else {
        // Apply the same variable here.
        param.snippet_var = tvar;
      }
    }
  }

  return tvar;
}

// Get the Type denoted by the type syntax tree.
let get_type_rules: TypeASTVisit<TypeMap, Type> = {
  visit_primitive(tree: ast.PrimitiveTypeNode, types: TypeMap) {
    let t = types[tree.name];
    if (t !== undefined) {
      if (t instanceof ConstructorType) {
        throw "type error: " + tree.name + " needs a parameter" + locationError(tree);
      } else {
        return t;
      }
    } else {
      throw "type error: unknown primitive type " + tree.name + locationError(tree);
    }
  },

  visit_fun(tree: ast.FunTypeNode, types: TypeMap) {
    let params: Type[] = [];
    for (let param_node of tree.params) {
      params.push(get_type(param_node, types));
    }
    let ret = get_type(tree.ret, types);

    // Construct the function type.
    return rectify_fun_type(new FunType(params, ret));
  },

  visit_code(tree: ast.CodeTypeNode, types: TypeMap) {
    let inner = get_type(tree.inner, types);
    if (tree.snippet) {
      // Polymorphic snippet code type.
      return new CodeType(inner, tree.annotation, null, new TypeVariable("id"));
    } else {
      return new CodeType(inner, tree.annotation);
    }
  },

  visit_instance(tree: ast.InstanceTypeNode, types: TypeMap) {
    let t = types[tree.name];
    if (t !== undefined) {
      if (t instanceof ConstructorType) {
        let arg = get_type(tree.arg, types);
        return t.instance(arg);
      } else {
        throw "type error: " + tree.name + " is not parameterized" + locationError(tree);
      }
    } else {
      throw "type error: unknown type constructor " + tree.name + locationError(tree);
    }
  },
};

function get_type(ttree: ast.TypeNode, types: TypeMap): Type {
  return type_ast_visit(get_type_rules, ttree, types);
}

// Fill in a parameterized type.
let apply_type_rules: TypeVisit<[TypeVariable, any], Type> = {
  // Replace a type variable (used as a type) with the provided type.
  visit_variable(type: VariableType, [tvar, targ]: [TypeVariable, any]): Type {
    if (type.variable === tvar) {
      return targ;
    } else {
      return new VariableType(type.variable);
    }
  },

  // In code types, variables can appear in the snippet.
  visit_code(type: CodeType, [tvar, targ]: [TypeVariable, any]): Type {
    if (type.snippet_var && type.snippet_var === tvar) {
      // A match!
      if (targ instanceof TypeVariable) {
        // Replace the type variable.
        return new CodeType(apply_type(type.inner, tvar, targ), type.annotation,
            null, targ);
      } else {
        // Make this a concrete snippet type.
        return new CodeType(apply_type(type.inner, tvar, targ), type.annotation,
            targ);
      }
    } else {
      // Reconstruct the type.
      return new CodeType(apply_type(type.inner, tvar, targ), type.annotation,
          type.snippet, type.snippet_var);
    }
  },

  // The remaining rules are just boring boilerplate: `map` for types.
  visit_primitive(type: PrimitiveType,
      [tvar, targ]: [TypeVariable, any]): Type
  {
    return type;
  },
  visit_fun(type: FunType, [tvar, targ]: [TypeVariable, any]): Type {
    let params: Type[] = [];
    for (let param of type.params) {
      params.push(apply_type(param, tvar, targ));
    }
    let ret = apply_type(type.ret, tvar, targ);
    return new FunType(params, ret);
  },
  visit_any(type: AnyType, [tvar, targ]: [TypeVariable, any]): Type {
    return type;
  },
  visit_void(type: VoidType, [tvar, targ]: [TypeVariable, any]): Type {
    return type;
  },
  visit_constructor(type: ConstructorType,
      [tvar, targ]: [TypeVariable, any]): Type
  {
    return type;
  },
  visit_instance(type: InstanceType,
      [tvar, targ]: [TypeVariable, any]): Type
  {
    return new InstanceType(type.cons, apply_type(type.arg, tvar, targ));
  },
  visit_quantified(type: QuantifiedType,
      [tvar, targ]: [TypeVariable, any]): Type
  {
    return new QuantifiedType(type.variable,
        apply_type(type.inner, tvar, targ));
  },
}

function apply_type(type: Type, tvar: TypeVariable, targ: any): Type {
  return type_visit(apply_type_rules, type, [tvar, targ]);
}

function apply_quantified_type(type: QuantifiedType, arg: any): Type {
  return apply_type(type.inner, type.variable, arg);
}
