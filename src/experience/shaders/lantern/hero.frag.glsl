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
uniform vec4 uWakeA;
uniform vec4 uWakeB;
uniform vec4 uWakeC;
uniform vec4 uMotion; // shock, pointer speed, velocity x, velocity y

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

vec2 inverseLayer(vec2 uv, vec2 pivot, vec2 translate, float rotation, float scale) {
  vec2 p = uv - pivot - translate;
  float c = cos(-rotation);
  float s = sin(-rotation);
  p = mat2(c, -s, s, c) * p;
  return p / scale + pivot;
}

vec3 nightGrade(vec3 c, vec2 s) {
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 restrained = mix(vec3(luma), c, .36);
  vec3 n = restrained * vec3(.325, .365, .375) + vec3(.005, .012, .014);
  vec2 q = (s - .5) / vec2(.70, .64);
  float vignette = 1.0 - .15 * clamp(dot(q, q), 0.0, 1.0);
  return n * vignette;
}

vec3 creatureGrade(vec3 c) {
  float luma = dot(c, vec3(.299,.587,.114));
  vec3 restrained = mix(vec3(luma), c, .47);
  return restrained * vec3(.40,.455,.465) + vec3(.006,.011,.012);
}

vec3 dayGrade(vec3 c, float core) {
  vec3 warm = c * vec3(1.035, 1.018, .972) + vec3(.008,.004,0.0);
  return mix(c, warm, .45 + core * .24);
}

float wakeById(int id) {
  if (id == 0) return uWakeA.x;
  if (id == 1) return uWakeA.y;
  if (id == 2) return uWakeA.z;
  if (id == 3) return uWakeA.w;
  if (id == 4) return uWakeB.x;
  if (id == 5) return uWakeB.y;
  if (id == 6) return uWakeB.z;
  if (id == 7) return uWakeB.w;
  return uWakeC.x;
}

float regionById(int id, vec2 uv) {
  if (id <= 3) {
    vec4 a = texture(uRegionsA, uv);
    if (id == 0) return a.r;
    if (id == 1) return a.g;
    if (id == 2) return a.b;
    return a.a;
  }
  if (id <= 7) {
    vec4 b = texture(uRegionsB, uv);
    if (id == 4) return b.r;
    if (id == 5) return b.g;
    if (id == 6) return b.b;
    return b.a;
  }
  return texture(uRegionsC, uv).r;
}

void layerParams(
  int id,
  float aspect,
  out vec2 pivot,
  out vec2 trans,
  out float rot,
  out float scale,
  out vec2 shadowOffset,
  out float shadowOpacity,
  out float depth
) {
  float wake = wakeById(id) * (1.0 - uReducedMotion);
  vec2 lanternArt = screenToArt(uLantern, aspect);
  vec2 face = vec2(.322,.424);
  vec2 away = face - lanternArt;
  float awayLen = max(length(away), .0001);
  away /= awayLen;

  float idle = sin(uTime * .72);
  float idle2 = sin(uTime * 1.07 + 1.4);
  float breath = sin(uTime * 1.18);
  float shock = uMotion.x;

  vec2 baseTrans = vec2(0.0);
  float baseRot = 0.0;
  float baseScale = 1.0;
  float baseShadow = 0.0;
  depth = 0.0;
  pivot = vec2(.5);

  if (id == 0) { pivot=vec2(.267,.576); baseTrans=vec2(-.002,.003); baseRot=-.25+idle*.18; baseScale=1.002; baseShadow=.12; depth=.26; }
  else if (id == 1) { pivot=vec2(.458,.673); baseTrans=vec2(-.003,.006); baseRot=-.75+idle2*.48; baseScale=1.004; baseShadow=.16; depth=.38; }
  else if (id == 2) { pivot=vec2(.603,.677); baseTrans=vec2(.004,.005); baseRot=.82-idle*.52; baseScale=1.004; baseShadow=.17; depth=.42; }
  else if (id == 3) { pivot=vec2(.592,.344); baseTrans=vec2(.006,-.004); baseRot=.45+idle*.42; baseScale=1.010+breath*.0035; baseShadow=.20; depth=.58; }
  else if (id == 4) { pivot=vec2(.612,.402); baseTrans=vec2(.010,-.005); baseRot=1.10+idle2*.72; baseScale=1.012; baseShadow=.23; depth=.70; }
  else if (id == 5) { pivot=vec2(.472,.494); baseTrans=vec2(-.010,-.008); baseRot=2.05+idle*.95; baseScale=1.013; baseShadow=.26; depth=.82; }
  else if (id == 6) { pivot=vec2(.334,.256); baseTrans=vec2(-.007,-.012); baseRot=-1.15+idle2*.70; baseScale=1.012; baseShadow=.25; depth=.78; }
  else if (id == 7) { pivot=vec2(.373,.261); baseTrans=vec2(-.012,-.016); baseRot=-1.95+idle*.95; baseScale=1.018; baseShadow=.29; depth=.96; }
  else { pivot=vec2(.322,.424); baseTrans=vec2(-.010,-.008); baseRot=-.72+idle2*.42; baseScale=1.014; baseShadow=.28; depth=.88; }

  float frontResponse = step(5.5, float(id));
  float flinch = shock * frontResponse;
  baseTrans += away * depth * (.0065 + flinch * .016);
  baseTrans.y -= flinch * depth * .004;
  baseRot += sign(away.x) * flinch * depth * 4.2;

  trans = baseTrans * wake;
  rot = radians(baseRot) * wake;
  scale = mix(1.0, baseScale, wake);
  vec2 moon = normalize(vec2(.72,1.0) + away * .18);
  shadowOffset = moon * depth * (.007 + flinch * .005) * wake;
  shadowOpacity = baseShadow * wake;
}

vec2 secondaryWarp(vec2 uv, int id, vec2 pivot, float wake, float depth) {
  if (wake <= .0001 || uReducedMotion > .5) return uv;
  vec2 local = uv - pivot;
  float radial = exp(-dot(local,local) * 95.0);
  if (id == 7) {
    uv.x += sin(local.y * 74.0 + uTime * 1.65) * .0032 * wake * radial;
    uv.y += sin(local.x * 62.0 - uTime * 1.30) * .0019 * wake * radial;
  } else if (id == 4) {
    uv.x += sin(local.y * 48.0 + uTime * .82) * .0018 * wake * radial;
  } else if (id == 5) {
    uv.y += sin(local.x * 58.0 + uTime * 1.05) * .0015 * wake * radial;
  } else if (id == 3) {
    uv.y += sin(uTime * 1.18) * .0014 * wake * radial;
  }
  return uv;
}

float layerAlphaAt(int id, vec2 artUv, vec2 destinationOffset, float aspect) {
  vec2 pivot, trans, shadowOffset;
  float rot, scale, shadowOpacity, depth;
  layerParams(id, aspect, pivot, trans, rot, scale, shadowOffset, shadowOpacity, depth);
  vec2 tuv = inverseLayer(artUv + destinationOffset, pivot, trans, rot, scale);
  tuv = secondaryWarp(tuv, id, pivot, wakeById(id), depth);
  vec4 ink = texture(uInk, tuv);
  return ink.a * regionById(id, tuv);
}

void compositeLayer(inout vec3 color, int id, vec2 artUv, float outside, float aspect) {
  vec2 pivot, trans, shadowOffset;
  float rot, scale, shadowOpacity, depth;
  layerParams(id, aspect, pivot, trans, rot, scale, shadowOffset, shadowOpacity, depth);
  float wake = wakeById(id);

  float shadow = layerAlphaAt(id, artUv, shadowOffset, aspect);
  shadow = smoothstep(.018,.72,shadow) * shadowOpacity * outside;
  color *= 1.0 - shadow;

  vec2 tuv = inverseLayer(artUv, pivot, trans, rot, scale);
  tuv = secondaryWarp(tuv, id, pivot, wake, depth);
  vec4 tex = texture(uInk, tuv);
  float region = regionById(id, tuv);
  float alpha = tex.a * region * outside;

  vec3 layerColor = creatureGrade(tex.rgb);
  vec2 px = vec2(1.8 / 1450.0, 1.8 / 1450.0);
  float aR = texture(uInk, tuv + vec2(px.x,0)).a;
  float aD = texture(uInk, tuv + vec2(0,px.y)).a;
  vec2 grad = vec2(aR-tex.a,aD-tex.a);
  float edge = clamp(length(grad) * 1.9,0.0,1.0);
  vec3 fauxNormal = normalize(vec3(-grad * (5.0 + depth * 9.0), 1.0));
  float relief = dot(fauxNormal, normalize(vec3(-.42,-.58,.85)));
  layerColor *= .94 + relief * edge * (.16 + depth * .08) * wake;
  layerColor += edge * wake * depth * vec3(.018,.025,.024);

  color = mix(color, layerColor, clamp(alpha,0.0,1.0));
}

float circle(vec2 uv, vec2 c, float r, float feather) {
  return 1.0 - smoothstep(r-feather,r,length(uv-c));
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
  vec2 velocity = uMotion.zw;
  velocity.x *= aspect;
  float speed = min(length(velocity),2.5);
  vec2 trailDir = velocity / max(length(velocity),.0001);
  float organic = (fbm(s * vec2(5.3,4.1) + uTime * .018) - .5) * .065;
  float distMain = length(lp / vec2(.300,.315));
  float distTrail = length((lp + trailDir * speed * .018) / vec2(.335,.295));
  float dist = min(distMain, distTrail + .045) + organic;
  float light = (1.0 - smoothstep(.29,.99,dist)) * uIntro;
  float core = (1.0 - smoothstep(.05,.54,dist)) * uIntro;
  float halo = (1.0 - smoothstep(.72,1.30,dist)) * uIntro;
  float outside = pow(clamp(1.0 - light * 1.035,0.0,1.0),1.15);

  vec3 night = nightGrade(source.rgb,s);
  vec3 day = dayGrade(source.rgb,core);
  vec3 color = mix(night,day,light);
  color += halo * (1.0-light) * vec3(.014,.008,.001);

  float characterUnion = inkBase.a * regionC.a;
  vec3 cleanNight = nightGrade(clean.rgb,s);
  color = mix(color,cleanNight,clamp(characterUnion*outside,0.0,1.0));

  for (int i=0;i<9;i++) compositeLayer(color,i,artUv,outside,aspect);

  // Eyes lock onto the lantern in darkness; the historical pupils remain untouched in light.
  vec2 facePivot, faceTrans, faceShadow;
  float faceRot, faceScale, faceOpacity, faceDepth;
  layerParams(8,aspect,facePivot,faceTrans,faceRot,faceScale,faceShadow,faceOpacity,faceDepth);
  vec2 faceUv = inverseLayer(artUv,facePivot,faceTrans,faceRot,faceScale);
  vec4 faceMasks = texture(uRegionsC,faceUv);
  vec2 lanternArt = screenToArt(uLantern,aspect);
  vec2 eyeMid = vec2(.3276,.4190);
  vec2 gaze = lanternArt-eyeMid;
  gaze = gaze / max(length(gaze),.0001) * min(length(gaze),.018) * .28;
  float leftPupil = circle(faceUv,vec2(.300,.4207)+gaze,.0083,.0030) * faceMasks.g;
  float rightPupil = circle(faceUv,vec2(.3552,.4172)+gaze,.0083,.0030) * faceMasks.b;
  float eyeWake = uWakeC.x * outside;
  color = mix(color,vec3(.022,.028,.026),(leftPupil+rightPupil)*eyeWake*.82);
  float glint = circle(faceUv,vec2(.298,.418)+gaze*.72,.0024,.0015) + circle(faceUv,vec2(.353,.415)+gaze*.72,.0024,.0015);
  color += glint * eyeWake * vec3(.080,.064,.024);

  // The flattening frontier receives a paper lip: warm on the lit side, cool contact shadow on the living side.
  vec2 edgePx = vec2(2.4/1450.0);
  float a0 = characterUnion;
  float aN = max(max(texture(uInk,artUv+vec2(edgePx.x,0)).a,texture(uInk,artUv-vec2(edgePx.x,0)).a),
                 max(texture(uInk,artUv+vec2(0,edgePx.y)).a,texture(uInk,artUv-vec2(0,edgePx.y)).a));
  float characterEdge = clamp(aN-a0+.18*a0,0.0,1.0);
  float band = exp(-pow((light-.49)/.080,2.0)) * characterEdge;
  color += band * light * vec3(.105,.061,.018);
  color *= 1.0 - band * outside * .16;

  float curve = 1.0 - .038 * pow((s.x-.5)*1.82,2.0) - .024 * pow((s.y-.5)*1.72,2.0);
  float fold = 1.0 - .009 * exp(-pow((s.y-(.79+.005*sin(s.x*PI*2.7)))/.013,2.0));
  color *= curve*fold;

  float grain = hash21(gl_FragCoord.xy + floor(uTime*18.0))-.5;
  color += grain*.0052;
  color = clamp(color,0.0,1.0);
  outColor = vec4(color,1.0);
}
