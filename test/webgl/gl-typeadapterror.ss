extern a: Float3 Buffer;
extern s: Float3;
var av = a;
render js<
  s = av
>
