import assert from 'node:assert/strict';
import { fockCorrelations } from '../src/physics/FockCorrelations';
const close=(x:number,y:number)=>assert.ok(Math.abs(x-y)<1e-12, `${x} != ${y}`);
// |00> + i|11>, with c0 c1 |11> = -|00>.
let q=fockCorrelations([1,0,0,0],[0,0,0,1],2);
close(q.norm,2); close(q.normal[0][0].re,.5); close(q.normal[1][1].re,.5);
close(q.pair[0][1].im,-.5); close(q.pair[1][0].im,.5); close(q.pair[0][0].re,0);
// (|10> + i|01>)/sqrt(2), tests off-diagonal phases and Hermiticity.
q=fockCorrelations([0,1,0,0],[0,0,1,0],2);
close(q.normal[0][1].im,.5); close(q.normal[1][0].im,-.5);
close(q.pair[0][1].re,0); close(q.pair[0][1].im,0);
assert.throws(()=>fockCorrelations([0,0],[0,0],1));
console.log('Fock correlation tests passed');
