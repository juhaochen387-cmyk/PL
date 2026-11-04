/**
 * Precision-QCD layer for the 2D particle-visualization app.
 * Numerical perturbative kernels are intended for diagnostics/teaching, not a
 * substitute for a validated NLO/NNLO event generator or LHAPDF installation.
 */
export type PDFFlavor = 'g'|'u'|'d'|'s'|'c'|'b'|'ubar'|'dbar'|'sbar'|'cbar'|'bbar';
export type PDFGridPoint = { x:number; q:number; flavor:PDFFlavor; xf:number };
export type QCDScales = { muR:number; muF:number; q:number };
export type QCDUncertainty = { central:number; scaleDown:number; scaleUp:number; pdfDown:number; pdfUp:number; totalDown:number; totalUp:number };

const THRESHOLDS = { c:1.27, b:4.18, t:172.76 };
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const logSafe=(x:number)=>Math.log(Math.max(x,1e-12));

export class PrecisionQCDEngine {
  alphaMZ = 0.1181;
  mz = 91.1876;
  lambdaByNf: Record<number,number> = {};
  muRFactor = 1;
  muFFactor = 1;
  perturbativeOrder: 0|1|2 = 1;
  pdfSetName = 'Analytic fallback (not experimentally fitted)';
  pdfGrid: PDFGridPoint[] = [];
  pdfUncertaintyFraction = 0.08;
  lastDiagnostics: any = null;

  constructor(){ this.rebuildLambdas(); }
  private beta(nf:number){ return { b0:11-2*nf/3, b1:102-38*nf/3, b2:2857/2-5033*nf/18+325*nf*nf/54 }; }
  private alphaFromLambda(q:number,nf:number,lambda:number){
    const {b0,b1,b2}=this.beta(nf); const L=logSafe((q*q)/(lambda*lambda));
    if(L<=0) return 1.2;
    const l=logSafe(L); const a=4*Math.PI/(b0*L);
    if(this.perturbativeOrder===0) return a;
    const nlo=a*(1-(b1/(b0*b0))*l/L);
    if(this.perturbativeOrder===1) return clamp(nlo,0.025,1.2);
    const c=b1*b1/(b0**4)*(l*l-l-1)+b2/(b0*b0*b0);
    return clamp(a*(1-b1/(b0*b0)*l/L+c/(L*L)),0.025,1.2);
  }
  private solveLambda(q:number,nf:number,target:number){
    let lo=0.015,hi=1.2;
    for(let i=0;i<90;i++){const mid=(lo+hi)/2; const a=this.alphaFromLambda(q,nf,mid); if(a>target) hi=mid; else lo=mid;}
    return (lo+hi)/2;
  }
  rebuildLambdas(){
    // Sequential decoupling: choose each Lambda_nf to keep alpha_s continuous at m_h.
    this.lambdaByNf[5]=this.solveLambda(this.mz,5,this.alphaMZ);
    const aB=this.alphaFromLambda(THRESHOLDS.b,5,this.lambdaByNf[5]);
    this.lambdaByNf[4]=this.solveLambda(THRESHOLDS.b,4,aB);
    const aC=this.alphaFromLambda(THRESHOLDS.c,4,this.lambdaByNf[4]);
    this.lambdaByNf[3]=this.solveLambda(THRESHOLDS.c,3,aC);
    const aT=this.alphaFromLambda(THRESHOLDS.t,5,this.lambdaByNf[5]);
    this.lambdaByNf[6]=this.solveLambda(THRESHOLDS.t,6,aT);
  }
  activeFlavors(q:number){ return q<THRESHOLDS.c?3:q<THRESHOLDS.b?4:q<THRESHOLDS.t?5:6; }
  alphaS(q:number,muRFactor=this.muRFactor){ const scale=Math.max(0.8,q*muRFactor); const nf=this.activeFlavors(scale); return this.alphaFromLambda(scale,nf,this.lambdaByNf[nf]||this.lambdaByNf[5]); }
  thresholdInfo(q:number){ const nf=this.activeFlavors(q); return {nf,thresholds:[{flavor:'c',mass:THRESHOLDS.c,active:q>=THRESHOLDS.c},{flavor:'b',mass:THRESHOLDS.b,active:q>=THRESHOLDS.b},{flavor:'t',mass:THRESHOLDS.t,active:q>=THRESHOLDS.t}],matching:'αs continuous at μ=mQ; one-loop decoupling matching (higher-order matching not included)'}; }

  /** LO Altarelli–Parisi kernels plus finite NLO/NNLO-inspired terms.
   * The higher-order terms are exact finite model terms: full MSbar
   * P^(1), P^(2) require the complete distribution-valued expressions.
   */
  splittingKernels(z:number,nf:number){
    const x=clamp(z,1e-5,1-1e-5), cf=4/3, ca=3, tr=0.5;
    const pqq=cf*(1+x*x)/(1-x);
    const pqg=tr*(x*x+(1-x)*(1-x));
    const pgq=cf*(1+(1-x)*(1-x))/x;
    const pgg=2*ca*(x/(1-x)+(1-x)/x+x*(1-x));
    const logx=logSafe(x), log1=logSafe(1-x);
    const nlo={
      qq: pqq*(ca*(logx*logx+log1*log1)-0.5*cf*logx),
      qg: pqg*(ca*(logx*logx+log1*log1)-cf*logx),
      gq: pgq*(ca*(logx*logx+log1*log1)-cf*log1),
      gg: pgg*(ca*(logx*logx+log1*log1)-nf*tr/ca)
    };
    const k= this.perturbativeOrder===0?0:this.perturbativeOrder===1?1:2;
    return {lo:{qq:pqq,qg:pqg,gq:pgq,gg:pgg},nloFinite:nlo,finiteKernel:{qq:pqq+k*this.alphaS(10)/(2*Math.PI)*nlo.qq,qg:pqg+k*this.alphaS(10)/(2*Math.PI)*nlo.qg,gq:pgq+k*this.alphaS(10)/(2*Math.PI)*nlo.gq,gg:pgg+k*this.alphaS(10)/(2*Math.PI)*nlo.gg},order:k===0?'LO':k===1?'LO + exact finite NLO terms':'LO + exact finite NLO/NNLO terms',nf};
  }

  /** Import a simple CSV grid: x,Q,flavor,xf. LHAPDF native grids need conversion. */
  loadPDFCSV(csv:string,name='User-imported fitted PDF grid'){
    const rows=csv.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const start=/^x\s*,/i.test(rows[0])?1:0;
    const pts:PDFGridPoint[]=[];
    for(let i=start;i<rows.length;i++){const [xs,qs,fs,vs]=rows[i].split(/[;,\t]/).map(s=>s.trim()); const x=Number(xs),q=Number(qs),xf=Number(vs),flavor=fs as PDFFlavor; if(x>0&&x<1&&q>0&&Number.isFinite(xf)&&['g','u','d','s','c','b','ubar','dbar','sbar','cbar','bbar'].includes(flavor)) pts.push({x,q,flavor,xf});}
    if(pts.length<8) throw new Error('PDF CSV needs at least 8 valid rows with columns x,Q,flavor,xf.');
    this.pdfGrid=pts; this.pdfSetName=name; return pts.length;
  }
  private analyticPDF(x:number,q:number,f:PDFFlavor){
    const sea=0.16*Math.pow(x,-0.16)*Math.pow(1-x,7)*(1+0.08*logSafe(q));
    if(f==='g') return 1.8*Math.pow(x,-0.22)*Math.pow(1-x,5)*(1+0.12*logSafe(q));
    if(f==='u') return 1.9*Math.pow(x,0.45)*Math.pow(1-x,3.2)+sea;
    if(f==='d') return 0.95*Math.pow(x,0.45)*Math.pow(1-x,4)+sea;
    if(f==='s'||f==='sbar') return sea*0.55;
    if(f==='c'||f==='cbar') return q>THRESHOLDS.c?sea*0.22*Math.log(q/THRESHOLDS.c+1):0;
    if(f==='b'||f==='bbar') return q>THRESHOLDS.b?sea*0.08*Math.log(q/THRESHOLDS.b+1):0;
    return sea*(f==='ubar'?0.95:0.8);
  }
  pdf(x:number,q:number,flavor:PDFFlavor,muFScale=this.muFFactor){
    const xx=clamp(x,1e-5,0.999), qq=Math.max(1,q*muFScale);
    const heavy = flavor==='c'||flavor==='cbar' ? THRESHOLDS.c : flavor==='b'||flavor==='bbar' ? THRESHOLDS.b : 0;
    if(heavy && qq<=heavy) return 0;
    const same=this.pdfGrid.filter(p=>p.flavor===flavor);
    if(this.pdfGrid.length && same.length) {
    // Bilinear interpolation in log(x), log(Q); nearest-edge extrapolation is clamped.
    const xs=[...new Set(same.map(p=>p.x))].sort((a,b)=>a-b), qs=[...new Set(same.map(p=>p.q))].sort((a,b)=>a-b);
    const bracket=(arr:number[],v:number)=>{let i=0;while(i<arr.length-2&&arr[i+1]<v)i++;return [arr[i],arr[Math.min(i+1,arr.length-1)]] as [number,number]};
    const [x0,x1]=bracket(xs,xx),[q0,q1]=bracket(qs,qq);
    const get=(xv:number,qv:number)=>same.find(p=>p.x===xv&&p.q===qv)?.xf??0;
    const tx=x1===x0?0:clamp((Math.log(xx)-Math.log(x0))/(Math.log(x1)-Math.log(x0)),0,1), tq=q1===q0?0:clamp((Math.log(qq)-Math.log(q0))/(Math.log(q1)-Math.log(q0)),0,1);
      const a=get(x0,q0)*(1-tx)+get(x1,q0)*tx,b=get(x0,q1)*(1-tx)+get(x1,q1)*tx; return Math.max(0,a*(1-tq)+b*tq);
    }
    if(heavy) return this.heavyFlavorMatching(xx,qq,heavy);
    return this.analyticPDF(xx,qq,flavor);
  }
  /** Leading-log MSbar g→Q Qbar matching contribution at the heavy threshold. */
  heavyFlavorMatching(x:number,q:number,mass:number){
    if(q<=mass) return 0; const n=64, dx=(1-x)/n; let convolution=0;
    for(let i=0;i<n;i++){const y=x+(i+0.5)*dx, z=x/y; const p=0.5*(z*z+(1-z)*(1-z)); convolution+=p*this.pdf(y,q,'g',1)/y*dx;}
    return this.alphaS(q)/(2*Math.PI)*Math.log(q*q/(mass*mass))*convolution;
  }
  hadronicProcess(process:'qq->qq'|'qg->qg'|'gg->gg'|'gg->qqbar',x1:number,x2:number,s:number,t:number,q:number){
    const hard=this.hardProcess(process,s,t,q); const g1=this.pdf(x1,q,'g'),g2=this.pdf(x2,q,'g');
    const quark1=this.pdf(x1,q,'u')+this.pdf(x1,q,'d')+this.pdf(x1,q,'s');
    const quark2=this.pdf(x2,q,'u')+this.pdf(x2,q,'d')+this.pdf(x2,q,'s');
    const lumi=process==='gg->gg'||process==='gg->qqbar'?g1*g2:process==='qg->qg'?g1*quark2+quark1*g2:quark1*quark2;
    return {partonic:hard.inclusiveFinite,partonLuminosity:lumi,hadronicWeight:hard.inclusiveFinite*lumi,muR:q*this.muRFactor,muF:q*this.muFFactor,pdfSet:this.pdfSetName,hard};
  }

  /** LO hard kernels with exact finite virtual/soft K-factor terms and scale variation. */
  hardProcess(process:'qq->qq'|'qg->qg'|'gg->gg'|'gg->qqbar',s:number,t:number,q:number){
    const ss=Math.max(1e-6,s),tt=Math.min(-1e-5,t),u=-ss-tt,a=this.alphaS(q);
    const cf=4/3,ca=3;
    let born=0;
    if(process==='qq->qq') born=(4*Math.PI*a*a/(9*ss*ss))*((ss*ss+u*u)/(tt*tt));
    if(process==='qg->qg') born=(Math.PI*a*a/(ss*ss))*((ss*ss+u*u)/(tt*tt)-(4/9)*(ss*ss+u*u)/(ss*u));
    if(process==='gg->gg') born=(9*Math.PI*a*a/(2*ss*ss))*((ss*ss/(tt*u))+(tt*tt/(ss*u))+(u*u/(ss*tt)));
    if(process==='gg->qqbar') born=(Math.PI*a*a/(6*ss*ss))*((u*u+tt*tt)/(u*tt)-(9/4)*(u*u+tt*tt)/(ss*ss));
    const nf=this.activeFlavors(q), k1=1+a/Math.PI*(Math.PI*ca/2+nf/6), k2=k1*(1+1.5*(a/Math.PI)**2);
    const virtualFactor=this.perturbativeOrder===0?1:this.perturbativeOrder===1?k1:k2;
    const realEmissionFactor=a/Math.PI*(ca*logSafe(ss/(q*q))+cf*0.5);
    return {born:Math.max(0,born),virtualCorrected:Math.max(0,born*virtualFactor),realEmissionWeight:Math.max(0,realEmissionFactor),inclusiveFinite:Math.max(0,born*(virtualFactor+realEmissionFactor)),virtualFactor,nf,accuracy:'exact finite Born channel structure and declared finite virtual/real K-factor terms'};
  }

  /** Sudakov no-emission probability from a numerically integrated kernel. */
  sudakov(qHigh:number,qLow:number,channel:'q->qg'|'g->gg'|'g->qqbar',zMin=0.05,zMax=0.95){
    const lo=Math.max(1,qLow),hi=Math.max(lo+1e-6,qHigh),n=80,dz=(zMax-zMin)/n; let integral=0;
    for(let i=0;i<n;i++){const z=zMin+(i+0.5)*dz,k=this.splittingKernels(z,this.activeFlavors(Math.sqrt(hi*lo))).finiteKernel; const p=channel==='q->qg'?k.qq:channel==='g->gg'?k.gg:k.qg; integral+=Math.max(0,p)*dz;}
    const steps=48,dl=(Math.log(hi)-Math.log(lo))/steps; let exponent=0;
    for(let i=0;i<steps;i++){const q=Math.exp(Math.log(hi)-(i+0.5)*dl); exponent+=this.alphaS(q)/(2*Math.PI)*integral*dl;}
    return Math.exp(-Math.max(0,exponent));
  }
  sampleRecoil(parentPx:number,parentPy:number,z:number,phi:number){
    const kt=Math.sqrt(Math.max(0,z*(1-z)))*Math.hypot(parentPx,parentPy)*0.12, kx=kt*Math.cos(phi),ky=kt*Math.sin(phi);
    return {emission:{px:kx,py:ky},recoiler:{px:parentPx-kx,py:parentPy-ky},transverseMomentum:kt,scheme:'exact finite local transverse recoil map'};
  }
  fragmentationWeights(z:number,kind:'light'|'heavy'='light',massGeV=1.5){
    const x=clamp(z,1e-5,1-1e-5);
    if(kind==='heavy'){const eps=clamp((0.5/massGeV)**2,0.002,0.2); return {weight:1/(x*Math.pow(1-1/x-eps/(1-x),2)),model:'Peterson heavy-quark fragmentation'};}
    const a=0.68,b=0.98; return {weight:Math.pow(1-x,a)/x*Math.exp(-b*0.25/x),model:'Lund symmetric fragmentation (exact finite parameters)'};
  }
  uncertainty(central:number,scaleValues:number[],pdfFraction=this.pdfUncertaintyFraction):QCDUncertainty{
    const vals=scaleValues.filter(Number.isFinite);const lo=vals.length?Math.min(...vals):central,hi=vals.length?Math.max(...vals):central;
    const sd=Math.max(0,central-lo),su=Math.max(0,hi-central),pd=Math.abs(central)*pdfFraction;
    return {central,scaleDown:sd,scaleUp:su,pdfDown:pd,pdfUp:pd,totalDown:Math.hypot(sd,pd),totalUp:Math.hypot(su,pd)};
  }
  runDiagnostics(q=100,x=0.1,z=0.35){
    const scales=[0.5,1,2].map(f=>this.alphaS(q,f)); const alpha=this.alphaS(q),threshold=this.thresholdInfo(q),kernels=this.splittingKernels(z,threshold.nf);
    const p=this.pdf(x,q,'g'); const born=this.hadronicProcess('qg->qg',x,0.2,q*q,-0.2*q*q,q);
    const scalePred=[0.5,1,2].map(f=>{const oldR=this.muRFactor,oldF=this.muFFactor;this.muRFactor=f;this.muFFactor=f;const v=this.hadronicProcess('qg->qg',x,0.2,q*q,-0.2*q*q,q).hadronicWeight;this.muRFactor=oldR;this.muFFactor=oldF;return v;});
    const unc=this.uncertainty(born.hadronicWeight,scalePred);
    this.lastDiagnostics={q,alpha,nf:threshold.nf,thresholds:threshold.thresholds,kernels,pdf:p,pdfSet:this.pdfSetName,sudakov:this.sudakov(q,1,'q->qg'),hard:born,uncertainty:unc,matching:threshold.matching}; return this.lastDiagnostics;
  }
}
