import {performance} from 'node:perf_hooks';
import {PlanarGaugeQFTEngine} from '../src/physics/PlanarGaugeQFTEngine';
const engine=new PlanarGaugeQFTEngine(1200,800,12);const e:any=engine;
let seed=1234;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const name of ['a3x','a3y','a2x','a2y','e3x','e3y','e2x','e2y','eBX','eBY','rho3','rho2','rhoY']) for(let i=0;i<e[name].length;i++) e[name][i]=(random()-.5)*.06;
for(let i=0;i<2;i++)engine.projectExactPhysicalGauss();
const start=performance.now();for(let i=0;i<3;i++)engine.projectExactPhysicalGauss();const end=performance.now();
console.log(`Gauge relaxation: ${((end-start)/3).toFixed(2)} ms per projection (12×12, deterministic populated fields; Node.js).`);
