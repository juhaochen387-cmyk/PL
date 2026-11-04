import assert from 'node:assert/strict';
import {JointFockBasis,JointFockState,type FermionMode} from '../src/physics/joint/JointFockState';
import {evolvePlaquette,plaquetteGaussNorms,plaquetteGaugeTransform,type U1Plaquette} from '../src/physics/joint/U1PlaquetteTest';
const close=(a:number,b:number,t=1e-12)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const fermion:FermionMode={species:'test',flavor:'f',antiparticle:false,orbital:{kind:'site',x:0,y:0},spinor:0,color:null,internal:'unit'};
const basis=new JointFockBasis([fermion],Array.from({length:4},(_,i)=>({label:`link ${i}`,cutoff:1})));
const p:U1Plaquette={registers:[0,1,2,3],matterModes:[0,null,null,null],background:[0,0,0,0]};
const entries=Array.from({length:32},(_,i)=>({config:{fermions:BigInt(i>>4),bosons:[(i>>0)&1,(i>>1)&1,(i>>2)&1,(i>>3)&1]},amplitude:{re:Math.sin(i+1)/8,im:Math.cos(i+1)/8}}));
const state=new JointFockState(basis,entries);
const map=(s:JointFockState)=>new Map(s.entries().map(e=>[`${e.config.fermions}:${e.config.bosons}`,e.amplitude]));
const equal=(a:JointFockState,b:JointFockState)=>{const aa=map(a),bb=map(b);assert.equal(aa.size,bb.size);for(const [k,z] of aa){close(z.re,bb.get(k)!.re);close(z.im,bb.get(k)!.im);}};
const evolved=evolvePlaquette(state,p,.8,.7);close(evolved.normSquared(),state.normSquared());
const before=plaquetteGaussNorms(state,p), after=plaquetteGaussNorms(evolved,p);before.forEach((v,i)=>close(v,after[i]));
const theta=[.2,-.7,.3,1.1];
equal(evolvePlaquette(plaquetteGaugeTransform(state,p,theta),p,.8,.7),plaquetteGaugeTransform(evolved,p,theta));
equal(evolvePlaquette(evolved,p,.8,-.7),state);
// Gauge-invariant loop oscillates coherently into the opposite loop.
const loop=new JointFockState(basis,[{config:{fermions:0n,bosons:[0,0,1,1]},amplitude:{re:1,im:0}}]);
const oscillated=evolvePlaquette(loop,p,.8,.7);plaquetteGaussNorms(oscillated,p).forEach(v=>close(v,0));
const pair=oscillated.entries().find(e=>e.config.bosons.join(',')==='1,1,0,0')!;
close(pair.amplitude.im,Math.sin(.56));
// Both cutoffs and duplicate registers are rejected rather than silently altered.
assert.throws(()=>evolvePlaquette(loop,{...p,registers:[0,0,2,3]},1,1));
console.log('U(1) quantum-plaquette tests passed');
