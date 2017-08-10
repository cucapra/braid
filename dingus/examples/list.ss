# title: list
# mode: webgl
# ---

# Position the model.
var model = mat4.create();
mat4.scale(model, model, vec3(10.0, 10.0, 10.0));
mat4.rotateY(model, model, 1.0);

# Load buffers and parameters for the model.
var position = array_buffer(test_vertex_list);
var indices = element_buffer(test_index_list);

render js<
  vertex glsl<
    gl_Position = projection * view * model * vec4(position, 1.0);
    var vPosition = normalize(abs(position));
    fragment glsl<
      gl_FragColor = vec4(vPosition, 1.0);
    >
  >;
  draw_mesh(indices, 36);
>
