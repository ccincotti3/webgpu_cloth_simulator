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
    @group(0) @binding(2) var<uniform> cameraPosition : vec3<f32>;
    @group(1) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
    @group(1) @binding(1) var<uniform> normalMatrix : mat4x4<f32>;
    @group(2) @binding(0) var<uniform> lightModelPosition : vec3<f32>;

    @vertex
    fn ${VERTEX_ENTRY_POINT}(
        @location(0) position: vec4<f32>,
        @location(1) normal: vec4<f32>) -> VertexOut
    {
        var n = normalMatrix;
        var output : VertexOut;
        output.position = projectionMatrix * viewMatrix * modelMatrix * position;
        output.vNormal = normalMatrix * abs(normal);
        output.vPos = modelMatrix * position;
        return output;
    } 

    @fragment
    fn ${FRAGMENT_ENTRY_POINT}(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        let diffuseLightStrength = 0.9;
        let ambientLightIntensity = 0.0;
        let specularStrength = 0.2;
        let specularShininess = 32.;

        let vNormal = normalize(fragData.vNormal.xyz);
        let vPosition = fragData.vPos.xyz;
        let vCameraPosition = cameraPosition;
        let lightPosition = lightModelPosition.xyz;

        let lightDir = normalize(lightPosition - vPosition);
        let lightMagnitude = dot(vNormal, lightDir);
        let diffuseLightFinal: f32 = diffuseLightStrength * max(lightMagnitude, 0);

        let viewDir = normalize(vCameraPosition - vPosition);
        let reflectDir = reflect(-lightDir, vNormal);  
        let spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
        let specularFinal = specularStrength * spec;  

        let lightFinal = specularFinal + diffuseLightFinal + ambientLightIntensity;
        // return vec4(vNormal, 1.0) * lightFinal;
        return vec4(0.9, .8, 0.5, 1.0) * lightFinal;
    } 
`;

export default {
  code,
  primitive: {
    topology: "triangle-list",
    frontFace: 'ccw',
    cullMode: 'none'
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
