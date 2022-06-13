import { RawShaderData } from "../../types";

const FRAGMENT_ENTRY_POINT = "fragment_main";
const VERTEX_ENTRY_POINT = "vertex_main";
const STEP_MODE = "vertex";
const FORMAT = "float32x3";
const STRIDE = Float32Array.BYTES_PER_ELEMENT * 3;

const code = `
    struct VertexOut {
        @builtin(position) position : vec4<f32>,
    };

    @binding(0) @group(0) var<uniform> viewMatrix : mat4x4<f32>;
    @binding(1) @group(0) var<uniform> projectionMatrix : mat4x4<f32>;
    @binding(2) @group(0) var<uniform> cameraPosition : vec3<f32>;
    @group(1) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
    @group(1) @binding(1) var<uniform> normalMatrix : mat4x4<f32>;

    @vertex
    fn ${VERTEX_ENTRY_POINT}(@location(0) position: vec4<f32>) -> VertexOut
    {
        let normalMatrix = normalMatrix;
        let cameraPosition = cameraPosition;
        var output : VertexOut;
        output.position = projectionMatrix * viewMatrix * modelMatrix * position;
        return output;
    } 

    @fragment
    fn ${FRAGMENT_ENTRY_POINT}(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        return vec4(0.0, 1.0, 0.0, 1.0);
    } 
`;

export default {
  code,
  primitive: {
    topology: "triangle-list",
    cullMode: "back",
  },
  fragment: {
    entryPoint: FRAGMENT_ENTRY_POINT,
  },
  vertex: {
    entryPoint: VERTEX_ENTRY_POINT,
    buffers: [
      {
        arrayStride: STRIDE,
        attributes: [
          {
            format: FORMAT,
            offset: 0,
            shaderLocation: 0,
          },
        ],
        stepMode: STEP_MODE,
      },
    ],
  },
} as RawShaderData;
