import assert from 'node:assert/strict';
import { JointFockBasis, JointFockState, reducedDensityMatrix, reducedEnsemble, evolvePairConversion, type FermionMode } from '../src/physics/joint/JointFockState';
const close=(a:number,b:number,t=1e-12)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const mode=(species:string,antiparticle=false):FermionMode=>({species,flavor:species,antiparticle,orbital:{kind:'site',x:0,y:0},spinor:0,color:null,internal:'singlet'});
const e=mode('electron'), anti=mode('electron',true), nu=mode('neutrino');
const basis=new JointFockBasis([e,anti,nu],[{label:'photon k0',cutoff:3},{label:'scalar k1',cutoff:2}]);
assert.throws(()=>new JointFockBasis([e,e],[]));
assert.throws(()=>new JointFockState(basis,[{config:{fermions:0n,bosons:[4,0]},amplitude:{re:1,im:0}}]));
const vacuum=JointFockState.vacuum(basis);
let two=vacuum.boson(0,true).boson(0,true);
close(two.normSquared(),2);close(two.boson(0,false).normSquared(),4);
const ab=vacuum.fermion(0,true).fermion(1,true).entries()[0];
const ba=vacuum.fermion(1,true).fermion(0,true).entries()[0];
close(ab.amplitude.re,-ba.amplitude.re);
assert.equal(vacuum.fermion(0,true).fermion(0,true).entries().length,0);
// Three-way GHZ: each single-mode reduced state is maximally mixed.
const ghz=new JointFockState(basis,[
 {config:{fermions:0n,bosons:[0,0]},amplitude:{re:Math.SQRT1_2,im:0}},
 {config:{fermions:3n,bosons:[1,0]},amplitude:{re:0,im:Math.SQRT1_2}}
]);
let rho=reducedDensityMatrix(ghz,[0],[]);
close(rho.get('0|')!.get('0|')!.re,.5);close(rho.get('1|')!.get('1|')!.re,.5);
assert.equal(rho.get('0|')!.get('1|'),undefined);
rho=reducedDensityMatrix(ghz,[0,1],[0]);
close(rho.get('0|0')!.get('3|1')!.im,-.5);
const mixed=reducedEnsemble([{state:vacuum,weight:.25},{state:ghz,weight:.75}],[0],[]);
close(mixed.get('0|')!.get('0|')!.re,.625);close(mixed.get('1|')!.get('1|')!.re,.375);
assert.throws(()=>reducedDensityMatrix(ghz,[0,0],[]));
// Conversion produces matter-boson entanglement, preserves norm and is reversible.
const initial=vacuum.boson(0,true), g=.4, t=1.2;
const evolved=evolvePairConversion(initial,0,1,0,g,t);
close(evolved.normSquared(),1);rho=reducedDensityMatrix(evolved,[],[0]);
close(rho.get('0|1')!.get('0|1')!.re,Math.cos(g*t)**2);
close(rho.get('0|0')!.get('0|0')!.re,Math.sin(g*t)**2);
const back=evolvePairConversion(evolved,0,1,0,g,-t);
for(const entry of back.entries()) {
  close(entry.amplitude.re,entry.config.fermions===0n && entry.config.bosons[0]===1 ? 1 : 0);
  close(entry.amplitude.im,0);
}
close(back.normSquared(),1);
// Bose enhancement: transition frequency scales as sqrt(n).
const n2=vacuum.boson(0,true).boson(0,true); const out=evolvePairConversion(n2,0,1,0,g,t);
const pair=out.entries().find(e=>e.config.fermions===3n)!;
close(pair.amplitude.im**2,2*Math.sin(g*Math.SQRT2*t)**2);
console.log('Joint Fock tests passed');
