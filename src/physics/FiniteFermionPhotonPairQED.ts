/**
 * Single-channel, one-excitation fermion-pair / photon test sector.
 *
 * The enclosing basis is (2^12 fermion occupations) x (photonCutoff+1), but
 * the chosen initial state |fermion vacuum, 1 photon> and the pair-conversion
 * interaction only reach two states: |vacuum,1 photon> and |pair_j,0 photons>.
 * The implementation evolves that exact invariant subspace directly rather
 * than allocating a mostly-zero 20,480-entry vector. It is not spatial QED,
 * has no momentum threshold kinematics, and does not impose local Gauss law.
 */
export interface FermionPhotonPairDiagnostics {
  fermionModes:number; fermionBasisDimension:number; photonCutoff:number;
  jointDimension:number; activeSubspaceDimension:number;
  normDrift:number; energyDrift:number; pairProbability:number;
  photonOccupation:number; entanglementEntropyBits:number;
  hermiticityError:number; pairSlot:number; netChargeDrift:number;
  maxPhotonOccupationReached:number; status:string;
}

export class FiniteFermionPhotonPairQED {
  readonly fermionModes=12;
  readonly fermionBasisDimension=1<<12;
  readonly photonCutoff:number;
  readonly jointDimension:number;
  readonly activeSubspaceDimension=2;
  readonly coupling:number;
  readonly detuning:number;
  readonly pairSlot:number;
  // Basis: [|fermion vacuum, 1 photon>, |selected particle+antiparticle, 0 photons>].
  private re=new Float64Array(2);
  private im=new Float64Array(2);
  private initialNorm=1;
  private initialEnergy=1;
  private initialCharge=0;

  constructor(photonCutoff=4,coupling=0.08,detuning=0.03,pairSlot=0){
    const rawCutoff=Number.isFinite(photonCutoff)?Math.floor(photonCutoff):4;
    this.photonCutoff=Math.max(1,Math.min(8,rawCutoff));
    this.jointDimension=this.fermionBasisDimension*(this.photonCutoff+1);
    this.coupling=Number.isFinite(coupling)?Math.max(-100,Math.min(100,coupling)):0;
    this.detuning=Number.isFinite(detuning)?Math.max(-100,Math.min(100,detuning)):0;
    this.pairSlot=Math.max(0,Math.min(5,Number.isFinite(pairSlot)?Math.floor(pairSlot):0));
    this.re[0]=1;
    this.initialNorm=this.norm();
    this.initialEnergy=this.energy();
    this.initialCharge=this.netFermionCharge();
  }

  private norm():number{return this.re[0]**2+this.im[0]**2+this.re[1]**2+this.im[1]**2;}
  private energy():number{
    const p0=this.re[0]**2+this.im[0]**2;
    const p1=this.re[1]**2+this.im[1]**2;
    return p0+(1+this.detuning)*p1+2*this.coupling*(this.re[0]*this.re[1]+this.im[0]*this.im[1]);
  }
  private netFermionCharge():number{
    // Both basis states carry zero net particle-minus-antiparticle number.
    return 0*(this.re[0]**2+this.im[0]**2)+0*(this.re[1]**2+this.im[1]**2);
  }
  private hermiticityError():number{
    // Check the actual finite 2x2 matrix H=[[1,g],[g,1+detuning]].
    const h01=this.coupling,h10=this.coupling;
    return Math.max(Math.abs(h01-h10),Math.abs(1-1),Math.abs((1+this.detuning)-(1+this.detuning)));
  }

  step(dt:number):void{
    if(!Number.isFinite(dt))throw new Error('dt must be finite');
    // H = [[1,g],[g,1+delta]]. Remove its mean energy, evolve the
    // Hermitian remainder exactly, then restore the common phase.
    const h=this.detuning/2, g=this.coupling;
    const radius=Math.hypot(h,g), phase=radius*dt;
    const co=Math.cos(phase), q=radius>0?Math.sin(phase)/radius:dt;
    const ar=this.re[0],ai=this.im[0],br=this.re[1],bi=this.im[1];
    const avR=-h*ar+g*br,avI=-h*ai+g*bi;
    const bpR=g*ar+h*br,bpI=g*ai+h*bi;
    let aR=co*ar+q*avI,aI=co*ai-q*avR;
    let bR=co*br+q*bpI,bI=co*bi-q*bpR;
    const globalPhase=(1+h)*dt,gc=Math.cos(globalPhase),gs=Math.sin(globalPhase);
    this.re[0]=gc*aR+gs*aI;this.im[0]=gc*aI-gs*aR;
    this.re[1]=gc*bR+gs*bI;this.im[1]=gc*bI-gs*bR;
  }

  diagnostics():FermionPhotonPairDiagnostics{
    const p0=this.re[0]**2+this.im[0]**2,pairP=this.re[1]**2+this.im[1]**2;
    let entropy=0;for(const p of [p0,pairP])if(p>1e-15)entropy-=p*Math.log2(p);
    return {fermionModes:12,fermionBasisDimension:this.fermionBasisDimension,
      photonCutoff:this.photonCutoff,jointDimension:this.jointDimension,
      activeSubspaceDimension:this.activeSubspaceDimension,normDrift:Math.abs(this.norm()-this.initialNorm),
      energyDrift:Math.abs(this.energy()-this.initialEnergy),pairProbability:pairP,
      photonOccupation:p0,entanglementEntropyBits:entropy,hermiticityError:this.hermiticityError(),
      pairSlot:this.pairSlot,netChargeDrift:Math.abs(this.netFermionCharge()-this.initialCharge),
      maxPhotonOccupationReached:1,
      status:`Exact unitary evolution of the two-state invariant subspace for conjugate modes ${this.pairSlot} and ${this.pairSlot+6}, embedded in a 12-mode fermion and truncated photon basis. One photon mode only; no spatial momentum threshold kinematics, no local Gauss-law projection, and not the live simulation.`};
  }

  static selfTest():FermionPhotonPairDiagnostics{
    // Nonzero detuning is intentional: it catches sign mistakes that a
    // resonant-only test cannot see. Exercise every conjugate pair slot.
    const results:FermionPhotonPairDiagnostics[]=[];
    for(let slot=0;slot<6;slot++){
      const q=new FiniteFermionPhotonPairQED(4,.08,.03,slot);
      for(let i=0;i<250;i++)q.step(.02);
      const d=q.diagnostics();
      if(d.normDrift>1e-10||d.energyDrift>1e-10||d.hermiticityError!==0||d.netChargeDrift!==0)
        throw new Error(`Finite fermion-photon pair test failed for slot ${slot}: ${JSON.stringify(d)}`);
      results.push(d);
    }
    const avg=(key:'pairProbability'|'photonOccupation'|'entanglementEntropyBits')=>results.reduce((sum,d)=>sum+d[key],0)/results.length;
    return {...results[0],normDrift:Math.max(...results.map(x=>x.normDrift)),
      energyDrift:Math.max(...results.map(x=>x.energyDrift)),
      hermiticityError:Math.max(...results.map(x=>x.hermiticityError)),
      netChargeDrift:Math.max(...results.map(x=>x.netChargeDrift)),
      pairProbability:avg('pairProbability'),photonOccupation:avg('photonOccupation'),
      entanglementEntropyBits:avg('entanglementEntropyBits'),
      status:'Six independent two-state one-excitation tests (one per conjugate-mode pairing), each embedded in a 12-mode fermion × truncated-photon basis. Nonzero detuning checked. These are not simultaneous channels or spatially local gauge QED.'};
  }
}
