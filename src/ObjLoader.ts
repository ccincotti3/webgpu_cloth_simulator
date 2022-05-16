type ObjFile = string;
type FilePath = string;
type Vertices = number;
type Faces = string;
type Normals = number;
type Uvs = number;
type CacheArray<T> = T[][];

interface ParsedObjFileData {
    vertices: Float32Array
    uvs: Float32Array
    normals: Float32Array
    indices: Uint16Array
}

/**
 * ObjLoader to load in .obj files. This has only been tested on Blender .obj exports that have been UV 1unwrapped
 * and you may need to throw out certain returned fields if the .OBJ is missing them (ie. uvs or normals)
 * 
 * Use at your own risk.
 */
export default class ObjLoader {
    constructor() { }
    async load(filePath: FilePath): Promise<ObjFile> {
        const resp = await fetch(filePath)
        if (!resp.ok) {
            throw new Error(`ObjLoader could not fine file at ${filePath}. Please check your path.`)
        }
        const file = await resp.text()

        if (file.length === 0) {
            throw new Error(`${filePath} File is empty.`)
        }

        return file
    }

    /**
     * Parse a given obj file.
     */
    parse(file: ObjFile): ParsedObjFileData {
        const lines = file?.split("\n");

        // Store what's in the object file here
        const cachedVertices: CacheArray<Vertices> = [];
        const cachedFaces: CacheArray<Faces> = [];
        const cachedNormals: CacheArray<Normals> = [];
        const cachedUvs: CacheArray<Uvs> = [];

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

        const finalVertices: number[] = []; // float32
        const finalNormals: number[] = []; //float32
        const finalIndices: number[] = []; //uInt16
        const finalUvs: number[] = []; //uInt16

        // Loop through faces, and return the buffers that will be sent to GPU for rendering
        {
            const cache: Record<string, number> = {}
            let indexCount = 0;
            for (const faces of cachedFaces) {
                for (const faceString of faces) {
                    // If we already saw this, add to indices list.
                    if(cache[faceString]) {
                        finalIndices.push(cache[faceString]);
                        continue;
                    } 

                    cache[faceString] = indexCount
                    finalIndices.push(indexCount);

                    indexCount += 1

                    // Need to convert strings to integers, and subtract by 1 to get to zero index.
                    const face = faceString.split("/")
                        .map((i: string) => Number(i) - 1);

                    const [vI, uvI, nI] = face
                    vI > -1 && finalVertices.push(...cachedVertices[vI])
                    uvI > -1 && finalUvs.push(...cachedUvs[uvI])
                    nI > -1 && finalNormals.push(...cachedNormals[nI])
                }
            }
        }

        return {
            vertices: new Float32Array(finalVertices),
            uvs: new Float32Array(finalUvs),
            normals: new Float32Array(finalNormals),
            indices: new Uint16Array(finalIndices),
        }
    }
}