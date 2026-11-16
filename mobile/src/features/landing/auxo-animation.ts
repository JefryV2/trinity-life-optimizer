// Self-contained landing animation. The Baloo 2 700 glyphs (AUXO.) are inlined,
// so the canvas renders identically offline and never waits on a font CDN.
// Source: the supplied Auxo wordmark animation; controls removed for the app landing.
export const AUXO_LANDING_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Auxo wordmark</title>
<style>
:root{--bg:#f2f2f2;--ink:#111;--line:#cfcfcf;--btn:#111;--btnt:#fff;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#16181c;--ink:#f2f2f2;--line:#33363c;--btn:#f2f2f2;--btnt:#111}}
:root[data-theme="dark"]{--bg:#16181c;--ink:#f2f2f2;--line:#33363c;--btn:#f2f2f2;--btnt:#111}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:"Helvetica Neue",Arial,sans-serif}
main{max-width:520px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:14px}
canvas{display:block;width:100%;aspect-ratio:4/5;border-radius:24px;background:#000;box-shadow:0 18px 50px rgba(0,0,0,.28)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
button,input[type="text"]{font:inherit;font-size:14px;padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink)}
button{font-weight:600;cursor:pointer;transition:transform .12s ease}
button:active{transform:scale(.96)}
input[type="text"]{flex:1;min-width:100px}
button.primary,button[aria-pressed="true"]{background:var(--btn);color:var(--btnt);border-color:var(--btn)}
input[type="range"]{flex:1;accent-color:var(--btn);min-width:0}
button:focus-visible,input:focus-visible{outline:3px solid #888;outline-offset:2px}
p{margin:0;font-size:13px;opacity:.7;line-height:1.55}
</style>

<style>
@font-face{font-family:'Baloo 2';font-style:normal;font-weight:700;font-display:block;src:url(data:font/ttf;base64,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) format('truetype')}
html,body{height:100%;margin:0;overflow:hidden;background:#070708;-webkit-tap-highlight-color:transparent}
main{max-width:none;height:100%;padding:0;display:block;margin:0}
.row,p{display:none!important}
canvas{width:100%;height:100%;aspect-ratio:auto;border-radius:0;box-shadow:none;background:#070708}
</style>
</head>
<body>
<main>
  <canvas id="cv" role="img" aria-label="Animation: four dots gather, swirl, line up, and morph into glowing outlined letters spelling Auxo followed by a period. The camera then zooms in to show the anchor points and guide lines that construct each letter."></canvas>
  <div class="row">
    <button class="primary" id="replay">Replay</button>
    <button id="play" aria-label="Pause">Pause</button>
    <button id="loop" aria-pressed="true">Loop</button>
    <input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Timeline">
  </div>
  <div class="row">
    <button data-v="lime" aria-pressed="true">Lime</button>
    <button data-v="white" aria-pressed="false">White</button>
    <button data-v="light" aria-pressed="false">Light</button>
    <input type="text" id="word" value="AUXO" maxlength="8" aria-label="Word to spell">
  </div>
  <p>Four dots swirl into a ring, straighten into a row, and morph into the outlined word. A period pops in, then the camera zooms in to reveal the anchor points and guide lines that build each letter.</p>
</main>
<script>
(function(){
  var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),wm=document.createElement('canvas'),wx=wm.getContext('2d');
  var LW=640,LH=800,CX=320,CY=400,R=1.5,CW=330,CH=360,DR=24,INF=1e9,DS=Math.ceil(2*(DR*R+46)),RING=64,ZM=2.4;
  var TH={lime:{bg:'#070708',bg2:'#070708',body:[172,214,62],fg:[198,242,78],halo:.6,sheen:'255,255,230',guide:'rgba(255,255,255,.16)'},
          white:{bg:'#000',bg2:'#000',body:[212,224,238],fg:[255,255,255],halo:.5,sheen:'200,225,255',guide:'rgba(255,255,255,.16)'},
          light:{bg:'#ECE9E1',bg2:'#FFFFFF',body:[11,15,20],fg:[11,15,20],halo:0,sheen:'255,255,255',guide:'rgba(0,0,0,.16)'}};
  var cur='lime',word='AUXO',fsz=190,L=[],N=0,NL=0,ready=false,dcv=null,dk='';
  var TPOP=5,TEND=6,TZ0=7.5,TP0=9,PD=3,TTOT=13,XS=CX,XE=CX,YC=CY,GUIDES=[];
  var t=0,playing=true,loop=true,last=0,drag=false,started=false;
  var still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scr=document.getElementById('scrub'),playBtn=document.getElementById('play'),loopBtn=document.getElementById('loop');
  function cl(x){return Math.max(0,Math.min(1,x))}
  function io(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}
  function eo(x){return 1-Math.pow(1-x,3)}
  function back(x){var c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}
  function lp(a,b,k){return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]}
  function edt(f,w,h){
    var o=new Float32Array(w*h),n=Math.max(w,h),d=new Float32Array(n),v=new Int32Array(n),z=new Float32Array(n+1),g=new Float32Array(n),x,y;
    function pass(len){var k=0,q,s;v[0]=0;z[0]=-INF;z[1]=INF;
      for(q=1;q<len;q++){s=((g[q]+q*q)-(g[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);
        while(s<=z[k]){k--;s=((g[q]+q*q)-(g[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}
        k++;v[k]=q;z[k]=s;z[k+1]=INF}
      k=0;for(q=0;q<len;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+g[v[k]]}}
    for(x=0;x<w;x++){for(y=0;y<h;y++)g[y]=f[y*w+x];pass(h);for(y=0;y<h;y++)o[y*w+x]=d[y]}
    for(y=0;y<h;y++){for(x=0;x<w;x++)g[x]=o[y*w+x];pass(w);for(x=0;x<w;x++)o[y*w+x]=d[x]}
    return o}
  // @@S
// Marching squares: closed outline loops where the signed distance field crosses zero.
function contours(f,W,xa,xb,ya,yb){
  var adj=new Map(),pt=new Map(),x,y;
  function cross(h,cx,cy){var k=(cy*W+cx)*2+(h?0:1);
    if(!pt.has(k)){var a=f[cy*W+cx],b=h?f[cy*W+cx+1]:f[(cy+1)*W+cx],tt=a/(a-b);pt.set(k,h?[cx+tt,cy]:[cx,cy+tt])}return k}
  function link(a,b){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a)}
  for(y=ya;y<yb;y++)for(x=xa;x<xb;x++){
    var a=f[y*W+x]<0,b=f[y*W+x+1]<0,c=f[(y+1)*W+x+1]<0,d=f[(y+1)*W+x]<0;
    if(a===b&&b===c&&c===d)continue;
    var e=[];if(a!==b)e.push(cross(1,x,y));if(b!==c)e.push(cross(0,x+1,y));if(d!==c)e.push(cross(1,x,y+1));if(a!==d)e.push(cross(0,x,y));
    if(e.length===2)link(e[0],e[1]);else if(e.length===4){link(e[0],e[1]);link(e[2],e[3])}}
  var seen=new Set(),loops=[];
  adj.forEach(function(_,s){
    if(seen.has(s))return;var pts=[],cur=s,prev=-1;
    while(cur!==undefined&&!seen.has(cur)){seen.add(cur);pts.push(pt.get(cur));var nb=adj.get(cur),nx=nb[0]===prev?nb[1]:nb[0];prev=cur;cur=nx}
    loops.push(pts)});
  return loops}
// Anchor points: sharp corners, true curve extremes (centred on the curve) and straight-to-curve joins.
function anchorsOf(loops){
  var corners=[],ext=[],joins=[];
  loops.forEach(function(P0){
    var n=P0.length,i,j,m,k=5,P=[];
    if(n<16)return;
    for(i=0;i<n;i++){var sx=0,sy=0;for(j=-3;j<=3;j++){var q=P0[(i+j+n)%n];sx+=q[0];sy+=q[1]}P.push([sx/7,sy/7])}
    function turn(i,kk){var a=P[(i-kk+n)%n],b=P[i],c=P[(i+kk)%n],ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-b[0],vy=c[1]-b[1];return Math.abs(Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy))}
    var ang=new Float32Array(n),a3=new Float32Array(n),a6=new Float32Array(n);
    for(i=0;i<n;i++){ang[i]=turn(i,k);a3[i]=turn(i,3);a6[i]=turn(i,6)}
    // sharp corners
    for(i=0;i<n;i++){if(ang[i]<.7)continue;var ok=true;
      for(j=-k;j<=k;j++){var o=ang[(i+j+n)%n];if(o>ang[i]||(o===ang[i]&&j<0)){ok=false;break}}
      if(ok)corners.push(P0[i])}
    // curve extremes: parabola vertex, so left/right and top/bottom line up exactly
    for(var ax=0;ax<2;ax++)for(var sg=-1;sg<=1;sg+=2)for(i=0;i<n;i++){
      var v=sg*P[i][ax],ok2=true,mx=0;
      for(j=-18;j<=18;j++){var q2=(i+j+n)%n;if(sg*P[q2][ax]>v+.03){ok2=false;break}if(a3[q2]>mx)mx=a3[q2]}
      if(!ok2||mx>.6)continue;
      var W=6,uc=P[i][1-ax],S=[0,0,0,0,0],T=[0,0,0];
      for(j=-W;j<=W;j++){var pq=P[(i+j+n)%n],u=pq[1-ax]-uc,vv=pq[ax]-P[i][ax],u2=u*u;
        S[0]++;S[1]+=u;S[2]+=u2;S[3]+=u2*u;S[4]+=u2*u2;T[0]+=vv;T[1]+=vv*u;T[2]+=vv*u2}
      // solve [S4 S3 S2; S3 S2 S1; S2 S1 S0] [a b c] = [T2 T1 T0]
      var M=[[S[4],S[3],S[2],T[2]],[S[3],S[2],S[1],T[1]],[S[2],S[1],S[0],T[0]]];
      for(var c1=0;c1<3;c1++){var pv=c1;for(var r1=c1+1;r1<3;r1++)if(Math.abs(M[r1][c1])>Math.abs(M[pv][c1]))pv=r1;
        var tmp=M[c1];M[c1]=M[pv];M[pv]=tmp;if(Math.abs(M[c1][c1])<1e-9)break;
        for(var r2=c1+1;r2<3;r2++){var fct=M[r2][c1]/M[c1][c1];for(var cc=c1;cc<4;cc++)M[r2][cc]-=fct*M[c1][cc]}}
      if(Math.abs(M[2][2])<1e-9||Math.abs(M[1][1])<1e-9||Math.abs(M[0][0])<1e-9)continue;
      var cz=M[2][3]/M[2][2],bz=(M[1][3]-M[1][2]*cz)/M[1][1],az=(M[0][3]-M[0][1]*bz-M[0][2]*cz)/M[0][0];
      if(Math.abs(az)<.003)continue;
      var u0=uc-bz/(2*az),best=0,bd=1e9;
      for(j=-W;j<=W;j++){var dd=Math.abs(P[(i+j+n)%n][1-ax]-u0);if(dd<bd){bd=dd;best=j}}
      ext.push(P0[(i+best+n)%n])}
    // where a straight vertical or horizontal edge turns into a curve (both sides of a stem get one)
    var st=new Uint8Array(n),cnt=0;for(i=0;i<n;i++){st[i]=a6[i]<.035?1:0;cnt+=st[i]}
    var cs=corners.filter(function(c){return P0.indexOf(c)>=0});
    function nearCorner(p){return cs.some(function(c){return Math.hypot(c[0]-p[0],c[1]-p[1])<26})}
    if(cnt<n)for(i=0;i<n;i++){if(st[i]&&!st[(i-1+n)%n]){var len=0;while(st[(i+len)%n]&&len<n)len++;
      if(len<8)continue;var e0=P0[i],e1=P0[(i+len-1)%n],dx=Math.abs(e1[0]-e0[0]),dy=Math.abs(e1[1]-e0[1]);
      if(Math.min(dx,dy)>.12*Math.max(dx,dy))continue;
      var j0=P0[(i-4+n)%n],j1=P0[(i+len-1+4)%n];
      if(!nearCorner(j0))joins.push(j0);if(!nearCorner(j1))joins.push(j1)}}
  });
  var res=[];[corners,ext,joins].forEach(function(g){g.forEach(function(p){
    if(!res.some(function(r){return Math.hypot(r[0]-p[0],r[1]-p[1])<18}))res.push(p)})});
  return res}
  // @@E
  function font(){return '700 '+fsz+'px "Baloo 2","Helvetica Neue",Arial,sans-serif'}
  function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
  // One pixel from its signed distance to the edge: lime outline, soft halo outside, optional solid fill f (0 = hollow).
  function shade(d,o,v,th,f){
    var hw=2.6,av=v<0?-v:v,ra,ia,h,b,al,bc,w,vv=v-hw;
    if(v>hw+40){d[o+3]=0;return}
    if(v<-hw-1){if(f<=0){d[o+3]=0;return}d[o]=th.body[0];d[o+1]=th.body[1];d[o+2]=th.body[2];d[o+3]=f*255;return}
    ra=hw+.5-av;ra=ra<0?0:ra>1?1:ra;
    ia=.5-(v+hw);ia=ia<0?0:ia>1?1:ia;ia*=f;
    h=vv>0?th.halo/((1+vv*.14)*(1+vv*.14)):0;
    b=ia>h?ia:h;bc=ia>h?th.body:th.fg;
    al=ra+(1-ra)*b;if(al<=.002){d[o+3]=0;return}
    w=(1-ra)*b;
    d[o]=(th.fg[0]*ra+bc[0]*w)/al;d[o+1]=(th.fg[1]*ra+bc[1]*w)/al;d[o+2]=(th.fg[2]*ra+bc[2]*w)/al;d[o+3]=al*255}
  function build(){
    var text=word+'.',m=document.createElement('canvas').getContext('2d'),ls=0,i;
    N=text.length;NL=N-1;
    fsz=100;m.font=font();var w100=0;for(i=0;i<N;i++)w100+=m.measureText(text[i]).width;
    fsz=Math.min(220,Math.floor(100*470/(w100||300)));ls=-fsz*.02;m.font=font();
    var adv=[],tot=0;for(i=0;i<N;i++){adv[i]=m.measureText(text[i]).width+ls;tot+=adv[i]}
    var base=CY+fsz*.28,x=CX-tot/2;L=[];
    var nt=Math.ceil(NL/2),nb=NL-nt;
    for(i=0;i<N;i++){
      var cx=x+adv[i]/2;x+=adv[i];
      var o=mk(CW,CH),c=o.getContext('2d');
      c.setTransform(R,0,0,R,0,0);c.fillStyle='#fff';c.font=font();c.textAlign='center';c.fillText(text[i],CW/R/2,170);
      var px=c.getImageData(0,0,CW,CH).data,fin=new Float32Array(CW*CH),fout=new Float32Array(CW*CH),k,x0=1e9,x1=-1,y0=1e9,y1=-1;
      for(k=0;k<CW*CH;k++){var ins=px[k*4+3]>127;fin[k]=ins?0:INF;fout[k]=ins?INF:0;
        if(ins){var xx=k%CW,yy=(k/CW)|0;if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy}}
      if(x1<0){x0=x1=CW/2;y0=y1=CH/2}
      var dO=edt(fin,CW,CH),dI=edt(fout,CW,CH),sdf=new Float32Array(CW*CH);
      for(k=0;k<CW*CH;k++)sdf[k]=Math.sqrt(dO[k])-Math.sqrt(dI[k]);
      var ccx=(x0+x1)/2,ccy=(y0+y1)/2,cell=mk(CW,CH),full=mk(CW,CH),row=i<nt?0:1,jj=row?i-nt:i,nn=row?nb:nt;
      var q={ch:text[i],sdf:sdf,ccx:ccx,ccy:ccy,cell:cell,img:cell.getContext('2d').createImageData(CW,CH),
        fcell:full,fimg:full.getContext('2d').createImageData(CW,CH),fk:'',
        fin:[cx-CW/R/2+ccx/R,base-170+ccy/R],sc:[CX+(jj-(nn-1)/2)*66,CY+(row?38:-38)]};
      q.left=q.fin[0]-(x1-x0)/(2*R);q.right=q.fin[0]+(x1-x0)/(2*R);q.top=q.fin[1]-(y1-y0)/(2*R);q.bot=q.fin[1]+(y1-y0)/(2*R);
      q.loops=contours(sdf,CW,Math.max(0,x0-3),Math.min(CW-2,x1+3),Math.max(0,y0-3),Math.min(CH-2,y1+3)).map(function(P){
        var a=[],j;for(j=0;j<P.length;j+=2)a.push([q.fin[0]+(P[j][0]-ccx)/R,q.fin[1]+(P[j][1]-ccy)/R]);return a}).filter(function(a){return a.length>8});
      q.pts=anchorsOf(q.loops);
      L.push(q)}
    // timeline
    TPOP=1.95+.22*(NL-1)+.75;TEND=TPOP+.7;TZ0=TEND+1.3;TP0=TZ0+1.7;
    var vw=LW/ZM,wl=L[0].left,wr=L[N-1].right;
    XS=wl-26+vw/2;XE=wr+26-vw/2;if(XE<XS){XS=XE=(wl+wr)/2}
    PD=XE>XS?3.4:.2;TTOT=TP0+PD+1.0;
    var capTop=Infinity,i2;for(i2=0;i2<N;i2++)capTop=Math.min(capTop,L[i2].top);
    var xTop=L[Math.min(1,NL-1)].top;
    GUIDES=[capTop,xTop,(xTop+base)/2,base];YC=(capTop+base)/2;
  }
  function pos(i,tt){
    var q=L[i],a=i*6.2832/NL+3.4*io(cl((tt-.5)/1))+tt*.5,ring=[CX+RING*Math.cos(a),CY+RING*Math.sin(a)];
    var p=lp(q.sc,ring,io(cl((tt-.6)/.6)));
    p=lp(p,[CX+(i-(NL-1)/2)*Math.min(60,330/NL),CY],io(cl((tt-1.35)/.6)));
    return lp(p,q.fin,io(cl((tt-1.9-.22*i)/.8)))}
  function fullCell(q,th){
    if(q.fk===cur)return;var d=q.fimg.data,s=q.sdf,i;
    for(i=0;i<CW*CH;i++)shade(d,i*4,s[i],th,0);
    q.fcell.getContext('2d').putImageData(q.fimg,0,0);q.fk=cur}
  function dotCell(th){
    if(dk===cur&&dcv)return;dcv=mk(DS,DS);var c=dcv.getContext('2d'),img=c.createImageData(DS,DS),d=img.data,x,y,h=DS/2,rp=DR*R;
    for(y=0;y<DS;y++)for(x=0;x<DS;x++)shade(d,(y*DS+x)*4,Math.sqrt((x-h)*(x-h)+(y-h)*(y-h))-rp,th,1);
    c.putImageData(img,0,0);dk=cur}
  function bg(th){
    var g=ctx.createRadialGradient(CX,CY-40,30,CX,CY,540);g.addColorStop(0,th.bg2);g.addColorStop(1,th.bg);
    ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH)}
  function frame(tt){
    var th=TH[cur],k=cv.width/LW,i;
    ctx.setTransform(k,0,0,k,0,0);bg(th);if(!ready)return;
    if(tt>=TEND){ending(tt,th,k);return}
    dotCell(th);
    for(i=0;i<NL;i++){
      var q=L[i],r=DR*back(cl((tt-.15-.06*i)/.4)),p=pos(i,tt),m=io(cl((tt-1.95-.22*i)/.6)),tl=1.95+.22*i+.6;
      if(r<=.1)continue;
      if(m<=.001){var sd=r/DR*DS/R;ctx.drawImage(dcv,p[0]-sd/2,p[1]-sd/2,sd,sd);continue}
      var cellc,sc=1+.07*Math.exp(-Math.max(0,tt-tl)*6)*Math.sin(Math.max(0,tt-tl)*16);
      if(m>=.999){fullCell(q,th);cellc=q.fcell}
      else{
        var d=q.img.data,s=q.sdf,rp=r*R,x,y,idx=0,dx,dy,v;
        for(y=0;y<CH;y++){dy=y-q.ccy;for(x=0;x<CW;x++,idx++){dx=x-q.ccx;
          v=Math.sqrt(dx*dx+dy*dy)-rp;v+=(s[idx]-v)*m;shade(d,idx*4,v,th,1-m)}}
        q.cell.getContext('2d').putImageData(q.img,0,0);cellc=q.cell}
      ctx.drawImage(cellc,p[0]-q.ccx/R*sc,p[1]-q.ccy/R*sc,CW/R*sc,CH/R*sc);}
    var pq=L[NL],pu=cl((tt-TPOP)/.45);
    if(pu>0){var ps=back(pu);fullCell(pq,th);
      ctx.drawImage(pq.fcell,pq.fin[0]-pq.ccx/R*ps,pq.fin[1]-pq.ccy/R*ps,CW/R*ps,CH/R*ps)}}
  function vec(tt,th,k,al){
    var e=io(cl((tt-TZ0)/1.5)),s=io(cl((tt-TP0)/PD)),Z=1+(ZM-1)*e;
    var cx=CX+(XS-CX)*e+(XE-XS)*s,cy=CY+(YC-CY)*e;
    ctx.setTransform(k*Z,0,0,k*Z,k*(LW/2-Z*cx),k*(LH/2-Z*cy));ctx.globalAlpha=al;
    var xl=cx-LW/Z/2-10,xr=cx+LW/Z/2+10,gp=eo(cl((tt-TZ0-.3)/.9));
    ctx.strokeStyle=th.guide;ctx.lineWidth=1.2/Z;
    GUIDES.forEach(function(gy){ctx.beginPath();ctx.moveTo(xl,gy);ctx.lineTo(xl+(xr-xl)*gp,gy);ctx.stroke()});
    var fg='rgb('+th.fg.join(',')+')';
    ctx.strokeStyle=fg;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=(3.4-1.3*e)/Z;
    if(th.halo>0){ctx.shadowColor='rgba('+th.fg.join(',')+',.85)';ctx.shadowBlur=18*k*(1-.6*e)}
    L.forEach(function(q){q.loops.forEach(function(P){ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);
      for(var i=1;i<P.length;i++)ctx.lineTo(P[i][0],P[i][1]);ctx.closePath();ctx.stroke()})});
    ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.fillStyle=fg;
    var wl=L[0].left,ww=(L[N-1].right-wl)||1;
    L.forEach(function(q){q.pts.forEach(function(p){
      var u=cl((tt-TZ0-.7-(p[0]-wl)/ww*2.2)/.4);if(u<=0)return;
      ctx.beginPath();ctx.arc(p[0],p[1],5.2/Z*back(u),0,6.2832);ctx.fill()})});
    ctx.globalAlpha=1}
  function ending(tt,th,k){
    var i,w=cv.width,h=cv.height,vf=cl((tt-(TZ0-.35))/.3);
    if(vf<1){
      if(wm.width!==w||wm.height!==h){wm.width=w;wm.height=h}
      wx.setTransform(1,0,0,1,0,0);wx.globalCompositeOperation='source-over';wx.clearRect(0,0,w,h);wx.setTransform(k,0,0,k,0,0);
      for(i=0;i<N;i++){var q=L[i];fullCell(q,th);wx.drawImage(q.fcell,q.fin[0]-q.ccx/R,q.fin[1]-q.ccy/R,CW/R,CH/R)}
      var u=(tt-TEND)/.9;
      if(u>0&&u<1){var x=-120+(LW+240)*io(u),g=wx.createLinearGradient(x-80,CY-70,x+80,CY+70);
        g.addColorStop(0,'rgba('+th.sheen+',0)');g.addColorStop(.5,'rgba('+th.sheen+',.8)');g.addColorStop(1,'rgba('+th.sheen+',0)');
        wx.globalCompositeOperation='source-atop';wx.fillStyle=g;wx.fillRect(0,0,LW,LH)}
      ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1-vf;ctx.drawImage(wm,0,0);ctx.globalAlpha=1}
    if(vf>0)vec(tt,th,k,vf);
    var fo=cl((tt-(TTOT-.5))/.5);
    if(fo>0){ctx.setTransform(k,0,0,k,0,0);ctx.globalAlpha=fo;bg(th);ctx.globalAlpha=1}}
  function size(){var r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d)}
  function setPlay(){playBtn.textContent=playing?'Pause':'Play';playBtn.setAttribute('aria-label',playing?'Pause':'Play')}
  function tick(now){
    var dt=Math.min(.05,(now-last)/1000);last=now;
    if(playing&&ready){t+=dt;if(t>=TTOT){if(loop)t=0;else{t=TTOT-.5;playing=false;setPlay()}}}
    frame(t);if(!drag)scr.value=Math.round(t/TTOT*1000);requestAnimationFrame(tick)}
  function go(){build();ready=true;t=0;
    if(still){t=TEND+.6;playing=false;setPlay();frame(t);return}
    last=performance.now();if(!started){started=true;requestAnimationFrame(tick)}}
  size();window.addEventListener('resize',function(){size();if(still)frame(t)});
  Promise.race([document.fonts.load('700 100px "Baloo 2"',word),new Promise(function(r){setTimeout(r,2500)})]).catch(function(){}).then(go);
  document.getElementById('replay').onclick=function(){t=0;playing=true;setPlay();if(still)frame(0)};
  playBtn.onclick=function(){playing=!playing;if(playing&&t>=TTOT-.5)t=0;setPlay()};
  loopBtn.onclick=function(){loop=!loop;loopBtn.setAttribute('aria-pressed',loop)};
  scr.oninput=function(){drag=true;playing=false;setPlay();t=scr.value/1000*TTOT;if(still)frame(t)};
  scr.onchange=function(){drag=false};
  var tm;document.getElementById('word').oninput=function(){var v=this.value.replace(/[\s.]/g,'')||'Auxo';clearTimeout(tm);tm=setTimeout(function(){word=v;go()},250)};
  document.querySelectorAll('[data-v]').forEach(function(b){b.onclick=function(){cur=b.dataset.v;cv.style.background=TH[cur].bg;
    document.querySelectorAll('[data-v]').forEach(function(o){o.setAttribute('aria-pressed',o===b)});if(still)frame(t)}});
})();
</script>
</body>
</html>
`;

/**
 * A trimmed segment of the same canvas for the onboarding arrival. It starts
 * with the letters already assembling, stops after the period lands, and holds
 * the final mark. No loop, no controls, no second animation code path.
 */
export const AUXO_MOMENT_HTML = AUXO_LANDING_HTML
  .replace('var t=0,playing=true,loop=true', 'var t=4.0,playing=true,loop=false')
  .replace('ready=true;t=0;', 'ready=true;t=4.0;')
  // `build()` recalculates TTOT, so fix the end after that calculation rather
  // than only changing the initial value. 7.4 gives 2.9s from the 4.0 start
  // and stops after the sheen on the completed wordmark, before the camera zoom.
  .replace('PD=XE>XS?3.4:.2;TTOT=TP0+PD+1.0;', 'PD=XE>XS?3.4:.2;TTOT=7.4;')
  .replace(
    'if(playing&&ready){t+=dt;if(t>=TTOT){if(loop)t=0;else{t=TTOT-.5;playing=false;setPlay()}}}',
    "if(playing&&ready){t+=dt;if(t>=TTOT){if(loop)t=0;else{t=TTOT-.5;playing=false;setPlay();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage('auxo-moment-done')}}}",
  )
  .replace(
    'if(still){t=TEND+.6;playing=false;setPlay();frame(t);return}',
    "if(still){t=TTOT-.5;playing=false;setPlay();frame(t);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage('auxo-moment-done');return}",
  );
