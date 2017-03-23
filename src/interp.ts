import * as ast from './ast';
import { ASTVisit, ast_visit, compose_visit,
  ast_translate_rules } from './visit';
import { pretty } from './pretty';
import { overlay, merge } from './util';

// Dynamic syntax.

type Value = number | string | boolean | Code | Fun | Extern;

interface Env {
  [key: string]: Value;
}

type Pers = Value[];
class Code {
  constructor(
    public expr: ast.ExpressionNode,
    // The Pers is a Code value's equivalent of a closure's environment. It is
    // a list of values associated with the Persist nodes in the expression.
    public pers: Pers,
    public annotation: string
  ) {}
}

class Fun {
  constructor(
    public params: string[],
    public body: ast.ExpressionNode,
    public env: Env,
    public pers: Pers  // In case the function was defined in a quote.
  ) {}
}

// A marker for values from the external world. This helps with two
// extern-related issues:
// - We need to invoke functions with a different "calling convention".
// - Assignments work differently.
class Extern {
  constructor(
    public name: string
  ) {}
}

function unwrap_extern(v: Value): Value {
  if (v instanceof Extern) {
    return eval(v.name);
  } else {
    return v;
  }
}


// Dynamic semantics rules.

/**
 * The state tuple for the dynamic semantics.
 */
interface State {
  /**
   * Variable environment.
   */
  env: Env;

  /**
   * Persist-escape environment.
   */
  pers: Pers;

  /**
   * Bookkeeping for snippets: when we're inside a snippet escape, the number
   * of "levels" for that escape (so we can resume at the appropriate distance
   * when we hit a snippet quote).
   */
  snipdist: number | null;
}

// This first set of rules applies at the "top level", for ordinary execution.
// Escapes are not allowed at this level. At a quote, we transition to a
// different set of rules.
let Interp: ASTVisit<State, [Value, State]> = {
  visit_literal(tree: ast.LiteralNode, state: State): [Value, State] {
    return [tree.value, state];
  },

  visit_seq(tree: ast.SeqNode, state: State): [Value, State] {
    let [v, s] = interp(tree.lhs, state);
    return interp(tree.rhs, s);
  },

  visit_let(tree: ast.LetNode, state: State): [Value, State] {
    let [v, s] = interp(tree.expr, state);
    let env = overlay(s.env);  // Update the value in an overlay.
    env[tree.ident] = v;
    return [v, merge(s, {env})];
  },

  visit_assign(tree: ast.AssignNode, state: State): [Value, State] {
    let [v, s] = interp(tree.expr, state);

    // Check whether we have an extern or a normal variable by looking at the
    // current value.
    let old_value = state.env[tree.ident];
    if (old_value instanceof Extern) {
      // Update the external value.
      let f = eval("(function(value) { " + old_value.name + " = value })");
      f(v);
      return [v, s];
    } else {
      // Ordinary variable assignment.
      let env = overlay(s.env);
      env[tree.ident] = v;
      return [v, merge(s, {env})];
    }
  },

  visit_lookup(tree: ast.LookupNode, state: State): [Value, State] {
    let v = state.env[tree.ident];
    if (v === undefined) {
      throw "error: undefined variable " + tree.ident;
    }
    return [v, state];
  },

  visit_quote(tree: ast.QuoteNode, state: State): [Value, State] {
    // Jump to any escapes and execute them.
    let level = tree.snippet ? state.snipdist! : 1;
    let [t, s, p] = quote_interp(tree.expr, level, state, []);

    // Wrap the resulting AST as a code value.
    return [new Code(t, p, tree.annotation), s];
  },

  visit_escape(tree: ast.EscapeNode, state: State): [Value, State] {
    throw "error: top-level escape";
  },

  visit_run(tree: ast.RunNode, state: State): [Value, State] {
    let [v, s] = interp(tree.expr, state);
    if (v instanceof Code) {
      // Execute the code. In order to carry along the `extern` intrinsics, we
      // include the current environment even though quoted code is
      // *ordinarily* prohibited from looking up values in it.
      let res = interpret(v.expr, s.env, v.pers);
      return [res, s];
    } else {
      throw "error: tried to run non-code value";
    }
  },

  visit_unary(tree: ast.UnaryNode, state: State): [Value, State] {
    let [v, s] = interp(tree.expr, state);
    v = unwrap_extern(v);
    if (typeof v === 'number') {
      let out: Value;
      switch (tree.op) {
        case "+":
          out = +v; break;
        case "-":
          out = -v; break;
        default:
          throw "error: unknown unary operator " + tree.op;
      }
      return [out, s];
    } else if (typeof v === 'boolean') {
      let out: Value;
      switch (tree.op) {
        case "~":
          out = !v; break;
        default:
          throw "error: unknown unary operator " + tree.op;
      }
      return [out, s];
    } else {
      throw "error: non-numeric operand to unary operator";
    }
  },

  visit_binary(tree: ast.BinaryNode, state: State): [Value, State] {
    let [v1, s1] = interp(tree.lhs, state);
    let [v2, s2] = interp(tree.rhs, state);
    v1 = unwrap_extern(v1);
    v2 = unwrap_extern(v2);
    if (typeof v1 === 'number' && typeof v2 === 'number') {
      let v: Value;
      switch (tree.op) {
        case "+":
          v = v1 + v2; break;
        case "-":
          v = v1 - v2; break;
        case "*":
          v = v1 * v2; break;
        case "/":
          v = v1 / v2; break;
        case "==":
          v = v1 == v2; break;
        case "!==":
          v = v1 != v2; break;
        default:
          throw "error: unknown binary operator " + tree.op;
      }
      return [v, s2];
    } else {
      throw "error: non-numeric operands to binary operator";
    }
  },

  visit_fun(tree: ast.FunNode, state: State): [Value, State] {
    // Extract the parameter names.
    let param_names : string[] = [];
    for (let param of tree.params) {
      param_names.push(param.name);
    }

    // Construct a function value.
    let fun = new Fun(param_names, tree.body, state.env, state.pers);
    return [fun, state];
  },

  visit_call(tree: ast.CallNode, state: State): [Value, State] {
    // Evaluate the target expression to a function value.
    let [target, s] = interp(tree.fun, state);

    // Evaluate the arguments.
    let args: Value[] = [];
    for (let i = 0; i < tree.args.length; ++i) {
      let arg_expr = tree.args[i];
      let arg: Value;
      [arg, s] = interp(arg_expr, s);
      args.push(arg);
    }

    // Normal function.
    if (target instanceof Fun) {
      // Bind the function parameters and overlay them on the function's
      // closed environment.
      let call_env : Env = overlay(target.env);
      for (let i = 0; i < args.length; ++i) {
        let param_name = target.params[i];
        call_env[param_name] = args[i];
      }

      // Evaluate the function body. Throw away any updates it makes to its
      // environment.
      let substate = merge(state, {env: call_env, pers: target.pers});
      let [ret, _] = interp(target.body, substate);

      return [ret, s];

    // Call a "native" JavaScript function.
    } else if (target instanceof Extern) {
      let fun = eval(target.name);
      let unwrapped_args: Value[] = [];
      for (let arg of args) {
        unwrapped_args.push(unwrap_extern(arg));
      }
      let ret = fun(...unwrapped_args);
      return [ret, s];

    } else {
      throw "error: call of non-function value";
    }
  },

  visit_extern(tree: ast.ExternNode, state: State): [Value, State] {
    // Add the placeholder value to the environment. It may seem a little
    // messy to mix together normal variables and externs, but the type system
    // keeps them straight so we don't have to.
    let extern = new Extern(tree.expansion || tree.name);
    let env = overlay(state.env);
    env[tree.name] = extern;

    return [extern, merge(state, {env})];
  },

  visit_persist(tree: ast.PersistNode, state: State): [Value, State] {
    if (tree.index < 0 || tree.index >= state.pers.length) {
      throw "error: persist index (" + tree.index +
            ") out of range (" + state.pers.length + ")";
    }
    let value = state.pers[tree.index];
    return [value, state];
  },

  visit_if(tree: ast.IfNode, state: State): [Value, State] {
    let [flag, s] = interp(tree.cond, state);
    return interp(flag ? tree.truex : tree.falsex, s);
  },

  visit_while(tree: ast.WhileNode, state: State): [Value, State] {
    let s = state;
    while (true) {
      let flag: Value;
      [flag, s] = interp(tree.cond, s);
      if (!flag) {
        break;
      }
      [, s] = interp(tree.body, s);
    }
    return [null as any, s];  // FIXME: A bit of a cheat.
  },

  visit_macrocall(tree: ast.MacroCallNode, state: State): [Value, State] {
    throw "error: macro invocations are sugar";
  },
}

function interp(tree: ast.SyntaxNode, state: State): [Value, State] {
  return ast_visit(Interp, tree, state);
}

// Add a number to every persist node in an AST. This is used when splicing
// quotes into other quotes.
function increment_persists(amount: number) {
  function fself(tree: ast.SyntaxNode): ast.SyntaxNode {
    let rules = compose_visit(ast_translate_rules(fself), {
      visit_persist(tree: ast.PersistNode, param: void): ast.SyntaxNode {
        return merge(tree, { index: tree.index + amount });
      },
    });
    return ast_visit(rules, tree, null);
  }
  return fself;
}

// A second set of rules applies inside at least one quote.
//
// We keep track of the current level while walking the tree, searching for
// escapes that bring us back down to level 0. When this happens, we switch
// back to the first rule set.
//
// Threaded through all of this, in addition to the level number, is a State
// reflecting the state of the ordinary semantics rules. We don't ordinarily
// touch this state here, but escapes can return to the first semantics and
// update the state.
//
// We also accumulate a *new* Pers, just called `pers`, which is a list of
// values produced by each *persistent* escape. The Persist nodes in the code
// contain indices into this array.
let QuoteInterp : ASTVisit<[number, State, Pers],
                           [ast.SyntaxNode, State, Pers]> = {
  // The `quote` and `escape` cases are the only interesting ones. We
  // increment/decrement the stage number and (when the stage gets back down
  // to zero) swap back to normal interpretation.

  // Just increment the stage further.
  visit_quote(tree: ast.QuoteNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let level = tree.snippet ? state.snipdist : 1;
    let inner_stage = stage + level;  // Recurse at a deeper stage.
    let [t, s, p] = quote_interp(tree.expr, inner_stage, state, pers);
    return [merge(tree, { expr: t }), s, p];
  },

  // Decrement the stage and either swap back or just keep recursing.
  visit_escape(tree: ast.EscapeNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    // The escape moves us "up" `count` stages.
    let inner_stage = stage - tree.count;

    // Save the snippet distance, if any.
    if (tree.kind === "snippet") {
      state = merge(state, { snipdist: tree.count });
    }

    if (inner_stage == 0) {
      // Escaped back out of the top-level quote! Evaluate it and integrate it
      // with the quote, either by splicing or persisting.
      let [v, s] = interp(tree.expr, state);

      if (tree.kind === "splice" || tree.kind === "snippet") {
        // The resulting expression must be a quote we can splice.
        if (v instanceof Code) {
          // Renumber the persist expressions in the code to reflect its
          // position in the current context.
          let spliced = increment_persists(pers.length)(v.expr);

          // Combine the spliced code's persists with ours.
          let p = pers.concat(v.pers);

          return [spliced, s, p];
        } else {
          throw "error: escape produced non-code value " + v;
        }

      } else if (tree.kind === "persist") {
        let p = pers.concat([v]);
        let expr : ast.PersistNode = {tag: "persist", index: p.length - 1};
        return [expr, s, p];

      } else {
        throw "error: unknown persist kind";
      }
    } else {
      // Keep going.
      let [t, s, p] = quote_interp(tree.expr, inner_stage, state, pers);
      return [merge(tree, { expr: t }), s, p];
    }
  },

  visit_macrocall(tree: ast.MacroCallNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers]
  {
    throw "error: macro invocations are sugar";
  },

  // The rest of the cases are boring: just copy the input tree and recurse
  // while threading through the stage and environment parameters.
  // TODO Use the Translate machinery from the desugaring step.

  visit_literal(tree: ast.LiteralNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    return [merge(tree), state, pers];
  },

  visit_seq(tree: ast.SeqNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t1, s1, p1] = quote_interp(tree.lhs, stage, state, pers);
    let [t2, s2, p2] = quote_interp(tree.rhs, stage, s1, p1);
    return [merge(tree, { lhs: t1, rhs: t2 }), s2, p2];
  },

  visit_let(tree: ast.LetNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t, s, p] = quote_interp(tree.expr, stage, state, pers);
    return [merge(tree, { expr: t }), s, p];
  },

  visit_assign(tree: ast.AssignNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t, s, p] = quote_interp(tree.expr, stage, state, pers);
    return [merge(tree, { expr: t }), s, p];
  },

  visit_lookup(tree: ast.LookupNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    return [merge(tree), state, pers];
  },

  visit_unary(tree: ast.UnaryNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t, s, p] = quote_interp(tree.expr, stage, state, pers);
    return [merge(tree, { expr: t }), s, p];
  },

  visit_binary(tree: ast.BinaryNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t1, s1, p1] = quote_interp(tree.lhs, stage, state, pers);
    let [t2, s2, p2] = quote_interp(tree.rhs, stage, s1, p1);
    return [merge(tree, { lhs: t1, rhs: t2 }), s2, p2];
  },

  visit_run(tree: ast.RunNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t, s, p] = quote_interp(tree.expr, stage, state, pers);
    return [merge(tree, { expr: t }), s, p];
  },

  visit_fun(tree: ast.FunNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [t, s, p] = quote_interp(tree.body, stage, state, pers);
    return [merge(tree, { body: t }), s, p];
  },

  visit_call(tree: ast.CallNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [fun_tree, s, p] = quote_interp(tree.fun, stage, state, pers);
    let arg_trees : ast.SyntaxNode[] = [];
    for (let arg of tree.args) {
      let arg_tree : ast.SyntaxNode;
      [arg_tree, s, p] = quote_interp(arg, stage, state, p);
      arg_trees.push(arg_tree);
    }
    return [merge(tree, { fun: fun_tree, args: arg_trees }), s, p];
  },

  visit_extern(tree: ast.ExternNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    return [merge(tree), state, pers];
  },

  visit_persist(tree: ast.PersistNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    // Take the persist from the current quote and retain it as a persist for
    // this quote. (This arises in multi-stage escapes: the Persist gets
    // created for the outer quote, and the inner quote needs to keep it as a
    // persist.)
    let value = state.pers[tree.index];
    let p = pers.concat([value]);
    let expr: ast.PersistNode = {tag: "persist", index: p.length - 1};
    return [expr, state, p];
  },

  visit_if(tree: ast.IfNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [c, s1, p1] = quote_interp(tree.cond, stage, state, pers);
    let [t, s2, p2] = quote_interp(tree.truex, stage, s1, p1);
    let [f, s3, p3] = quote_interp(tree.falsex, stage, s2, p2);
    return [merge(tree, { cond: c, truex: t, falsex: f }), s3, p3];
  },

  visit_while(tree: ast.WhileNode,
      [stage, state, pers]: [number, State, Pers]):
      [ast.SyntaxNode, State, Pers] {
    let [c, s1, p1] = quote_interp(tree.cond, stage, state, pers);
    let [b, s2, p2] = quote_interp(tree.body, stage, s1, p1);
    return [merge(tree, { cond: c, body: b }), s2, p2];
  },
}

function quote_interp(tree: ast.SyntaxNode, stage: number, state: State,
    pers: Pers): [ast.SyntaxNode, State, Pers]
{
  return ast_visit(QuoteInterp, tree, [stage, state, pers]);
}

// State to execute to a value in an (optionally) empty initial environment.
export function interpret(program: ast.SyntaxNode, e: Env = {}, p: Pers = []):
  Value
{
  let [v, _] = interp(program, {env: e, pers: p, snipdist: null});
  return v;
}

// Format a resulting value as a string.
export function pretty_value(v: Value): string {
  if (typeof v == 'number') {
    return v.toString();
  } else if (typeof v === 'string') {
    return JSON.stringify(v);
  } else if (typeof v === 'boolean') {
    return v.toString();
  } else if (v instanceof Code) {
    return v.annotation + "< " + pretty(v.expr) + " >";
  } else if (v instanceof Fun) {
    return "(fun)";
  } else if (v instanceof Extern) {
    return eval(v.name).toString();
  } else {
    throw "error: unknown value kind " + typeof(v);
  }
}

// Format a *code* value as raw Ssl source code. The value must be
// residualizable: there can be no persists.
export function pretty_code(v: Value): string {
  if (v instanceof Code) {
    if (v.pers.length) {
      throw "error: code has persists";
    } else {
      return pretty(v.expr);
    }
  } else {
    throw "error: this is not a code value";
  }
}
