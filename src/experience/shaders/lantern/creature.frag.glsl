#version 300 es
precision highp float;

uniform sampler2D uInk;
uniform sampler2D uRegionsC;
uniform vec2 uResolution;
uniform vec2 uLantern;
uniform float uTime;
uniform vec4 uMotion;
uniform vec4 uEvent;
uniform float uPass;

in vec2 vArtUv;
in vec2 vScreen;
in float vLift;
in float vWake;
in float vOutside;
in float vHero;
out vec4 outColor;

float sampleHero(vec2 uv) {
  return texture(uInk, uv).a * texture(uRegionsC, uv).a;
}

vec3 creatureGrade(vec3 color) {
  float luma = dot(color, vec3(.299, .587, .114));
  vec3 restrained = mix(vec3(luma), color, .68);
  return restrained * vec3(.70, .745, .72) + vec3(.008, .014, .013);
}

void main() {
  vec4 ink = texture(uInk, vArtUv);
  float heroAlpha = ink.a * vHero;
  if (heroAlpha < .003 || vOutside < .002) discard;

  vec2 px = vec2(1.0 / 1450.0);
  if (uPass < 1.5) {
    float farPass = 1.0 - step(.5, uPass);
    float radius = mix(4.2, 9.0, farPass);
    float blur = heroAlpha;
    blur += sampleHero(vArtUv + vec2(px.x * radius, 0.0));
    blur += sampleHero(vArtUv - vec2(px.x * radius, 0.0));
    blur += sampleHero(vArtUv + vec2(0.0, px.y * radius));
    blur += sampleHero(vArtUv - vec2(0.0, px.y * radius));
    blur += sampleHero(vArtUv + px * radius * .72);
    blur += sampleHero(vArtUv + vec2(-px.x, px.y) * radius * .72);
    blur = smoothstep(.018, .58, blur / 7.0);
    float opacity = mix(.23, .095, farPass) * vLift * vOutside;
    vec3 shadowColor = mix(vec3(.018, .027, .028), vec3(.006, .011, .012), farPass);
    outColor = vec4(shadowColor, blur * opacity);
    return;
  }

  vec3 color = creatureGrade(ink.rgb);
  vec3 normal = normalize(vec3(-dFdx(vLift) * 78.0, dFdy(vLift) * 78.0, 1.0));
  vec3 key = normalize(vec3(-.48, -.62, .88));
  float diffuse = dot(normal, key);
  color *= .82 + max(diffuse, 0.0) * .34 + min(diffuse, 0.0) * .10;
  color *= 1.0 + vLift * .11;

  float aR = sampleHero(vArtUv + vec2(px.x * 2.0, 0.0));
  float aL = sampleHero(vArtUv - vec2(px.x * 2.0, 0.0));
  float aD = sampleHero(vArtUv + vec2(0.0, px.y * 2.0));
  float aU = sampleHero(vArtUv - vec2(0.0, px.y * 2.0));
  vec2 edgeGradient = vec2(aR - aL, aD - aU);
  float edge = clamp(length(edgeGradient) * 2.25, 0.0, 1.0);
  float grazing = dot(normalize(vec3(-edgeGradient * 8.5, 1.0)), key);
  color += edge * vLift * max(grazing, 0.0) * vec3(.036, .040, .032);
  color *= 1.0 - edge * vLift * max(-grazing, 0.0) * .12;

  // V05 deliberately keeps the historical eyes. No synthetic pupil circles are drawn.
  color += uEvent.x * vLift * vec3(.035, .041, .033);
  color += uMotion.x * vLift * vec3(.032, .022, .010);

  float alpha = heroAlpha * vOutside * smoothstep(0.0, .055, vWake + vLift);
  outColor = vec4(clamp(color, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
