import assert from 'node:assert/strict';
import {JointFockBasis,JointFockState,type FermionMode} from '../src/physics/joint/JointFockState';
import {gaussNorms,evolveGaugeHop,evolveLinkStep,gaugeTransform,type U1Link} from '../src/physics/joint/U1LinkTest';
const close=(a:number,b:number,t=1e-11)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const f=(x:number):FermionMode=>({species:'fermion',flavor:'f',antiparticle:false,orbital:{kind:'site',x,y:0},spinor:0,color:null,internal:'unit charge'});
const basis=new JointFockBasis([f(0),f(1),f(2)],[{label:'flux register',cutoff:2}]);
const link:U1Link={site0Mode:0,site1Mode:1,fluxRegister:0,maxFlux:1,background0:0,background1:1};
// n0=0,n1=1,E=0 with neutralizing static charge at site 1.
const start=new JointFockState(basis,[{config:{fermions:2n,bosons:[1]},amplitude:{re:1,im:0}}]);
const state=evolveGaugeHop(start,link,.7,.8);
close(state.normSquared(),1);close(gaussNorms(state,link).site0,0);close(gaussNorms(state,link).site1,0);
close(state.entries().find(e=>e.config.fermions===1n)!.amplitude.im**2,Math.sin(.56)**2);
// Check covariance on a superposition including unphysical sectors and a spectator.
const generic=new JointFockState(basis,[
 {config:{fermions:6n,bosons:[1]},amplitude:{re:.3,im:.2}},
 {config:{fermions:5n,bosons:[2]},amplitude:{re:-.4,im:.1}},
 {config:{fermions:2n,bosons:[2]},amplitude:{re:.7,im:-.3}}, // cutoff-edge spectator
]);
const lhs=evolveLinkStep(gaugeTransform(generic,link,.4,-.6),link,.7,.9,.3);
const rhs=gaugeTransform(evolveLinkStep(generic,link,.7,.9,.3),link,.4,-.6);
const map=(s:JointFockState)=>new Map(s.entries().map(e=>[`${e.config.fermions}:${e.config.bosons}`,e.amplitude]));
const a=map(lhs),b=map(rhs);for(const [k,z] of a){close(z.re,b.get(k)!.re);close(z.im,b.get(k)!.im);}
close(lhs.normSquared(),generic.normSquared());
close(gaussNorms(lhs,link).site0,gaussNorms(generic,link).site0);
close(gaussNorms(lhs,link).site1,gaussNorms(generic,link).site1);
// Reversible split and boundary cannot raise flux above S.
const reverse=evolveLinkStep(evolveLinkStep(generic,link,.7,.9,.3),link,.7,.9,-.3);
for(const [k,z] of map(generic)){const r=map(reverse).get(k)!;close(z.re,r.re);close(z.im,r.im);}
assert.throws(()=>gaussNorms(start,{...link,maxFlux:2}));
console.log('U(1) quantum-link tests passed');
