#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uSource;
uniform sampler2D uCutout;
uniform sampler2D uRegionsA;
uniform sampler2D uRegionsB;
uniform sampler2D uRegionsC;
uniform vec2 uResolution;
uniform vec2 uLantern;
uniform float uTime;
uniform vec4 uMotion;
uniform vec4 uEvent;
uniform float uPass;
uniform int uPart;

in vec2 vArtUv;
in float vLift;
in float vWake;
in float vOutside;
in float vMask;
in float vPart;
out vec4 outColor;

float rawMask(int id,vec2 uv){
  vec4 a=texture(uRegionsA,uv);vec4 b=texture(uRegionsB,uv);vec4 c=texture(uRegionsC,uv);
  if(id==0)return a.r;if(id==1)return a.g;if(id==2)return a.b;if(id==3)return a.a;
  if(id==4)return b.r;if(id==5)return b.g;if(id==6)return b.b;if(id==7)return b.a;return c.r;
}
float partMask(int id,vec2 uv){
  vec4 a=texture(uRegionsA,uv);vec4 b=texture(uRegionsB,uv);vec4 c=texture(uRegionsC,uv);float m=rawMask(id,uv);
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
vec3 nightPaper(vec3 c){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,.74)*vec3(.73,.78,.74)+vec3(.010,.015,.013);}

void main(){
  vec2 uv=vArtUv;
  vec4 regionsC=texture(uRegionsC,uv);

  // Use the historical painted eyes themselves. Only their source coordinates move.
  if(uPart==8){
    float aspect=uResolution.x/max(uResolution.y,1.0),crop=.988;
    vec2 lanternArt=aspect>=1.0?vec2(.5+(uLantern.x-.5)*crop,.463+(uLantern.y-.5)*crop/aspect):vec2(.435+(uLantern.x-.5)*crop*aspect,.49+(uLantern.y-.5)*crop);
    vec2 gaze=lanternArt-vec2(.342,.450);gaze=gaze/max(length(gaze),.0001)*min(length(gaze),.014);
    float eyeMask=clamp(regionsC.g+regionsC.b,0.0,1.0);
    uv+=gaze*eyeMask*.58*vWake*vOutside;
    float blink=pow(max(0.0,sin(uTime*1.31+.50)),32.0)*vWake*vOutside;
    float eyeY=mix(.452,.447,step(regionsC.g,regionsC.b));
    uv.y=mix(uv.y,eyeY+(uv.y-eyeY)*.13,eyeMask*blink*.86);
  }

  vec4 source=texture(uSource,uv);
  float hero=texture(uCutout,uv).a;
  float mask=partMask(uPart,vArtUv);
  float alpha=hero*mask*vOutside*smoothstep(.012,.11,vWake+vLift);
  if(alpha<.002)discard;

  vec2 px=vec2(1.0/1450.0);
  if(uPass<1.5){
    float farPass=1.0-step(.5,uPass),radius=mix(4.8,10.5,farPass);
    float blur=hero*mask;
    vec2 o1=vec2(px.x*radius,0),o2=vec2(0,px.y*radius),o3=px*radius*.72,o4=vec2(-px.x,px.y)*radius*.72;
    blur+=texture(uCutout,vArtUv+o1).a*partMask(uPart,vArtUv+o1);
    blur+=texture(uCutout,vArtUv-o1).a*partMask(uPart,vArtUv-o1);
    blur+=texture(uCutout,vArtUv+o2).a*partMask(uPart,vArtUv+o2);
    blur+=texture(uCutout,vArtUv-o2).a*partMask(uPart,vArtUv-o2);
    blur+=texture(uCutout,vArtUv+o3).a*partMask(uPart,vArtUv+o3);
    blur+=texture(uCutout,vArtUv+o4).a*partMask(uPart,vArtUv+o4);
    blur=smoothstep(.02,.64,blur/7.0);
    float opacity=mix(.32,.10,farPass)*vLift*vOutside;
    outColor=vec4(mix(vec3(.014,.021,.021),vec3(.006,.010,.010),farPass),blur*opacity);
    return;
  }

  float mL=partMask(uPart,vArtUv-vec2(px.x*3.0,0)),mR=partMask(uPart,vArtUv+vec2(px.x*3.0,0));
  float mU=partMask(uPart,vArtUv-vec2(0,px.y*3.0)),mD=partMask(uPart,vArtUv+vec2(0,px.y*3.0));
  vec2 grad=vec2(mR-mL,mD-mU);float edge=clamp(length(grad)*2.5,0.0,1.0);
  vec2 edgeNormal=grad/max(length(grad),.0001);float lightSide=clamp(dot(edgeNormal,normalize(vec2(-.62,-.78)))*.5+.5,0.0,1.0);

  if(uPass<2.5){
    vec3 paperEdge=mix(vec3(.030,.040,.039),vec3(.40,.33,.20),lightSide)*(.58+.28*vLift);
    outColor=vec4(paperEdge,edge*alpha*min(.42,.13+vLift*.38));
    return;
  }

  vec3 color=nightPaper(source.rgb);
  vec3 fauxNormal=normalize(vec3(-dFdx(vLift)*92.0,dFdy(vLift)*92.0,1.0));
  float diffuse=dot(fauxNormal,normalize(vec3(-.44,-.58,.86)));
  color*=.82+max(diffuse,0.0)*.34+min(diffuse,0.0)*.10;
  color*=1.0+vLift*.16;
  color+=edge*vLift*lightSide*vec3(.050,.043,.030);
  color*=1.0-edge*vLift*(1.0-lightSide)*.14;
  color+=uEvent.x*vLift*vec3(.030,.034,.026)+uMotion.x*vLift*vec3(.030,.020,.008);
  outColor=vec4(clamp(color,0.0,1.0),clamp(alpha,0.0,1.0));
}
