import {performance} from 'node:perf_hooks';
import {PlanarGaugeQFTEngine} from '../src/physics/PlanarGaugeQFTEngine';
const e:any=new PlanarGaugeQFTEngine(1200,800,12);const stats:Record<string,{ms:number,count:number}>={};
for(const name of ['projectExactPhysicalGauss','computeGaugeCovariantDivergence','buildRightAdjoint','linkDiagnostics','updateDiagnostics','advanceFock','covariantHiggsStep','solveScalarPotentials']) {
 const original=e[name].bind(e);stats[name]={ms:0,count:0};e[name]=(...args:any[])=>{let t=performance.now();let result=original(...args);stats[name].ms+=performance.now()-t;stats[name].count++;return result;};
}
let t=performance.now();for(let i=0;i<4;i++)e.advance(.25,[],18,1);console.log(JSON.stringify({totalMs:performance.now()-t,stats},null,2));
