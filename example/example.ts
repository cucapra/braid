import glrt from 'braid-glrt';

function example(canvas: HTMLCanvasElement) {
  // Get the WebGL context.
  let gl = (canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext;

  // Load a Braid runtime object.
  let assets = {};
  let rt = glrt(gl, assets, (n) => {});

  // Get the compiled Braid code's render function.
  let braid_render = x;

  // The main render loop.
  function render() {
    // Draw on the whole canvas.
    let width = gl.drawingBufferWidth;
    let height = gl.drawingBufferHeight;
    gl.viewport(0, 0, width, height);

    // Rendering flags.
    gl.depthFunc(gl.LESS);
    gl.enable(gl.DEPTH_TEST);

    // Invoke the compiled Braid code.
    braid_render.proc.apply(void 0, braid_render.env);

    // Ask to be run again.
    window.requestAnimationFrame(render);
  }

  // Start the first frame.
  window.requestAnimationFrame(render);
}

document.addEventListener("DOMContentLoaded", () => {
  let canvas = document.getElementsByTagName("canvas")[0];
  example(canvas);
});
