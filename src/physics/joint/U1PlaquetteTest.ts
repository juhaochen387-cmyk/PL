/** Isolated, open square with four spin-1/2 U(1) quantum links.
 * Oriented links: bottom 0→1, right 1→2, top 3→2, left 0→3.
 * E=n−1/2; U=|1><0|, [E,U]=U, [U,U†]=2E; U is not unitary.
 * H_B=−K(P+P†), P=U_bottom U_right U†_top U†_left.
 * H_E=(g²/2)ΣE² (a constant in this spin-1/2 representation).
 * No dynamical matter coupling is present here. The optional matter modes and
 * static backgrounds enter Gauss diagnostics only. This is an isolated test,
 * not the live gauge lattice or a compact-rotor continuum approximation.
 */
import { JointFockState, type Configuration } from './JointFockState';
export interface U1Plaquette {
  registers:readonly [number,number,number,number];
  matterModes:readonly [number|null,number|null,number|null,number|null];
  background:readonly [number,number,number,number];
}
function validate(state:JointFockState,p:U1Plaquette) {
  const rs=p.registers,ms=p.matterModes.filter((x):x is number=>x!==null);
  if(rs.length!==4 || new Set(rs).size!==4 || rs.some(i=>!Number.isInteger(i)||i<0||i>=state.basis.bosons.length||state.basis.bosons[i].cutoff!==1) ||
     p.matterModes.length!==4 || new Set(ms).size!==ms.length || ms.some(i=>!Number.isInteger(i)||i<0||i>=state.basis.fermions.length) ||
     p.background.length!==4 || p.background.some(x=>!Number.isFinite(x))) throw new RangeError('Invalid plaquette specification');
}
const key=(c:Configuration)=>`${c.fermions.toString(16)}|${c.bosons.join(',')}`;
function localGauss(c:Configuration,p:U1Plaquette) {
  const [b,r,t,l]=p.registers.map(i=>c.bosons[i]-.5);
  const div=[b+l,r-b,-r-t,t-l];
  return div.map((x,i)=>x-(p.matterModes[i]===null?0:Number((c.fermions>>BigInt(p.matterModes[i]!))&1n))+p.background[i]);
}
/** Exact unnormalized squared operator norms ||G(x) ψ||². */
export function plaquetteGaussNorms(state:JointFockState,p:U1Plaquette) {
  validate(state,p);const norms=[0,0,0,0];
  for(const {config,amplitude:z} of state.entries()) {const g=localGauss(config,p),prob=z.re*z.re+z.im*z.im;for(let i=0;i<4;i++)norms[i]+=g[i]*g[i]*prob;}
  return norms;
}
export function plaquetteGaugeTransform(state:JointFockState,p:U1Plaquette,angles:readonly number[]) {
  validate(state,p);if(angles.length!==4||angles.some(x=>!Number.isFinite(x)))throw new RangeError('Invalid gauge angles');
  return new JointFockState(state.basis,state.entries().map(({config,amplitude:z})=>{
    const g=localGauss(config,p), angle=g.reduce((v,x,i)=>v+x*angles[i],0),co=Math.cos(angle),si=Math.sin(angle);
    return {config,amplitude:{re:co*z.re-si*z.im,im:si*z.re+co*z.im}};
  }));
}
/** Exact exp(-i H_B dt); for binary links P connects disjoint state pairs. */
export function evolvePlaquette(state:JointFockState,p:U1Plaquette,coupling:number,dt:number) {
  validate(state,p);if(!Number.isFinite(coupling)||!Number.isFinite(dt)) throw new RangeError('Invalid evolution parameters');
  const input=state.entries(),source=new Map(input.map(e=>[key(e.config),e])),output=new Map(source),pairs=new Map<string,Configuration>();
  const [b,r,t,l]=p.registers;
  for(const {config:c} of input) {
    const n=c.bosons;
    // The P source has bottom/right 0 and top/left 1; target is reversed.
    if(n[b]===0&&n[r]===0&&n[t]===1&&n[l]===1) pairs.set(key(c),c);
    if(n[b]===1&&n[r]===1&&n[t]===0&&n[l]===0) {
      const a=[...n];a[b]=0;a[r]=0;a[t]=1;a[l]=1;
      const src={fermions:c.fermions,bosons:a};pairs.set(key(src),src);
    }
  }
  const co=Math.cos(coupling*dt),si=Math.sin(coupling*dt);
  for(const [k,c] of pairs) {
    const n=[...c.bosons];n[b]=1;n[r]=1;n[t]=0;n[l]=0;
    const target={fermions:c.fermions,bosons:n}, kt=key(target), a=source.get(k)?.amplitude||{re:0,im:0}, z=source.get(kt)?.amplitude||{re:0,im:0};
    // H_B has a minus sign, hence exp(-i H_B t) has +i sin(Kt).
    output.set(k,{config:c,amplitude:{re:co*a.re-si*z.im,im:co*a.im+si*z.re}});
    output.set(kt,{config:target,amplitude:{re:co*z.re-si*a.im,im:co*z.im+si*a.re}});
  }
  return new JointFockState(state.basis,[...output.values()]);
}
