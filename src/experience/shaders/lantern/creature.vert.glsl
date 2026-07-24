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

vec2 artToScreen(vec2 art,float aspect){float crop=.988;if(aspect>=1.0)return vec2(.5+(art.x-.5)/crop,.5+(art.y-.463)*aspect/crop);return vec2(.5+(art.x-.435)/(crop*aspect),.5+(art.y-.49)/crop);}
vec2 screenToArt(vec2 s,float aspect){float crop=.988;if(aspect>=1.0)return vec2(.5+(s.x-.5)*crop,.463+(s.y-.5)*(crop/aspect));return vec2(.435+(s.x-.5)*(crop*aspect),.49+(s.y-.5)*crop);}
float wakeById(int id){if(id==0)return uWakeA.x;if(id==1)return uWakeA.y;if(id==2)return uWakeA.z;if(id==3)return uWakeA.w;if(id==4)return uWakeB.x;if(id==5)return uWakeB.y;if(id==6)return uWakeB.z;if(id==7)return uWakeB.w;return uWakeC.x;}
float regionById(int id,vec2 uv){
  if(id<=3){vec4 a=texture(uRegionsA,uv);if(id==0)return a.r;if(id==1)return a.g;if(id==2)return a.b;return a.a;}
  if(id<=7){vec4 b=texture(uRegionsB,uv);if(id==4)return b.r;if(id==5)return b.g;if(id==6)return b.b;return b.a;}
  return texture(uRegionsC,uv).r;
}
mat2 rotation(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float simpleLantern(vec2 screen,float aspect){
  vec2 velocity=uMotion.zw;velocity.x*=aspect;float speed=min(length(velocity),2.65);vec2 dir=velocity/max(length(velocity),.0001);
  if(speed<.025)dir=normalize(vec2(.82,.36));vec2 lp=screen-uLantern;lp.x*=aspect;
  vec2 q=rotation(-atan(dir.y,dir.x))*lp;q/=vec2(.292+speed*.026,.318-min(speed,1.5)*.012);
  float a=atan(q.y,q.x);float contour=1.0+.050*sin(a*3.0+.72)+.028*sin(a*5.0-1.35);return(1.0-smoothstep(.50,1.04,length(q)/contour))*uIntro;
}

void boneData(int id,out vec2 pivot,out vec2 translation,out float angle,out float scale,out float depth,out float bend,out vec2 axis){
  float idle=sin(uTime*.74),idle2=sin(uTime*1.05+1.7),breath=sin(uTime*1.16);
  pivot=vec2(.5);translation=vec2(0);angle=0.0;scale=1.0;depth=0.0;bend=0.0;axis=vec2(0,1);
  if(id==0){pivot=vec2(.267,.576);translation=vec2(-.002,.004);angle=radians(-.45+idle*.24);scale=1.003;depth=.09;bend=.003;axis=normalize(vec2(.8,.25));}
  else if(id==1){pivot=vec2(.458,.673);translation=vec2(-.003,.006);angle=radians(-.85+idle2*.42);scale=1.004;depth=.13;bend=.004;axis=normalize(vec2(.25,1));}
  else if(id==2){pivot=vec2(.603,.677);translation=vec2(.004,.006);angle=radians(.95-idle*.44);scale=1.004;depth=.14;bend=.004;axis=normalize(vec2(-.2,1));}
  else if(id==3){pivot=vec2(.592,.344);translation=vec2(.006,-.004);angle=radians(.55+idle*.38);scale=1.009+breath*.002;depth=.21;bend=.006;axis=normalize(vec2(.15,1));}
  else if(id==4){pivot=vec2(.612,.402);translation=vec2(.011,-.007);angle=radians(1.35+idle2*.72);scale=1.012;depth=.31;bend=.011;axis=normalize(vec2(.15,1));}
  else if(id==5){pivot=vec2(.472,.494);translation=vec2(-.018,-.015);angle=radians(3.9+idle*1.25);scale=1.022;depth=.56;bend=.018;axis=normalize(vec2(1,.18));}
  else if(id==6){pivot=vec2(.334,.256);translation=vec2(-.013,-.021);angle=radians(-2.15+idle2*.92);scale=1.033;depth=.73;bend=.022;axis=normalize(vec2(.18,1));}
  else if(id==7){pivot=vec2(.373,.261);translation=vec2(-.021,-.031);angle=radians(-3.65+idle*1.45);scale=1.046;depth=.91;bend=.031;axis=normalize(vec2(.08,1));}
  else{pivot=vec2(.322,.424);translation=vec2(-.018,-.018);angle=radians(-1.65+idle2*.58);scale=1.040;depth=.86;bend=.024;axis=normalize(vec2(.35,1));}
}

vec2 deformBone(vec2 uv,int id,float activation,vec2 lanternArt,out float z){
  vec2 pivot,translation,axis;float angle,scale,depth,bend;boneData(id,pivot,translation,angle,scale,depth,bend,axis);
  vec2 local=uv-pivot,tangent=normalize(vec2(axis.y,-axis.x));float along=dot(local,axis);
  float envelope=exp(-dot(local*vec2(5.6,5.1),local*vec2(5.6,5.1)));
  float cloth=(id==4||id==7)?sin(uTime*(id==7?1.55:.88)+along*31.0):0.0;
  local+=tangent*bend*(along*along*sign(along+.0001)*6.2+cloth*.28)*envelope*activation;
  vec2 transformed=rotation(angle*activation)*local;transformed*=mix(1.0,scale,activation);transformed+=pivot+translation*activation;
  vec2 face=vec2(.322,.424),away=face-lanternArt;away/=max(length(away),.0001);
  float front=id>=5?1.0:(id>=3?.48:.18);float recoil=uMotion.x*front*activation;
  transformed+=away*recoil*depth*.030;transformed.y-=recoil*depth*.007;
  transformed=pivot+rotation(sign(away.x)*recoil*depth*radians(8.5))*(transformed-pivot);
  float awaken=uEvent.x*front*activation;transformed+=vec2(-.0045,-.010)*awaken*depth;
  transformed=pivot+rotation((-0.9+float(id)*.11)*awaken*depth*.045)*(transformed-pivot);
  transformed+=(uv-face)*activation*depth*front*.042;
  z=depth*activation*(1.0+uEvent.x*front*.34+uMotion.x*front*.28);return transformed;
}

void main(){
  float aspect=uResolution.x/max(uResolution.y,1.0);vec2 originalScreen=artToScreen(aArtUv,aspect);
  float outside=pow(clamp(1.0-simpleLantern(originalScreen,aspect)*1.04,0.0,1.0),1.08);
  float hero=texture(uRegionsC,aArtUv).a;vec2 lanternArt=screenToArt(uLantern,aspect);
  float raw[9];float sum=0.0;for(int i=0;i<9;i++){raw[i]=pow(max(regionById(i,aArtUv),0.0),1.16);sum+=raw[i];}
  vec2 deformed=aArtUv;float weightedLift=0.0,weightedWake=0.0;
  if(sum>.0001&&hero>.001){vec2 delta=vec2(0);for(int i=0;i<9;i++){float weight=raw[i]/sum;float activation=wakeById(i)*outside*(1.0-uReducedMotion);float z;vec2 moved=deformBone(aArtUv,i,activation,lanternArt,z);delta+=(moved-aArtUv)*weight;weightedLift+=z*weight;weightedWake+=activation*weight;}deformed+=delta*smoothstep(.02,.28,hero);}
  vec2 screen=artToScreen(deformed,aspect);if(uPass<1.5){float farPass=1.0-step(.5,uPass);screen+=vec2(.0055,.0086)*weightedLift*mix(.72,1.65,farPass);}
  vArtUv=aArtUv;vScreen=screen;vLift=weightedLift;vWake=weightedWake;vOutside=outside;vHero=hero;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0,1);
}
