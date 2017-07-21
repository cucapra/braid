# This is the SCC preamble for WebGL programs. It includes the functions
# provided by the `glrt` runtime library. It also includes some
# dingus-specific matrices from the `dingus` map.

# Externs for the dingus parameter matrices.
extern dingus.projection: Mat4;
extern dingus.view: Mat4;

# And local bindings, to make them non-pervasive.
var projection = dingus.projection;
var view = dingus.view;

# Sample assets to play with.
extern bunny: Mesh;
extern teapot: Mesh;
extern snowden: Mesh;

# Mesh asset wrangling.
extern mesh_indices: Mesh -> (Int3 Array);
extern mesh_positions: Mesh -> (Float3 Array);
extern mesh_normals: Mesh -> (Float3 Array);
extern mesh_size: Mesh -> Int;
extern mesh_count: Mesh -> Int;
extern mesh_texcoords: Mesh -> (Float2 Array);
extern mesh_tangents: Mesh -> (Float3 Array);
extern draw_mesh: (Int3 Array) Int -> Void;
extern draw_arrays: Int -> Void;

# Matrix manipulation library.
extern mat4.create: -> Mat4;
extern mat4.rotate: Mat4 Mat4 Float Vec3 -> Void;
extern mat4.rotateX: Mat4 Mat4 Float -> Void;
extern mat4.rotateY: Mat4 Mat4 Float -> Void;
extern mat4.rotateZ: Mat4 Mat4 Float -> Void;
extern mat4.scale: Mat4 Mat4 Vec3 -> Void;
extern mat4.translate: Mat4 Mat4 Vec3 -> Void;
extern mat4.fromTranslation: Mat4 Vec3 -> Void;
extern mat4.transpose: Mat4 Mat4 -> Void;
extern mat4.scale: Mat4 Mat4 Vec3 -> Void;
extern mat4.invert: Mat4 Mat4 -> Void;
extern mat4.perspective: Mat4 Float Float Float Float -> Void;
extern mat4.lookAt: Mat4 Vec3 Vec3 Vec3 -> Void;

# Get the camera position (in world space) from a view matrix.
extern eye: Mat4 -> Vec3;

# Assets: loading images and such.
extern load_obj: String -> Mesh;
extern load_texture: String -> Texture;
extern load_raw: String -> Mesh;
extern load_image: String -> Image;
extern average: Image -> Float4;

# Create a texture from an image. The first form is for standard 2D
# textures; the second form takes [posx, negx, posy, negy, posz, negz]
# to create a cube-map texture.
extern texture: Image -> Texture | -> Texture | Image Image Image Image Image Image -> CubeTexture;
extern framebuffer: Texture -> Framebuffer;
extern bindFramebuffer: Framebuffer -> Void | -> Void;

# Standard JavaScript functions.
extern Date.now: -> Float;
extern Math.sin: Float -> Float;
extern Math.cos: Float -> Float;

# Random numbers.
extern random.seed: -> Void;
extern random.flip: -> Float;
