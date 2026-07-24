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

float sampleHero(vec2 uv){return texture(uInk,uv).a*texture(uRegionsC,uv).a;}
vec3 creatureGrade(vec3 c){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,.57)*vec3(.575,.625,.620)+vec3(.006,.011,.011);}

void main(){
  vec4 ink=texture(uInk,vArtUv);float heroAlpha=ink.a*vHero;if(heroAlpha<.003||vOutside<.002)discard;
  vec2 px=vec2(1.0/1450.0);
  if(uPass<1.5){
    float farPass=1.0-step(.5,uPass),radius=mix(3.2,7.0,farPass),blur=heroAlpha;
    blur+=sampleHero(vArtUv+vec2(px.x*radius,0));blur+=sampleHero(vArtUv-vec2(px.x*radius,0));
    blur+=sampleHero(vArtUv+vec2(0,px.y*radius));blur+=sampleHero(vArtUv-vec2(0,px.y*radius));
    blur+=sampleHero(vArtUv+vec2(px.x,px.y)*radius*.72);blur+=sampleHero(vArtUv+vec2(-px.x,px.y)*radius*.72);
    blur=smoothstep(.025,.64,blur/7.0);float opacity=mix(.135,.055,farPass)*vLift*vOutside;
    outColor=vec4(mix(vec3(.020,.030,.031),vec3(.010,.016,.017),farPass),blur*opacity);return;
  }

  vec3 color=creatureGrade(ink.rgb);vec3 normal=normalize(vec3(-dFdx(vLift)*62.0,dFdy(vLift)*62.0,1.0));
  vec3 key=normalize(vec3(-.48,-.62,.88));float diffuse=dot(normal,key);
  color*=.86+max(diffuse,0.0)*.26+min(diffuse,0.0)*.08;color*=1.0+vLift*.055;
  float aR=sampleHero(vArtUv+vec2(px.x*2.0,0)),aL=sampleHero(vArtUv-vec2(px.x*2.0,0));
  float aD=sampleHero(vArtUv+vec2(0,px.y*2.0)),aU=sampleHero(vArtUv-vec2(0,px.y*2.0));
  vec2 edgeGrad=vec2(aR-aL,aD-aU);float edge=clamp(length(edgeGrad)*2.0,0.0,1.0);
  float grazing=dot(normalize(vec3(-edgeGrad*8.0,1.0)),key);
  color+=edge*vLift*max(grazing,0.0)*vec3(.020,.024,.020);color*=1.0-edge*vLift*max(-grazing,0.0)*.075;

  float aspect=uResolution.x/max(uResolution.y,1.0),crop=.988;
  vec2 lanternArt=aspect>=1.0?vec2(.5+(uLantern.x-.5)*crop,.463+(uLantern.y-.5)*crop/aspect):vec2(.435+(uLantern.x-.5)*crop*aspect,.49+(uLantern.y-.5)*crop);
  vec2 gaze=lanternArt-vec2(.3276,.4190);gaze=gaze/max(length(gaze),.0001)*min(length(gaze),.019)*.30;
  vec4 faceMasks=texture(uRegionsC,vArtUv);
  float leftPupil=(1.0-smoothstep(.0048,.0090,length(vArtUv-(vec2(.300,.4207)+gaze))))*faceMasks.g;
  float rightPupil=(1.0-smoothstep(.0048,.0090,length(vArtUv-(vec2(.3552,.4172)+gaze))))*faceMasks.b;
  float attention=clamp(uEvent.y*vOutside*1.35,0.0,1.0);color=mix(color,vec3(.018,.023,.021),(leftPupil+rightPupil)*attention*.88);
  float glint=(1.0-smoothstep(.0012,.0028,length(vArtUv-(vec2(.298,.418)+gaze*.72))))+(1.0-smoothstep(.0012,.0028,length(vArtUv-(vec2(.353,.415)+gaze*.72))));
  color+=glint*attention*vec3(.070,.054,.018);
  color+=uEvent.x*vLift*vec3(.025,.030,.025)+uMotion.x*vLift*vec3(.024,.018,.009);
  float alpha=heroAlpha*vOutside*smoothstep(0.0,.065,vWake+vLift);
  outColor=vec4(clamp(color,0.0,1.0),clamp(alpha,0.0,1.0));
}
