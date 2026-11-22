import{readdirSync,readFileSync,writeFileSync,mkdirSync}from"node:fs";
const T=`!2b%'+,0        *******&***&*** ***             AEEA!           &)              %%"%`;
function R(p,q){
let D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536),s=0,g=0,l=0,j=0,n=0,i=0;
let E=c=>[o.subarray(0,l),c];
for(;;){
if(n==1e6)return E(10);
if(j<0||j>=p.length)return E(9);
let a=p[j],k=T.charCodeAt(a)-33;
if(!(k>=0))return E(5);
let m=k>>4,u=k>>2&3,w=k&3;
if(j+m>=p.length)return E(9);
n++;
if(s<u)return E(2);
if(s-u+w>256)return E(3);
let x=j+1+m;j=x;
if(a<8){
if(a==0)return E(0);
if(a==1)D[s++]=p[x-1]<<24>>24;
else if(a==2)D[s++]=p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;
else if(a==3)s--;
else if(a==4){D[s]=D[s-1];s++}
else if(a==5){let t=D[s-1];D[s-1]=D[s-2];D[s-2]=t}
else if(a==6){D[s]=D[s-2];s++}
else{let t=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=t}
}else if(a==23)D[s-1]=-D[s-1]|0;
else if(a==27)D[s-1]=~D[s-1];
else if(a>15&&a<35){
if(a>18&&a<23&&D[s-1]==0)return E(4);
let b=D[s-1],c=D[s-2],r=a<23?a==16?c+b|0:a==17?c-b|0:a==18?Math.imul(c,b):a==19?(c/b)|0:a==20?c%b|0:a==21?(c>>>0)/(b>>>0)|0:(c>>>0)%(b>>>0)|0:a<27?a==24?c&b:a==25?c|b:c^b:a<31?a==28?c<<(b&31):a==29?c>>(b&31):(c>>>(b&31))|0:a==32?c==b?1:0:a==33?c<b?1:0:(c>>>0)<(b>>>0)?1:0;
s-=2;D[s++]=r;
}else if(a>47&&a<53){
let r=(p[x-2]|p[x-1]<<8)<<16>>16;
if(a==48)j=x+r;
else if(a<51){let v=D[--s];if(a==49?v==0:v!=0)j=x+r}
else if(a==51){if(g==64)return E(7);C[g++]=x;j=p[x-2]|p[x-1]<<8}
else{if(!g)return E(8);j=C[--g]}
}else if(a==64){let v=D[s-1];if(v>>>0>255)return E(6);D[s-1]=M[v]}
else if(a==65){let v=D[s-1],w=D[s-2];if(v>>>0>255)return E(6);s-=2;M[v]=w}
else if(a==80){let t=String(D[s-1]);if(l+t.length>65536)return E(11);s--;o.set(Buffer.from(t),l);l+=t.length}
else if(a==81){if(l>65535)return E(11);o[l++]=D[--s]&255}
else if(a==82)D[s++]=i<q.length?q[i++]:-1;
else return E(D[--s]&255);
}
}
let I=process.env.MAKEFUN_INPUT_DIR||"/input",O=process.env.MAKEFUN_OUTPUT_DIR||"/output";
for(let f of readdirSync(I)){let p,q;try{p=readFileSync(I+"/"+f+"/program.bin");q=readFileSync(I+"/"+f+"/input.bin")}catch{continue}let[r,e]=R(p,q);mkdirSync(O+"/"+f,{recursive:true});writeFileSync(O+"/"+f+"/stdout.bin",r);writeFileSync(O+"/"+f+"/exit.txt",e+"")}
