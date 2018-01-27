# This is the SCC preamble for WebGL programs. It includes the functions
# provided by the `glrt` runtime library. It also includes some
# dingus-specific matrices from the `dingus` map.

# Externs for the dingus parameter matrices. This is currently a little weird
# because it's dingus-specific, and yet we currently place it on the general
# `rt` namespace.
extern dingus.projection: Mat4 = "rt.dingus.projection";
extern dingus.view: Mat4 = "rt.dingus.view";

# And local bindings, to make them non-pervasive.
var projection = dingus.projection;
var view = dingus.view;

# Sample assets to play with.
extern bunny: Mesh = "rt.bunny";
extern teapot: Mesh = "rt.teapot";

# Mesh asset wrangling.
extern mesh_indices: Mesh -> (Int3 Buffer) = "rt.mesh_indices";
extern mesh_positions: Mesh -> (Float3 Buffer) = "rt.mesh_positions";
extern mesh_normals: Mesh -> (Float3 Buffer) = "rt.mesh_normals";
extern mesh_size: Mesh -> Int = "rt.mesh_size";
extern mesh_count: Mesh -> Int = "rt.mesh_count";
extern mesh_texcoords: Mesh -> (Float2 Buffer) = "rt.mesh_texcoords";
extern mesh_tangents: Mesh -> (Float3 Buffer) = "rt.mesh_tangents";
extern draw_mesh: (Int3 Buffer) Int -> Void = "rt.draw_mesh";
extern draw_arrays: Int -> Void = "rt.draw_arrays";
extern array_buffer:
    (Int Buffer) -> (Int Array) |
    (Float Array) -> (Float Buffer) |
    (Float2 Array) -> (Float2 Buffer) |
    (Float3 Array) -> (Float3 Buffer) |
    (Float4 Array) -> (Float4 Buffer)
    = "rt.array_buffer";
extern element_buffer: (Int Array) -> (Int3 Buffer) = "rt.element_buffer";

# Matrix manipulation library.
extern mat4.create: -> Mat4 = "rt.mat4.create";
extern mat4.rotate: Mat4 Mat4 Float Vec3 -> Void = "rt.mat4.rotate";
extern mat4.rotateX: Mat4 Mat4 Float -> Void = "rt.mat4.rotateX";
extern mat4.rotateY: Mat4 Mat4 Float -> Void = "rt.mat4.rotateY";
extern mat4.rotateZ: Mat4 Mat4 Float -> Void = "rt.mat4.rotateZ";
extern mat4.scale: Mat4 Mat4 Vec3 -> Void = "rt.mat4.scale";
extern mat4.translate: Mat4 Mat4 Vec3 -> Void = "rt.mat4.translate";
extern mat4.fromTranslation: Mat4 Vec3 -> Void = "rt.mat4.fromTranslation";
extern mat4.transpose: Mat4 Mat4 -> Void = "rt.mat4.transpose";
extern mat4.scale: Mat4 Mat4 Vec3 -> Void = "rt.mat4.scale";
extern mat4.invert: Mat4 Mat4 -> Void = "rt.mat4.invert";
extern mat4.perspective: Mat4 Float Float Float Float -> Void
    = "rt.mat4.perspective";
extern mat4.lookAt: Mat4 Vec3 Vec3 Vec3 -> Void = "rt.mat4.lookAt";

# Get the camera position (in world space) from a view matrix.
extern eye: Mat4 -> Vec3 = "rt.eye";

# Assets: loading images and such.
extern load_obj: String -> Mesh = "rt.load_obj";
extern load_texture: String -> Texture = "rt.load_texture";
extern load_raw: String -> Mesh = "rt.load_raw";
extern load_image: String -> Image = "rt.load_image";
extern average: Image -> Float4 = "rt.average";

# Create a standard 2D texture from an image or a blank texture "from scratch."
extern texture: Image -> Texture | -> Texture = "rt.texture";
# Create a cube-map texture. The arguments are:
# [posx, negx, posy, negy, posz, negz]
extern cubeTexture:
    Image Image Image Image Image Image -> CubeTexture |
    -> CubeTexture
    = "rt.cubeTexture";

# Manage frame buffer objects.
extern createFramebuffer: -> Framebuffer = "rt.createFramebuffer";
extern framebufferTexture:
    Framebuffer Texture -> Void |
    Framebuffer CubeTexture Int -> Void
    = "rt.framebufferTexture";
extern bindFramebuffer: Framebuffer -> Void = "rt.bindFramebuffer";

# A framebuffer representing the content to be shown in the canvas
extern screenbuffer: Framebuffer = "rt.screenbuffer";

# Standard JavaScript functions.
extern Date.now: -> Float;
extern Math.sin: Float -> Float;
extern Math.cos: Float -> Float;

# Random numbers.
extern random.seed: -> Void = "rt.random.seed";
extern random.flip: -> Float = "rt.random.flip";
