extern a: Int Buffer;
extern b: Int;
var c = a;
vertex glsl<
  fragment glsl<
    b = c
  >
>
