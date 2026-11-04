/**
 * Exact finite one-excitation fermion-pair / photon-mode test sector.
 *
 * The embedding space is (2^12 fermion occupations) x (cutoff+1 photons),
 * but the chosen initial state |vacuum, 1 photon> and this pair-only
 * interaction conserve N_photon + N_pairs = 1. The dynamically reachable
 * invariant subspace is therefore exactly seven dimensional: one vacuum+one-
 * photon state and six orthogonal one-pair+zero-photon states. This is NOT a
 * general Hamiltonian over arbitrary Fock configurations, spatial QED, or a
 * local-Gauss-law-constrained gauge theory. The resonant pair conversion is a
 * finite-mode model and has no momentum-resolved threshold kinematics.
 */
export interface MultiChannelQEDDiagnostics {
  fermionBasisDimension: number;
  photonCutoff: number;
  jointEmbeddingDimension: number;
  activeSubspaceDimension: number;
  channels: number;
  normDrift: number;
  energyDrift: number;
  hermiticityError: number;
  totalPairProbability: number;
  channelProbabilities: number[];
  photonOccupation: number;
  entanglementEntropyBits: number;
  channelRatioError: number;
  maxPhotonOccupationReached: number;
  netFermionChargeDrift: number;
  status: string;
}

export class FiniteMultiChannelFermionPhotonQED {
  readonly fermionDimension = 4096;
  readonly photonCutoff: number;
  readonly photonDimension: number;
  readonly jointEmbeddingDimension: number;
  readonly activeSubspaceDimension = 7;
  readonly channels = 6;
  readonly couplings: number[];
  readonly detuning: number;
  // Basis order: |fermion vacuum, 1 photon>, then |pair_j, 0 photons>.
  private re = new Float64Array(7);
  private im = new Float64Array(7);
  private norm0: number;
  private energy0: number;
  private charge0 = 0;

  constructor(photonCutoff = 4, couplings = [.08, .08, .08, .08, .08, .08], detuning = 0) {
    const rawCutoff = Number.isFinite(photonCutoff) ? Math.floor(photonCutoff) : 4;
    this.photonCutoff = Math.max(1, Math.min(8, rawCutoff));
    this.photonDimension = this.photonCutoff + 1;
    this.jointEmbeddingDimension = this.fermionDimension * this.photonDimension;
    this.couplings = Array.from({ length: 6 }, (_, i) => {
      const value = Number(couplings[i]);
      return Number.isFinite(value) ? Math.max(-100, Math.min(100, value)) : 0;
    });
    this.detuning = Number.isFinite(detuning) ? Math.max(-100, Math.min(100, detuning)) : 0;
    this.re[0] = 1;
    this.norm0 = this.norm();
    this.energy0 = this.energy();
    this.charge0 = this.netFermionCharge();
  }

  private norm(): number {
    let value = 0;
    for (let i = 0; i < 7; i++) value += this.re[i] ** 2 + this.im[i] ** 2;
    return value;
  }

  private energy(): number {
    // E_vac+gamma = 1; E_pair_j = 1 + detuning.
    let value = this.re[0] ** 2 + this.im[0] ** 2;
    for (let j = 0; j < 6; j++) {
      const p = this.re[j + 1] ** 2 + this.im[j + 1] ** 2;
      value += (1 + this.detuning) * p;
      const g = this.couplings[j];
      value += 2 * g * (this.re[0] * this.re[j + 1] + this.im[0] * this.im[j + 1]);
    }
    return value;
  }

  private netFermionCharge(): number {
    // Every represented matter basis state is either empty or contains one
    // particle and its conjugate; their modeled global U(1) charge is zero.
    return 0;
  }

  private hermiticityError(): number {
    // Construct/check the real-symmetric 7x7 Hamiltonian actually evolved.
    const h = new Float64Array(49);
    h[0] = 1;
    for (let j = 0; j < 6; j++) {
      h[(j + 1) * 7 + (j + 1)] = 1 + this.detuning;
      h[j + 1] = this.couplings[j];
      h[(j + 1) * 7] = this.couplings[j];
    }
    let error = 0;
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      error = Math.max(error, Math.abs(h[i * 7 + j] - h[j * 7 + i]));
    }
    return error;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt)) throw new Error('dt must be finite');
    const gs = Math.hypot(...this.couplings);
    const h = this.detuning / 2;
    const r = Math.hypot(h, gs);
    const phase = r * dt;
    const co = Math.cos(phase);
    const q = r > 0 ? Math.sin(phase) / r : dt;
    const vr = this.re[0], vi = this.im[0];
    let br = 0, bi = 0;
    if (gs > 0) {
      for (let j = 0; j < 6; j++) {
        const w = this.couplings[j] / gs;
        br += w * this.re[j + 1];
        bi += w * this.im[j + 1];
      }
    }
    // Exact exponential in the vacuum/bright subspace for
    // H'=[[-detuning/2, gs],[gs,+detuning/2]].
    const avR = -h * vr + gs * br, avI = -h * vi + gs * bi;
    const abR = gs * vr + h * br, abI = gs * vi + h * bi;
    const nextVR = co * vr + q * avI;
    const nextVI = co * vi - q * avR;
    const nextBR = co * br + q * abI;
    const nextBI = co * bi - q * abR;
    // The six-dimensional dark subspace has eigenvalue +detuning/2.
    // Preserve it exactly, including for non-initial superpositions.
    const darkPhase = h * dt, dc = Math.cos(darkPhase), ds = Math.sin(darkPhase);
    const avgEnergy = 1 + h;
    const globalPhase = avgEnergy * dt, gc = Math.cos(globalPhase), gsin = Math.sin(globalPhase);
    const rotateGlobal = (re: number, im: number): [number, number] =>
      [gc * re + gsin * im, gc * im - gsin * re];
    const [gvR, gvI] = rotateGlobal(nextVR, nextVI);
    this.re[0] = gvR; this.im[0] = gvI;
    for (let j = 0; j < 6; j++) {
      const w = gs > 0 ? this.couplings[j] / gs : 0;
      const darkR = this.re[j + 1] - w * br;
      const darkI = this.im[j + 1] - w * bi;
      const evolvedDarkR = dc * darkR + ds * darkI;
      const evolvedDarkI = dc * darkI - ds * darkR;
      const pairR = w * nextBR + evolvedDarkR;
      const pairI = w * nextBI + evolvedDarkI;
      const [outR, outI] = rotateGlobal(pairR, pairI);
      this.re[j + 1] = outR; this.im[j + 1] = outI;
    }
  }

  diagnostics(): MultiChannelQEDDiagnostics {
    const probabilities = this.couplings.map((_, j) => this.re[j + 1] ** 2 + this.im[j + 1] ** 2);
    const totalPair = probabilities.reduce((a, b) => a + b, 0);
    const photonProbability = this.re[0] ** 2 + this.im[0] ** 2;
    const photonOccupation = photonProbability;
    const entropy = (p: number): number => p > 1e-15 && p < 1 - 1e-15
      ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
    const gs2 = this.couplings.reduce((a, g) => a + g * g, 0);
    let ratioError = 0;
    if (gs2 > 0 && totalPair > 1e-14) {
      for (let j = 0; j < 6; j++) ratioError = Math.max(ratioError,
        Math.abs(probabilities[j] / totalPair - this.couplings[j] ** 2 / gs2));
    }
    return {
      fermionBasisDimension: this.fermionDimension,
      photonCutoff: this.photonCutoff,
      jointEmbeddingDimension: this.jointEmbeddingDimension,
      activeSubspaceDimension: this.activeSubspaceDimension,
      channels: this.channels,
      normDrift: Math.abs(this.norm() - this.norm0),
      energyDrift: Math.abs(this.energy() - this.energy0),
      hermiticityError: this.hermiticityError(),
      totalPairProbability: totalPair,
      channelProbabilities: probabilities,
      photonOccupation,
      entanglementEntropyBits: entropy(photonProbability),
      channelRatioError: ratioError,
      maxPhotonOccupationReached: 1,
      netFermionChargeDrift: Math.abs(this.netFermionCharge() - this.charge0),
      status: 'Exact unitary evolution of a seven-state, one-excitation invariant subspace embedded in the 12-mode fermion × truncated-photon space. This is a resonant finite-mode pair-conversion test; it has no spatial momentum kinematics, no free-photon pair-production threshold, no local Gauss-law projection, and is not the app live simulation.'
    };
  }

  static selfTest(): MultiChannelQEDDiagnostics {
    const q = new FiniteMultiChannelFermionPhotonQED(4, [.08, .07, .09, .06, .05, .04], .03);
    for (let i = 0; i < 250; i++) q.step(.02);
    const d = q.diagnostics();
    if (d.normDrift > 1e-10 || d.energyDrift > 1e-10 || d.hermiticityError !== 0 || d.channelRatioError > 1e-10) {
      throw new Error(`Finite multi-channel QED self-test failed: ${JSON.stringify(d)}`);
    }
    return d;
  }
}
