/**
 * Isolated two-site U(1) quantum-link test, in a fixed Jordan–Wigner basis.
 * Flux is represented by one bounded integer-valued register (with integer or half-integer flux offset) carried in the
 * JointFockState occupation tuple (NOT an oscillator). U|e> = |e+1> unless
 * e is at the upper cutoff; U† reverses it. Thus [E,U]=U, including edges,
 * but U is not unitary at the truncation boundary.
 *
 * H_hop = g(c†_0 U c_1 + c†_1 U† c_0), H_E = electricCoupling*E²/2.
 * G0=E-n0+b0, G1=-E-n1+b1. Both commute with H. This is a single
 * open link, not the live spatial gauge system and not an SU(N) model.
 */
import { JointFockState, type Configuration, type Entry } from './JointFockState';

export interface U1Link {site0Mode:number; site1Mode:number; fluxRegister:number; maxFlux:number; background0:number; background1:number}
function validate(state:JointFockState, link:U1Link) {
  const {site0Mode:i,site1Mode:j,fluxRegister:b,maxFlux:s,background0,background1}=link;
  if(!Number.isInteger(i)||!Number.isInteger(j)||i<0||j<0||i===j||i>=state.basis.fermions.length||j>=state.basis.fermions.length ||
    !Number.isInteger(b)||b<0||b>=state.basis.bosons.length || !Number.isSafeInteger(2*s)||s<0 || state.basis.bosons[b].cutoff!==2*s ||
    !Number.isFinite(background0)||!Number.isFinite(background1)) throw new RangeError('Invalid U(1) link definition');
}
const configKey=(c:Configuration)=>`${c.fermions.toString(16)}|${c.bosons.join(',')}`;
function parity(f:bigint,k:number) {let x=f&((1n<<BigInt(k))-1n), s=1;while(x){x&=x-1n;s=-s;}return s;}
function charges(c:Configuration, link:U1Link) {
  const e=c.bosons[link.fluxRegister]-link.maxFlux;
  const n0=Number((c.fermions>>BigInt(link.site0Mode))&1n), n1=Number((c.fermions>>BigInt(link.site1Mode))&1n);
  return [e-n0+link.background0,-e-n1+link.background1] as const;
}
/** Unnormalized ||G_x psi||²; exactly zero iff that local constraint holds. */
export function gaussNorms(state:JointFockState,link:U1Link) {
  validate(state,link);let g0=0,g1=0;
  for(const {config,amplitude:z} of state.entries()) {const [a,b]=charges(config,link), p=z.re*z.re+z.im*z.im;g0+=a*a*p;g1+=b*b*p;}
  return {site0:g0,site1:g1};
}
/** Apply exp(i(theta0 G0 + theta1 G1)) to the whole state. */
export function gaugeTransform(state:JointFockState,link:U1Link,theta0:number,theta1:number) {
  validate(state,link);if(!Number.isFinite(theta0)||!Number.isFinite(theta1))throw new RangeError('Invalid gauge angle');
  return new JointFockState(state.basis,state.entries().map(({config,amplitude:z})=>{
    const [g0,g1]=charges(config,link), angle=theta0*g0+theta1*g1,co=Math.cos(angle),si=Math.sin(angle);
    return {config,amplitude:{re:co*z.re-si*z.im,im:si*z.re+co*z.im}};
  }));
}
/** Exact exponential of H_hop. Every allowed occupation pair is visited once. */
export function evolveGaugeHop(state:JointFockState,link:U1Link,coupling:number,dt:number) {
  validate(state,link);if(!Number.isFinite(coupling)||!Number.isFinite(dt)) throw new RangeError('Invalid evolution parameters');
  const {site0Mode:i,site1Mode:j,fluxRegister:b,maxFlux:s}=link;
  const bi=1n<<BigInt(i),bj=1n<<BigInt(j), bits=bi|bj;
  const input=state.entries(), source=new Map(input.map(e=>[configKey(e.config),e])), output=new Map(source);
  const pairs=new Map<string,Configuration>();
  for(const {config:c} of input) {
    // Source: occupied site 1, vacant site 0, and E < S.
    if((c.fermions&bits)===bj && c.bosons[b]<2*s) pairs.set(configKey(c),c);
    // A target can reconstruct its source even if that source has zero amplitude.
    if((c.fermions&bits)===bi && c.bosons[b]>0) {
      const flux=[...c.bosons];flux[b]--;
      const from={fermions:c.fermions^bits,bosons:flux};pairs.set(configKey(from),from);
    }
  }
  const co=Math.cos(coupling*dt),sn=Math.sin(coupling*dt);
  for(const [k,c] of pairs) {
    const flux=[...c.bosons];flux[b]++;
    const target={fermions:c.fermions^bits,bosons:flux}, kt=configKey(target);
    const a=source.get(k)?.amplitude||{re:0,im:0}, z=source.get(kt)?.amplitude||{re:0,im:0};
    // c_1 acts first, then c†_0; spectator modes contribute parity.
    const sign=parity(c.fermions,j)*parity(c.fermions^bj,i), q=sn*sign;
    output.set(k,{config:c,amplitude:{re:co*a.re+q*z.im,im:co*a.im-q*z.re}});
    output.set(kt,{config:target,amplitude:{re:co*z.re+q*a.im,im:co*z.im-q*a.re}});
  }
  return new JointFockState(state.basis,[...output.values()] as Entry[]);
}
/** Exact electric energy phase; compose with hopping via a symmetric split. */
export function evolveElectric(state:JointFockState,link:U1Link,electricCoupling:number,dt:number) {
  validate(state,link);if(!Number.isFinite(electricCoupling)||!Number.isFinite(dt))throw new RangeError('Invalid evolution parameters');
  return new JointFockState(state.basis,state.entries().map(({config,amplitude:z})=>{
    const flux=config.bosons[link.fluxRegister]-link.maxFlux;
    const angle=-0.5*electricCoupling*flux*flux*dt,co=Math.cos(angle),si=Math.sin(angle);
    return {config,amplitude:{re:co*z.re-si*z.im,im:si*z.re+co*z.im}};
  }));
}
/** Second-order unitary split; no claim of exact energy conservation at finite dt. */
export function evolveLinkStep(state:JointFockState,link:U1Link,g:number,electricCoupling:number,dt:number) {
  return evolveElectric(evolveGaugeHop(evolveElectric(state,link,electricCoupling,dt/2),link,g,dt),link,electricCoupling,dt/2);
}
