import * as driver from '../../src/driver';
import * as ast from '../../src/ast';

import { tree_canvas } from './tree';
import { get_children, get_name } from './astsumm';
import d3 = require('d3');

import { start_gl, PerfHandler } from './gl';
import EXAMPLES = require('../examples');
import PREAMBLES = require('../preambles');

import CodeMirror = require('codemirror');
import mode from './mode';
CodeMirror.defineMode("alltheworld", mode);

const RUN_DELAY_MS = 200;

/**
 * Run code and return:
 * - an error, if any
 * - the parse tree
 * - the type
 * - the compiled code (if compiling)
 * - the result of interpretation or execution
 * - the complete WebGL code (if in WebGL mode)
 * The mode can be "interp", "compile", or "webgl".
 */
function ssc_run(code: string, mode: string)
  : [string, ast.SyntaxNode, string, string, string, string]
{
  // Configure the driver to store a bunch of results.
  let error: string | null = null;
  let type: string | null = null;
  let config: driver.Config = {
    webgl: mode === "webgl",
    generate: false,

    log(...msg: any[]) {
      // Work around a TypeScript limitation.
      // https://github.com/Microsoft/TypeScript/issues/4759
      (console.log as any)(...msg);
    },
    error (e: string) {
      error = e;
    },

    parsed: (_ => void 0),
    typed (t: string) {
      type = t;
    },

    presplice: true,
  };

  // Add the preamble, if this is WebGL mode.
  if (mode === "webgl") {
    code = PREAMBLES[0]['body'] + code;
  }

  // Run the driver.
  let res: string | null = null;
  let jscode: string | null = null;
  let ast: ast.SyntaxNode | null = null;
  let glcode: string | null = null;
  driver.frontend(config, [code], null, function (tree, types) {
    ast = tree;

    if (mode === "interp") {
      // Interpreter.
      driver.interpret(config, tree, types, function (r) {
        res = r;
      });

    } else {
      // Compiler.
      driver.compile(config, tree, types, function (code) {
        jscode = code;
        if (mode === "webgl") {
          glcode = driver.full_code(config, jscode);
        } else {
          driver.execute(config, code, function (r) {
            res = r;
          });
        }
      });
    }
  });

  return [error!, ast!, type!, jscode!, res!, glcode!];
}

function show(text: string | null, el: HTMLElement) {
  if (text) {
    el.textContent = text;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function decode_hash(s: string): { [key: string]: string } {
  if (s[0] === "#") {
    s = s.slice(1);
  }

  let out: { [key: string]: string } = {};
  for (let part of s.split('&')) {
    let [key, value] = part.split('=');
    out[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return out;
}

function encode_hash(obj: { [key: string]: string | null | undefined }): string {
  let parts: string[] = [];
  for (let key in obj) {
    let value = obj[key];
    if (value !== undefined && value !== null && value !== "") {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return '#' + parts.join('&');
}

interface Config {
  /**
   * Record source code changes in the browser's navigation history.
   */
  history?: boolean;

  /**
   * Show line numbers in the code editor.
   */
  lineNumbers?: boolean;

  /**
   * Show scrollbars in the code editor.
   */
  scrollbars?: boolean;

  /**
   * A callback for measuring graphics performance.
   */
  fpsCallback?: PerfHandler;

  /**
   * In "performance measurement mode," the graphics context runs as fast as
   * possible instead of respecting the host browser's render loop.
   */
  perfMode?: boolean;
};

let DEFAULT: Config = {
  history: true,
  lineNumbers: true,
  scrollbars: true,
  perfMode: false,
};

export = function sscDingus(base: HTMLElement, config: Config = DEFAULT) {
  let codebox = <HTMLTextAreaElement> base.querySelector('textarea');
  let errbox = <HTMLElement> base.querySelector('.error');
  let treebox = <HTMLElement> base.querySelector('.tree');
  let compiledbox = <HTMLElement> base.querySelector('.compiled');
  let typebox = <HTMLElement> base.querySelector('.type');
  let outbox = <HTMLElement> base.querySelector('.result');
  let helpbox = <HTMLElement> base.querySelector('.help');
  let clearbtn = <HTMLElement> base.querySelector('.clear');
  let modeselect = <HTMLSelectElement> base.querySelector('.mode');
  let exampleselect = <HTMLSelectElement> base.querySelector('.example');
  let fpsbox = <HTMLElement> base.querySelector('.fps');
  let visualbox = <HTMLElement> base.querySelector('.visual');
  let loadingmsg = <HTMLElement> base.querySelector('.loading');
  let imagedlbtn = <HTMLElement> base.querySelector('.imagedl');

  // Set up CodeMirror. Replace this with `null` to use an ordinary textarea.
  let codemirror: CodeMirror.Editor | undefined;
  if (codebox) {
    codemirror = CodeMirror.fromTextArea(codebox, {
      lineNumbers: !!config.lineNumbers,
      mode: "alltheworld",
      scrollbarStyle: config.scrollbars ? "native" : null,
      tabSize: 2,
      lineWrapping: true,
    } as any);
  }

  // Accessors for the current code in the box.
  function get_code() {
    if (codemirror) {
      return codemirror.getDoc().getValue();
    } else {
      return codebox.value.trim();
    }
  }
  function set_code(s: string) {
    if (codemirror) {
      codemirror.getDoc().setValue(s);
    } else if (codebox) {
      codebox.value = s;
    }
  }

  // Event handler for changes to the code.
  let tid: any = null;
  function handle_code () {
    if (tid) {
      clearTimeout(tid);
    }
    tid = setTimeout(run_code, RUN_DELAY_MS);
  };

  if (codemirror) {
    codemirror.on('change', function (cm, change) {
      // Suppress change events from programmatic updates (to match an
      // ordinary textarea).
      if (change.origin !== "setValue") {
        handle_code();
      }
    });
  } else if (codebox) {
    codebox.addEventListener('change', handle_code);
  }

  // Lazily constructed tools.
  let draw_tree: (tree_data: any) => void;
  let update_gl: (code?: string, dl?: boolean) => Promise<void>;

  let last_mode: string | null = null;
  let custom_preamble = "";
  function run_code(navigate = true, mode: string | null = null, code: string | null = null) {
    if (code === null) {
      code = get_code();
    }

    // Get the mode from the popup, if available, or a variable if we don't
    // have the popup.
    if (!mode && modeselect) {
      mode = modeselect.value;
    } else {
      if (mode) {
        last_mode = mode;
      } else {
        mode = last_mode;
      }
    }

    if (code !== "") {
      let [err, tree, typ, compiled, res, glcode] =
        ssc_run(custom_preamble + code, mode!);

      if (errbox) {
        show(err, errbox);
      }
      if (typebox) {
        show(typ, typebox);
      }

      // Show the compiled code or the AST visualization.
      if (mode !== "interp") {
        // Show the compiled code.
        if (compiledbox) {
          show(compiled, compiledbox);
        }
        if (treebox) {
          treebox.style.display = 'none';
        }
      } else {
        // Draw the syntax tree.
        if (treebox) {
          if (!draw_tree) {
            // Lazily initialize the drawing code to avoid D3 invocations when
            // we don't need them.
            draw_tree = tree_canvas(d3, treebox, get_name, get_children);
          }
          draw_tree(tree);
          treebox.style.display = 'block';
        }

        if (compiledbox) {
          show(null, compiledbox);
        }
      }

      // Show the output, either as text or in the WebGL viewer.
      if (mode === "webgl" && glcode) {
        // Start the WebGL viewer.
        visualbox.style.display = 'block';
        if (fpsbox) {
          fpsbox.style.display = 'block';
        }
        if (outbox) {
          show(null, outbox);
        }
        if (imagedlbtn) {
          imagedlbtn.style.display = 'block';
          imagedlbtn.addEventListener('click', (e) => {
            update_gl(undefined, true);
          });
        }

        console.log(glcode);

        // Set up the WebGL viewer context. This gives us a function we can
        // use to update the program in the future.
        if (!update_gl) {
          update_gl = start_gl(visualbox, (frames, ms, latencies, draw_latencies) => {
            if (config.fpsCallback) {
              config.fpsCallback(frames, ms, latencies, draw_latencies);
            }
            if (fpsbox) {
              let fps = frames / ms * 1000;
              fpsbox.textContent = fps.toFixed(2);
            }
          }, config.perfMode);
        }

        // Inject the new code.
        console.log("Loading GL resources...");
        update_gl(glcode).then(() => {
          console.log("...loaded.");
        }, (err) => {
          console.error(err);
        });
      } else {
        // Just show the output value.
        visualbox.style.display = 'none';
        if (fpsbox) {
          fpsbox.style.display = 'none';
        }
        if (outbox) {
          show(res, outbox);
        }
        if (imagedlbtn) {
          imagedlbtn.style.display = 'none';
        }
      }

      if (navigate && config.history) {
        let hash = encode_hash({code: code, mode: mode!});
        history.replaceState(null, "", hash);
      }

    } else {
      if (errbox) {
        show(null, errbox);
      }
      if (typebox) {
        show(null, typebox);
      }
      if (outbox) {
        show(null, outbox);
      }
      if (treebox) {
        treebox.style.display = 'none';
      }
      if (compiledbox) {
        show(null, compiledbox);
      }

      if (navigate && config.history) {
        history.replaceState(null, "", '#');
      }
    }
  }

  function handle_hash() {
    let values = decode_hash(location.hash);

    // Handle examples.
    let example_name: string = values['example'];
    let code: string | null = null;
    let mode: string | null = null;
    if (example_name) {
      for (let example of EXAMPLES) {
        if (example['name'] === example_name) {
          code = example['body'];
          mode = example['mode'];
          break;
        }
      }
    }

    // Handle ordinary inline data.
    if (values['code'] !== undefined) {
      code = values['code'];
    }
    if (values['mode'] !== undefined) {
      mode = values['mode'];
    }

    if (code) {
      set_code(code);
    } else {
      set_code('');
    }

    if (mode) {
      modeselect.value = mode;
    }

    run_code(false);
  }

  // Execute code by linking to it (pushing onto the history).
  function link_to_code(code: string, mode: string | null = null) {
    let hash = encode_hash({code: code, mode: mode});
    history.pushState(null, "", hash);
    handle_hash();
  }

  // Similarly, link to an example with a shorter name.
  function link_to_example(name: string) {
    let hash = encode_hash({example: name});
    history.pushState(null, "", hash);
    handle_hash();
  }

  // Also run the code when toggling the compile checkbox.
  if (modeselect) {
    modeselect.addEventListener('change', function () {
      run_code();
    });
  }

  if (exampleselect) {
    // Populate the example popup.
    for (let example of EXAMPLES) {
      let option = document.createElement("option");
      option.value = example['name'];
      option.text = example['title'];
      exampleselect.appendChild(option);
    }

    // Handle example choices.
    exampleselect.addEventListener('change', function () {
      // Load the example.
      link_to_example(exampleselect.value);

      // Switch back to the "choose an example" item.
      exampleselect.value = 'choose';
    });
  }

  // Handle the "clear" button.
  if (clearbtn) {
    clearbtn.addEventListener('click', function () {
      if (get_code() != '') {
        link_to_code('');
      }
    });
  }

  // Handle the empty hash and any new ones that are set.
  if (config.history) {
    window.addEventListener('hashchange', function () {
      handle_hash();
    });
    handle_hash();
  }

  return {
    run(code: string, mode: string | null = null) {
      set_code(code);
      run_code(true, mode, code);
    },

    set_preamble(code?: string) {
      custom_preamble = code || "";
    },

    cm: codemirror,

    /**
     * Redraw components in the dingus to adapt to screen size changes, etc.
     */
    redraw() {
      if (codemirror) {
        codemirror.refresh();
      }
      if (update_gl) {
        update_gl();
      }
    }
  };
}
