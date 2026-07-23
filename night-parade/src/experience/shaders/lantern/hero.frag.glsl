#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uClean;
uniform sampler2D uInk;
uniform sampler2D uRegionsA;
uniform sampler2D uRegionsB;
uniform sampler2D uRegionsC;
uniform vec2 uResolution;
uniform vec2 uLantern;
uniform vec2 uPointer;
uniform float uTime;
uniform float uIntro;
uniform float uReducedMotion;

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
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise21(p);
    p = r * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

vec2 screenToArt(vec2 s, float aspect) {
  float crop = 0.988;
  if (aspect >= 1.0) {
    return vec2(0.5 + (s.x - 0.5) * crop,
                0.463 + (s.y - 0.5) * (crop / aspect));
  }
  return vec2(0.50 + (s.x - 0.5) * (crop * aspect),
              0.49 + (s.y - 0.5) * crop);
}

float ellipseMask(vec2 uv, vec2 c, vec2 r, float feather) {
  float d = length((uv - c) / r);
  return 1.0 - smoothstep(1.0 - feather, 1.0, d);
}

vec2 inverseLayer(vec2 uv, vec2 pivot, vec2 translate, float rotation, float scale) {
  vec2 p = uv - pivot - translate;
  float c = cos(-rotation);
  float s = sin(-rotation);
  p = mat2(c, -s, s, c) * p;
  return p / scale + pivot;
}

vec3 nightGrade(vec3 c, vec2 s) {
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 n = c * vec3(0.205, 0.235, 0.242) + vec3(0.006, 0.011, 0.014) * (0.85 + luma * 0.15);
  vec2 q = (s - 0.5) / vec2(0.64, 0.59);
  float vignette = 1.0 - 0.19 * clamp(dot(q, q), 0.0, 1.0);
  return n * vignette;
}

vec3 dayGrade(vec3 c, float core) {
  c = c * vec3(1.10, 1.065, 0.995) + vec3(0.018, 0.010, 0.0);
  return c * vec3(1.0 + 0.045 * core, 1.0 + 0.018 * core, 1.0 - 0.025 * core);
}

float regionById(int id, vec2 uv) {
  vec4 a = texture(uRegionsA, uv);
  vec4 b = texture(uRegionsB, uv);
  vec4 c = texture(uRegionsC, uv);
  if (id == 0) return a.r; // bag
  if (id == 1) return a.g; // left leg
  if (id == 2) return a.b; // right leg
  if (id == 3) return a.a; // torso
  if (id == 4) return b.r; // robe
  if (id == 5) return b.g; // arm
  if (id == 6) return b.b; // head
  if (id == 7) return b.a; // fur
  return c.r;              // face
}

void layerParams(
  int id,
  out vec2 pivot,
  out vec2 trans,
  out float rot,
  out float scale,
  out vec2 shadowOffset,
  out float shadowOpacity,
  out float depth
) {
  vec2 look = clamp(uPointer - vec2(.39,.42), vec2(-.42), vec2(.42));
  float idle = uReducedMotion > .5 ? 0.0 : sin(uTime * .72);
  float idle2 = uReducedMotion > .5 ? 0.0 : sin(uTime * 1.07 + 1.4);
  float breath = uReducedMotion > .5 ? 0.0 : sin(uTime * 1.18);

  if (id == 0) { pivot=vec2(.33,.61); trans=vec2(.0007,.0008)+look*.0015; rot=radians(-.10+idle*.10); scale=1.0005; shadowOffset=vec2(.0018,.0030); shadowOpacity=.10; depth=.28; return; }
  if (id == 1) { pivot=vec2(.46,.66); trans=vec2(.0010,.0018)+look*.0019; rot=radians(-.16+idle2*.18); scale=1.0018; shadowOffset=vec2(.0024,.0040); shadowOpacity=.13; depth=.40; return; }
  if (id == 2) { pivot=vec2(.60,.665); trans=vec2(.0018,.0015)+look*.0022; rot=radians(.18-idle*.20); scale=1.0020; shadowOffset=vec2(.0028,.0044); shadowOpacity=.14; depth=.44; return; }
  if (id == 3) { pivot=vec2(.535,.475); trans=vec2(.0020,-.0010)+look*.0030; rot=radians(.12+idle*.19); scale=1.0035+breath*.0014; shadowOffset=vec2(.0034,.0052); shadowOpacity=.15; depth=.54; return; }
  if (id == 4) { pivot=vec2(.65,.53); trans=vec2(.0030,-.0017)+look*.0038; rot=radians(.25+idle2*.25); scale=1.0045; shadowOffset=vec2(.0042,.0063); shadowOpacity=.17; depth=.66; return; }
  if (id == 5) { pivot=vec2(.47,.505); trans=vec2(.0042,-.0028)+look*.0048; rot=radians(.55+idle*.31); scale=1.0058; shadowOffset=vec2(.0050,.0072); shadowOpacity=.19; depth=.78; return; }
  if (id == 6) { pivot=vec2(.405,.365); trans=vec2(.0036,-.0030)+look*.0047; rot=radians(-.28+idle2*.26); scale=1.0053; shadowOffset=vec2(.0047,.0068); shadowOpacity=.18; depth=.74; return; }
  if (id == 7) { pivot=vec2(.455,.32); trans=vec2(.0051,-.0045)+look*.0055; rot=radians(-.42+idle*.42); scale=1.0065; shadowOffset=vec2(.0058,.0082); shadowOpacity=.21; depth=.92; return; }
  pivot=vec2(.35,.445); trans=vec2(.0043,-.0034)+look*.0053; rot=radians(-.12+idle2*.16); scale=1.0047; shadowOffset=vec2(.0051,.0073); shadowOpacity=.20; depth=.84;
}

float layerAlphaAt(int id, vec2 artUv, vec2 destinationOffset) {
  vec2 pivot, trans, shadowOffset;
  float rot, scale, shadowOpacity, depth;
  layerParams(id, pivot, trans, rot, scale, shadowOffset, shadowOpacity, depth);
  vec2 tuv = inverseLayer(artUv + destinationOffset, pivot, trans, rot, scale);
  vec4 ink = texture(uInk, tuv);
  return ink.a * regionById(id, tuv);
}

void compositeLayer(inout vec3 color, int id, vec2 artUv, float outside) {
  vec2 pivot, trans, shadowOffset;
  float rot, scale, shadowOpacity, depth;
  layerParams(id, pivot, trans, rot, scale, shadowOffset, shadowOpacity, depth);

  vec2 shadowArtOffset = shadowOffset * vec2(1.0, 1.72);
  float shadow = layerAlphaAt(id, artUv, shadowArtOffset);
  shadow = smoothstep(.025, .72, shadow) * shadowOpacity * outside;
  color *= 1.0 - shadow;

  vec2 tuv = inverseLayer(artUv, pivot, trans, rot, scale);
  vec4 tex = texture(uInk, tuv);
  float region = regionById(id, tuv);
  float alpha = tex.a * region * outside;

  vec3 layerColor = tex.rgb * vec3(.51,.585,.60) + vec3(.008,.012,.014);
  float originalLuma = dot(tex.rgb, vec3(.299,.587,.114));
  layerColor += originalLuma * vec3(.018,.022,.020);

  vec2 edgeOffset = vec2(2.2 / 1450.0, 2.2 / 1450.0);
  vec2 edgeUv = tuv - edgeOffset;
  float edgeAlpha = texture(uInk, edgeUv).a * regionById(id, edgeUv);
  float rim = max(edgeAlpha - tex.a * region, 0.0) * depth * outside;
  layerColor += rim * vec3(.085,.095,.088);

  color = mix(color, layerColor, clamp(alpha, 0.0, 1.0));
}
void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 artUv = screenToArt(s, aspect);
  vec4 source = texture(uSource, artUv);
  vec4 clean = texture(uClean, artUv);
  vec4 inkBase = texture(uInk, artUv);
  vec4 regionC = texture(uRegionsC, artUv);

  vec2 lp = s - uLantern;
  lp.x *= aspect;
  float organic = (fbm(s * vec2(4.0,3.0) + uTime * .012) - .5) * .075;
  float dist = length(lp / vec2(.405, .39)) + organic;
  float light = (1.0 - smoothstep(.34, .98, dist)) * uIntro;
  float core = (1.0 - smoothstep(.10, .58, dist)) * uIntro;
  float outside = pow(clamp(1.0 - light * 1.04, 0.0, 1.0), 1.24);

  vec3 n = nightGrade(source.rgb, s);
  vec3 d = dayGrade(source.rgb, core);
  vec3 color = mix(n, d, light);
  color += max(light - core, 0.0) * vec3(.034,.017,-.004);

  float characterUnion = inkBase.a * regionC.a;
  vec3 cleanNight = nightGrade(clean.rgb, s);
  color = mix(color, cleanNight, clamp(characterUnion * outside,0.0,1.0));

  for (int i = 0; i < 9; i++) compositeLayer(color, i, artUv, outside);

  // Ink eyes acquire attention in darkness without becoming neon.
  vec2 facePivot, faceTrans, faceShadow;
  float faceRot, faceScale, faceOpacity, faceDepth;
  layerParams(8, facePivot, faceTrans, faceRot, faceScale, faceShadow, faceOpacity, faceDepth);
  vec2 faceUv = inverseLayer(artUv, facePivot, faceTrans, faceRot, faceScale);
  vec4 faceMasks = texture(uRegionsC, faceUv);
  float eyes = (faceMasks.g + faceMasks.b) * texture(uInk, faceUv).a * outside;
  color += eyes * vec3(.105,.062,.006);

  float character = characterUnion;
  float band = exp(-pow((light-.50)/.045,2.0)) * character;
  color = mix(color, vec3(.91,.76,.50), band * light * .12);
  color = mix(color, vec3(.18,.285,.30), band * outside * .12);

  float curve = 1.0 - .052 * pow((s.x-.5)*1.82,2.0) - .029 * pow((s.y-.5)*1.72,2.0);
  float fold = 1.0 - .011 * exp(-pow((s.y-(.79+.005*sin(s.x*PI*2.7)))/.013,2.0));
  color *= curve * fold;

  float grain = hash21(gl_FragCoord.xy + floor(uTime*18.0)) - .5;
  color += grain * .007;
  color = clamp(color,0.0,1.0);
  outColor = vec4(color,1.0);
}
