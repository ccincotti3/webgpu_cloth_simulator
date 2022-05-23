import { Mesh } from "./types";

type ObjFile = string;
type FilePath = string;

type CacheVertice = number;
type CacheFace = string;
type CacheNormal = number;
type CacheUv = number;
type CacheArray<T> = T[][];

type toBeFloat32 = number;
type toBeUInt16 = number;

/**
 * ObjLoader to load in .obj files. This has only been tested on Blender .obj exports that have been UV unwrapped
 * and you may need to throw out certain returned fields if the .OBJ is missing them (ie. uvs or normals)
 *
 * Use at your own risk.
 *
 * TODO:// Draco ? https://github.com/google/draco
 */
export default class ObjLoader {
  constructor() {}
  async load(filePath: FilePath): Promise<ObjFile> {
    const resp = await fetch(filePath);
    if (!resp.ok) {
      throw new Error(
        `ObjLoader could not fine file at ${filePath}. Please check your path.`
      );
    }
    const file = await resp.text();

    if (file.length === 0) {
      throw new Error(`${filePath} File is empty.`);
    }

    return file;
  }

  /**
   * Parse a given obj file into a Mesh
   */
  parse(file: ObjFile): Mesh {
    const lines = file?.split("\n");

    // Store what's in the object file here
    const cachedVertices: CacheArray<CacheVertice> = [];
    const cachedFaces: CacheArray<CacheFace> = [];
    const cachedNormals: CacheArray<CacheNormal> = [];
    const cachedUvs: CacheArray<CacheUv> = [];

    // Read out data from file and store into appropriate source buckets
    {
      for (const untrimmedLine of lines) {
        const line = untrimmedLine.trim(); // remove whitespace
        const [startingChar, ...data] = line.split(" ");
        switch (startingChar) {
          case "v":
            cachedVertices.push(data.map(parseFloat));
            break;
          case "vt":
            cachedUvs.push(data.map(Number));
            break;
          case "vn":
            cachedNormals.push(data.map(parseFloat));
            break;
          case "f":
            cachedFaces.push(data);
            break;
        }
      }
    }

    // Use these intermediate arrays to leverage Array API (.push)
    const finalVertices: toBeFloat32[] = [];
    const finalNormals: toBeFloat32[] = [];
    const finalUvs: toBeFloat32[] = [];
    const finalIndices: toBeUInt16[] = [];

    // Loop through faces, and return the buffers that will be sent to GPU for rendering
    {
      const cache: Record<string, number> = {};
      let i = 0;
      for (const faces of cachedFaces) {
        for (const faceString of faces) {
          // If we already saw this, add to indices list.
          if (cache[faceString] !== undefined) {
            finalIndices.push(cache[faceString]);
            continue;
          }

          cache[faceString] = i;
          finalIndices.push(i);

          // Need to convert strings to integers, and subtract by 1 to get to zero index.
          const [vI, uvI, nI] = faceString
            .split("/")
            .map((s: string) => Number(s) - 1);

          vI > -1 && finalVertices.push(...cachedVertices[vI]);
          uvI > -1 && finalUvs.push(...cachedUvs[uvI]);
          nI > -1 && finalNormals.push(...cachedNormals[nI]);

          i += 1;
        }
      }
    }

    console.log(finalIndices, finalVertices);
    return {
      vertices: new Float32Array(finalVertices),
      uvs: new Float32Array(finalUvs),
      normals: new Float32Array(finalNormals),
      indices: new Uint16Array(finalIndices),
    };
  }
}
