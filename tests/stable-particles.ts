import assert from 'node:assert/strict';
import {ExactPhysicsEngine, invariantEnergy, addFour, RADIATION_LIMITS} from '../src/physics/ExactPhysicsEngine';
import {LIGHT_SPEED,simulationMass} from '../src/physics/catalog';
const originalRandom=Math.random;
try {
  // Unit checks with deterministic random numbers and intact physics handlers.
  Math.random=()=>0;
  const e=new ExactPhysicsEngine(800,600);
  Object.assign(e.settings,{radiationEnabled:true,bremsstrahlungEnabled:true,gluonRadiationEnabled:true});
  e.spawnNucleon('proton',400,300);
  const members=[...e.particles];
  for(const p of members) assert.deepEqual(e.radiationChannels(p),{photon:false,gluon:false},'internal nucleon partners must not generate an external shower');
  const electron=e.addParticle({kind:'electron',x:400,y:300});
  assert.deepEqual(e.radiationChannels(members[0]),{photon:true,gluon:false},'charged external partner cannot trigger the gluon channel');
  const outsider=e.addParticle({kind:'up',x:400,y:300,color:'red'});
  assert.equal(e.radiationChannels(members[0]).gluon,true,'external quark allows a gluon-channel trigger');
  e.removeParticle(electron.id);e.removeParticle(outsider.id);
  e.settings.magneticFieldBiasZ=1;
  assert.deepEqual(e.radiationChannels(members[0]),{photon:true,gluon:false},'background magnetic field must not trigger gluon emission');
  e.settings.magneticFieldBiasZ=0;
  // Disabling fragmentation must not silently run an alternate pair creator.
  const f=new ExactPhysicsEngine(800,600);f.settings.lundFragmentationEnabled=false;f.settings.cornellConfinementEnabled=false;
  const q=f.addParticle({kind:'up',x:100,y:100,color:'red'}),aq=f.addParticle({kind:'up',x:400,y:100,isAntiparticle:true,color:'red'});
  f.createBond(q,aq);f.settings.confinementTension=1000;f.computeLongRangeConfinement(1);
  assert.equal(f.particles.length,2);assert.equal(f.bonds.size,1);
  // Existing Higgs event handlers must not turn soft or virtual gluons into a Higgs.
  const g=new ExactPhysicsEngine(800,600);
  const g1=g.addParticle({kind:'gluon',x:400,y:300,vx:LIGHT_SPEED,vy:0,isRadiation:true,energy:10});
  const g2=g.addParticle({kind:'gluon',x:401,y:300,vx:-LIGHT_SPEED,vy:0,isRadiation:true,energy:10});
  g.handleHiggsInteractions(1);assert.ok(g.particles.includes(g1)&&g.particles.includes(g2));assert.equal(g.particles.some(p=>p.kind==='higgs'),false);
  const v=new ExactPhysicsEngine(800,600);
  v.addParticle({kind:'gluon',x:400,y:300,isVirtual:true,energy:1e8});v.addParticle({kind:'gluon',x:401,y:300,isVirtual:true,energy:1e8});
  v.handleHiggsInteractions(1);assert.equal(v.particles.some(p=>p.kind==='higgs'),false);
  // An exactly on-shell, opposite-momentum pair remains supported.
  const r=new ExactPhysicsEngine(800,600);const energy=simulationMass('higgs')*LIGHT_SPEED**2/2;
  const a=r.addParticle({kind:'gluon',x:400,y:300,vx:LIGHT_SPEED,vy:0,isRadiation:true,energy});
  const b=r.addParticle({kind:'gluon',x:401,y:300,vx:-LIGHT_SPEED,vy:0,isRadiation:true,energy});
  const before=addFour(r.fourMomentum(a),r.fourMomentum(b));r.handleHiggsInteractions(1);
  const higgs=r.particles.find(p=>p.kind==='higgs');assert.ok(higgs);const after=r.fourMomentum(higgs);
  for(const k of ['E','px','py'] as const)assert.ok(Math.abs(before[k]-after[k])<1e-7*Math.max(1,Math.abs(before[k])));
  assert.ok(Math.abs(invariantEnergy(after)-2*energy)<1e-6);
  // Below threshold, even a real e+/e− pair must not become Z+H.
  const hs=new ExactPhysicsEngine(800,600);
  const low1=hs.addParticle({kind:'electron',x:200,y:200,vx:0,vy:0}), low2=hs.addParticle({kind:'electron',isAntiparticle:true,x:201,y:200,vx:0,vy:0});
  hs.handleHiggsInteractions(1);assert.ok(hs.particles.includes(low1)&&hs.particles.includes(low2));
  // Above the 2-body threshold, output four-momenta are sampled on shell.
  const hi=new ExactPhysicsEngine(800,600);
  const hi1=hi.addParticle({kind:'electron',x:200,y:200,vx:0,vy:0}),hi2=hi.addParticle({kind:'electron',isAntiparticle:true,x:201,y:200,vx:0,vy:0});
  const E=(simulationMass('higgs')+simulationMass('z_boson'))*LIGHT_SPEED**2*.6;
  const mom=Math.sqrt(E*E-(hi1.mass*LIGHT_SPEED**2)**2)/LIGHT_SPEED;
  hi.setFourMomentum(hi1,{E,px:mom,py:0});hi.setFourMomentum(hi2,{E,px:-mom,py:0});
  const incoming=addFour(hi.fourMomentum(hi1),hi.fourMomentum(hi2));hi.handleHiggsInteractions(1);
  const h=hi.particles.find(p=>p.kind==='higgs'),z=hi.particles.find(p=>p.kind==='z_boson');assert.ok(h&&z);
  const outgoing=addFour(hi.fourMomentum(h),hi.fourMomentum(z));
  for(const k of ['E','px','py'] as const) assert.ok(Math.abs(incoming[k]-outgoing[k])<1e-8*Math.max(1,incoming.E));
  // Public annihilation cannot delete two unrelated species or bypass QED toggle.
  const annih=new ExactPhysicsEngine(800,600), el=annih.addParticle({kind:'electron',x:1,y:1}), antiMu=annih.addParticle({kind:'muon',x:2,y:1,isAntiparticle:true});
  assert.equal(annih.handleAnnihilation(el,antiMu),false);
  const positron=annih.addParticle({kind:'electron',x:2,y:1,isAntiparticle:true});annih.settings.qedInteractionsEnabled=false;
  assert.equal(annih.handleAnnihilation(el,positron),false);
  assert.ok(annih.particles.includes(el)&&annih.particles.includes(positron));
  // Brush-style photons and gluons are real massless packets and do not expire.
  // Stub unrelated heavy lattice/packet dynamics, but exercise the actual update
  // loop, radiation transport, expiration, and removal paths for >170 ticks.
  const transport=new ExactPhysicsEngine(800,600); const internals:any=transport;
  internals.planarGaugeQFT.advance=()=>{};internals.quantumLinkGauge.advance=()=>{};
  internals.updatePlanarManyBodyState=()=>{};
  Object.assign(transport.settings,{subSteps:1,maxwellFieldEnabled:false,relativisticQuantumMotionEnabled:false,
    qedInteractionsEnabled:false,weakForceEnabled:false,strongForceEnabled:false,higgsFieldEnabled:false});
  const photon=transport.addParticle({kind:'photon',x:100,y:100,vx:LIGHT_SPEED,vy:0});
  const gluon=transport.addParticle({kind:'gluon',x:200,y:200,vx:LIGHT_SPEED,vy:0});
  const stable=transport.addParticle({kind:'electron',x:300,y:300,vx:0,vy:0});
  const temporary=transport.addParticle({kind:'photon',x:100,y:400,vx:LIGHT_SPEED,vy:0,energy:3,lifetime:2});
  assert.ok(photon.isRadiation && gluon.isRadiation && !gluon.isVirtual);
  assert.equal(photon.mass,0); assert.equal(gluon.mass,0);
  for(let i=0;i<1600;i++)transport.update(1);
  assert.ok(transport.particles.includes(photon)&&transport.particles.includes(gluon)&&transport.particles.includes(stable));
  assert.equal(transport.particles.includes(temporary),false);
  assert.equal(transport.radiationStats.depositedCount,1);
  assert.equal(transport.radiationStats.depositedEnergy,3);
  assert.ok(RADIATION_LIMITS.maxPackets>0);
  console.log('Stable particle and radiation regression tests passed');
} finally {Math.random=originalRandom;}
