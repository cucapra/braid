declare module "webgl-obj-loader" {
  class Mesh {
    vertices: number[];
    vertexNormals: number[];
    textures: number[];
    indices: number[];

    constructor(objStr: string);
  }
}
