/** Four-site open square: one joint state of matter and four spin-1/2 U(1)
 * quantum links. This finite test model is not the live simulation.
 *
 * H = Σ_x m_x n_x + g Σ_edges (c†_tail U c_head + h.c.)
 *     - K(P+P†) + (electric/2) Σ_edges E².
 * Oriented links and P match U1PlaquetteTest. E=register-1/2 and
 * U=|1><0|.  All terms commute with local Gauss generators. Exact local
 * exponentials are composed with a symmetric second-order split, so the
 * finite-time-step map is unitary but does not conserve H exactly.
 * It is a one-component staggered toy model, not the full 2+1D Dirac theory.
 */
import {JointFockBasis, JointFockState, type FermionMode} from './JointFockState';
import {evolveGaugeHop, evolveElectric, type U1Link} from './U1LinkTest';
import {evolvePlaquette, plaquetteGaussNorms, type U1Plaquette} from './U1PlaquetteTest';

export interface SquareParameters { hopping:number; magnetic:number; electric:number; masses:readonly [number,number,number,number] }
export const squarePlaquette:U1Plaquette={registers:[0,1,2,3],matterModes:[0,1,2,3],background:[0,1,0,0]};
const edges:readonly [number,number][]=[[0,1],[1,2],[3,2],[0,3]];
const links:U1Link[]=edges.map(([site0Mode,site1Mode],fluxRegister)=>({site0Mode,site1Mode,fluxRegister,maxFlux:.5,background0:0,background1:0}));
function validate(state:JointFockState,p:SquareParameters,dt=0) {
  if(state.basis.fermions.length!==4 || state.basis.bosons.length!==4 || state.basis.bosons.some(x=>x.cutoff!==1) ||
     ![p.hopping,p.magnetic,p.electric,dt,...p.masses].every(Number.isFinite) || p.masses.length!==4) throw new RangeError('Invalid square state or Hamiltonian');
}
export function createSquareState() {
  const xy=[[0,0],[1,0],[1,1],[0,1]];
  const modes:FermionMode[]=xy.map(([x,y])=>({species:'test fermion',flavor:'f',antiparticle:false,orbital:{kind:'site',x,y},spinor:0,color:null,internal:'unit charge'}));
  const basis=new JointFockBasis(modes,Array.from({length:4},(_,i)=>({label:`link ${i}`,cutoff:1})));
  // One fermion at site 1 and a static charge background at site 1.
  return new JointFockState(basis,[{config:{fermions:2n,bosons:[0,0,1,1]},amplitude:{re:1,im:0}}]);
}
function massStep(state:JointFockState,p:SquareParameters,dt:number) {
  return new JointFockState(state.basis,state.entries().map(({config,amplitude:z})=>{
    let energy=0;for(let i=0;i<4;i++)if(config.fermions&(1n<<BigInt(i)))energy+=p.masses[i];
    const angle=-energy*dt,c=Math.cos(angle),s=Math.sin(angle);
    return {config,amplitude:{re:c*z.re-s*z.im,im:s*z.re+c*z.im}};
  }));
}
/** Symmetric split. Hopping is applied forwards and backwards around H_B. */
export function evolveSquare(state:JointFockState,p:SquareParameters,dt:number) {
  validate(state,p,dt);let next=massStep(state,p,dt/2);
  for(const link of links) next=evolveElectric(next,link,p.electric,dt/2);
  for(const link of links) next=evolveGaugeHop(next,link,p.hopping,dt/2);
  next=evolvePlaquette(next,squarePlaquette,p.magnetic,dt);
  for(let i=links.length-1;i>=0;i--) next=evolveGaugeHop(next,links[i],p.hopping,dt/2);
  for(let i=links.length-1;i>=0;i--) next=evolveElectric(next,links[i],p.electric,dt/2);
  return massStep(next,p,dt/2);
}
const key=(f:bigint,b:readonly number[])=>`${f.toString(16)}|${b.join(',')}`;
function signBelow(f:bigint,i:number) {let n=f&((1n<<BigInt(i))-1n),s=1;while(n){n&=n-1n;s=-s;}return s;}
/** Exact expectation values of the finite Hamiltonian and gauge-invariant
 * link matter current J=i[H_hop,E]=2g Im<c†_tail U c_head>. This sign
 * describes flow head→tail; magnetic dynamics also contributes to dE/dt. Values are normalized
 * by the measured norm; no mean-field factorization is used. */
export function squareObservables(state:JointFockState,p:SquareParameters) {
  validate(state,p);const entries=state.entries(),norm=state.normSquared();
  if(!(norm>0)||!Number.isFinite(norm))throw new RangeError('State must have finite nonzero norm');
  const byKey=new Map(entries.map(e=>[key(e.config.fermions,e.config.bosons),e.amplitude]));
  const occupations=[0,0,0,0],flux=[0,0,0,0], currents=[0,0,0,0];let energy=0;
  for(const {config:c,amplitude:z} of entries) {
    const weight=(z.re*z.re+z.im*z.im)/norm;
    for(let i=0;i<4;i++) {
      if(c.fermions&(1n<<BigInt(i))){occupations[i]+=weight;energy+=p.masses[i]*weight;}
      const e=c.bosons[i]-.5;flux[i]+=weight*e;energy+=.5*p.electric*e*e*weight;
      const [tail,head]=edges[i], bt=1n<<BigInt(tail), bh=1n<<BigInt(head);
      if((c.fermions&bt)!==0n||(c.fermions&bh)===0n||c.bosons[i]!==0)continue;
      const targetFlux=[...c.bosons];targetFlux[i]=1;
      const target=byKey.get(key(c.fermions^bt^bh,targetFlux));if(!target)continue;
      const sign=signBelow(c.fermions,head)*signBelow(c.fermions^bh,tail);
      const re=sign*(target.re*z.re+target.im*z.im)/norm;
      const im=sign*(target.re*z.im-target.im*z.re)/norm;
      energy+=2*p.hopping*re;currents[i]+=2*p.hopping*im;
    }
    if(c.bosons[0]===0&&c.bosons[1]===0&&c.bosons[2]===1&&c.bosons[3]===1){
      const target=byKey.get(key(c.fermions,[1,1,0,0]));
      if(target)energy-=2*p.magnetic*(target.re*z.re+target.im*z.im)/norm;
    }
  }
  return {norm, occupations, flux, currents, energy, gaussNorms:plaquetteGaussNorms(state,squarePlaquette)};
}

/** Matrix-free action of the same finite Hamiltonian on the joint state.
 * No projection, normalization or amplitude pruning is performed. */
export function applySquareHamiltonian(state:JointFockState,p:SquareParameters):JointFockState {
  validate(state,p);
  const out:import('./JointFockState').Entry[]=[];
  const emit=(fermions:bigint,bosons:readonly number[],z:{re:number;im:number},factor:number)=>{
    if(factor!==0)out.push({config:{fermions,bosons},amplitude:{re:factor*z.re,im:factor*z.im}});
  };
  for(const {config:c,amplitude:z} of state.entries()) {
    let diagonal=0;
    for(let i=0;i<4;i++) {
      if(c.fermions&(1n<<BigInt(i)))diagonal+=p.masses[i];
      diagonal+=.5*p.electric*(c.bosons[i]-.5)**2;
    }
    emit(c.fermions,c.bosons,z,diagonal);
    for(let i=0;i<4;i++) {
      const [tail,head]=edges[i],bt=1n<<BigInt(tail),bh=1n<<BigInt(head);
      const mask=c.fermions&(bt|bh),n=c.bosons[i];
      // Both A=c†tail U c_head and A† use the sign of the A source.
      if(!((mask===bh&&n===0)||(mask===bt&&n===1)))continue;
      const original=mask===bh?c.fermions:c.fermions^bt^bh;
      const sign=signBelow(original,head)*signBelow(original^bh,tail);
      const flux=[...c.bosons];flux[i]=1-n;
      emit(c.fermions^bt^bh,flux,z,p.hopping*sign);
    }
    const a=c.bosons;
    if((a[0]===0&&a[1]===0&&a[2]===1&&a[3]===1)||(a[0]===1&&a[1]===1&&a[2]===0&&a[3]===0)) {
      emit(c.fermions,a.map(n=>1-n),z,-p.magnetic);
    }
  }
  return new JointFockState(state.basis,out);
}

/** Approximate exp(-i H t) for the *unsplit* finite Hamiltonian by a scaled
 * Taylor series with an operator-norm truncation bound. The bound excludes
 * floating-point roundoff; this is not exact continuum/QFT evolution. */
export function evolveSquareUnsplit(state:JointFockState,p:SquareParameters,dt:number,tolerance=1e-11) {
  validate(state,p,dt);
  if(!Number.isFinite(tolerance)||tolerance<1e-14||tolerance>1e-3) throw new RangeError('Tolerance must be between 1e-14 and 1e-3');
  const normBound=p.masses.reduce((s,x)=>s+Math.abs(x),0)+4*Math.abs(p.hopping)+Math.abs(p.magnetic)+.5*Math.abs(p.electric);
  const total=Math.abs(dt)*normBound;
  if(!Number.isFinite(total)||total>40) throw new RangeError('Time or Hamiltonian scale exceeds the supported finite-sector limit');
  const steps=Math.max(1,Math.ceil(total/.5)), h=dt/steps, r=total/steps;
  let order=0,termBound=1,tailBound=Math.exp(r);
  const target=tolerance/(steps*Math.exp(total));
  // e^r r^(N+1)/(N+1)! bounds the tail of a Taylor exponential.
  while(tailBound>target && order<80) {
    order++;termBound*=r/order;
    tailBound=Math.exp(r)*termBound*r/(order+1);
  }
  if(tailBound>target) throw new RangeError('Requested truncation bound could not be reached');
  let result=state;
  for(let step=0;step<steps;step++) {
    let term=result, sum=result;
    for(let n=1;n<=order;n++) {
      const applied=applySquareHamiltonian(term,p);
      term=new JointFockState(state.basis,applied.entries().map(({config,amplitude:z})=>({config,amplitude:{re:h*z.im/n,im:-h*z.re/n}})));
      sum=new JointFockState(state.basis,[...sum.entries(),...term.entries()]);
    }
    result=sum;
  }
  return {state:result,steps,order,relativeTruncationBound:steps*Math.exp(total)*tailBound};
}
