const canvas = document.getElementById('lightningCanvas');
const gl = canvas.getContext('webgl');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

if (!gl) {
  alert('WebGL not supported on your browser.');
}

// Vertex Shader
const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Fragment Shader
const fragmentShaderSource = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uHue;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;

#define OCTAVE_COUNT 10

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < OCTAVE_COUNT; ++i) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  uv = 2.0 * uv - 1.0;
  uv.x *= iResolution.x / iResolution.y;
  uv += vec2(0.0, fbm(uv * uSize + iTime * uSpeed));
  float brightness = pow(0.3 / abs(uv.y), uIntensity);
  vec3 col = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8)) * brightness;
  fragColor = vec4(col, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

// Compile shaders
function compileShader(source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const vertices = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const position = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

const iResolution = gl.getUniformLocation(program, 'iResolution');
const iTime = gl.getUniformLocation(program, 'iTime');
const uHue = gl.getUniformLocation(program, 'uHue');
const uSpeed = gl.getUniformLocation(program, 'uSpeed');
const uIntensity = gl.getUniformLocation(program, 'uIntensity');
const uSize = gl.getUniformLocation(program, 'uSize');

let start = performance.now();
function render() {
  const now = (performance.now() - start) / 1000;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(iResolution, canvas.width, canvas.height);
  gl.uniform1f(iTime, now);
  gl.uniform1f(uHue, 220.0);
  gl.uniform1f(uSpeed, 1.0);
  gl.uniform1f(uIntensity, 1.0);
  gl.uniform1f(uSize, 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}
render();
