export const FRAGMENT_ENTRY_POINT = "fragment_main";
export const VERTEX_ENTRY_POINT = "vertex_main";

export default `
    struct VertexOut {
        @builtin(position) position : vec4<f32>,
        @location(0) @interpolate(flat) vNormal: vec4<f32>,
    };

    struct Uniforms {
        modelViewProjectionMatrix : mat4x4<f32>,
    };
    @binding(0) @group(0) var<uniform> uniforms : Uniforms;

    @stage(vertex)
    fn ${VERTEX_ENTRY_POINT}(
        @location(0) position: vec4<f32>,
        @location(1) normal: vec4<f32>) -> VertexOut
    {
        var output : VertexOut;
        output.position = uniforms.modelViewProjectionMatrix * position;
        output.vNormal = normal;
        return output;
    } 

    @stage(fragment)
    fn ${FRAGMENT_ENTRY_POINT}(fragData: VertexOut) -> @location(0) vec4<f32>
    {
        return abs(fragData.vNormal);
    } 
`;
