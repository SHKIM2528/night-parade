#version 300 es
precision highp float;
precision highp int;

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
uniform int uPart;

out vec2 vArtUv;
out float vLift;
out float vWake;
out float vOutside;
out float vMask;
out float vPart;

mat2 rotation(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec2 artToScreen(vec2 art,float aspect){float crop=.988;if(aspect>=1.0)return vec2(.5+(art.x-.5)/crop,.5+(art.y-.463)*aspect/crop);return vec2(.5+(art.x-.435)/(crop*aspect),.5+(art.y-.49)/crop);}
vec2 screenToArt(vec2 s,float aspect){float crop=.988;if(aspect>=1.0)return vec2(.5+(s.x-.5)*crop,.463+(s.y-.5)*(crop/aspect));return vec2(.435+(s.x-.5)*(crop*aspect),.49+(s.y-.5)*crop);}

float rawMask(int id,vec2 uv){
  vec4 a=texture(uRegionsA,uv);vec4 b=texture(uRegionsB,uv);vec4 c=texture(uRegionsC,uv);
  if(id==0)return a.r;
  if(id==1)return a.g;
  if(id==2)return a.b;
  if(id==3)return a.a;
  if(id==4)return b.r;
  if(id==5)return b.g;
  if(id==6)return b.b;
  if(id==7)return b.a;
  return c.r;
}
float partMask(int id,vec2 uv){
  vec4 a=texture(uRegionsA,uv);vec4 b=texture(uRegionsB,uv);vec4 c=texture(uRegionsC,uv);
  float m=rawMask(id,uv);
  // Remove foreground regions from underlying paper pieces so seams read as hinges, not duplicate stickers.
  if(id==0)m*=1.0-clamp(max(max(max(b.r,b.g),max(b.b,b.a)),c.r)*.92,0.0,1.0);
  if(id==1)m*=1.0-clamp(max(max(max(b.r,b.g),max(b.b,b.a)),c.r)*.82,0.0,1.0);
  if(id==2)m*=1.0-clamp(max(max(max(b.r,b.g),max(b.b,b.a)),c.r)*.82,0.0,1.0);
  if(id==3)m*=1.0-clamp(max(max(max(b.r,b.g),max(b.b,b.a)),c.r)*.76,0.0,1.0);
  if(id==4)m*=1.0-clamp(max(max(b.g,b.b),max(b.a,c.r))*.78,0.0,1.0);
  if(id==5)m*=1.0-clamp(max(max(b.b,b.a),c.r)*.72,0.0,1.0);
  if(id==6)m*=1.0-clamp(max(b.a,c.r)*.62,0.0,1.0);
  if(id==7)m*=1.0-c.r*.46;
  return smoothstep(.18,.72,clamp(m,0.0,1.0));
}
float partWake(int id){
  if(id==0)return uWakeA.x;
  if(id==1)return uWakeA.y;
  if(id==2)return uWakeA.z;
  if(id==3)return uWakeA.w;
  if(id==4)return uWakeB.x;
  if(id==5)return uWakeB.y;
  if(id==6)return uWakeB.z;
  if(id==7)return uWakeB.w;
  return uWakeC.x;
}
float partDepth(int id){
  if(id==0)return .20;
  if(id==1||id==2)return .27;
  if(id==3)return .38;
  if(id==4)return .53;
  if(id==5)return .69;
  if(id==6)return .79;
  if(id==7)return .92;
  return 1.04;
}
float simpleLantern(vec2 screen,float aspect){
  vec2 velocity=uMotion.zw;velocity.x*=aspect;float speed=min(length(velocity),2.65);
  vec2 dir=velocity/max(length(velocity),.0001);if(speed<.025)dir=normalize(vec2(.82,.36));
  vec2 lp=screen-uLantern;lp.x*=aspect;vec2 q=rotation(-atan(dir.y,dir.x))*lp;
  q/=vec2(.286+speed*.030,.315-min(speed,1.5)*.013);
  float a=atan(q.y,q.x);float contour=1.0+.060*sin(a*3.0+.72)+.032*sin(a*5.0-1.35)+.018*sin(a*9.0+.15);
  return(1.0-smoothstep(.50,1.04,length(q)/contour))*uIntro;
}
vec2 around(vec2 p,vec2 pivot,float angle,float scale){return pivot+rotation(angle)*(p-pivot)*scale;}

void partTransform(int id,inout vec2 p,float activation,float lookX,float lookY,float idle,float idle2,float breath,float wakePulse,float recoil){
  if(id==0){
    p=around(p,vec2(.267,.576),radians(-.7+idle*.45)*activation,1.0+.006*activation);
    p+=vec2(-.0045,.005+breath*.0015)*activation;
  }else if(id==1){
    p=around(p,vec2(.458,.673),radians(-3.2+idle2*1.8)*activation,1.0+.012*activation);
    p+=vec2(-.007,.008)*activation;
  }else if(id==2){
    p=around(p,vec2(.603,.677),radians(3.5-idle*1.9)*activation,1.0+.012*activation);
    p+=vec2(.008,.007)*activation;
  }else if(id==3){
    p=around(p,vec2(.592,.344),radians(.8+idle*.65)*activation,1.0+(breath*.004+.007)*activation);
    p+=vec2(.006,-.005+breath*.002)*activation;
  }else if(id==4){
    vec2 pivot=vec2(.690,.470);
    p=around(p,pivot,radians(2.8+idle2*2.2-lookX*1.2)*activation,1.0+.013*activation);
    float along=p.y-pivot.y;
    p.x+=sin(along*35.0+uTime*.88)*.0038*activation*exp(-abs(p.x-pivot.x)*8.0);
    p+=vec2(.009,-.007)*activation;
  }else if(id==5){
    vec2 pivot=vec2(.535,.470);
    p=around(p,pivot,radians(-6.0+idle*2.2-wakePulse*5.0+recoil*11.0)*activation,1.0+.020*activation);
    p+=vec2(-.015,-.010-wakePulse*.010)*activation;
  }else if(id==6){
    vec2 pivot=vec2(.420,.375);
    p=around(p,pivot,radians(lookX*5.2+idle2*1.0-wakePulse*3.0+recoil*12.0)*activation,1.0+.024*activation);
    p+=vec2(lookX*.010,-.014+lookY*.004-wakePulse*.009)*activation;
  }else if(id==7){
    vec2 pivot=vec2(.455,.285);
    p=around(p,pivot,radians(-lookX*4.5+idle*3.2-wakePulse*6.0+recoil*15.0)*activation,1.0+.030*activation);
    float along=p.y-pivot.y;
    p.x+=sin(along*44.0+uTime*1.44)*.0052*activation*exp(-abs(p.x-pivot.x)*7.0);
    p+=vec2(-lookX*.007,-.019-wakePulse*.011)*activation;
  }else{
    vec2 pivot=vec2(.350,.455);
    p=around(p,pivot,radians(lookX*3.4+idle*.6-wakePulse*2.4+recoil*8.0)*activation,1.0+.026*activation);
    p+=vec2(lookX*.011,-.017+lookY*.004-wakePulse*.010)*activation;
    vec2 jawLocal=p-vec2(.378,.505);
    float jaw=exp(-dot(jawLocal*vec2(17.0,25.0),jawLocal*vec2(17.0,25.0)));
    p.y+=jaw*activation*(.004+sin(uTime*1.04+.7)*.0025+wakePulse*.0035);
  }
}

void main(){
  float aspect=uResolution.x/max(uResolution.y,1.0);
  vec2 originalScreen=artToScreen(aArtUv,aspect);
  float outside=pow(clamp(1.0-simpleLantern(originalScreen,aspect)*1.04,0.0,1.0),1.06);
  float mask=partMask(uPart,aArtUv);
  float wake=partWake(uPart)*(1.0-uReducedMotion);
  float activation=wake*outside;
  float depth=partDepth(uPart);
  vec2 lanternArt=screenToArt(uLantern,aspect);
  vec2 face=vec2(.342,.450);
  vec2 gaze=lanternArt-face;
  float lookX=clamp(gaze.x*2.8,-1.0,1.0);
  float lookY=clamp(gaze.y*2.3,-1.0,1.0);
  float idle=sin(uTime*.72),idle2=sin(uTime*.97+1.4),breath=sin(uTime*1.18);
  float wakePulse=uEvent.x,recoil=uMotion.x;

  vec2 p=aArtUv;
  float rootWake=clamp((uWakeA.w+uWakeB.x+uWakeB.y)*.34,0.0,1.0)*outside;
  p=around(p,vec2(.535,.590),radians(idle*.38+lookX*.24)*rootWake,1.0+(breath*.0032+.0038)*rootWake);
  p+=vec2(lookX*.0015,-.0020+breath*.0012)*rootWake;
  partTransform(uPart,p,activation,lookX,lookY,idle,idle2,breath,wakePulse,recoil);

  float lift=depth*activation*(1.0+wakePulse*.42+recoil*.36);
  vec2 screen=artToScreen(p,aspect);
  vec2 faceScreen=artToScreen(face,aspect);
  screen+=(screen-faceScreen)*lift*.019;
  screen.y-=lift*.0065;

  if(uPass<1.5){
    float farPass=1.0-step(.5,uPass);
    screen+=normalize(vec2(.70,1.0))*lift*mix(.008,.019,farPass);
  }

  vArtUv=aArtUv;
  vLift=lift;
  vWake=wake;
  vOutside=outside;
  vMask=mask;
  vPart=float(uPart);
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0,1);
}
