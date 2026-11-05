import assert from 'node:assert/strict';
import {ElectromagneticField} from '../src/physics/ElectromagneticField';
import {ExactPhysicsEngine} from '../src/physics/ExactPhysicsEngine';
function residual(f:ElectromagneticField, mode:'torus'|'bounce') {
  let max=0;
  for(let y=0;y<f.rows;y++)for(let x=0;x<f.cols;x++) {
    const k=f.idx(x,y);
    const xPrev=x>0?f.Ex[f.idx(x-1,y)]:(mode==='torus'?f.Ex[f.idx(f.cols-1,y)]:0);
    const yPrev=y>0?f.Ey[f.idx(x,y-1)]:(mode==='torus'?f.Ey[f.idx(x,f.rows-1)]:0);
    const div=(f.Ex[k]-xPrev+f.Ey[k]-yPrev)/f.cellSize;
    max=Math.max(max,Math.abs(div-(f.rho[k]/f.epsilon0-f.gaussUncompensatedMean)));
  }
  return max;
}
for(const mode of ['torus','bounce'] as const) for(const netCharge of [false,true]) {
  const f=new ElectromagneticField(140,95,16);
  let total=0;
  for(let i=0;i<f.totalCells;i++) {
    f.Ex[i]=Math.sin(i*.71)*2;f.Ey[i]=Math.cos(i*.57)*2;
    f.rho[i]=Math.sin(i*.43)*.01+(netCharge?.1:0);total+=f.rho[i];
  }
  if(!netCharge){for(let i=0;i<f.totalCells;i++)f.rho[i]-=total/f.totalCells;}
  f.projectGaussConstraint(mode);
  assert.ok(residual(f,mode)<2e-7,`${mode}: residual ${residual(f,mode)}`);
  const x=Float32Array.from(f.Ex),y=Float32Array.from(f.Ey);
  f.projectGaussConstraint(mode);
  for(let i=0;i<f.totalCells;i++) {
    assert.ok(Math.abs(f.Ex[i]-x[i])<3e-6);assert.ok(Math.abs(f.Ey[i]-y[i])<3e-6);
  }
  assert.ok(netCharge ? Math.abs(f.gaussUncompensatedMean)>.05 : Math.abs(f.gaussUncompensatedMean)<1e-8);
}
// Repeated projection of a net-charged source used to grow exponentially.
const f=new ElectromagneticField(120,120,16);f.rho[f.idx(3,3)]=1;
for(let i=0;i<500;i++){f.projectGaussConstraint('torus');assert.ok(residual(f,'torus')<1e-7);}
assert.ok(Math.max(...f.Ex.map(Math.abs))<100);
// Reproduction uses real update, Maxwell, packet, Fock and gauge paths.
// Previously this exact seed produced NaN coordinates at tick 33.
const saved=Math.random;let seed=17;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try {
  const engine=new ExactPhysicsEngine(800,600);
  const quark=engine.addParticle({kind:'up',x:400,y:300,color:'red',vx:0,vy:0});
  for(let i=0;i<45;i++) {
    engine.update(1);
    assert.ok(engine.particles.includes(quark),`up quark removed at tick ${i}`);
    assert.ok([quark.x,quark.y,quark.vx,quark.vy,quark.sigma,quark.packetEnergy,...(quark.localE||[]),...(quark.localB||[])].every(Number.isFinite),`non-finite quark state at tick ${i}`);
    for(const name of ['Ex','Ey','Bz'] as const) assert.ok(engine.emField[name].every(Number.isFinite),`${name} non-finite at tick ${i}`);
  }
  assert.equal(engine.particles.length,1);assert.equal(quark.decayRate,0);
} finally {Math.random=saved;}
console.log('Maxwell Gauss projection and full-engine particle visibility regressions passed');
