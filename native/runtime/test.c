#include "runtime.h"
#include <stdio.h>
#include <graphene.h>

const char *frag_src =
  "#version 410\n"
  "uniform float phase;\n"
  "in vec4 myPos;\n"
  "out vec4 color;\n"
  "void main() {\n"
  "  float r2 = (myPos.x + 1.) * (myPos.x + 1.) +\n"
  "             (myPos.y + 1.) * (myPos.y + 1.);\n"
  "  color = vec4((myPos.x + 1.) / r2,\n"
  "               (myPos.y + 1.) / r2,\n"
  "               phase,\n"
  "               1.);\n"
  "}\n"
;

const char *vert_src =
  "#version 410\n"
  "in vec4 position;\n"
  "out vec4 myPos;\n"
  "void main() {\n"
  "  myPos = position;\n"
  "  gl_Position = position;\n"
  "}\n"
;

int main() {
  GLFWwindow *window = create_window();
  GLuint vao;
  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);

  GLuint prog = get_shader(vert_src, frag_src);
  GLuint loc_phase = glGetUniformLocation(prog, "phase");
  GLuint loc_position = glGetAttribLocation(prog, "position");

  float points[3 * 3] = {-1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0};

  GLuint buffer;
  glGenBuffers(1, &buffer);
  glBindBuffer(GL_ARRAY_BUFFER, buffer);
  glBufferData(GL_ARRAY_BUFFER, sizeof(points), points, GL_DYNAMIC_DRAW);
  glVertexAttribPointer(loc_position, 3, GL_FLOAT, GL_FALSE, 0, 0);
  glEnableVertexAttribArray(loc_position);

  while (!glfwWindowShouldClose(window)) {
    glfwPollEvents();

    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(prog);
    glDrawArrays(GL_TRIANGLE_FAN, 0, 3);

    glfwSwapBuffers(window);

  }
  return 0;
}
