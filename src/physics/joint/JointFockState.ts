/**
 * Finite sparse joint occupation basis. This is an experimental, standalone
 * mathematical building block; it is not the live simulation's state.
 *
 * Fermions use one global Jordan–Wigner order; bosons use independent number
 * cutoffs. Operators are linear and do not normalize or prune the state.
 * Sparse storage does not remove the exponential worst case.
 */
export interface FermionMode {
  species: string;
  flavor: string;
  antiparticle: boolean;
  orbital: {kind:'site'; x:number; y:number} | {kind:'momentum'; kx:number; ky:number};
  spinor: number;
  color: string | null;
  internal: string;
}
export interface BosonMode { label:string; cutoff:number }
export interface Amplitude {re:number; im:number}
export interface Configuration {fermions:bigint; bosons:readonly number[]}
export interface Entry {config:Configuration; amplitude:Amplitude}

const key = (f:bigint,b:readonly number[]) => `${f.toString(16)}|${b.join(',')}`;
function signBelow(f:bigint, mode:number):number {
  let bits=f & ((1n<<BigInt(mode))-1n), sign=1;
  while(bits) { bits &= bits-1n; sign=-sign; }
  return sign;
}
export class JointFockBasis {
  readonly fermions:ReadonlyArray<FermionMode>;
  readonly bosons:ReadonlyArray<BosonMode>;
  constructor(fermions:readonly FermionMode[], bosons:readonly BosonMode[]) {
    if (fermions.length > 256) throw new RangeError('At most 256 fermion modes are supported');
    for(const m of fermions) {
      if (!m.species || !m.flavor || !Number.isInteger(m.spinor) || m.spinor<0 || !m.internal ||
        (m.orbital.kind==='site' ? !Number.isInteger(m.orbital.x)||!Number.isInteger(m.orbital.y) : !Number.isInteger(m.orbital.kx)||!Number.isInteger(m.orbital.ky)))
        throw new RangeError('Invalid fermion mode');
    }
    const identities=fermions.map(m=>JSON.stringify([m.species,m.flavor,m.antiparticle,m.orbital.kind,m.orbital.kind==='site'?m.orbital.x:m.orbital.kx,m.orbital.kind==='site'?m.orbital.y:m.orbital.ky,m.spinor,m.color,m.internal]));
    if(new Set(identities).size!==identities.length) throw new Error('Duplicate fermion mode');
    for(const b of bosons) if(!b.label || !Number.isSafeInteger(b.cutoff) || b.cutoff<0) throw new RangeError('Invalid boson mode');
    if(new Set(bosons.map(b=>b.label)).size!==bosons.length) throw new Error('Duplicate boson mode');
    this.fermions=fermions.map(m=>Object.freeze({...m,orbital:Object.freeze({...m.orbital})}));
    this.bosons=bosons.map(m=>Object.freeze({...m}));
    Object.freeze(this.fermions);Object.freeze(this.bosons);
  }
  validate(c:Configuration) {
    if(c.fermions<0n || c.fermions>>BigInt(this.fermions.length)) throw new RangeError('Fermion mask outside basis');
    if(c.bosons.length!==this.bosons.length || c.bosons.some((n,i)=>!Number.isSafeInteger(n)||n<0||n>this.bosons[i].cutoff)) throw new RangeError('Boson occupation outside cutoff');
  }
}
export class JointFockState {
  private readonly terms = new Map<string,Entry>();
  constructor(readonly basis:JointFockBasis, entries:readonly Entry[]=[]) {
    for(const {config,amplitude} of entries) this.add(config, amplitude);
  }
  static vacuum(basis:JointFockBasis) {
    return new JointFockState(basis,[{config:{fermions:0n,bosons:basis.bosons.map(()=>0)},amplitude:{re:1,im:0}}]);
  }
  private add(config:Configuration, z:Amplitude) {
    this.basis.validate(config);
    if(!Number.isFinite(z.re)||!Number.isFinite(z.im)) throw new RangeError('Nonfinite amplitude');
    const k=key(config.fermions,config.bosons), prior=this.terms.get(k);
    const re=(prior?.amplitude.re||0)+z.re, im=(prior?.amplitude.im||0)+z.im;
    if(re===0 && im===0) this.terms.delete(k);
    else this.terms.set(k,{config:{fermions:config.fermions,bosons:[...config.bosons]},amplitude:{re,im}});
  }
  entries():Entry[] { return Array.from(this.terms.values(),e=>({config:{fermions:e.config.fermions,bosons:[...e.config.bosons]},amplitude:{...e.amplitude}})); }
  normSquared():number { let n=0; for(const {amplitude:z} of this.terms.values()) n+=z.re*z.re+z.im*z.im; return n; }
  fermion(mode:number, create:boolean):JointFockState {
    if(!Number.isInteger(mode)||mode<0||mode>=this.basis.fermions.length) throw new RangeError('Invalid fermion mode index');
    const out=new JointFockState(this.basis), bit=1n<<BigInt(mode);
    for(const {config:c,amplitude:z} of this.terms.values()) {
      if(Boolean(c.fermions&bit)===create) continue;
      const s=signBelow(c.fermions,mode);
      out.add({fermions:c.fermions^bit,bosons:c.bosons},{re:s*z.re,im:s*z.im});
    }
    return out;
  }
  boson(mode:number, create:boolean):JointFockState {
    if(!Number.isInteger(mode)||mode<0||mode>=this.basis.bosons.length) throw new RangeError('Invalid boson mode index');
    const out=new JointFockState(this.basis);
    for(const {config:c,amplitude:z} of this.terms.values()) {
      const n=c.bosons[mode];
      if(create ? n===this.basis.bosons[mode].cutoff : n===0) continue;
      const b=[...c.bosons]; b[mode]+=create?1:-1;
      const factor=Math.sqrt(create?n+1:n);
      out.add({fermions:c.fermions,bosons:b},{re:factor*z.re,im:factor*z.im});
    }
    return out;
  }
}

/** Partial trace in the fixed Jordan–Wigner occupation-bit tensor-product
 * convention. This is not a graded/algebraic fermion partial trace: operators
 * spanning subsystems must still carry their Jordan–Wigner strings.
 * Output is sparse and unnormalized, with rows/columns encoded as kept bits
 * (ordered by the supplied indices) and kept boson occupations. */
export function reducedDensityMatrix(state:JointFockState, keepF:readonly number[], keepB:readonly number[]) {
  const basis=state.basis;
  const validate=(a:readonly number[], size:number) => {
    if(new Set(a).size!==a.length || a.some(i=>!Number.isInteger(i)||i<0||i>=size)) throw new RangeError('Invalid subsystem indices');
  };
  validate(keepF,basis.fermions.length);validate(keepB,basis.bosons.length);
  const setF=new Set(keepF),setB=new Set(keepB);
  const envF=Array.from({length:basis.fermions.length},(_,i)=>i).filter(i=>!setF.has(i));
  const envB=Array.from({length:basis.bosons.length},(_,i)=>i).filter(i=>!setB.has(i));
  const project=(c:Configuration, fs:readonly number[],bs:readonly number[])=> {
    let bits=0n; fs.forEach((f,i)=>{if(c.fermions&(1n<<BigInt(f))) bits|=1n<<BigInt(i);});
    return key(bits,bs.map(i=>c.bosons[i]));
  };
  const groups=new Map<string,{kept:string; z:Amplitude}[]>();
  for(const e of state.entries()) {
    const env=project(e.config,envF,envB), kept=project(e.config,keepF,keepB);
    const group=groups.get(env)||[]; group.push({kept,z:e.amplitude});groups.set(env,group);
  }
  const matrix=new Map<string,Map<string,Amplitude>>();
  for(const group of groups.values()) for(const a of group) for(const b of group) {
    let row=matrix.get(a.kept);if(!row){row=new Map();matrix.set(a.kept,row);}
    const z=row.get(b.kept)||{re:0,im:0};
    z.re+=a.z.re*b.z.re+a.z.im*b.z.im;
    z.im+=a.z.im*b.z.re-a.z.re*b.z.im;
    row.set(b.kept,z);
  }
  return matrix;
}
/** Incoherent ensemble Σ weight |ψ⟩⟨ψ|, weights may sum to anything.
 * States must share the identical basis object. */
export function reducedEnsemble(states:readonly {state:JointFockState; weight:number}[], keepF:readonly number[], keepB:readonly number[]) {
  const out=new Map<string,Map<string,Amplitude>>();
  const basis=states[0]?.state.basis;
  for(const {state,weight} of states) {
    if(state.basis!==basis || !Number.isFinite(weight)||weight<0) throw new RangeError('Invalid ensemble');
    for(const [r,row] of reducedDensityMatrix(state,keepF,keepB)) for(const [c,z] of row) {
      let target=out.get(r); if(!target){target=new Map();out.set(r,target);}
      const v=target.get(c)||{re:0,im:0};v.re+=weight*z.re;v.im+=weight*z.im;target.set(c,v);
    }
  }
  return out;
}

/** Exact exp(-i dt H) for H=g(c†_i c†_j a + a† c_j c_i),
 * with i != j and a single truncated boson mode. This intentionally small
 * conversion Hamiltonian is a mathematical test sector, not spatial QED:
 * no kinetic terms, gauge links, local Gauss laws or threshold kinematics.
 * Occupation states with only one of the two fermions are spectators. */
export function evolvePairConversion(state:JointFockState, i:number, j:number, boson:number, coupling:number, dt:number):JointFockState {
  const basis=state.basis;
  if(!Number.isInteger(i)||!Number.isInteger(j)||i<0||j<0||i>=basis.fermions.length||j>=basis.fermions.length||i===j ||
     !Number.isInteger(boson)||boson<0||boson>=basis.bosons.length || !Number.isFinite(coupling)||!Number.isFinite(dt)) throw new RangeError('Invalid pair conversion parameters');
  const bitI=1n<<BigInt(i),bitJ=1n<<BigInt(j), bits=bitI|bitJ;
  const inputs=state.entries(), byKey=new Map(inputs.map(e=>[key(e.config.fermions,e.config.bosons),e]));
  const sourceConfigs=new Map<string,Configuration>();
  for(const e of inputs) {
    const f=e.config.fermions, n=e.config.bosons[boson];
    if((f&bits)===0n && n>0) sourceConfigs.set(key(f,e.config.bosons),e.config);
    if((f&bits)===bits && n<basis.bosons[boson].cutoff) {
      const b=[...e.config.bosons];b[boson]++;
      const source={fermions:f^bits,bosons:b};sourceConfigs.set(key(source.fermions,b),source);
    }
  }
  const output=new Map(byKey);
  for(const [sourceKey,source] of sourceConfigs) {
    const b=[...source.bosons]; b[boson]--;
    const target={fermions:source.fermions|bits,bosons:b}, targetKey=key(target.fermions,b);
    const a=byKey.get(sourceKey)?.amplitude||{re:0,im:0}, z=byKey.get(targetKey)?.amplitude||{re:0,im:0};
    // c†_j acts first, then c†_i.
    const sign=signBelow(source.fermions,j)*signBelow(source.fermions|bitJ,i);
    const angle=coupling*Math.sqrt(source.bosons[boson])*dt, co=Math.cos(angle), sn=Math.sin(angle)*sign;
    output.set(sourceKey,{config:source,amplitude:{re:co*a.re+sn*z.im,im:co*a.im-sn*z.re}});
    output.set(targetKey,{config:target,amplitude:{re:co*z.re+sn*a.im,im:co*z.im-sn*a.re}});
  }
  return new JointFockState(basis,[...output.values()]);
}
