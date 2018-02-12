#include "runtime.h"
#include <stdio.h>
#include <graphene.h>
#include <math.h>

#define PI 3.14159265

const char *frag_src =
"#version 410\n"
"precision mediump float;\n"
"in vec3 frag_normal;\n"
"out vec4 color;\n"
"void main() {\n"
"  color = vec4(abs(frag_normal), 1.0);\n"
"}\n";

const char *vert_src =
"#version 410\n"
"precision mediump float;\n"
"in vec3 position;\n"
"in vec3 vert_normal;\n"
"out vec3 frag_normal;\n"
"uniform mat4 model;\n"
"uniform mat4 view;\n"
"uniform mat4 proj;\n"
"void main() {\n"
"  frag_normal = vert_normal;\n"
"  gl_Position = ((((proj) * (view)) * (model)) * (vec4(position, 1.0)));\n"
"}\n";


void render(GLuint vao, int mesh_size,
    GLint positions_loc, GLint normals_loc,
    GLint model_loc, GLint view_loc, GLint proj_loc,
    GLuint indices, GLuint positions, GLuint normals,
    float *model, float *view, float *projection) {
  glBindVertexArray(vao);
  glEnableVertexAttribArray(positions_loc);
  glBindBuffer(GL_ARRAY_BUFFER, positions);
  glVertexAttribPointer(positions_loc, 3, GL_FLOAT, GL_FALSE, 0, 0);
  glEnableVertexAttribArray(normals_loc);
  glBindBuffer(GL_ARRAY_BUFFER, normals);
  glVertexAttribPointer(normals_loc, 3, GL_FLOAT, GL_FALSE, 0, 0);
  glUniformMatrix4fv(model_loc, 1, GL_FALSE, model);
  glUniformMatrix4fv(view_loc, 1, GL_FALSE, view);
  glUniformMatrix4fv(proj_loc, 1, GL_FALSE, projection);
  draw_mesh(indices, mesh_size);
}

int main() {
  GLFWwindow *window = create_window();
  GLuint vao;
  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);

  GLuint prog = get_shader(vert_src, frag_src);
  GLint normals_loc = glGetAttribLocation(prog, "vert_normal");
  GLint position_loc = glGetAttribLocation(prog, "position");
  GLint model_loc = glGetUniformLocation(prog, "model");
  GLint view_loc = glGetUniformLocation(prog, "view");
  GLint proj_loc = glGetUniformLocation(prog, "proj");

  graphene_point3d_t literal_point;
  graphene_point3d_init(&literal_point, 0.0, 0.0, 0.0);
  graphene_matrix_t model_g;
  graphene_matrix_init_translate(&model_g, &literal_point);
  graphene_matrix_scale(&model_g, 0.9, 0.9, 0.9);

  graphene_matrix_t projection_g;
  graphene_matrix_init_perspective(&projection_g, 90.0, 1.0, 0.01, 1000.0);

  graphene_vec3_t eye, center, up;
  graphene_vec3_init(&eye, 0.0, 0.0, 5.0);
  graphene_vec3_init(&center, 0.0, 0.0, 0.0);
  graphene_vec3_init(&up, 0.0, 1.0, 0.0);
  graphene_matrix_t view_g;
  graphene_matrix_init_look_at(&view_g, &eye, &center, &up);

  float *model = malloc(sizeof(float) * 16);
  float *view = malloc(sizeof(float) * 16);
  float *projection = malloc(sizeof(float) * 16);
  graphene_matrix_to_float(&model_g, model);
  graphene_matrix_to_float(&projection_g, projection);
  graphene_matrix_to_float(&view_g, view);

  int failed;
  tinyobj_attrib_t *mesh = load_obj("assets/bunny.obj", &failed);
  if (failed) {
    printf("Could not find mesh file.\n");
    exit(1);
  }
  print_mesh(mesh);
  GLuint positions = mesh_positions(mesh);
  GLuint normals = mesh_normals(mesh);
  GLuint indices = mesh_indices(mesh);

  int mesh_size = mesh->num_faces;

  while (!glfwWindowShouldClose(window)) {
    glfwPollEvents();

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glUseProgram(prog);
    glEnable(GL_DEPTH_TEST);
    render(vao, mesh_size,
      position_loc, normals_loc,
      model_loc, view_loc, proj_loc,
      indices, positions, normals,
      model, view, projection);
    glfwSwapBuffers(window);

  }
  return 0;
}
