#include <stdlib.h>
#include <math.h>
#include <stdio.h>
#include <assert.h>
#include <string.h>

#define TINYOBJ_LOADER_C_IMPLEMENTATION
#include "runtime.h"
#define BUFSIZE 2000

void detect_error() {
  GLenum err = glGetError();
  printf("error detected (0x%x)\n", err);
  if (err != 0x0) exit(1);
}

typedef void (*GetLogFunc)(GLuint, GLsizei, GLsizei *, GLchar *);
typedef void (*GetParamFunc)(GLuint, GLenum, GLint *);
void shader_error_check(GLuint object, const char *kind,
        GetLogFunc getLog, GetParamFunc getParam, GLenum param) {
  // Get the error/warning log using either `glGetShaderInfoLog` or
  // `glGetProgramInfoLog` (as `getLog`).
  GLchar log[BUFSIZE];
  GLsizei length;
  getLog(object, BUFSIZE, &length, log);
  if (length)
    fprintf(stderr, "%s log:\n%s", kind, log);

  // Get the status flag using either `glGetShaderiv` with the
  // `GL_COMPILE_STATUS` parameter,  or `glGetProgramiv` with `GL_LINK_STATUS`.
  GLint status;
  getParam(object, param, &status);
  if (status == GL_FALSE)
    exit(1);
}


GLuint compile_glsl(GLenum type, const char *src) {
  GLuint shader = glCreateShader(type);
  glShaderSource(shader, 1, &src, 0);
  glCompileShader(shader);
  // TODO : error checking
  return shader;
}

GLuint get_shader(const char *vert_src, const char *frag_src) {
  GLuint vert = compile_glsl(GL_VERTEX_SHADER, vert_src);
  shader_error_check(vert, "vertex shader", glGetShaderInfoLog,
                     glGetShaderiv, GL_COMPILE_STATUS);
  GLuint frag = compile_glsl(GL_FRAGMENT_SHADER, frag_src);
  shader_error_check(frag, "fragment shader", glGetShaderInfoLog,
                     glGetShaderiv, GL_COMPILE_STATUS);
  GLuint prog = glCreateProgram();
  glAttachShader(prog, vert);
  glDeleteShader(vert);
  glAttachShader(prog, frag);
  glDeleteShader(frag);
  glLinkProgram(prog);
  // TODO : error checking
  return prog;
}

char *read_file(const char *file) {
  FILE *f = fopen(file, "rb");
  fseek(f, 0, SEEK_END);
  long fsize = ftell(f);
  fseek(f, 0, SEEK_SET);  //same as rewind(f);

  char *string = malloc(fsize + 1);
  fread(string, fsize, 1, f);
  fclose(f);

  string[fsize] = 0;
  return string;
}

void draw_mesh(GLuint indices, int mesh_size) {
  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices);
  glDrawElements(GL_TRIANGLES, mesh_size, GL_UNSIGNED_INT, 0);
}

GLuint mesh_indices(tinyobj_attrib_t mesh) {
  int *indices = malloc(mesh.num_faces * sizeof(int));
  for (int i = 0; i < mesh.num_faces; i++) {
    indices[i] = mesh.faces[i].v_idx;
  }

  GLuint buf = gl_buffer(GL_ELEMENT_ARRAY_BUFFER, indices, sizeof(int) * mesh.num_faces);
  free(indices);
  return buf;
}

GLuint mesh_positions(tinyobj_attrib_t mesh) {
  return gl_buffer(GL_ARRAY_BUFFER, mesh.vertices, sizeof(float) * mesh.num_vertices * 3);
}

GLuint mesh_normals(tinyobj_attrib_t mesh) {
  return gl_buffer(GL_ARRAY_BUFFER, mesh.normals, sizeof(float) * mesh.num_normals * 3);
}

GLuint gl_buffer(GLenum mode, void *data, int data_len) {
  GLuint buffer_id;
  glGenBuffers(1, &buffer_id);
  glBindBuffer(mode, buffer_id);
  glBufferData(mode, data_len, data, GL_STATIC_DRAW);
  return buffer_id;
}

void print_mesh(tinyobj_attrib_t mesh) {
  printf("num_vertices = %d\n", mesh.num_vertices);
  for (int i = 0; i < 3 * mesh.num_vertices; i += 3) {
    printf("(%f, %f, %f)\n", mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]);
  }
  printf("num_normals = %d\n", mesh.num_normals);
  for (int i = 0; i < 3 * mesh.num_normals; i += 3) {
    printf("(%f, %f, %f)\n", mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
  }
  printf("num_texcoords = %d\n", mesh.num_texcoords);
  for (int i = 0; i < 2 * mesh.num_texcoords; i += 2) {
    printf("(%f, %f)\n", mesh.texcoords[i], mesh.texcoords[i + 1]);
  }
  printf("num_faces = %d\n", mesh.num_faces);
  printf("num_face_num_verts = %d\n", mesh.num_face_num_verts);
  int face_ptr_offset = 0;
  for (int i = 0; i < mesh.num_face_num_verts; i++) {
    for (int j = 0; j < mesh.face_num_verts[i]; j++) {
      tinyobj_vertex_index_t vi = mesh.faces[face_ptr_offset];
      printf("%d/%d/%d ", vi.v_idx, vi.vt_idx, vi.vn_idx);
      face_ptr_offset++;
    }
    printf("\n");
  }
}

tinyobj_attrib_t load_obj(const char *file) {
  tinyobj_attrib_t attrib;
  tinyobj_shape_t *shapes = NULL;
  size_t num_shapes;
  tinyobj_material_t *materials = NULL;
  size_t num_materials;
  char *data = read_file(file);
  int data_len = strlen(data);
  unsigned int flags = TINYOBJ_FLAG_TRIANGULATE;
  int ret = tinyobj_parse_obj(&attrib, &shapes, &num_shapes, &materials, &num_materials, data, data_len, flags);
  tinyobj_shapes_free(shapes, num_shapes);
  tinyobj_materials_free(materials, num_materials);
  if (ret == TINYOBJ_SUCCESS) printf("success!\n");
  else printf("failure!\n");
  //print_mesh(attrib);
  return attrib;
}

GLFWwindow *create_window() {
  glfwInit();
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 1);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  GLFWwindow *window = glfwCreateWindow(512, 512, "Look at Me!", NULL, NULL);
  glfwMakeContextCurrent(window);
  glfwSwapInterval(1);
  return window;
}
