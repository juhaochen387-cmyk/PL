import assert from 'node:assert/strict';
import {createSquareState,evolveSquare,squareObservables,squarePlaquette,type SquareParameters} from '../src/physics/joint/U1MatterSquare';
import {plaquetteGaugeTransform} from '../src/physics/joint/U1PlaquetteTest';
import {JointFockState} from '../src/physics/joint/JointFockState';
const p:SquareParameters={hopping:.7,magnetic:.5,electric:.9,masses:[.3,-.3,.3,-.3]};
const close=(a:number,b:number,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const evolve=(s:JointFockState,t:number,n:number)=>{for(let i=0;i<n;i++)s=evolveSquare(s,p,t/n);return s;};
const initial=createSquareState(), evolved=evolve(initial,1.3,80);
const obs=squareObservables(evolved,p);close(obs.norm,1);obs.gaussNorms.forEach(g=>close(g,0));
close(obs.occupations.reduce((a,b)=>a+b,0),1);
assert.ok(obs.occupations[0]>1e-4 && obs.occupations[2]>1e-4,'matter propagates to multiple sites');
const map=(s:JointFockState)=>new Map(s.entries().map(e=>[`${e.config.fermions}:${e.config.bosons}`,e.amplitude]));
const eq=(a:JointFockState,b:JointFockState,t=1e-10)=>{const x=map(a),y=map(b);for(const k of new Set([...x.keys(),...y.keys()])) {const aa=x.get(k)||{re:0,im:0},bb=y.get(k)||{re:0,im:0};close(aa.re,bb.re,t);close(aa.im,bb.im,t);}};
eq(evolve(evolved,-1.3,80),initial);
// Gauge covariance on a generic nonphysical superposition, not only a physical state.
const generic=new JointFockState(initial.basis,[{config:{fermions:7n,bosons:[0,0,1,1]},amplitude:{re:.3,im:.2}},{config:{fermions:2n,bosons:[1,0,1,1]},amplitude:{re:.4,im:-.1}}]);
const angles=[.2,-.7,.3,1.1];
eq(evolveSquare(plaquetteGaugeTransform(generic,squarePlaquette,angles),p,.25),plaquetteGaugeTransform(evolveSquare(generic,p,.25),squarePlaquette,angles));
// Current continuity from the same hopping Hamiltonian, numerical derivative.
const eps=1e-5,left=squareObservables(evolveSquare(evolved,p,-eps),p),right=squareObservables(evolveSquare(evolved,p,eps),p);
const [j0,j1,j2,j3]=obs.currents,expected=[j0+j3,j1-j0,-j1-j2,j2-j3];
for(let i=0;i<4;i++)close((right.occupations[i]-left.occupations[i])/(2*eps),expected[i],1e-8);
// Symmetric splitting should converge quadratically with timestep; energy is
// calculated from the unsplit Hamiltonian and converges, not exact at finite dt.
const fine=evolve(initial,2,320), coarse=evolve(initial,2,10), medium=evolve(initial,2,20);
const distance=(a:JointFockState,b:JointFockState)=>{const x=map(a),y=map(b);let s=0;for(const k of new Set([...x.keys(),...y.keys()])){const aa=x.get(k)||{re:0,im:0},bb=y.get(k)||{re:0,im:0};s+=(aa.re-bb.re)**2+(aa.im-bb.im)**2;}return Math.sqrt(s);};
assert.ok(distance(coarse,fine)>3.5*distance(medium,fine));
const e0=squareObservables(initial,p).energy;
assert.ok(Math.abs(squareObservables(medium,p).energy-e0)<Math.abs(squareObservables(coarse,p).energy-e0));
console.log('Joint U(1) matter-square tests passed');

// Independent Hamiltonian action: Hermiticity and energy match the observable.
import {applySquareHamiltonian,evolveSquareUnsplit} from '../src/physics/joint/U1MatterSquare';
const inner=(a:JointFockState,b:JointFockState)=>{const bm=map(b);let re=0,im=0;for(const [k,z] of map(a)){const w=bm.get(k);if(w){re+=z.re*w.re+z.im*w.im;im+=z.re*w.im-z.im*w.re;}}return {re,im};};
const hc=applySquareHamiltonian(evolved,p),hgeneric=applySquareHamiltonian(generic,p);
const ab=inner(generic,hc), ba=inner(hgeneric,evolved);close(ab.re,ba.re);close(ab.im,ba.im);
const energy=inner(evolved,hc);close(energy.re/obs.norm,obs.energy);close(energy.im,0);
const exact=evolveSquareUnsplit(initial,p,2,1e-12);
assert.ok(exact.relativeTruncationBound<=1e-12);
close(exact.state.normSquared(),1,2e-11);
close(squareObservables(exact.state,p).energy,squareObservables(initial,p).energy,2e-11);
squareObservables(exact.state,p).gaussNorms.forEach(v=>close(v,0));
const restored=evolveSquareUnsplit(exact.state,p,-2,1e-12).state;eq(restored,initial,2e-11);
assert.ok(distance(evolve(initial,2,20),exact.state)<distance(evolve(initial,2,10),exact.state)/3.5);
// Analytic free diagonal phase, including the spin-half electric constant.
const diagonal:SquareParameters={hopping:0,magnetic:0,electric:.9,masses:[.3,-.3,.3,-.3]};
const d=evolveSquareUnsplit(initial,diagonal,2).state.entries()[0].amplitude;
close(d.re,Math.cos((-.3+.9/2)*2));close(d.im,-Math.sin((-.3+.9/2)*2));
assert.throws(()=>evolveSquareUnsplit(initial,p,2,0));
console.log('Unsplit finite-Hamiltonian tests passed');
// Exhaustive Hermiticity in the 256-dimensional occupation basis.
const configs=Array.from({length:256},(_,i)=>({fermions:BigInt(i>>4),bosons:Array.from({length:4},(_,j)=>(i>>j)&1)}));
const columns=configs.map(config=>map(applySquareHamiltonian(new JointFockState(initial.basis,[{config,amplitude:{re:1,im:0}}]),p)));
for(let i=0;i<configs.length;i++) for(let j=0;j<configs.length;j++) {
  const ik=`${configs[i].fermions}:${configs[i].bosons}`,jk=`${configs[j].fermions}:${configs[j].bosons}`;
  const x=columns[j].get(ik)||{re:0,im:0},y=columns[i].get(jk)||{re:0,im:0};close(x.re,y.re);close(x.im,-y.im);
}
const gt=plaquetteGaugeTransform(generic,squarePlaquette,angles);
eq(evolveSquareUnsplit(gt,p,.6).state,plaquetteGaugeTransform(evolveSquareUnsplit(generic,p,.6).state,squarePlaquette,angles),1e-10);
console.log('Exhaustive finite Hamiltonian Hermiticity and unsplit covariance passed');
