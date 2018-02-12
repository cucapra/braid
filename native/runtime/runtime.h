#define GLFW_INCLUDE_GLCOREARB
#define GL_GLEXT_PROTOTYPES
#include <GLFW/glfw3.h>
#ifndef __APPLE__
#include <GL/glcorearb.h>
#endif

/* for loading obj files */
#include "tinyobj_loader_c.h"

typedef struct {
  float x;
  float y;
  float z;
} vec3_t;

typedef struct {
  float u;
  float v;
} vec2_t;

typedef struct {
  int n_positions, n_cells, n_texcoords, n_normals, n_tangents;
  vec3_t *positions;
  vec3_t *cells;
  vec2_t *texcoords;
  vec3_t *normals;
  vec3_t *tangents;
} mesh_t;

GLuint mesh_indices(tinyobj_attrib_t mesh);

GLuint mesh_positions(tinyobj_attrib_t mesh);

GLuint mesh_normals(tinyobj_attrib_t mesh);

GLuint get_shader(const char *vert_src, const char *frag_src);

void draw_mesh(GLuint indices, int mesh_size);

void print_mesh(tinyobj_attrib_t mesh);

GLuint gl_buffer(GLenum mode, void *data, int data_len);

void detect_error();

tinyobj_attrib_t load_obj(const char *file);

GLFWwindow *create_window();
