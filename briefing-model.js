'use strict';

function briefingModel(canvas, models) {
  const gl = canvas.getContext('webgl2', {alpha:true, antialias:true});
  let disposed=false;
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  };
  const vertex = shader(gl.VERTEX_SHADER, `#version 300 es
    in vec3 position; in vec3 normal; in vec2 uv; uniform float angle; uniform float growth; out vec3 n; out vec3 p; out vec2 texUV;
    void main(){
      float c=cos(angle),s=sin(angle),t=.42;
      mat3 yaw=mat3(c,0.,s,0.,1.,0.,-s,0.,c);
      mat3 tilt=mat3(1.,0.,0.,0.,cos(t),sin(t),0.,-sin(t),cos(t));
      p=tilt*yaw*position; n=tilt*yaw*normal; texUV=uv;
      gl_Position=vec4(vec3(p.x*.95,-p.y*.95,p.z*.3)*growth,1.);
    }`);
  const fragment = shader(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float; in vec3 n; in vec3 p; in vec2 texUV;
    uniform vec4 tint; uniform sampler2D albedo; uniform bool textured;
    uniform float energy; uniform float emissive; uniform float time; out vec4 color;
    void main(){
      vec3 norm=normalize(n); if(!gl_FrontFacing)norm=-norm;
      float light=max(dot(norm,normalize(vec3(-.6,-.8,-1.))),0.);
      float rim=pow(1.-abs(norm.z),3.);
      vec3 base=textured?texture(albedo,texUV).rgb:pow(tint.rgb,vec3(1./2.2));
      float scan=pow(max(0.,sin(p.y*180.+time*3.)),24.);
      color=vec4(base*(.38+.75*light+emissive)+vec3(.2,.3,.3)*rim*.15,tint.a);
      if(energy>0.)color=vec4(tint.rgb*(.45+scan*.6),tint.a*(.25+rim*.45+scan*.3));
    }`);
  const program=gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program); gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
  const textureObjects=[];
  const ready=[];
  const buffers = Object.fromEntries(Object.entries(models).map(([key, model])=>{
    const bytes=Uint8Array.from(atob(model.buffer), c=>c.charCodeAt(0));
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,bytes,gl.STATIC_DRAW);
    const textures=model.textures.map(t=>{
      const texture=gl.createTexture(),image=new Image();textureObjects.push(texture);
      ready.push(new Promise((resolve,reject)=>{
        image.onload=()=>{
          if(disposed){resolve();return;}
          gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,t.repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,t.repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);resolve();
        };
        image.onerror=reject;image.src=t.url;
      }));
      return texture;
    });
    return [key,{buffer,groups:model.groups,materials:model.materials,textures}];
  }));
  const angleLoc=gl.getUniformLocation(program,'angle'),tintLoc=gl.getUniformLocation(program,'tint');
  const position=gl.getAttribLocation(program,'position'), normal=gl.getAttribLocation(program,'normal'),uv=gl.getAttribLocation(program,'uv');
  const uniforms=Object.fromEntries(['textured','energy','emissive','time','growth'].map(key=>[key,gl.getUniformLocation(program,key)]));
  const plain=gl.createTexture();textureObjects.push(plain);gl.bindTexture(gl.TEXTURE_2D,plain);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  return {
    ready:Promise.all(ready),
    draw(key, angle, growth){
      const model=buffers[key];
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,model.buffer);
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,3,gl.FLOAT,false,32,0);
      gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal,3,gl.FLOAT,false,32,12);
      gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,32,24);
      gl.uniform1f(angleLoc,angle);gl.uniform1f(uniforms.time,angle);
      gl.uniform1f(uniforms.growth,growth);
      const groups=[...model.groups].sort((a,b)=>Number(model.materials[a.material].energy>0)-Number(model.materials[b.material].energy>0));
      for(const group of groups){
        const m=model.materials[group.material],color=[...m.color];
        if(m.energy>0)color[3]=m.opacity;
        gl.enable(gl.BLEND);gl.depthMask(color[3]===1);
        gl.uniform4fv(tintLoc,color);gl.uniform1i(uniforms.textured,m.texture>=0);
        gl.uniform1f(uniforms.energy,m.energy);gl.uniform1f(uniforms.emissive,m.emissive);
        gl.bindTexture(gl.TEXTURE_2D,m.texture>=0?model.textures[m.texture]:plain);
        gl.drawArrays(gl.TRIANGLES,group.first,group.count);
      }
      gl.depthMask(true);
    },
    dispose(){
      disposed=true;
      Object.values(buffers).forEach(b=>gl.deleteBuffer(b.buffer));
      textureObjects.forEach(t=>gl.deleteTexture(t));
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
      gl.getExtension('WEBGL_lose_context').loseContext();
    }
  };
}
