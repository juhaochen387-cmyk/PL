/**
 * Finite, exactly integrated Jaynes-Cummings matter–photon test sector.
 * This is a controlled two-level transition coupled to one regulated photon
 * oscillator, not yet the app's 12-mode fermion Fock sector or spatial QED.
 * Frequencies and coupling are in the same dimensionless natural units.
 */
export interface MatterPhotonDiagnostics {
  dimension: number;
  activeSubspaceDimension: number;
  normDrift: number;
  energyDrift: number;
  entanglementEntropyBits: number;
  matterExcitation: number;
  photonOccupation: number;
  hermiticityError: number;
  cutoff: number;
  status: string;
}

type Complex = { re: number; im: number };
const cAdd=(a:Complex,b:Complex):Complex=>({re:a.re+b.re,im:a.im+b.im});
const cMul=(a:Complex,b:Complex):Complex=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const cScale=(a:Complex,s:number):Complex=>({re:a.re*s,im:a.im*s});

export class FiniteMatterPhotonQED {
  readonly cutoff:number;
  readonly photonDimension:number;
  readonly dimension:number;
  readonly omegaMatter:number;
  readonly omegaPhoton:number;
  readonly coupling:number;
  private re:Float64Array;
  private im:Float64Array;
  private initialNorm=1;
  private initialEnergy=0;

  constructor(cutoff=8,omegaMatter=1,omegaPhoton=1,coupling=0.12){
    this.cutoff=Math.max(1,Math.min(24,Math.floor(cutoff)));
    this.photonDimension=this.cutoff+1;
    this.dimension=2*this.photonDimension;
    this.omegaMatter=omegaMatter;
    this.omegaPhoton=omegaPhoton;
    this.coupling=coupling;
    this.re=new Float64Array(this.dimension);
    this.im=new Float64Array(this.dimension);
    // Start in |excited matter> tensor |0 photons>.
    this.re[0]=1;
    this.initialNorm=this.norm();
    this.initialEnergy=this.energy();
  }
  private idx(excited:boolean,n:number):number{return (excited?0:this.photonDimension)+n;}
  private norm():number{let v=0;for(let i=0;i<this.dimension;i++)v+=this.re[i]**2+this.im[i]**2;return v;}
  private hermiticityError():number{
    let error=0;
    // The finite Jaynes-Cummings matrix has conjugate off-diagonal entries g√(n+1).
    for(let n=0;n<this.cutoff;n++){const hab=this.coupling*Math.sqrt(n+1),hba=this.coupling*Math.sqrt(n+1);error=Math.max(error,Math.abs(hab-hba));}
    return error;
  }
  private energy():number{
    let e=0;
    for(let n=0;n<=this.cutoff;n++){
      const ie=this.idx(true,n),ig=this.idx(false,n),N=n+0.5;
      e+=(this.omegaMatter*0.5+this.omegaPhoton*N)*(this.re[ie]**2+this.im[ie]**2);
      e+=(-this.omegaMatter*0.5+this.omegaPhoton*N)*(this.re[ig]**2+this.im[ig]**2);
    }
    for(let n=0;n<this.cutoff;n++){
      const a=this.idx(true,n),b=this.idx(false,n+1),g=this.coupling*Math.sqrt(n+1);
      const cross=this.re[a]*this.re[b]+this.im[a]*this.im[b];
      e+=2*g*cross;
    }
    return e;
  }
  step(dt:number):void{
    if(!Number.isFinite(dt))throw new Error('Matter-photon step must be finite');
    // Exact exponential of each independent Hermitian 2x2 excitation block.
    const delta=this.omegaMatter-this.omegaPhoton;
    for(let n=0;n<this.cutoff;n++){
      const ia=this.idx(true,n),ib=this.idx(false,n+1);
      const g=this.coupling*Math.sqrt(n+1),half=delta*0.5;
      const radius=Math.hypot(half,g),phase=radius*dt;
      const co=Math.cos(phase),si=radius>0?Math.sin(phase)/radius:dt;
      const ar=this.re[ia],ai=this.im[ia],br=this.re[ib],bi=this.im[ib];
      // exp(-i[(delta/2) sigma_z + g sigma_x]dt)
      const nrA=co*ar+si*(half*ai+g*bi);
      const niA=co*ai+si*(-half*ar-g*br);
      const nrB=co*br+si*(g*ai-half*bi);
      const niB=co*bi+si*(-g*ar+half*br);
      this.re[ia]=nrA;this.im[ia]=niA;this.re[ib]=nrB;this.im[ib]=niB;
    }
    // Unpaired |g,0> and cutoff-edge |e,N> acquire only their free phases.
    const rotate=(i:number,E:number)=>{const p=E*dt,co=Math.cos(p),si=Math.sin(p),r=this.re[i],v=this.im[i];this.re[i]=co*r+si*v;this.im[i]=co*v-si*r;};
    rotate(this.idx(false,0),-this.omegaMatter/2+this.omegaPhoton/2);
    rotate(this.idx(true,this.cutoff),this.omegaMatter/2+this.omegaPhoton*(this.cutoff+0.5));
  }
  diagnostics():MatterPhotonDiagnostics{
    const norm=this.norm(),energy=this.energy();
    let pe=0,pm=0,entropy=0,excitation=0,occupation=0;
    for(let n=0;n<=this.cutoff;n++){
      const ie=this.idx(true,n),ig=this.idx(false,n);
      const pE=this.re[ie]**2+this.im[ie]**2,pG=this.re[ig]**2+this.im[ig]**2;
      excitation+=pE;occupation+=n*(pE+pG);
      pe+=pE;pm+=pG;
    }
    // The matter reduced density matrix is diagonal for this excitation-number
    // conserving initial condition; compute its binary von Neumann entropy.
    for(const p of [pe,pm])if(p>1e-15)entropy-=p*Math.log2(p);
    return {dimension:this.dimension,activeSubspaceDimension:2,normDrift:Math.abs(norm-this.initialNorm),energyDrift:Math.abs(energy-this.initialEnergy),entanglementEntropyBits:entropy,matterExcitation:excitation,photonOccupation:occupation,hermiticityError:this.hermiticityError(),cutoff:this.cutoff,status:'Exact unitary evolution in the two-state invariant subspace |excited,0 photons> ↔ |ground,1 photon>, embedded in a finite Jaynes–Cummings oscillator. Not yet coupled to the app’s fermion Fock state or spatial gauge field.'};
  }
  static selfTest():MatterPhotonDiagnostics{
    const model=new FiniteMatterPhotonQED(8,1.03,1,0.12);
    for(let i=0;i<200;i++)model.step(0.025);
    return model.diagnostics();
  }
}
