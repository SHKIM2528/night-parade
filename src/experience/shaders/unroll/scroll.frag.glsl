#version 300 es
precision highp float;

uniform sampler2D uScroll;
uniform sampler2D uRight;
uniform vec2 uResolution;
uniform vec2 uScrollSize;
uniform vec2 uRightSize;
uniform vec2 uPointer;
uniform vec2 uLantern;
uniform float uTime;
uniform float uOffset;
uniform float uVelocity;
uniform float uReveal;
uniform float uPull;
uniform float uHasRight;
uniform float uReducedMotion;
uniform float uSpan;

in vec2 vUv;
out vec4 outColor;

#define PI 3.141592653589793

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise21(p);
    p = rotation * p * 2.03 + 11.7;
    amplitude *= 0.5;
  }
  return value;
}

vec3 nightGrade(vec3 color) {
  float luma = dot(color, vec3(.299, .587, .114));
  vec3 restrained = mix(vec3(luma), color, .58);
  // The scroll must remain readable in darkness. V02 crushed the paper almost to black.
  return restrained * vec3(.54, .60, .59) + vec3(.018, .028, .027);
}

vec3 sampleScroll(vec2 uv) {
  return texture(uScroll, clamp(uv, 0.0, 1.0)).rgb;
}

void main() {
  vec2 screen = vec2(vUv.x, 1.0 - vUv.y);
  float viewportAspect = uResolution.x / max(uResolution.y, 1.0);

  float reveal = smoothstep(0.0, 1.0, uReveal);
  reveal = 1.0 - pow(1.0 - reveal, 3.0);
  float fullSpan = clamp(uSpan, .055, .72);
  float closeSpan = min(fullSpan * .34, .082);
  float span = mix(closeSpan, fullSpan, reveal);
  float center = mix(.72, clamp(uOffset, fullSpan * .5, 1.0 - fullSpan * .5), reveal);

  vec2 paper = screen;
  float velocity = uReducedMotion > .5 ? 0.0 : clamp(uVelocity, -3.0, 3.0);
  float drag = uReducedMotion > .5 ? 0.0 : uPull;
  float horizontalArc = sin(screen.x * PI);
  float verticalArc = sin(screen.y * PI);

  paper.y += horizontalArc * (screen.y - .5) * velocity * .014;
  paper.y += sin(screen.x * PI * 2.0 + uTime * 1.2) * drag * .0040 * verticalArc;
  paper.x += (screen.y - .5) * velocity * .0050;

  float edgeLeft = 1.0 - smoothstep(.0, .07, screen.x);
  float edgeRight = smoothstep(.93, 1.0, screen.x);
  float edgeCurl = edgeLeft - edgeRight;
  paper.x += edgeCurl * edgeCurl * sign(edgeCurl) * (.018 + abs(velocity) * .006);
  paper.y += edgeCurl * (screen.y - .5) * .028;

  vec2 uv = vec2(center + (paper.x - .5) * span, mix(.025, .975, paper.y));
  float inkDrift = fbm(uv * vec2(160.0, 42.0) + vec2(uTime * .018, 0.0)) - .5;
  vec2 smearUv = uv + vec2(velocity * .00090, inkDrift * abs(velocity) * .00060);

  vec3 original = sampleScroll(uv);
  vec3 smear = sampleScroll(smearUv);
  original = mix(original, smear, min(.32, abs(velocity) * .085));

  vec2 lamp = screen - uLantern;
  lamp.x *= viewportAspect;
  float lampAngle = atan(lamp.y, lamp.x);
  float contour = 1.0 + .050 * sin(lampAngle * 3.0 + .8) + .024 * sin(lampAngle * 7.0 - 1.4);
  float fiber = (fbm(uv * vec2(22.0, 92.0) + vec2(uTime * .008, 0.0)) - .5) * .055;
  float lampDistance = length(lamp / vec2(.37 + abs(velocity) * .018, .40)) / contour + fiber;
  float light = 1.0 - smoothstep(.40, 1.04, lampDistance);
  float halo = 1.0 - smoothstep(.82, 1.42, lampDistance);

  vec3 day = original * vec3(1.028, 1.014, .982) + vec3(.006, .003, 0.0);
  vec3 night = nightGrade(original);
  vec3 color = mix(night, day, light);
  color += halo * (1.0 - light) * vec3(.018, .011, .004);

  float paperFiber = (fbm(uv * vec2(280.0, 74.0)) - .5) * .012;
  color += paperFiber * mix(.45, 1.0, light);

  float fakeDepth = sin((screen.x - .5) * PI) * (.018 + drag * .035) + edgeCurl * .11;
  vec3 normal = normalize(vec3(-velocity * .10 - edgeCurl * .65, fakeDepth, 1.0));
  vec3 key = normalize(vec3(-.45, -.35, .88));
  color *= .97 + max(dot(normal, key), 0.0) * .08;

  float topEdge = 1.0 - smoothstep(.0, .018, screen.y);
  float bottomEdge = smoothstep(.982, 1.0, screen.y);
  color *= 1.0 - (topEdge + bottomEdge) * .08;
  color += topEdge * vec3(.020, .017, .010);

  float vignette = 1.0 - .075 * dot((screen - .5) / vec2(.74, .68), (screen - .5) / vec2(.74, .68));
  color *= vignette;
  color += (hash21(gl_FragCoord.xy + floor(uTime * 18.0)) - .5) * .0035;

  // Lift shadow values slightly for screen recordings and ordinary laptop displays.
  color = pow(max(color, vec3(0.0)), vec3(.92));
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
