import assert from 'node:assert/strict';
import { PlanarGaugeQFTEngine } from '../src/physics/PlanarGaugeQFTEngine';
const names=['a3x','a3y','a2x','a2y','e3x','e3y','e2x','e2y','eBX','eBY','rho3','rho2','rhoY'];
function setup(n:number,seedStart:number) {
  const engine=new PlanarGaugeQFTEngine(1200,800,n), e:any=engine;let seed=seedStart;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const name of names) for(let i=0;i<e[name].length;i++) e[name][i]=(rand()-.5)*.1;
  // Make U(1) incompatible, so both paths intentionally skip its Poisson step.
  e.rhoY.fill(.01);
  return engine;
}
const close=(a:number,b:number,eps=2e-12)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
// Slow reference retains the original fresh full-divergence calculation on
// every iteration, including the same stopping rule and electric update.
function reference(engine:PlanarGaugeQFTEngine,iters:number,tol:number) {
  const e:any=engine;
  for(const [nc,rho,ex,ey] of [[3,e.rho2,e.e2x,e.e2y],[8,e.rho3,e.e3x,e.e3y]] as [3|8,Float64Array,Float64Array,Float64Array][]) {
    for(let it=0;it<iters;it++) {
      const div=engine.computeGaugeCovariantDivergence(), data=nc===3?div.div2:div.div3, res=new Float64Array(data.length);let max=0;
      for(let i=0;i<res.length;i++){res[i]=data[i]-rho[i];max=Math.max(max,Math.abs(res[i]));}
      if(max<tol) break;
      for(let i=0;i<res.length;i++){const shift=.24*res[i];ex[i]-=.5*shift;ey[i]-=.5*shift;}
    }
  }
}
for(const n of [4,6,12]) for(const seed of [7,471]) {
  const fast=setup(n,seed), slow=setup(n,seed), a:any=fast,b:any=slow;
  // Compare cached linear maps with full matrix divergence on nonzero links.
  const direct=fast.computeGaugeCovariantDivergence();
  for(const nc of [3,8] as const){
    const out=new Float64Array(n*n*nc);a.familyDivergence(nc,a.buildRightAdjoint(nc),out);
    const original=nc===3?direct.div2:direct.div3;
    out.forEach((v,i)=>close(v,original[i]));
  }
  reference(slow,5,1e-12);fast.projectExactPhysicalGauss(5,1e-12);
  for(const field of ['e2x','e2y','e3x','e3y']) for(let i=0;i<a[field].length;i++)close(a[field][i],b[field][i]);
  // Change the gauge links and repeat; caches must not persist between calls.
  a.a3x[0]+=.2;b.a3x[0]+=.2;a.a2y[0]-=.1;b.a2y[0]-=.1;
  reference(slow,3,1e-12);fast.projectExactPhysicalGauss(3,1e-12);
  for(const field of ['e2x','e2y','e3x','e3y']) for(let i=0;i<a[field].length;i++)close(a[field][i],b[field][i]);
}
console.log('Gauge optimization regression tests passed');
