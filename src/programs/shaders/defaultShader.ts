import { RawShaderData } from "../../types";

const FRAGMENT_ENTRY_POINT = "fragment_main";
const VERTEX_ENTRY_POINT = "vertex_main";
const STEP_MODE = "vertex";
const FORMAT = "float32x3";
const STRIDE = Float32Array.BYTES_PER_ELEMENT * 3;

const code = `
    struct VertexOut {
        @builtin(position) position : vec4<f32>,
        @location(1) vPos: vec4<f32>,
        @location(2) vNormal: vec4<f32>,
    };

    @group(0) @binding(0) var<uniform> viewMatrix : mat4x4<f32>;
    @group(0) @binding(1) var<uniform> projectionMatrix : mat4x4<f32>;
    @group(1) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
    @group(1) @binding(1) var<uniform> normalMatrix : mat4x4<f32>;
    @group(2) @binding(0) var<uniform> lightModelPosition : vec3<f32>;

    @stage(vertex)
    fn ${VERTEX_ENTRY_POINT}(
        @location(0) position: vec4<f32>,
        @location(1) normal: vec4<f32>) -> VertexOut
    {
        var output : VertexOut;
        output.position = projectionMatrix * viewMatrix * modelMatrix * position;
        output.vNormal = normalMatrix * normal;
        output.vPos = output.position;
        return output;
    } 

    @stage(fragment)
    fn ${FRAGMENT_ENTRY_POINT}(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        let lightStrength = 10.;
        let lightDir = normalize(1.9*lightModelPosition.xyz - fragData.vPos.xyz);
        let ambientLightIntensity = 0.2;
        let diffuseLightIntensity: f32 = lightStrength * max(dot(fragData.vNormal.xyz, lightDir), 0.00);
        let lightFinal = diffuseLightIntensity + ambientLightIntensity;
        return vec4(1.0) * lightFinal;
    } 
`;

export default {
  code,
  primitive: {
    topology: "triangle-list",
    cullMode: "front",
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
      {
        arrayStride: STRIDE,
        attributes: [
          {
            format: FORMAT,
            offset: 0,
            shaderLocation: 1,
          },
        ],
        stepMode: STEP_MODE,
      },
    ],
  },
} as RawShaderData;
