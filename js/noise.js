// Simplex-Rauschen, fbm, Hilfsfunktionen
export function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const sstep=(a,b,x)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
export const lerp=(a,b,t)=>a+(b-a)*t;
export function hash2(i,j){let h=Math.imul(i,374761393)+Math.imul(j,668265263)|0;h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return(h>>>0)/4294967296;}

const GX=[1,-1,1,-1,1,-1,0,0],GY=[1,1,-1,-1,0,0,1,-1];
export function makeSimplex(seed){
  const r=mulberry(seed),perm=new Uint8Array(256);for(let i=0;i<256;i++)perm[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));const t=perm[i];perm[i]=perm[j];perm[j]=t;}
  const p=new Uint8Array(512);for(let i=0;i<512;i++)p[i]=perm[i&255];
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  return function(xin,yin){
    const s=(xin+yin)*F2,i=Math.floor(xin+s),j=Math.floor(yin+s),t=(i+j)*G2;
    const x0=xin-(i-t),y0=yin-(j-t);const i1=x0>y0?1:0,j1=x0>y0?0:1;
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
    const ii=i&255,jj=j&255;let n=0,tt;
    tt=0.5-x0*x0-y0*y0;if(tt>0){const g=p[ii+p[jj]]&7;tt*=tt;n+=tt*tt*(GX[g]*x0+GY[g]*y0);}
    tt=0.5-x1*x1-y1*y1;if(tt>0){const g=p[ii+i1+p[jj+j1]]&7;tt*=tt;n+=tt*tt*(GX[g]*x1+GY[g]*y1);}
    tt=0.5-x2*x2-y2*y2;if(tt>0){const g=p[ii+1+p[jj+1]]&7;tt*=tt;n+=tt*tt*(GX[g]*x2+GY[g]*y2);}
    return 70*n;
  };
}
export function fbm(n,x,z,o){let a=0.5,f=1,s=0;for(let i=0;i<o;i++){s+=a*n(x*f,z*f);f*=2.02;a*=0.5;}return s;}
export function ridged(n,x,z,o){let a=0.5,f=1,s=0,w=1;for(let i=0;i<o;i++){let v=1-Math.abs(n(x*f,z*f));v*=v;v*=w;w=clamp(v*1.9,0,1);s+=v*a;f*=2.03;a*=0.52;}return s;}
