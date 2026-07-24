#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uClean;
uniform sampler2D uInk;
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

in vec2 vUv;
out vec4 outColor;

#define PI 3.141592653589793

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise21(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x), mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v=0.0,a=.5; mat2 r=mat2(.8,.6,-.6,.8);
  for(int i=0;i<4;i++){v+=a*noise21(p);p=r*p*2.03+11.7;a*=.5;} return v;
}
vec2 screenToArt(vec2 s,float aspect){
  float crop=.988;
  if(aspect>=1.0)return vec2(.5+(s.x-.5)*crop,.463+(s.y-.5)*(crop/aspect));
  return vec2(.435+(s.x-.5)*(crop*aspect),.49+(s.y-.5)*crop);
}
vec3 nightGrade(vec3 c,vec2 s){
  float l=dot(c,vec3(.299,.587,.114)); vec3 n=mix(vec3(l),c,.43)*vec3(.355,.405,.412)+vec3(.004,.011,.013);
  vec2 q=(s-.5)/vec2(.72,.66); return n*(1.0-.145*clamp(dot(q,q),0.0,1.0));
}
vec3 dayGrade(vec3 c,float core){vec3 w=c*vec3(1.035,1.018,.972)+vec3(.008,.004,0);return mix(c,w,.46+core*.24);}
mat2 rotation(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

void lanternField(vec2 s,vec2 artUv,float aspect,out float light,out float core,out float halo,out float signedDistance){
  vec2 velocity=uMotion.zw;velocity.x*=aspect;float speed=min(length(velocity),2.65);
  vec2 dir=velocity/max(length(velocity),.0001);if(speed<.025)dir=normalize(vec2(.82,.36));
  vec2 lp=s-uLantern;lp.x*=aspect;vec2 q=rotation(-atan(dir.y,dir.x))*lp;
  q/=vec2(.292+speed*.026,.318-min(speed,1.5)*.012);
  float a=atan(q.y,q.x);float contour=1.0+.050*sin(a*3.0+.72)+.028*sin(a*5.0-1.35)+.016*sin(a*9.0+.15);
  float fibers=(fbm(artUv*vec2(20.0,76.0)+vec2(uTime*.006,0))-.5)*.058;
  float lines=(noise21(vec2(artUv.x*11.0,artUv.y*185.0))-.5)*.024;
  float dMain=length(q)/contour+fibers+lines;
  vec2 trail=(q+vec2(.22+speed*.055,-.035*sin(uTime*.6)))/vec2(1.18,.91);
  float d=min(dMain,length(trail)+fibers*.55+.055);
  light=(1.0-smoothstep(.53,1.04,d))*uIntro;core=(1.0-smoothstep(.10,.58,d))*uIntro;
  halo=(1.0-smoothstep(.88,1.34,d))*uIntro;signedDistance=d-.81;
}

void main(){
  vec2 s=vec2(vUv.x,1.0-vUv.y);float aspect=uResolution.x/max(uResolution.y,1.0);vec2 artUv=screenToArt(s,aspect);
  float light,core,halo,lanternDistance;lanternField(s,artUv,aspect,light,core,halo,lanternDistance);
  float outside=pow(clamp(1.0-light*1.035,0.0,1.0),1.12);vec2 px=vec2(1.0/1450.0);
  float u0=texture(uRegionsC,artUv).a*texture(uInk,artUv).a;
  float uL=texture(uRegionsC,artUv-vec2(px.x*3.0,0)).a*texture(uInk,artUv-vec2(px.x*3.0,0)).a;
  float uR=texture(uRegionsC,artUv+vec2(px.x*3.0,0)).a*texture(uInk,artUv+vec2(px.x*3.0,0)).a;
  float uU=texture(uRegionsC,artUv-vec2(0,px.y*3.0)).a*texture(uInk,artUv-vec2(0,px.y*3.0)).a;
  float uD=texture(uRegionsC,artUv+vec2(0,px.y*3.0)).a*texture(uInk,artUv+vec2(0,px.y*3.0)).a;
  vec2 grad=vec2(uR-uL,uD-uU);float edge=clamp(length(grad)*2.4,0.0,1.0);vec2 edgeNormal=grad/max(length(grad),.0001);
  float globalWake=clamp(uEvent.z,0.0,1.0)*(1.0-uReducedMotion);vec2 fromFace=artUv-vec2(.322,.424);
  float radius=length(fromFace*vec2(1.0,1.18));float env=exp(-radius*17.0);
  float recoilRipple=sin(radius*205.0-uTime*20.0)*env*uMotion.x;
  float pinRipple=sin(radius*235.0-uTime*27.0)*env*uEvent.w;
  vec4 rb=texture(uRegionsB,artUv);float front=clamp(rb.g*.42+rb.b*.92+rb.a*.82+texture(uRegionsC,artUv).r*1.08,0.0,1.0);
  float focus=mix(.10,1.0,smoothstep(.03,.42,front));float eventLift=max(uEvent.x*.72,max(uMotion.x*.85,uEvent.w*.62));
  float paperLift=edge*outside*focus*(globalWake*.10+eventLift);
  vec2 sampleUv=artUv+edgeNormal*(paperLift*.00130+recoilRipple*.00082+pinRipple*.00055);
  vec4 source=texture(uSource,sampleUv),clean=texture(uClean,sampleUv);
  vec3 color=mix(nightGrade(source.rgb,s),dayGrade(source.rgb,core),light)+halo*(1.0-light)*vec3(.015,.008,.001);
  color=mix(color,nightGrade(clean.rgb,s),clamp(u0*outside,0.0,1.0));
  float grazing=dot(normalize(vec3(-grad*8.5,1.0)),normalize(vec3(-.58,-.42,.86)));
  float tension=edge*outside*focus*(globalWake*.055+eventLift*.88);
  color+=tension*max(grazing,0.0)*vec3(.030,.026,.019);color*=1.0-tension*max(-grazing,0.0)*.10;
  color+=(recoilRipple*.014+pinRipple*.010)*vec3(.88,.78,.56);
  float frontier=exp(-pow(lanternDistance/.075,2.0))*edge;
  color+=frontier*light*vec3(.085,.051,.020);color*=1.0-frontier*outside*.13;
  float curve=1.0-.038*pow((s.x-.5)*1.82,2.0)-.024*pow((s.y-.5)*1.72,2.0);
  float fold=1.0-.009*exp(-pow((s.y-(.79+.005*sin(s.x*PI*2.7)))/.013,2.0));color*=curve*fold;
  color+=(hash21(gl_FragCoord.xy+floor(uTime*18.0))-.5)*.0048;
  outColor=vec4(clamp(color,0.0,1.0),1.0);
}
