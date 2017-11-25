import { Type, TypeMap, FunType, OverloadedType, CodeType, InstanceType,
  ConstructorType, VariableType, PrimitiveType, AnyType, VoidType,
  QuantifiedType, TupleType, INT, FLOAT, ANY, VOID, STRING, BOOLEAN,
  pretty_type, TypeVisit, TypeVariable,
  VariadicFunType, TypeKind } from './type';
import * as ast from './ast';
import { Gen, merge, hd, tl, cons, stack_lookup, zip,
  head_merge, unreachable } from './util';
import { ASTVisit, ast_visit, TypeASTVisit, type_ast_visit } from './visit';
import { error } from './error';

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
  stack: TypeMap[];

  /**
   * A stack of *quote annotations*, which allows type system extensions to be
   * sensitive to the quote context.
   */
  anns: (string | null)[];

  /**
   * A single frame for "extern" values, which are always available without
   * any persisting.
   */
  externs: TypeMap;

  /**
   * A map for *named types*. Unlike the other maps, each entry here
   * represents a *type*, not a variable.
   */
  named: TypeMap;

  /**
   * The current *snippet escape* (or null if there is none). The tuple
   * consists of the ID of the escape and the environment at that point that
   * should be "resumed" on quote.
   */
  snip: [number, TypeEnv] | null;
}

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
  if (type.kind === TypeKind.QUANTIFIED) {
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
const _COMPARE_TYPE = new OverloadedType([
  new FunType([INT, INT], BOOLEAN),
  new FunType([FLOAT, FLOAT], BOOLEAN),
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
  '==': _COMPARE_TYPE,
  '!=': _COMPARE_TYPE,
  '>=': _COMPARE_TYPE,
  '<=': _COMPARE_TYPE,
};


// The type checker.
// The checker is written as a "function generator," and we'll later take its
// fixed point to get an ordinary type checker function (of type `TypeCheck`,
// below).

export type TypeCheck = (tree: ast.SyntaxNode, env: TypeEnv) => [Type, TypeEnv];
export let gen_check: Gen<TypeCheck> = function(check) {
  let type_rules: ASTVisit<TypeEnv, [Type, TypeEnv]> = {
    visit_root(tree: ast.RootNode, env: TypeEnv): [Type, TypeEnv] {
      let t: Type | null = null;
      let e: TypeEnv = env;
      for (let child of tree.children) {
        [t, e] = check(child, e);
      }
      if (t === null) {
        throw "Error: Empty Root node";
      }
      return [t, e];
    },

    visit_literal(tree: ast.LiteralNode, env: TypeEnv): [Type, TypeEnv] {
      switch (tree.type) {
        case "int":
          return [INT, env];
        case "float":
          return [FLOAT, env];
        case "string":
          return [STRING, env];
        case "boolean":
          return [BOOLEAN, env];
        default:
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
        stack: head_merge(e.stack, { [tree.ident]: t })
      });

      return [t, e2];
    },

    visit_assign(tree: ast.AssignNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the value expression.
      let [expr_t, e] = check(tree.expr, env);

      // Check that the new value is compatible with the variable's type.
      // Try a normal variable first.
      let [var_t] = stack_lookup(env.stack, tree.ident);
      if (var_t === undefined) {
        var_t = env.externs[tree.ident];
        if (var_t === undefined) {
          throw error(tree, "type",
            `assignment to undeclared variable ${tree.ident}`);
        }
      }

      if (!compatible(var_t, expr_t)) {
        throw error(tree, "type",
          `expected ${pretty_type(var_t)}, got ${pretty_type(expr_t)}`);
      }

      return [var_t, e];
    },

    visit_lookup(tree: ast.LookupNode, env: TypeEnv): [Type, TypeEnv] {
      // Try a normal variable first.
      let [t] = stack_lookup(env.stack, tree.ident);
      if (t !== undefined) {
        return [t, env];
      }

      // Next, try looking for an extern.
      let et = env.externs[tree.ident];
      if (et !== undefined) {
        return [et, env];
      }

      throw error(tree, "type", `undefined variable ${tree.ident}`);
    },

    visit_unary(tree: ast.UnaryNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = check(tree.expr, env);

      // Unary and binary operators use intrinsic functions whose names match
      // the operator. Currently, these can *only* be defined as externs; for
      // more flexible operator overloading, we could eventually also look at
      // ordinary variable.
      let fun = env.externs[tree.op];
      let ret = check_call(fun, [t]);
      if (typeof(ret) === 'string') {
        // A string represents an error checking the call.
        throw error(tree, "type",
          `invalid unary operation ${tree.op} ${pretty_type(t)}`);
      } else {
        // Success: we have a return type.
        return [ret, e];
      }
    },

    visit_binary(tree: ast.BinaryNode, env: TypeEnv): [Type, TypeEnv] {
      let [t1, e1] = check(tree.lhs, env);
      let [t2, e2] = check(tree.rhs, e1);

      // Use extern functions, as with unary operators.
      let fun = env.externs[tree.op];
      let ret = check_call(fun, [t1, t2]);
      if (typeof(ret) === 'object') {
        return [ret, e2];
      } else {
        throw error(tree, "type",
          `invalid binary operation ` +
          `${pretty_type(t1)} ${tree.op} ${pretty_type(t2)}`);
      }
    },

    visit_typealias(tree: ast.TypeAliasNode, env: TypeEnv): [Type, TypeEnv] {
      // Check if name has been defined before
      let t = env.named[tree.ident];
      if (t !== undefined) {
        throw error(tree, "type", 'type alias redefined');
      }

      // Get type from TypeNode
      let type = get_type(tree.type, env.named);

      // Add to TypeEnv
      let new_named = merge(env.named, { [tree.ident]: type });

      let e: TypeEnv = merge(env, {
        named: new_named,
      });

      // Return void type
      return [VOID, e];
    },

    visit_quote(tree: ast.QuoteNode, env: TypeEnv): [Type, TypeEnv] {
      // If this is a snippet quote, we need to "resume" type context from the
      // escape point. Also, we'll record the ID from the environment in the
      // type.
      let snippet: number | null = null;
      let inner_env: TypeEnv;
      if (tree.snippet) {
        if (env.snip === null) {
          throw error(tree, "type",
            'snippet quote without matching snippet escape');
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
        throw error(tree, "type", `can't escape ${count}x at level ${level}`);
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
        if (t.kind === TypeKind.CODE) {
          if (t.snippet !== null) {
            throw error(tree, "type", 'snippet quote in non-snippet splice');
          } else if (t.annotation !== env.anns[0]) {
            throw error(tree, "type", 'mismatched annotations in splice');
          }
          // The result type is the type that was quoted.
          return [t.inner, env];
        } else {
          throw error(tree, "type", 'splice escape produced non-code value');
        }

      } else if (tree.kind === "persist") {
        // A persist escape has the same type as the original type.
        return [t, env];

      } else if (tree.kind === "snippet") {
        if (t.kind === TypeKind.CODE) {
          if (t.snippet === null) {
            throw error(tree, "type", "non-snippet code in snippet splice");
          } else if (t.snippet !== tree.id) {
            throw error(tree, "type", "mismatched snippet splice");
          }
          return [t.inner, env];
        } else {
          throw error(tree, "type", "snippet escape produced non-code value");
        }

      } else {
        throw "error: unknown escape kind";
      }
    },

    visit_run(tree: ast.RunNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = check(tree.expr, env);
      if (t.kind === TypeKind.CODE) {
        if (t.snippet) {
          throw error(tree, "type", "cannot run splice quotes individually");
        }
        return [t.inner, e];
      } else {
        throw error(tree, "type", `running a non-code type ${pretty_type(t)}`);
      }
    },

    visit_fun(tree: ast.FunNode, env: TypeEnv): [Type, TypeEnv] {
      // Get the list of declared parameter types and accumulate them in an
      // environment based on the top of the environment stack.
      let param_types: Type[] = [];
      let body_env_hd = hd(env.stack);
      for (let param of tree.params) {
        let [ptype] = check(param, env);
        param_types.push(ptype);
        body_env_hd = merge(body_env_hd, { [param.name]: ptype });
      }
      let tvar = rectify_fun_params(param_types);

      // Check the body and get the return type.
      let body_env: TypeEnv = merge(env, {
        stack: cons(body_env_hd, tl(env.stack)),
      });
      let [ret_type] = check(tree.body, body_env);

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
      if (typeof(ret) === 'object') {
        return [ret, e];
      } else {
        throw error(tree, "type", ret);
      }
    },

    visit_extern(tree: ast.ExternNode, env: TypeEnv): [Type, TypeEnv] {
      // Add the type to the extern map.
      let type = get_type(tree.type, env.named);
      let new_externs = merge(env.externs, { [tree.name]: type });
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
        throw error(tree.cond, "type", '`if` condition must be a Bool');
      }

      let [true_type] = check(tree.truex, e);
      let [false_type] = check(tree.falsex, e);
      if (!(compatible(true_type, false_type) &&
            compatible(false_type, true_type))) {
        throw error(tree, "type", 'condition branches must have same type');
      }

      return [true_type, e];
    },

    visit_while(tree: ast.WhileNode, env: TypeEnv): [Type, TypeEnv] {
      let [cond_type, e] = check(tree.cond, env);
      if (cond_type !== BOOLEAN) {
        throw error(tree.cond, "type", '`while` condition must be a Bool');
      }

      let [body_type] = check(tree.body, e);
      return [VOID, e];
    },

    visit_macrocall(tree: ast.MacroCallNode, env: TypeEnv): [Type, TypeEnv] {
      // Look for the macro definition.
      let [macro_type, count] = stack_lookup(env.stack, tree.macro);
      if (macro_type === undefined) {
        throw error(tree, "type", `macro ${tree.macro} not defined`);
      }

      // Get the function type (we need its arguments).
      let unq_type = unquantified_type(macro_type);
      let fun_type: FunType | VariadicFunType;
      if (unq_type.kind === TypeKind.FUN ||
        unq_type.kind === TypeKind.VARIADIC_FUN) {
        fun_type = unq_type;
      } else {
        throw error(tree, "type", `macro must be a function`);
      }

      // Check code arguments in a fresh, quoted environment based at the
      // stage where the macro was defined.
      let arg_env = te_push(te_pop(env, count), {}, "");
      let arg_types: Type[] = [];
      for (let [param, arg] of zip(fun_type.params, tree.args)) {
        // Check whether the parameter is a snippet (open code), an ordinary
        // code type, or an eager non-code value.
        let as_snippet = false;
        if (param.kind === TypeKind.CODE) {
          // Code type, either ordinary or snippet.
          let as_snippet = !!param.snippet_var;

          // Check the argument and record its code type.
          let [t] = check(arg, as_snippet ? env : arg_env);
          let code_t = new CodeType(t, "", as_snippet ? tree.id : null);
          arg_types.push(code_t);
        } else {
          // Non-code type. Check the argument in the macro's scope.
          let [t] = check(arg, env);
          arg_types.push(t);
        }
      }

      // Get the return type of the macro function.
      let ret = check_call(macro_type, arg_types);
      if (typeof(ret) === 'object') {
        // Macros return code, and we splice in the result here.
        if (ret.kind === TypeKind.CODE) {
          return [ret.inner, env];
        } else {
          throw error(tree, "type", "macro must return code");
        }
      } else {
        throw ret;
      }
    },

    visit_tuple(tree: ast.TupleNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the types of each tuple component.
      let e = env;
      let expr_types: Type[] = [];
      let expr_type: Type;
      for (let expr of tree.exprs) {
        [expr_type, e] = check(expr, e);
        expr_types.push(expr_type);
      }

      return [new TupleType(expr_types), e];
    },

    visit_tupleind(tree: ast.TupleIndexNode, env: TypeEnv): [Type, TypeEnv] {
      // Check the tuple type.
      let [tuple_type, e] = check(tree.tuple, env);
      if (tuple_type.kind !== TypeKind.TUPLE) {
        throw error(tree.tuple, "type", "indexing non-tuple");
      }

      // Check that the index is in range.
      let num = tuple_type.components.length;
      if (tree.index >= num) {
        throw error(tree, "type",
          `index ${tree.index} out of range for ${num}-ary tuple`);
      }

      return [tuple_type.components[tree.index], e];
    },

    visit_alloc(tree: ast.AllocNode, env: TypeEnv): [Type, TypeEnv] {
      throw "unimplemented";
    },
  };

  // The entry point for the recursion.
  return function (tree, env) {
    return ast_visit(type_rules, tree, env);
  };
};

/**
 * An error message for argument types.
 */
function param_error(i: number, param: Type, arg: Type): string {
  return "mismatched argument type at index " + i +
    ": expected " + pretty_type(param) +
    ", got " + pretty_type(arg);
}

/**
 * Check that a function call is well-typed. Return the result type or a
 * string indicating the error.
 */
export function check_call(target: Type, args: Type[]): Type | string {
  switch (target.kind) {
    // The target is a variadic function.
    case TypeKind.VARIADIC_FUN: {
      if (target.params.length !== 1) {
        return "variadic function with multiple argument types";
      }
      let param = target.params[0];
      for (let i = 0; i < args.length; ++i) {
        let arg = args[i];
        if (!compatible(param, arg)) {
          return param_error(i, param, arg);
        }
      }

      return target.ret;
    }
    // The target is an ordinary function.
    case TypeKind.FUN: {
      // Check that the arguments are the right type.
      if (args.length !== target.params.length) {
        return "mismatched argument length";
      }
      for (let i = 0; i < args.length; ++i) {
        let param = target.params[i];
        let arg = args[i];
        if (!compatible(param, arg)) {
          return param_error(i, param, arg);
        }
      }

      return target.ret;
    }
    // An overloaded type. Try each component type.
    case TypeKind.OVERLOADED: {
      for (let sub of target.types) {
        let ret = check_call(sub, args);
        if (typeof(ret) === 'object') {
          return ret;
        }
      }
      return "no overloaded type applies";
    }
    // Polymorphic functions.
    case TypeKind.QUANTIFIED: {
      // Special case for unifying polymorphic snippet function types with
      // snippet arguments.
      let snippet: number | null = null;
      let snippet_var: TypeVariable | null = null;
      for (let arg of args) {
        if (arg.kind === TypeKind.CODE) {
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
        // Normal case for a polymorphic function.
        let inner = target.inner;
        // Get the generic type of the type variable.
        let ret = check_quantified(target.variable, inner, args);
        if (ret instanceof Type) {
          return check_call(apply_quantified_type(target, ret), args);
        } else {
          return ret;
        }
      }
    }
    // Non-function (never legal).
    default: {
      return "call of non-function";
    }
  }
}

/**
 * Determine the type of the type variable in a quantified function call.
 * Target is the inner function of a quantified type. Return the result
 * type of the type variable or a string indicating
 * the error.
 */
function check_quantified(tvar: TypeVariable, target: Type, args: Type[]): Type | string {
  // The inner function is a variadic function.
  if (target instanceof VariadicFunType) {
    if (target.params.length !== 1) {
      return "variadic function with multiple argument types";
    }
    let param = target.params[0];
    let vType: Type | null = null;
    for (let i = 0; i < args.length; ++i) {
      let arg = args[i];
      // Unify one parameter type with the corresponding argument type.
      let ret = unify(tvar, param, arg);

      if (ret instanceof Type) {
        // If the current result unifying type is different from the type
        // we get earlier, check whether the earlier type is compatible
        // with the current type, which means that the earlier type (vType)
        // is at right hand side and the current type (ret) is at left
        // hand side. If it is compatible, we can choose the current type
        // to be our generic type of the type variable.
        if (vType === null || ret === vType) {
          vType = ret;
        } else {
          return param_error(i, param, arg);
        }
      } else if (!ret) {
        return param_error(i, param, arg);
      }
    }

    if (vType) {
      return vType;
    } else {
      return "cannot unify the generic type";
    }

  // The inner function is an ordinary function.
  } else if (target instanceof FunType) {
    if (args.length !== target.params.length) {
      return "mismatched argument length";
    }
    let vType: Type | null = null;
    for (let i = 0; i < args.length; ++i) {
      let param = target.params[i];
      let arg = args[i];
      // Same mechanism as the variadic function above.
      let ret = unify(tvar, param, arg);
      if (ret instanceof Type) {
        if (vType === null || ret === vType) {
          vType = ret;
        } else {
          return param_error(i, param, arg);
        }
      } else if (!ret) {
        return param_error(i, param, arg);
      }
    }

    if (vType) {
      return vType;
    } else {
      return "cannot unify the generic type";
    }

  // The inner function is an overloaded type. Try each component type.
  } else if (target instanceof OverloadedType) {
    for (let sub of target.types) {
      let ret = check_quantified(tvar, sub, args);
      if (ret instanceof Type) {
        return ret;
      }
    }
    return "no overloaded type applies";

  // The inner funciton is a polymorphic function. Recusively call
  // check_quantified to the determine the type variable of
  // the inner function.
  } else if (target instanceof QuantifiedType) {
    let inner = target.inner;
    let ret = check_quantified(target.variable, inner, args);
    if (ret instanceof Type) {
      return check_quantified(tvar, apply_quantified_type(target, ret), args);
    } else {
      return ret;
    }

  } else {
    return "quantified type's inner function is illegal";
  }
}

/**
 * Unify a polymorphic function parameter type with the corresponding
 * argument type to determine the type of the type variable.
 */
function unify(tvar: TypeVariable, param: Type, arg: Type): boolean | Type {
  if (param instanceof VariableType) {
      if (tvar === param.variable) {
        return arg;

      // If the type variable in the variable type is not the one we want
      // to determine, treat it as ANY.
      } else {
        return true;
      }

  } else if (param instanceof InstanceType &&
     arg instanceof InstanceType && param.cons === arg.cons) {
    return unify(tvar, param.arg, arg.arg);

  // If no variable type is found, fall back to the normal compatible
  // check.
  } else {
    return compatible(param, arg);
  }
}

// Check type compatibility.
function compatible(ltype: Type, rtype: Type): boolean | Type {
  if (ltype === rtype) {
    return true;

  } else if (ltype === FLOAT && rtype === INT) {
    return true;

  } else if (ltype === ANY) {
    return true;

  } else if (
    (ltype.kind === TypeKind.FUN || ltype.kind === TypeKind.VARIADIC_FUN) &&
    (rtype.kind === TypeKind.FUN || rtype.kind === TypeKind.VARIADIC_FUN)) {
    if (ltype.params.length !== rtype.params.length) {
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

  } else if (ltype.kind === TypeKind.INSTANCE &&
    rtype.kind === TypeKind.INSTANCE) {
    if (ltype.cons === rtype.cons) {
      // Invariant.
      return compatible(ltype.arg, rtype.arg) &&
        compatible(rtype.arg, ltype.arg);
    }

  } else if (ltype.kind === TypeKind.CODE && rtype.kind === TypeKind.CODE) {
    return compatible(ltype.inner, rtype.inner) &&
      ltype.annotation === rtype.annotation &&
      ltype.snippet === rtype.snippet &&
      ltype.snippet_var === rtype.snippet_var;

  } else if (ltype.kind === TypeKind.TUPLE && rtype.kind === TypeKind.TUPLE) {
    if (ltype.components.length !== rtype.components.length) {
      return false;
    }
    for (let i = 0; i < ltype.components.length; ++i) {
      let lcomp = ltype.components[i];
      let rcomp = rtype.components[i];
      if (!compatible(lcomp, rcomp)) {
        return false;
      }
    }
    return true;

  } else if (ltype.kind === TypeKind.OVERLOADED) {
    for (let t of ltype.types) {
      if (compatible(t, rtype)) {
        return true;
      }
    }
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
  if (ret.kind === TypeKind.CODE && ret.snippet_var) {
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
    if (param.kind === TypeKind.CODE && param.snippet_var) {
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
      if (t.kind === TypeKind.CONSTRUCTOR) {
        throw error(tree, "type", `${tree.name} needs a parameter`);
      } else {
        return t;
      }
    } else {
      throw error(tree, "type", `unknown primitive type ${tree.name}`);
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
      if (t.kind === TypeKind.CONSTRUCTOR) {
        let arg = get_type(tree.arg, types);
        return t.instance(arg);
      } else {
        throw error(tree, "type", `${tree.name} is not parameterized`);
      }
    } else {
      throw error(tree, "type", `unknown type constructor ${tree.name}`);
    }
  },

  visit_overloaded(tree: ast.OverloadedTypeNode, types: TypeMap) {
    let ts: Type[] = [];
    for (let t of tree.types) {
      ts.push(get_type(t, types));
    }
    return new OverloadedType(ts);
  },

  visit_tuple(tree: ast.TupleTypeNode, types: TypeMap) {
    let comp_types = tree.components.map(t => get_type(t, types));
    return new TupleType(comp_types);
  },
};

function get_type(ttree: ast.TypeNode, types: TypeMap): Type {
  return type_ast_visit(get_type_rules, ttree, types);
}

/**
 * Fill in a parameterized type.
 */
function apply_type(type: Type, tvar: TypeVariable, targ: any): Type {
  switch (type.kind) {
  // Replace a type variable (used as a type) with the provided type.
  case TypeKind.VARIABLE:
    if (type.variable === tvar) {
      return targ;
    } else {
      return new VariableType(type.variable);
    }

  // In code types, variables can appear in the snippet.
  case TypeKind.CODE:
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

  // The remaining rules are just boring boilerplate: `map` for types.
  case TypeKind.PRIMITIVE:
    return type;
  case TypeKind.FUN:
  case TypeKind.VARIADIC_FUN: {
    let params: Type[] = [];
    for (let param of type.params) {
      params.push(apply_type(param, tvar, targ));
    }
    let ret = apply_type(type.ret, tvar, targ);
    if (type.kind === TypeKind.VARIADIC_FUN) {
      return new VariadicFunType(params, ret);
    } else {
      return new FunType(params, ret);
    }
  }
  case TypeKind.ANY:
    return type;
  case TypeKind.VOID:
    return type;
  case TypeKind.CONSTRUCTOR:
    return type;
  case TypeKind.INSTANCE:
    return new InstanceType(type.cons, apply_type(type.arg, tvar, targ));
  case TypeKind.QUANTIFIED:
    return new QuantifiedType(type.variable,
        apply_type(type.inner, tvar, targ));
  case TypeKind.OVERLOADED:
    return type;
  case TypeKind.TUPLE:
    return new TupleType(
      type.components.map(t => apply_type(t, tvar, targ))
    );
  default:
    return unreachable(type, "unknown type kind");
  }
}

function apply_quantified_type(type: QuantifiedType, arg: any): Type {
  return apply_type(type.inner, type.variable, arg);
}
