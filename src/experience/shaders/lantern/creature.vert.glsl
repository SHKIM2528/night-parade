#version 300 es
precision highp float;

in vec2 aArtUv;

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
uniform vec4 uMotion;
uniform vec4 uEvent;
uniform float uPass;

out vec2 vArtUv;
out vec2 vScreen;
out float vLift;
out float vWake;
out float vOutside;
out float vHero;

vec2 artToScreen(vec2 art, float aspect) {
  float crop = .988;
  if (aspect >= 1.0) {
    return vec2(.5 + (art.x - .5) / crop,
                .5 + (art.y - .463) * aspect / crop);
  }
  return vec2(.5 + (art.x - .435) / (crop * aspect),
              .5 + (art.y - .49) / crop);
}

vec2 screenToArt(vec2 screen, float aspect) {
  float crop = .988;
  if (aspect >= 1.0) {
    return vec2(.5 + (screen.x - .5) * crop,
                .463 + (screen.y - .5) * crop / aspect);
  }
  return vec2(.435 + (screen.x - .5) * crop * aspect,
              .49 + (screen.y - .5) * crop);
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

mat2 rotation(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float simpleLantern(vec2 screen, float aspect) {
  vec2 velocity = uMotion.zw;
  velocity.x *= aspect;
  float speed = min(length(velocity), 2.65);
  vec2 direction = velocity / max(length(velocity), .0001);
  if (speed < .025) direction = normalize(vec2(.82, .36));

  vec2 local = screen - uLantern;
  local.x *= aspect;
  local = rotation(-atan(direction.y, direction.x)) * local;
  local /= vec2(.292 + speed * .026, .318 - min(speed, 1.5) * .012);

  float angle = atan(local.y, local.x);
  float contour = 1.0 + .050 * sin(angle * 3.0 + .72) + .028 * sin(angle * 5.0 - 1.35);
  return (1.0 - smoothstep(.50, 1.04, length(local) / contour)) * uIntro;
}

void boneData(
  int id,
  out vec2 pivot,
  out vec2 translation,
  out float angle,
  out float scale,
  out float depth,
  out float bend,
  out vec2 axis
) {
  float slow = sin(uTime * .57);
  float idle = sin(uTime * .86 + .8);
  float idle2 = sin(uTime * 1.19 + 2.1);
  float breath = sin(uTime * 1.05);

  pivot = vec2(.5);
  translation = vec2(0.0);
  angle = 0.0;
  scale = 1.0;
  depth = 0.0;
  bend = 0.0;
  axis = vec2(0.0, 1.0);

  if (id == 0) {
    pivot = vec2(.267, .576); translation = vec2(-.004, .006);
    angle = radians(-.7 + slow * .45); scale = 1.005; depth = .11; bend = .005; axis = normalize(vec2(.8, .25));
  } else if (id == 1) {
    pivot = vec2(.458, .673); translation = vec2(-.005, .009);
    angle = radians(-1.3 + idle2 * .75); scale = 1.007; depth = .16; bend = .007; axis = normalize(vec2(.25, 1.0));
  } else if (id == 2) {
    pivot = vec2(.603, .677); translation = vec2(.007, .008);
    angle = radians(1.4 - idle * .78); scale = 1.007; depth = .17; bend = .007; axis = normalize(vec2(-.2, 1.0));
  } else if (id == 3) {
    pivot = vec2(.592, .344); translation = vec2(.010, -.008);
    angle = radians(.9 + slow * .70); scale = 1.016 + breath * .005; depth = .27; bend = .010; axis = normalize(vec2(.15, 1.0));
  } else if (id == 4) {
    pivot = vec2(.612, .402); translation = vec2(.018, -.012);
    angle = radians(2.2 + idle2 * 1.15); scale = 1.020; depth = .39; bend = .020; axis = normalize(vec2(.15, 1.0));
  } else if (id == 5) {
    pivot = vec2(.472, .494); translation = vec2(-.030, -.025);
    angle = radians(7.0 + idle * 2.20); scale = 1.035; depth = .68; bend = .034; axis = normalize(vec2(1.0, .18));
  } else if (id == 6) {
    pivot = vec2(.334, .256); translation = vec2(-.022, -.035 + slow * .004);
    angle = radians(-4.2 + idle2 * 1.45); scale = 1.050; depth = .84; bend = .037; axis = normalize(vec2(.18, 1.0));
  } else if (id == 7) {
    pivot = vec2(.373, .261); translation = vec2(-.034, -.050 + slow * .006);
    angle = radians(-6.4 + idle * 2.40); scale = 1.067; depth = 1.00; bend = .052; axis = normalize(vec2(.08, 1.0));
  } else {
    pivot = vec2(.337, .438); translation = vec2(-.025, -.030 + slow * .003);
    angle = radians(-3.2 + idle2 * 1.05); scale = 1.054; depth = .95; bend = .041; axis = normalize(vec2(.35, 1.0));
  }
}

vec2 deformBone(vec2 uv, int id, float activation, vec2 lanternArt, out float z) {
  vec2 pivot;
  vec2 translation;
  vec2 axis;
  float angle;
  float scale;
  float depth;
  float bend;
  boneData(id, pivot, translation, angle, scale, depth, bend, axis);

  vec2 local = uv - pivot;
  vec2 tangent = normalize(vec2(axis.y, -axis.x));
  float along = dot(local, axis);
  float envelope = exp(-dot(local * vec2(5.1, 4.8), local * vec2(5.1, 4.8)));
  float cloth = (id == 4 || id == 7)
    ? sin(uTime * (id == 7 ? 1.72 : .94) + along * 33.0)
    : 0.0;
  float curve = bend * (along * along * sign(along + .0001) * 7.8 + cloth * .40) * envelope;
  local += tangent * curve * activation;

  vec2 transformed = rotation(angle * activation) * local;
  transformed *= mix(1.0, scale, activation);
  transformed += pivot + translation * activation;

  vec2 face = vec2(.337, .438);
  vec2 toward = lanternArt - face;
  float towardLength = max(length(toward), .0001);
  toward /= towardLength;
  vec2 away = -toward;

  float front = id >= 5 ? 1.0 : (id >= 3 ? .48 : .18);
  float attention = uEvent.y * front * activation;
  transformed += toward * attention * depth * .013;
  transformed = pivot + rotation(toward.x * attention * depth * radians(2.8)) * (transformed - pivot);

  float recoil = uMotion.x * front * activation;
  transformed += away * recoil * depth * .046;
  transformed.y -= recoil * depth * .010;
  transformed = pivot + rotation(sign(away.x) * recoil * depth * radians(12.0)) * (transformed - pivot);

  float awaken = uEvent.x * front * activation;
  transformed += vec2(-.008, -.018) * awaken * depth;
  transformed = pivot + rotation((-1.1 + float(id) * .12) * awaken * depth * .075) * (transformed - pivot);

  transformed += (uv - face) * activation * depth * front * .068;
  z = depth * activation * (1.0 + uEvent.x * front * .48 + uMotion.x * front * .42);
  return transformed;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 originalScreen = artToScreen(aArtUv, aspect);
  float outside = pow(clamp(1.0 - simpleLantern(originalScreen, aspect) * 1.04, 0.0, 1.0), 1.08);
  vec4 regionsC = texture(uRegionsC, aArtUv);
  float hero = regionsC.a;
  vec2 lanternArt = screenToArt(uLantern, aspect);

  // V04 drew new black pupils over the old painting. V05 moves the original eyes instead.
  // The eye channels in the prepared mask sit about 3% too high, so sample them lower.
  vec4 correctedEyeMasks = texture(uRegionsC, aArtUv - vec2(0.0, .030));
  float leftEye = correctedEyeMasks.g;
  float rightEye = correctedEyeMasks.b;
  float eyeWeight = clamp(leftEye + rightEye, 0.0, 1.0);
  float faceWake = uWakeC.x * outside * (1.0 - uReducedMotion);

  vec2 eyeMid = vec2(.342, .450);
  vec2 gaze = lanternArt - eyeMid;
  gaze = gaze / max(length(gaze), .0001) * min(length(gaze), .010);

  vec2 articulatedUv = aArtUv + gaze * eyeWeight * faceWake * .68;
  float blinkWave = pow(max(0.0, sin(uTime * 1.34 + .55)), 28.0) * faceWake;
  float eyeCenterY = mix(.453, .448, step(leftEye, rightEye));
  articulatedUv.y = mix(
    articulatedUv.y,
    eyeCenterY + (articulatedUv.y - eyeCenterY) * .16,
    eyeWeight * blinkWave * .82
  );

  // A tiny jaw pulse makes the face read as alive even when the lantern is still.
  vec2 jawDelta = (aArtUv - vec2(.376, .493)) * vec2(19.0, 27.0);
  float jawMask = exp(-dot(jawDelta, jawDelta));
  articulatedUv.y += jawMask * faceWake * (.0025 + sin(uTime * 1.02 + .9) * .0017);

  float raw[9];
  float sum = 0.0;
  for (int i = 0; i < 9; i++) {
    raw[i] = pow(max(regionById(i, aArtUv), 0.0), 3.0);
    sum += raw[i];
  }

  vec2 deformed = articulatedUv;
  float weightedLift = 0.0;
  float weightedWake = 0.0;
  if (sum > .0001 && hero > .001) {
    vec2 delta = vec2(0.0);
    for (int i = 0; i < 9; i++) {
      float weight = raw[i] / sum;
      float activation = wakeById(i) * outside * (1.0 - uReducedMotion);
      float z;
      vec2 moved = deformBone(articulatedUv, i, activation, lanternArt, z);
      delta += (moved - articulatedUv) * weight;
      weightedLift += z * weight;
      weightedWake += activation * weight;
    }
    float skin = smoothstep(.012, .22, hero);
    deformed += delta * skin;
  }

  // Make the head/face/arm hierarchy readable instead of a single lenticular wobble.
  vec4 regionsB = texture(uRegionsB, aArtUv);
  float armWake = uWakeB.y * outside;
  float headWake = uWakeB.z * outside;
  float furWake = uWakeB.w * outside;
  float directFace = regionsC.r * faceWake;
  float directHead = regionsB.b * headWake;
  float directFur = regionsB.a * furWake;
  float directArm = regionsB.g * armWake;
  float turn = clamp((lanternArt.x - eyeMid.x) * 3.2, -1.0, 1.0);
  deformed += directFace * vec2(turn * .010, -.012 - uEvent.x * .010);
  deformed += directHead * vec2(turn * .008, -.010 - uEvent.x * .008);
  deformed += directFur * vec2(-turn * .006, -.014 - uEvent.x * .010);
  deformed += directArm * vec2(-.012 - uEvent.x * .010, -.008);

  vec2 screen = artToScreen(deformed, aspect);
  if (uPass < 1.5) {
    float farPass = 1.0 - step(.5, uPass);
    float shadowScale = mix(.90, 2.10, farPass);
    screen += vec2(.0090, .0140) * weightedLift * shadowScale;
  }

  vArtUv = aArtUv;
  vScreen = screen;
  vLift = weightedLift;
  vWake = weightedWake;
  vOutside = outside;
  vHero = hero;
  gl_Position = vec4(screen.x * 2.0 - 1.0, 1.0 - screen.y * 2.0, 0.0, 1.0);
}
