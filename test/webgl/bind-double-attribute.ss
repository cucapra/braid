# This tests the situation where the same array is used as an attribute in
# both stages.
extern e: Float3 Buffer;
var x = e;
render js<
  vertex glsl<
    abs(x);
    fragment glsl<
      abs(x)
    >
  >
>
