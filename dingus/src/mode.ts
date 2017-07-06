/**
 * A CodeMirror mode for SSC source code.
 */

export default function (config: CodeMirror.EditorConfiguration, pconfig: any):
  CodeMirror.Mode<any>
{
  const keywords = ["var", "def", "fun", "extern", "if", "while", "type"];
  const brackets = "<>[]()";
  const punctuation = [":", "->"];
  const operators = ["+", "-", "*", "/", "=", "!"];
  const builtins = ["render", "vertex", "fragment"];
  const quote_begin = /[A-Za-z0-9]+\</;
  const escape_begin = /(\$|\%)?\d*\[/;
  const macro = /@[A-Za-z][A-Za-z0-9]*[\?\!]*/;
  const stringlit = /"[^"]*"/;

  return {
    startState() {
      return {
        paren_depth: 0,
      };
    },

    token(stream, state) {
      // Language keywords.
      for (let keyword of keywords) {
        if (stream.match(keyword)) {
          return "keyword";
        }
      }

      // Built-in functions.
      for (let builtin of builtins) {
        if (stream.match(builtin)) {
          return "builtin";
        }
      }

      // Line noise, basically.
      for (let symbol of punctuation) {
        if (stream.match(symbol)) {
          return "operator";
        }
      }

      // Macro invocations.
      if (stream.match(macro)) {
        return "builtin";
      }

      // Annotated quotes.
      if (stream.match(quote_begin)) {
        return "bracket";
      }

      // Escapes in their various forms.
      if (stream.match(escape_begin)) {
        return "bracket";
      }

      // String literals.
      if (stream.match(stringlit)) {
        return "string";
      }

      // Single characters.
      let ch = stream.next().toString();
      if (ch === "(") {
        ++state.paren_depth;
      } else if (ch === ")") {
        --state.paren_depth;
      }

      for (let op of operators) {
        if (ch === op) {
          return "operator";
        }
      }
      if (brackets.indexOf(ch) !== -1) {
        return "bracket";
      }
      if (ch === "#") {
        stream.skipToEnd();
        return "comment";
      }
      return "";
    },

    /*
    indent(state, textAfter) {
      return
    },
    */

    lineComment: "#",
  };
}
