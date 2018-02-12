#define GLFW_INCLUDE_GLCOREARB
#define GL_GLEXT_PROTOTYPES
#include <GLFW/glfw3.h>
#ifndef __APPLE__
#include <GL/glcorearb.h>
#endif

/* for loading obj files */
#include "tinyobj_loader_c.h"

/* a mesh has a bunch of triangles; this returns a pointer to an opengl buffer
 * that has loaded the vertex indices for a mesh's triangles */
GLuint mesh_indices(tinyobj_attrib_t mesh);

/* loads vertex positions into an opengl buffer */
GLuint mesh_positions(tinyobj_attrib_t mesh);

/* loads vertex normals into an opengl buffer */
GLuint mesh_normals(tinyobj_attrib_t mesh);

/* compiles and returns an opengl shader program given the program source */
GLuint get_shader(const char *vert_src, const char *frag_src);

/* draws a mesh; appropriate buffers are assumed to be already bound and
 * associated with the right shader attributes. The triangle faces to be
 * rendered are passed in as an opengl buffer [indices], which stores vertex
 * indices of a triangle.
 * [mesh_size] is the number of vertex indices; e.g. if there are 12 triangles,
 * then [mesh_size] is 36 */
void draw_mesh(GLuint indices, int mesh_size);

/* prints a mesh stored in the tinyobj_loader format */
void print_mesh(tinyobj_attrib_t mesh);

/* loads [data] onto a buffer. [data_len] is the size of [data] in bytes */
GLuint gl_buffer(GLenum mode, void *data, int data_len);

/* looks for opengl errors; exits if one is found */
void detect_error();

/* loads a .obj file that contains a mesh. [failed] is set to 1 if something
 * goes wrong in this process, or 0 if all is well */
tinyobj_attrib_t load_obj(const char *file, int *failed);

/* returns a window to draw onto */
GLFWwindow *create_window();
