import assert from 'node:assert/strict';
import { DIRAC_2D_IRREP_PLUS, DIRAC_2D_IRREP_MINUS, matAnticommutator } from '../src/physics/Dirac2Plus1D';
import { SparseFockState } from '../src/physics/SparseFermionFockEngine';
import { wilsonEnergy, wilsonFreeAudit } from '../src/physics/Wilson2D';
const close=(a:number,b:number,t=1e-11)=>assert.ok(Math.abs(a-b)<t, `${a} != ${b}`);
for (const rep of [DIRAC_2D_IRREP_PLUS,DIRAC_2D_IRREP_MINUS]) {
  const gamma=[rep.gamma0,rep.gamma1,rep.gamma2];
  for(let mu=0;mu<3;mu++) for(let nu=0;nu<3;nu++) {
    const a=matAnticommutator(gamma[mu],gamma[nu]);
    for(let i=0;i<2;i++) for(let j=0;j<2;j++) {
      close(a[i][j].re,mu===nu && i===j ? (mu===0 ? 2 : -2) : 0);
      close(a[i][j].im,0);
    }
  }
}
// Exhaustive CAR on every basis configuration of four modes.
const add=(a:SparseFockState,b:SparseFockState,config:bigint) => {
  const x=a.amplitudes.get(config)||[0,0],y=b.amplitudes.get(config)||[0,0]; return [x[0]+y[0],x[1]+y[1]];
};
for(let mask=0;mask<16;mask++) for(let i=0;i<4;i++) for(let j=0;j<4;j++) {
  const state=new SparseFockState([{config:BigInt(mask),re:1,im:0}]);
  const a=state.applyCreation(j).applyAnnihilation(i),b=state.applyAnnihilation(i).applyCreation(j);
  const aa=state.applyAnnihilation(j).applyAnnihilation(i),bb=state.applyAnnihilation(i).applyAnnihilation(j);
  const cc=state.applyCreation(j).applyCreation(i),dd=state.applyCreation(i).applyCreation(j);
  for(let k=0;k<16;k++) {
    const cfg=BigInt(k), normal=add(a,b,cfg), an=add(aa,bb,cfg), cr=add(cc,dd,cfg);
    close(normal[0], i===j && k===mask ? 1:0); close(normal[1],0);
    close(an[0],0);close(an[1],0);close(cr[0],0);close(cr[1],0);
  }
}
// Independent numerical integration of the occupied-band Berry curvature.
function numericalChern(m:number,n=300) {
  let total=0; const h=2*Math.PI/n;
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) {
    const x=-Math.PI+(i+.5)*h,y=-Math.PI+(j+.5)*h;
    const sx=Math.sin(x),sy=Math.sin(y),cx=Math.cos(x),cy=Math.cos(y),z=m+2-cx-cy;
    const dot=-sx*sx*cy-cx*sy*sy+z*cx*cy;
    total+=-dot/(2*Math.hypot(sx,sy,z)**3)*h*h/(2*Math.PI);
  }
  return total;
}
for(const [m,expected] of [[1,0],[-1,1],[-3,-1],[-5,0]] as const) {
  assert.equal(wilsonFreeAudit(m,1,1).occupiedChern,expected);
  close(numericalChern(m),expected,1e-9);
}
for(const m of [0,-2,-4]) assert.equal(wilsonFreeAudit(m,1,1).occupiedChern,null);
close(wilsonEnergy(0,0,.3,1,1),.3);
close(wilsonEnergy(Math.PI,0,.3,1,1),2.3);
assert.throws(()=>wilsonFreeAudit(1,0,1));
console.log('Foundation tests passed: Clifford algebra, exhaustive four-mode CAR, Wilson bands');
