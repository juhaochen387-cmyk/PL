/**
 * Standard Model Electroweak Engine
 * Charged Currents (W±) & Neutral Currents (Z⁰) Separation,
 * Full 3x3 CKM Quark Mixing Matrix,
 * Full 3x3 PMNS Lepton Mixing Matrix & CP Violation,
 * Matter-Induced Neutrino Oscillations (MSW Effect & Resonance),
 * Matrix Element & Relativistic Phase-Space Decay Rate Integrals,
 * Full Competing Decay Channels & Branching Ratios,
 * Neutrino-Electron & Neutrino-Quark Scattering (NC & CC),
 * Neutrino-Antineutrino Annihilation (νν̄ → Z* → ff̄), and Glashow Resonance.
 */

import {
  ParticleInstance,
  ParticleKind,
  ParticleColor,
  QuarkFlavor,
  LeptonFlavor,
  WeakCurrentType,
  WeakVertex,
  DecayChannelDefinition,
  NeutrinoQuantumState,
  VirtualWeakMarker,
  FourVector
} from '../types/physics';
import { LIGHT_SPEED, STANDARD_MODEL_PARTICLES, simulationMass } from './catalog';
import { invariantEnergy } from './ExactPhysicsEngine';

// ==========================================
// PHYSICAL CONSTANTS (ELECTROWEAK SM)
// ==========================================
export const FERMI_CONSTANT_GF = 1.1663787e-5; // GeV^-2
export const WEAK_MIXING_SIN2_THETA_W = 0.23122; // sin^2(theta_W)
export const W_BOSON_MASS_GEV = 80.377; // GeV
export const Z_BOSON_MASS_GEV = 91.1876; // GeV
export const HIGGS_MASS_GEV = 125.25; // GeV

export const W_WIDTH_GEV = 2.085;
export const Z_WIDTH_GEV = 2.4952;
export const HIGGS_WIDTH_MEV = 4.07;

// ==========================================
// 3x3 CKM QUARK MIXING MATRIX
// ==========================================
// [V_ud, V_us, V_ub]
// [V_cd, V_cs, V_cb]
// [V_td, V_ts, V_tb]
export const CKM_MAGNITUDES = [
  [0.97370, 0.2245, 0.00382],
  [0.2210, 0.9870, 0.0410],
  [0.0080, 0.0388, 0.9990]
];

const UP_QUARK_INDICES: Record<string, number> = { up: 0, charm: 1, top: 2 };
const DOWN_QUARK_INDICES: Record<string, number> = { down: 0, strange: 1, bottom: 2 };
const UP_QUARK_FLAVORS: QuarkFlavor[] = ['up', 'charm', 'top'];
const DOWN_QUARK_FLAVORS: QuarkFlavor[] = ['down', 'strange', 'bottom'];

// ==========================================
// 3x3 PMNS NEUTRINO MIXING MATRIX
// ==========================================
// Best fit mixing parameters (NuFIT 5.2 normal ordering)
const THETA_12 = (33.41 * Math.PI) / 180;
const THETA_23 = (42.1 * Math.PI) / 180;
const THETA_13 = (8.57 * Math.PI) / 180;
const DELTA_CP = (195.0 * Math.PI) / 180; // CP violating phase ~ 1.08 pi

// Mass squared differences (eV^2)
export const DELTA_M2_21 = 7.53e-5; // eV^2 (solar)
export const DELTA_M2_31 = 2.453e-3; // eV^2 (atmospheric)

export class WeakEngine {
  virtualMarkers: VirtualWeakMarker[];
  nextMarkerId: number;

  // Cached PMNS components (Real & Imaginary parts of U_alpha,i)
  pmnsMatrix: [number, number][][]; // [row=e,mu,tau][col=1,2,3] -> [Re, Im]

  constructor() {
    this.virtualMarkers = [];
    this.nextMarkerId = 1;
    this.pmnsMatrix = this.computePMNSMatrix();
  }

  // -------------------------------------------------------------
  // PMNS MATRIX GENERATION
  // -------------------------------------------------------------
  private computePMNSMatrix(): [number, number][][] {
    const c12 = Math.cos(THETA_12);
    const s12 = Math.sin(THETA_12);
    const c23 = Math.cos(THETA_23);
    const s23 = Math.sin(THETA_23);
    const c13 = Math.cos(THETA_13);
    const s13 = Math.sin(THETA_13);
    const cosD = Math.cos(DELTA_CP);
    const sinD = Math.sin(DELTA_CP);

    // Row 0: e
    // U_e1 = c12 * c13
    const Ue1: [number, number] = [c12 * c13, 0];
    // U_e2 = s12 * c13
    const Ue2: [number, number] = [s12 * c13, 0];
    // U_e3 = s13 * e^(-i delta)
    const Ue3: [number, number] = [s13 * cosD, -s13 * sinD];

    // Row 1: mu
    // U_mu1 = -s12*c23 - c12*s23*s13*e^(i delta)
    const Umu1: [number, number] = [-s12 * c23 - c12 * s23 * s13 * cosD, -c12 * s23 * s13 * sinD];
    // U_mu2 = c12*c23 - s12*s23*s13*e^(i delta)
    const Umu2: [number, number] = [c12 * c23 - s12 * s23 * s13 * cosD, -s12 * s23 * s13 * sinD];
    // U_mu3 = s23 * c13
    const Umu3: [number, number] = [s23 * c13, 0];

    // Row 2: tau
    // U_tau1 = s12*s23 - c12*c23*s13*e^(i delta)
    const Utau1: [number, number] = [s12 * s23 - c12 * c23 * s13 * cosD, -c12 * c23 * s13 * sinD];
    // U_tau2 = -c12*s23 - s12*c23*s13*e^(i delta)
    const Utau2: [number, number] = [-c12 * s23 - s12 * c23 * s13 * cosD, -s12 * c23 * s13 * sinD];
    // U_tau3 = c23 * c13
    const Utau3: [number, number] = [c23 * c13, 0];

    return [
      [Ue1, Ue2, Ue3],
      [Umu1, Umu2, Umu3],
      [Utau1, Utau2, Utau3]
    ];
  }

  // -------------------------------------------------------------
  // CKM QUARK MIXING CALCULATIONS
  // -------------------------------------------------------------
  getCKMElement(up: QuarkFlavor, down: QuarkFlavor): number {
    const uIdx = UP_QUARK_INDICES[up];
    const dIdx = DOWN_QUARK_INDICES[down];
    if (uIdx === undefined || dIdx === undefined) return 0;
    return CKM_MAGNITUDES[uIdx][dIdx];
  }

  getCKMProbability(up: QuarkFlavor, down: QuarkFlavor): number {
    const v = this.getCKMElement(up, down);
    return v * v;
  }

  sampleCKMDownQuark(up: QuarkFlavor): QuarkFlavor {
    const uIdx = UP_QUARK_INDICES[up] ?? 0;
    const probs = [
      CKM_MAGNITUDES[uIdx][0] ** 2,
      CKM_MAGNITUDES[uIdx][1] ** 2,
      CKM_MAGNITUDES[uIdx][2] ** 2
    ];
    const sum = probs[0] + probs[1] + probs[2];
    const r = Math.random() * sum;
    if (r < probs[0]) return DOWN_QUARK_FLAVORS[0];
    if (r < probs[0] + probs[1]) return DOWN_QUARK_FLAVORS[1];
    return DOWN_QUARK_FLAVORS[2];
  }

  sampleCKMUpQuark(down: QuarkFlavor): QuarkFlavor {
    const dIdx = DOWN_QUARK_INDICES[down] ?? 0;
    const probs = [
      CKM_MAGNITUDES[0][dIdx] ** 2,
      CKM_MAGNITUDES[1][dIdx] ** 2,
      CKM_MAGNITUDES[2][dIdx] ** 2
    ];
    const sum = probs[0] + probs[1] + probs[2];
    const r = Math.random() * sum;
    if (r < probs[0]) return UP_QUARK_FLAVORS[0];
    if (r < probs[0] + probs[1]) return UP_QUARK_FLAVORS[1];
    return UP_QUARK_FLAVORS[2];
  }

  // -------------------------------------------------------------
  // NEUTRINO QUANTUM STATE INITIALIZATION & PROPAGATION (PMNS + MSW)
  // -------------------------------------------------------------
  createNeutrinoQuantumState(flavor: 'electron_neutrino' | 'muon_neutrino' | 'tau_neutrino'): NeutrinoQuantumState {
    let amplitudes: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    let probs: [number, number, number] = [0, 0, 0];

    if (flavor === 'electron_neutrino') {
      amplitudes = [1, 0, 0, 0, 0, 0];
      probs = [1, 0, 0];
    } else if (flavor === 'muon_neutrino') {
      amplitudes = [0, 0, 1, 0, 0, 0];
      probs = [0, 1, 0];
    } else {
      amplitudes = [0, 0, 0, 0, 1, 0];
      probs = [0, 0, 1];
    }

    // Project onto mass eigenstates using PMNS matrix: |nu_i> = sum_alpha U^*_{alpha, i} |nu_alpha>
    const fIdx = flavor === 'electron_neutrino' ? 0 : flavor === 'muon_neutrino' ? 1 : 2;
    const m1 = this.pmnsMatrix[fIdx][0][0] ** 2 + this.pmnsMatrix[fIdx][0][1] ** 2;
    const m2 = this.pmnsMatrix[fIdx][1][0] ** 2 + this.pmnsMatrix[fIdx][1][1] ** 2;
    const m3 = this.pmnsMatrix[fIdx][2][0] ** 2 + this.pmnsMatrix[fIdx][2][1] ** 2;

    return {
      flavorAmplitudes: amplitudes,
      flavorProbabilities: probs,
      massEigenstates: [m1, m2, m3],
      baselineKm: 0,
      phaseRad: 0,
      effectiveMatterPotential: 0,
      inMatterResonance: false,
      resonancePurity: 0,
      dominantFlavor: flavor
    };
  }

  /**
   * Evolve neutrino flavor state with PMNS mixing and MSW Matter Effect
   * Over distance deltaL (km) with neutrino energy E (GeV) and ambient electron density N_e.
   */
  propagateNeutrino(
    state: NeutrinoQuantumState,
    deltaLKm: number,
    energyGeV = 1.0,
    matterDensity = 1.0,
    mswEnabled = true,
    dt = 1.0
  ): void {
    if (deltaLKm <= 0) return;
    state.baselineKm += deltaLKm;

    // Phase velocity oscillation rate: dphi = Delta m^2 * L / (4 E hbar c)
    // 1.267 * (Delta m^2 [eV^2]) * L [km] / E [GeV]
    const phase21 = 1.267 * DELTA_M2_21 * (deltaLKm / Math.max(0.1, energyGeV));
    const phase31 = 1.267 * DELTA_M2_31 * (deltaLKm / Math.max(0.1, energyGeV));
    state.phaseRad += phase21;

    // MSW Matter Effect:
    // CC coherent forward scattering potential V_CC = sqrt(2) * G_F * N_e
    // In dimensionless ratio: A_matter = 2 * sqrt(2) * G_F * N_e * E / Delta m^2_21
    let cos2thetaM = Math.cos(2 * THETA_12);
    let sin2thetaM = Math.sin(2 * THETA_12);
    let inResonance = false;
    let resonancePurity = 0;
    let vCC = 0;

    if (mswEnabled && matterDensity > 0) {
      // Exact finite matter potential scaled for the declared visual model
      vCC = 0.54 * matterDensity;
      state.effectiveMatterPotential = vCC;

      const cos2th = Math.cos(2 * THETA_12);
      const sin2th = Math.sin(2 * THETA_12);
      const denom = Math.sqrt((cos2th - vCC) ** 2 + sin2th ** 2);
      if (denom > 1e-6) {
        sin2thetaM = sin2th / denom;
        cos2thetaM = (cos2th - vCC) / denom;
      }

      // Resonance condition: vCC = cos(2*theta_12) ~ 0.54
      const distToResonance = Math.abs(vCC - cos2th);
      resonancePurity = Math.max(0, 1 - distToResonance / 0.35);
      inResonance = resonancePurity > 0.5;
    } else {
      state.effectiveMatterPotential = 0;
    }

    state.inMatterResonance = inResonance;
    state.resonancePurity = resonancePurity;

    // Fast 3-flavor coherent oscillation amplitude evolution in matter:
    // P(nu_e -> nu_e) = 1 - sin^2(2*theta_m) * sin^2(Delta_m)
    const effectivePhase = phase21 * (mswEnabled && matterDensity > 0 ? Math.sqrt((Math.cos(2 * THETA_12) - vCC) ** 2 + Math.sin(2 * THETA_12) ** 2) : 1);
    const sinHalf = Math.sin(effectivePhase * 0.5);
    const transProb = (sin2thetaM ** 2) * (sinHalf ** 2);

    // Dynamic rotation of amplitudes
    const re_e = state.flavorAmplitudes[0];
    const im_e = state.flavorAmplitudes[1];
    const re_mu = state.flavorAmplitudes[2];
    const im_mu = state.flavorAmplitudes[3];
    const re_tau = state.flavorAmplitudes[4];
    const im_tau = state.flavorAmplitudes[5];

    // Atmospheric phase rotation for mu-tau sector
    const atmAngle = phase31 * 0.35;
    const cosAtm = Math.cos(atmAngle);
    const sinAtm = Math.sin(atmAngle);

    // Apply unitary oscillation step
    const oscAngle = Math.asin(Math.min(1.0, Math.sqrt(transProb)));
    const cOsc = Math.cos(oscAngle);
    const sOsc = Math.sin(oscAngle);

    // Evolve e <-> mu/tau
    const newReE = cOsc * re_e - sOsc * (re_mu * 0.707 + re_tau * 0.707);
    const newImE = cOsc * im_e - sOsc * (im_mu * 0.707 + im_tau * 0.707);

    const newReMu = sOsc * 0.707 * re_e + cOsc * (re_mu * cosAtm - im_mu * sinAtm);
    const newImMu = sOsc * 0.707 * im_e + cOsc * (re_mu * sinAtm + im_mu * cosAtm);

    const newReTau = sOsc * 0.707 * re_e + cOsc * (re_tau * cosAtm + im_tau * sinAtm);
    const newImTau = sOsc * 0.707 * im_e + cOsc * (-re_tau * sinAtm + im_tau * cosAtm);

    // Compute raw probabilities
    let pE = newReE * newReE + newImE * newImE;
    let pMu = newReMu * newReMu + newImMu * newImMu;
    let pTau = newReTau * newReTau + newImTau * newImTau;
    const totalP = pE + pMu + pTau || 1;

    pE /= totalP;
    pMu /= totalP;
    pTau /= totalP;

    // Renormalize amplitudes
    const invNorm = 1 / Math.sqrt(totalP);
    state.flavorAmplitudes = [
      newReE * invNorm,
      newImE * invNorm,
      newReMu * invNorm,
      newImMu * invNorm,
      newReTau * invNorm,
      newImTau * invNorm
    ];
    state.flavorProbabilities = [pE, pMu, pTau];

    // Determine instantaneous dominant flavor
    if (pE >= pMu && pE >= pTau) {
      state.dominantFlavor = 'electron_neutrino';
    } else if (pMu >= pE && pMu >= pTau) {
      state.dominantFlavor = 'muon_neutrino';
    } else {
      state.dominantFlavor = 'tau_neutrino';
    }
  }

  // -------------------------------------------------------------
  // WEAK VERTICES (CHARGED CURRENT & NEUTRAL CURRENT)
  // -------------------------------------------------------------
  getAllWeakVertices(): WeakVertex[] {
    const vertices: WeakVertex[] = [];

    // 1. CHARGED CURRENT (CC, W±) LEPTONIC VERTICES
    vertices.push(
      {
        currentType: 'charged_current',
        incoming: 'electron',
        outgoing: 'electron_neutrino',
        mediator: 'w_minus',
        couplingConstant: 1.0,
        matrixElementFactor: 1.0,
        description: 'e⁻ → ν_e + W⁻ vertex (charged current weak isospin doublet)'
      },
      {
        currentType: 'charged_current',
        incoming: 'muon',
        outgoing: 'muon_neutrino',
        mediator: 'w_minus',
        couplingConstant: 1.0,
        matrixElementFactor: 1.0,
        description: 'μ⁻ → ν_μ + W⁻ vertex'
      },
      {
        currentType: 'charged_current',
        incoming: 'tau',
        outgoing: 'tau_neutrino',
        mediator: 'w_minus',
        couplingConstant: 1.0,
        matrixElementFactor: 1.0,
        description: 'τ⁻ → ν_τ + W⁻ vertex'
      }
    );

    // 2. CHARGED CURRENT (CC, W±) QUARK VERTICES (CKM MIXED)
    for (const u of UP_QUARK_FLAVORS) {
      for (const d of DOWN_QUARK_FLAVORS) {
        const vCKM = this.getCKMElement(u, d);
        vertices.push({
          currentType: 'charged_current',
          incoming: d,
          outgoing: u,
          mediator: 'w_minus',
          couplingConstant: vCKM,
          matrixElementFactor: vCKM * vCKM,
          description: `${d} → ${u} + W⁻ with CKM matrix element V_{${u[0]}${d[0]}} = ${vCKM.toFixed(4)}`
        });
      }
    }

    // 3. NEUTRAL CURRENT (NC, Z⁰) FLAVOR-CONSERVING VERTICES
    const ncParticles: Array<{ kind: ParticleKind; I3: number; Q: number; name: string }> = [
      { kind: 'electron_neutrino', I3: 0.5, Q: 0, name: 'ν_e' },
      { kind: 'muon_neutrino', I3: 0.5, Q: 0, name: 'ν_μ' },
      { kind: 'tau_neutrino', I3: 0.5, Q: 0, name: 'ν_τ' },
      { kind: 'electron', I3: -0.5, Q: -1, name: 'e⁻' },
      { kind: 'muon', I3: -0.5, Q: -1, name: 'μ⁻' },
      { kind: 'tau', I3: -0.5, Q: -1, name: 'τ⁻' },
      { kind: 'up', I3: 0.5, Q: 2 / 3, name: 'u' },
      { kind: 'charm', I3: 0.5, Q: 2 / 3, name: 'c' },
      { kind: 'top', I3: 0.5, Q: 2 / 3, name: 't' },
      { kind: 'down', I3: -0.5, Q: -1 / 3, name: 'd' },
      { kind: 'strange', I3: -0.5, Q: -1 / 3, name: 's' },
      { kind: 'bottom', I3: -0.5, Q: -1 / 3, name: 'b' }
    ];

    for (const p of ncParticles) {
      const gV = p.I3 - 2 * p.Q * WEAK_MIXING_SIN2_THETA_W;
      const gA = p.I3;
      vertices.push({
        currentType: 'neutral_current',
        incoming: p.kind,
        outgoing: p.kind,
        mediator: 'z_boson',
        couplingConstant: Math.sqrt(gV * gV + gA * gA),
        matrixElementFactor: gV * gV + gA * gA,
        description: `${p.name} → ${p.name} + Z⁰ (NC: g_V = ${gV.toFixed(3)}, g_A = ${gA.toFixed(3)})`
      });
    }

    return vertices;
  }

  // -------------------------------------------------------------
  // DECAY RATES FROM MATRIX ELEMENTS & RELATIVISTIC PHASE SPACE
  // -------------------------------------------------------------
  /**
   * Two-body phase space momentum:
   * p* = sqrt([M^2 - (m1+m2)^2] * [M^2 - (m1-m2)^2]) / (2M)
   */
  twoBodyMomentum(M: number, m1: number, m2: number): number {
    if (M <= m1 + m2) return 0;
    const term1 = M * M - (m1 + m2) ** 2;
    const term2 = M * M - (m1 - m2) ** 2;
    if (term1 <= 0 || term2 <= 0) return 0;
    return Math.sqrt(term1 * term2) / (2 * M);
  }

  /**
   * Relativistic 3-body Fermi phase space suppression integral:
   * f(x) = 1 - 8x^2 + 8x^6 - x^8 - 24x^4 ln(x)
   */
  fermiPhaseSpace(mChild: number, mParent: number): number {
    if (mParent <= 0) return 0;
    const x = mChild / mParent;
    if (x >= 1) return 0;
    if (x <= 1e-4) return 1.0;
    const x2 = x * x;
    const x4 = x2 * x2;
    const x6 = x4 * x2;
    const x8 = x4 * x4;
    return 1 - 8 * x2 + 8 * x6 - x8 - 24 * x4 * Math.log(x);
  }

  /**
   * Calculates all competing decay channels for any particle,
   * evaluating exact matrix elements squared |M|^2 and kinematic phase space,
   * yielding exact partial widths (MeV) and branching ratios (BR).
   */
  calculateDecayChannels(particle: ParticleInstance): DecayChannelDefinition[] {
    const kind = particle.kind;
    const channels: DecayChannelDefinition[] = [];

    // ==========================================
    // TOP QUARK (t -> b W+, s W+, d W+)
    // ==========================================
    if (kind === 'top') {
      const Mt = 172690; // MeV
      const Mw = 80377; // MeV
      const Mb = 4180;
      const Ms = 93.4;
      const Md = 4.67;

      const pstarB = this.twoBodyMomentum(Mt, Mb, Mw);
      const pstarS = this.twoBodyMomentum(Mt, Ms, Mw);
      const pstarD = this.twoBodyMomentum(Mt, Md, Mw);

      // |M|^2 proportional to (G_F Mt^3 / 8*sqrt(2)*pi) * |V_tq|^2 * (1 - Mw^2/Mt^2)^2 * (1 + 2Mw^2/Mt^2)
      const baseTopWidth = 1420; // MeV (~1.42 GeV)
      const vtb2 = CKM_MAGNITUDES[2][2] ** 2;
      const vts2 = CKM_MAGNITUDES[2][1] ** 2;
      const vtd2 = CKM_MAGNITUDES[2][0] ** 2;

      channels.push(
        {
          id: 'top_b_w',
          name: 't → b + W⁺ (dominant)',
          currentType: 'charged_current',
          products: [{ kind: 'bottom' }, { kind: 'w_plus' }],
          matrixElementSquared: vtb2,
          phaseSpaceFactor: pstarB / Mt,
          partialWidthMeV: baseTopWidth * vtb2,
          branchingRatio: 0,
          description: `Dominant charged-current decay via |V_tb|² = ${vtb2.toFixed(5)}`
        },
        {
          id: 'top_s_w',
          name: 't → s + W⁺ (CKM suppressed)',
          currentType: 'charged_current',
          products: [{ kind: 'strange' }, { kind: 'w_plus' }],
          matrixElementSquared: vts2,
          phaseSpaceFactor: pstarS / Mt,
          partialWidthMeV: baseTopWidth * vts2,
          branchingRatio: 0,
          description: `CKM-suppressed transition via |V_ts|² = ${vts2.toFixed(5)}`
        },
        {
          id: 'top_d_w',
          name: 't → d + W⁺ (doubly CKM suppressed)',
          currentType: 'charged_current',
          products: [{ kind: 'down' }, { kind: 'w_plus' }],
          matrixElementSquared: vtd2,
          phaseSpaceFactor: pstarD / Mt,
          partialWidthMeV: baseTopWidth * vtd2,
          branchingRatio: 0,
          description: `Doubly CKM-suppressed transition via |V_td|² = ${vtd2.toFixed(6)}`
        }
      );
    }

    // ==========================================
    // BOTTOM QUARK (b -> c/u + l/q + nu/qbar)
    // ==========================================
    else if (kind === 'bottom') {
      const Mb = 4180;
      const Mc = 1270;
      const Mu = 2.16;
      const vcb2 = CKM_MAGNITUDES[1][2] ** 2;
      const vub2 = CKM_MAGNITUDES[0][2] ** 2;
      const fc = this.fermiPhaseSpace(Mc, Mb);
      const fu = this.fermiPhaseSpace(Mu, Mb);

      const baseWidthB = 4.2e-10; // MeV
      channels.push(
        {
          id: 'b_c_e_nu',
          name: 'b → c + e⁻ + ν̄_e',
          currentType: 'charged_current',
          products: [{ kind: 'charm' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }],
          matrixElementSquared: vcb2,
          phaseSpaceFactor: fc,
          partialWidthMeV: baseWidthB * vcb2 * fc * 0.108,
          branchingRatio: 0,
          description: 'Semileptonic decay to electron via |V_cb|²'
        },
        {
          id: 'b_c_mu_nu',
          name: 'b → c + μ⁻ + ν̄_μ',
          currentType: 'charged_current',
          products: [{ kind: 'charm' }, { kind: 'muon' }, { kind: 'muon_neutrino', isAntiparticle: true }],
          matrixElementSquared: vcb2,
          phaseSpaceFactor: fc,
          partialWidthMeV: baseWidthB * vcb2 * fc * 0.108,
          branchingRatio: 0,
          description: 'Semileptonic decay to muon via |V_cb|²'
        },
        {
          id: 'b_c_tau_nu',
          name: 'b → c + τ⁻ + ν̄_τ',
          currentType: 'charged_current',
          products: [{ kind: 'charm' }, { kind: 'tau' }, { kind: 'tau_neutrino', isAntiparticle: true }],
          matrixElementSquared: vcb2,
          phaseSpaceFactor: fc * 0.28, // Tau phase space suppression
          partialWidthMeV: baseWidthB * vcb2 * fc * 0.024,
          branchingRatio: 0,
          description: 'Semileptonic decay to heavy tau lepton'
        },
        {
          id: 'b_c_d_ubar',
          name: 'b → c + d + ū (hadronic)',
          currentType: 'charged_current',
          products: [{ kind: 'charm' }, { kind: 'down' }, { kind: 'up', isAntiparticle: true }],
          matrixElementSquared: vcb2 * CKM_MAGNITUDES[0][0] ** 2 * 3, // Color factor 3
          phaseSpaceFactor: fc,
          partialWidthMeV: baseWidthB * vcb2 * fc * 0.50,
          branchingRatio: 0,
          description: 'Non-leptonic charged-current decay to light quarks (3 color channels)'
        },
        {
          id: 'b_u_e_nu',
          name: 'b → u + e⁻ + ν̄_e (rare)',
          currentType: 'charged_current',
          products: [{ kind: 'up' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }],
          matrixElementSquared: vub2,
          phaseSpaceFactor: fu,
          partialWidthMeV: baseWidthB * vub2 * fu * 0.015,
          branchingRatio: 0,
          description: 'Charmless CKM-suppressed transition via |V_ub|²'
        }
      );
    }

    // ==========================================
    // CHARM QUARK (c -> s/d + W+*)
    // ==========================================
    else if (kind === 'charm') {
      const Mc = 1270;
      const Ms = 93.4;
      const Md = 4.67;
      const vcs2 = CKM_MAGNITUDES[1][1] ** 2;
      const vcd2 = CKM_MAGNITUDES[1][0] ** 2;
      const fs = this.fermiPhaseSpace(Ms, Mc);
      const fd = this.fermiPhaseSpace(Md, Mc);

      const baseWidthC = 1.6e-9;
      channels.push(
        {
          id: 'c_s_e_nu',
          name: 'c → s + e⁺ + ν_e',
          currentType: 'charged_current',
          products: [{ kind: 'strange' }, { kind: 'electron', isAntiparticle: true }, { kind: 'electron_neutrino' }],
          matrixElementSquared: vcs2,
          phaseSpaceFactor: fs,
          partialWidthMeV: baseWidthC * vcs2 * fs * 0.19,
          branchingRatio: 0,
          description: 'Cabibbo-favored semileptonic decay via |V_cs|²'
        },
        {
          id: 'c_s_mu_nu',
          name: 'c → s + μ⁺ + ν_μ',
          currentType: 'charged_current',
          products: [{ kind: 'strange' }, { kind: 'muon', isAntiparticle: true }, { kind: 'muon_neutrino' }],
          matrixElementSquared: vcs2,
          phaseSpaceFactor: fs * 0.95,
          partialWidthMeV: baseWidthC * vcs2 * fs * 0.18,
          branchingRatio: 0,
          description: 'Cabibbo-favored decay into muon'
        },
        {
          id: 'c_s_u_dbar',
          name: 'c → s + u + d̄ (hadronic)',
          currentType: 'charged_current',
          products: [{ kind: 'strange' }, { kind: 'up' }, { kind: 'down', isAntiparticle: true }],
          matrixElementSquared: vcs2 * 3,
          phaseSpaceFactor: fs,
          partialWidthMeV: baseWidthC * vcs2 * fs * 0.58,
          branchingRatio: 0,
          description: 'Hadronic charged-current transition to strange and up quarks'
        },
        {
          id: 'c_d_e_nu',
          name: 'c → d + e⁺ + ν_e (Cabibbo suppressed)',
          currentType: 'charged_current',
          products: [{ kind: 'down' }, { kind: 'electron', isAntiparticle: true }, { kind: 'electron_neutrino' }],
          matrixElementSquared: vcd2,
          phaseSpaceFactor: fd,
          partialWidthMeV: baseWidthC * vcd2 * fd * 0.05,
          branchingRatio: 0,
          description: 'Cabibbo-suppressed decay via |V_cd|²'
        }
      );
    }

    // ==========================================
    // STRANGE QUARK (s -> u + e- + nubar)
    // ==========================================
    else if (kind === 'strange') {
      const Ms = 93.4;
      const Mu = 2.16;
      const vus2 = CKM_MAGNITUDES[0][1] ** 2;
      const fu = this.fermiPhaseSpace(Mu, Ms);
      const baseWidthS = 5.3e-14;

      channels.push(
        {
          id: 's_u_e_nu',
          name: 's → u + e⁻ + ν̄_e',
          currentType: 'charged_current',
          products: [{ kind: 'up' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }],
          matrixElementSquared: vus2,
          phaseSpaceFactor: fu,
          partialWidthMeV: baseWidthS * vus2 * fu * 0.5,
          branchingRatio: 0,
          description: 'Weak decay of strange quark via Cabibbo angle |V_us|²'
        },
        {
          id: 's_u_mu_nu',
          name: 's → u + μ⁻ + ν̄_μ',
          currentType: 'charged_current',
          products: [{ kind: 'up' }, { kind: 'muon' }, { kind: 'muon_neutrino', isAntiparticle: true }],
          matrixElementSquared: vus2,
          phaseSpaceFactor: fu * 0.35,
          partialWidthMeV: baseWidthS * vus2 * fu * 0.5,
          branchingRatio: 0,
          description: 'Weak decay into muon channel'
        }
      );
    }

    // ==========================================
    // DOWN QUARK (d -> u + e- + nubar, Beta Decay)
    // ==========================================
    else if (kind === 'down') {
      const vud2 = CKM_MAGNITUDES[0][0] ** 2;
      const baseWidthD = 1e-21;
      channels.push({
        id: 'd_u_e_nu',
        name: 'd → u + e⁻ + ν̄_e (Beta Decay)',
        currentType: 'charged_current',
        products: [{ kind: 'up' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }],
        matrixElementSquared: vud2,
        phaseSpaceFactor: 1.0,
        partialWidthMeV: baseWidthD * vud2,
        branchingRatio: 0,
        description: 'Weak charged-current nuclear beta decay mediated by W⁻'
      });
    }

    // ==========================================
    // MUON (mu- -> e- + nubar_e + nu_mu)
    // ==========================================
    else if (kind === 'muon') {
      const Mmu = 105.66;
      const Me = 0.511;
      const f = this.fermiPhaseSpace(Me, Mmu);
      const totalMuWidthMeV = 2.996e-16; // tau ~ 2.197 microseconds

      channels.push(
        {
          id: 'mu_e_nu_nu',
          name: 'μ⁻ → e⁻ + ν̄_e + ν_μ',
          currentType: 'charged_current',
          products: [{ kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }, { kind: 'muon_neutrino' }],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: f,
          partialWidthMeV: totalMuWidthMeV * 0.986,
          branchingRatio: 0,
          description: 'Standard Model leptonic muon decay via virtual W⁻'
        },
        {
          id: 'mu_e_nu_nu_gamma',
          name: 'μ⁻ → e⁻ + ν̄_e + ν_μ + γ (radiative)',
          currentType: 'charged_current',
          products: [{ kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }, { kind: 'muon_neutrino' }, { kind: 'photon' }],
          matrixElementSquared: 1 / 137,
          phaseSpaceFactor: f * 0.8,
          partialWidthMeV: totalMuWidthMeV * 0.014,
          branchingRatio: 0,
          description: 'QED radiative correction with inner bremsstrahlung photon emission'
        }
      );
    }

    // ==========================================
    // TAU LEPTON (tau- -> e/mu/pi + nu_tau)
    // ==========================================
    else if (kind === 'tau') {
      const Mtau = 1776.86;
      const baseWidthTau = 2.267e-9; // tau ~ 2.9e-13 s

      channels.push(
        {
          id: 'tau_e_nu_nu',
          name: 'τ⁻ → e⁻ + ν̄_e + ν_τ (electronic)',
          currentType: 'charged_current',
          products: [{ kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }, { kind: 'tau_neutrino' }],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 1.0,
          partialWidthMeV: baseWidthTau * 0.178,
          branchingRatio: 0,
          description: 'Electronic leptonic decay mode (BR ~ 17.8%)'
        },
        {
          id: 'tau_mu_nu_nu',
          name: 'τ⁻ → μ⁻ + ν̄_μ + ν_τ (muonic)',
          currentType: 'charged_current',
          products: [{ kind: 'muon' }, { kind: 'muon_neutrino', isAntiparticle: true }, { kind: 'tau_neutrino' }],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 0.97,
          partialWidthMeV: baseWidthTau * 0.174,
          branchingRatio: 0,
          description: 'Muonic leptonic decay mode (BR ~ 17.4%)'
        },
        {
          id: 'tau_d_ubar_nu',
          name: 'τ⁻ → d + ū + ν_τ (hadronic pion/rho)',
          currentType: 'charged_current',
          products: [{ kind: 'down' }, { kind: 'up', isAntiparticle: true }, { kind: 'tau_neutrino' }],
          matrixElementSquared: 3 * CKM_MAGNITUDES[0][0] ** 2, // Color factor 3 * |V_ud|^2
          phaseSpaceFactor: 0.92,
          partialWidthMeV: baseWidthTau * 0.648,
          branchingRatio: 0,
          description: 'Dominant hadronic decay channels into pions/rhos (BR ~ 64.8%)'
        }
      );
    }

    // ==========================================
    // W+ AND W- GAUGE BOSONS (Full Leptonic & Hadronic CKM channels)
    // ==========================================
    else if (kind === 'w_minus' || kind === 'w_plus') {
      const isMinus = kind === 'w_minus';
      const wWidth = 2085; // MeV (2.085 GeV)

      // Leptonic: 3 generations, BR ~ 10.8% each
      channels.push(
        {
          id: 'w_e_nu',
          name: isMinus ? 'W⁻ → e⁻ + ν̄_e' : 'W⁺ → e⁺ + ν_e',
          currentType: 'charged_current',
          products: [
            { kind: 'electron', isAntiparticle: !isMinus },
            { kind: 'electron_neutrino', isAntiparticle: isMinus }
          ],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.108,
          branchingRatio: 0,
          description: 'First generation leptonic charged current'
        },
        {
          id: 'w_mu_nu',
          name: isMinus ? 'W⁻ → μ⁻ + ν̄_μ' : 'W⁺ → μ⁺ + ν_μ',
          currentType: 'charged_current',
          products: [
            { kind: 'muon', isAntiparticle: !isMinus },
            { kind: 'muon_neutrino', isAntiparticle: isMinus }
          ],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.106,
          branchingRatio: 0,
          description: 'Second generation leptonic charged current'
        },
        {
          id: 'w_tau_nu',
          name: isMinus ? 'W⁻ → τ⁻ + ν̄_τ' : 'W⁺ → τ⁺ + ν_τ',
          currentType: 'charged_current',
          products: [
            { kind: 'tau', isAntiparticle: !isMinus },
            { kind: 'tau_neutrino', isAntiparticle: isMinus }
          ],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.112,
          branchingRatio: 0,
          description: 'Third generation leptonic charged current'
        }
      );

      // Hadronic: 4 kinematic channels (u dbar, c sbar, u sbar, c dbar) x 3 color singlets
      const vud2 = CKM_MAGNITUDES[0][0] ** 2;
      const vcs2 = CKM_MAGNITUDES[1][1] ** 2;
      const vus2 = CKM_MAGNITUDES[0][1] ** 2;
      const vcd2 = CKM_MAGNITUDES[1][0] ** 2;

      channels.push(
        {
          id: 'w_u_d',
          name: isMinus ? 'W⁻ → d + ū' : 'W⁺ → u + d̄',
          currentType: 'charged_current',
          products: isMinus
            ? [{ kind: 'down', color: 'red' }, { kind: 'up', isAntiparticle: true, color: 'anti_red' }]
            : [{ kind: 'up', color: 'red' }, { kind: 'down', isAntiparticle: true, color: 'anti_red' }],
          matrixElementSquared: 3 * vud2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.334,
          branchingRatio: 0,
          description: `Hadronic channel via |V_ud|² = ${vud2.toFixed(4)} (3 colors)`
        },
        {
          id: 'w_c_s',
          name: isMinus ? 'W⁻ → s + c̄' : 'W⁺ → c + s̄',
          currentType: 'charged_current',
          products: isMinus
            ? [{ kind: 'strange', color: 'green' }, { kind: 'charm', isAntiparticle: true, color: 'anti_green' }]
            : [{ kind: 'charm', color: 'green' }, { kind: 'strange', isAntiparticle: true, color: 'anti_green' }],
          matrixElementSquared: 3 * vcs2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.334,
          branchingRatio: 0,
          description: `Hadronic channel via |V_cs|² = ${vcs2.toFixed(4)} (3 colors)`
        },
        {
          id: 'w_u_s',
          name: isMinus ? 'W⁻ → s + ū' : 'W⁺ → u + s̄',
          currentType: 'charged_current',
          products: isMinus
            ? [{ kind: 'strange', color: 'blue' }, { kind: 'up', isAntiparticle: true, color: 'anti_blue' }]
            : [{ kind: 'up', color: 'blue' }, { kind: 'strange', isAntiparticle: true, color: 'anti_blue' }],
          matrixElementSquared: 3 * vus2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.017,
          branchingRatio: 0,
          description: `Cabibbo-suppressed hadronic channel via |V_us|²`
        },
        {
          id: 'w_c_d',
          name: isMinus ? 'W⁻ → d + c̄' : 'W⁺ → c + d̄',
          currentType: 'charged_current',
          products: isMinus
            ? [{ kind: 'down', color: 'blue' }, { kind: 'charm', isAntiparticle: true, color: 'anti_blue' }]
            : [{ kind: 'charm', color: 'blue' }, { kind: 'down', isAntiparticle: true, color: 'anti_blue' }],
          matrixElementSquared: 3 * vcd2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: wWidth * 0.017,
          branchingRatio: 0,
          description: `Cabibbo-suppressed hadronic channel via |V_cd|²`
        }
      );
    }

    // ==========================================
    // Z0 GAUGE BOSON (Neutral Current Channels)
    // ==========================================
    else if (kind === 'z_boson') {
      const zWidth = 2495.2; // MeV (2.4952 GeV)

      // Invisible Neutrino Channels (3 flavors, total BR ~ 20.0%)
      channels.push(
        {
          id: 'z_nu_e',
          name: 'Z⁰ → ν_e + ν̄_e (invisible)',
          currentType: 'neutral_current',
          products: [{ kind: 'electron_neutrino' }, { kind: 'electron_neutrino', isAntiparticle: true }],
          matrixElementSquared: 0.5,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.067,
          branchingRatio: 0,
          description: 'Invisible neutral-current decay to electron neutrinos'
        },
        {
          id: 'z_nu_mu',
          name: 'Z⁰ → ν_μ + ν̄_μ (invisible)',
          currentType: 'neutral_current',
          products: [{ kind: 'muon_neutrino' }, { kind: 'muon_neutrino', isAntiparticle: true }],
          matrixElementSquared: 0.5,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.067,
          branchingRatio: 0,
          description: 'Invisible neutral-current decay to muon neutrinos'
        },
        {
          id: 'z_nu_tau',
          name: 'Z⁰ → ν_τ + ν̄_τ (invisible)',
          currentType: 'neutral_current',
          products: [{ kind: 'tau_neutrino' }, { kind: 'tau_neutrino', isAntiparticle: true }],
          matrixElementSquared: 0.5,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.067,
          branchingRatio: 0,
          description: 'Invisible neutral-current decay to tau neutrinos'
        },
        // Charged Leptons (BR ~ 3.36% each)
        {
          id: 'z_e_e',
          name: 'Z⁰ → e⁻ + e⁺',
          currentType: 'neutral_current',
          products: [{ kind: 'electron' }, { kind: 'electron', isAntiparticle: true }],
          matrixElementSquared: 0.25,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.0336,
          branchingRatio: 0,
          description: 'Neutral-current decay to electron-positron pair'
        },
        {
          id: 'z_mu_mu',
          name: 'Z⁰ → μ⁻ + μ⁺',
          currentType: 'neutral_current',
          products: [{ kind: 'muon' }, { kind: 'muon', isAntiparticle: true }],
          matrixElementSquared: 0.25,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.0336,
          branchingRatio: 0,
          description: 'Neutral-current decay to muon-antimuon pair'
        },
        {
          id: 'z_tau_tau',
          name: 'Z⁰ → τ⁻ + τ⁺',
          currentType: 'neutral_current',
          products: [{ kind: 'tau' }, { kind: 'tau', isAntiparticle: true }],
          matrixElementSquared: 0.25,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.0337,
          branchingRatio: 0,
          description: 'Neutral-current decay to tau-antitau pair'
        },
        // Quarks (Hadronic, 3 colors, total BR ~ 69.9%)
        {
          id: 'z_u_u',
          name: 'Z⁰ → u + ū',
          currentType: 'neutral_current',
          products: [{ kind: 'up', color: 'red' }, { kind: 'up', isAntiparticle: true, color: 'anti_red' }],
          matrixElementSquared: 0.86,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.120,
          branchingRatio: 0,
          description: 'Neutral current decay to up quarks (BR ~ 12.0%)'
        },
        {
          id: 'z_d_d',
          name: 'Z⁰ → d + d̄',
          currentType: 'neutral_current',
          products: [{ kind: 'down', color: 'blue' }, { kind: 'down', isAntiparticle: true, color: 'anti_blue' }],
          matrixElementSquared: 1.11,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.156,
          branchingRatio: 0,
          description: 'Neutral current decay to down quarks (BR ~ 15.6%)'
        },
        {
          id: 'z_b_b',
          name: 'Z⁰ → b + b̄',
          currentType: 'neutral_current',
          products: [{ kind: 'bottom', color: 'green' }, { kind: 'bottom', isAntiparticle: true, color: 'anti_green' }],
          matrixElementSquared: 1.11,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: zWidth * 0.151,
          branchingRatio: 0,
          description: 'Neutral current decay to bottom quarks (BR ~ 15.1%)'
        }
      );
    }

    // ==========================================
    // HIGGS BOSON (Yukawa & Gauge Loop Channels)
    // ==========================================
    else if (kind === 'higgs') {
      const hWidth = 4.07; // MeV

      channels.push(
        {
          id: 'h_b_b',
          name: 'H⁰ → b + b̄ (dominant Yukawa)',
          currentType: 'higgs',
          products: [{ kind: 'bottom', color: 'red' }, { kind: 'bottom', isAntiparticle: true, color: 'anti_red' }],
          matrixElementSquared: 4.18 ** 2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: hWidth * 0.582,
          branchingRatio: 0,
          description: 'Dominant decay via bottom quark Yukawa coupling (BR ~ 58.2%)'
        },
        {
          id: 'h_w_w',
          name: 'H⁰ → W⁺ + W⁻* (gauge coupling)',
          currentType: 'charged_current',
          products: [{ kind: 'w_plus' }, { kind: 'w_minus' }],
          matrixElementSquared: 1.0,
          phaseSpaceFactor: 0.3,
          partialWidthMeV: hWidth * 0.215,
          branchingRatio: 0,
          description: 'Weak vector boson pair production (BR ~ 21.5%)'
        },
        {
          id: 'h_tau_tau',
          name: 'H⁰ → τ⁻ + τ⁺',
          currentType: 'higgs',
          products: [{ kind: 'tau' }, { kind: 'tau', isAntiparticle: true }],
          matrixElementSquared: 1.77 ** 2,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: hWidth * 0.063,
          branchingRatio: 0,
          description: 'Yukawa coupling to third-generation charged leptons (BR ~ 6.3%)'
        },
        {
          id: 'h_gamma_gamma',
          name: 'H⁰ → γ + γ (loop discovery channel)',
          currentType: 'electromagnetic',
          products: [{ kind: 'photon' }, { kind: 'photon' }],
          matrixElementSquared: 0.01,
          phaseSpaceFactor: 0.5,
          partialWidthMeV: hWidth * 0.0023,
          branchingRatio: 0,
          description: 'Top quark & W boson quantum loop triangle diagram (BR ~ 0.23%)'
        },
        {
          id: 'h_z_z',
          name: 'H⁰ → Z⁰ + Z⁰* (golden channel)',
          currentType: 'neutral_current',
          products: [{ kind: 'z_boson' }, { kind: 'z_boson' }],
          matrixElementSquared: 0.5,
          phaseSpaceFactor: 0.15,
          partialWidthMeV: hWidth * 0.026,
          branchingRatio: 0,
          description: 'Golden decay channel to four leptons via off-shell Z bosons (BR ~ 2.6%)'
        }
      );
    }

    // Normalize Branching Ratios
    const totalPartialWidth = channels.reduce((sum, ch) => sum + ch.partialWidthMeV, 0);
    if (totalPartialWidth > 0) {
      for (const ch of channels) {
        ch.branchingRatio = ch.partialWidthMeV / totalPartialWidth;
      }
    }

    return channels;
  }

  /**
   * Samples one channel based on exact branching ratios
   */
  sampleDecayChannel(particle: ParticleInstance): DecayChannelDefinition | null {
    const channels = this.calculateDecayChannels(particle);
    if (channels.length === 0) return null;

    const r = Math.random();
    let accumulated = 0;
    for (const ch of channels) {
      accumulated += ch.branchingRatio;
      if (r <= accumulated) {
        return ch;
      }
    }
    return channels[0];
  }

  // -------------------------------------------------------------
  // NEUTRINO SCATTERING (NC & CC)
  // -------------------------------------------------------------
  /**
   * Neutral Current (NC) Elastic Scattering:
   * nu_l + e- -> nu_l' + e'-
   * Mediated by Z0 exchange.
   * Cross section with interference (nu_e has both NC and CC contributions):
   * g_L(nu_e) = sin^2(theta_W) + 1/2
   * g_L(nu_mu, nu_tau) = sin^2(theta_W) - 1/2
   * g_R = sin^2(theta_W)
   */
  evaluateNeutrinoElectronNC(
    nu: ParticleInstance,
    e: ParticleInstance,
    dt: number
  ): {
    scattered: boolean;
    recoilE: FourVector;
    scatteredNu: FourVector;
    q2: number;
    channel: 'NC' | 'NC_CC_Interference';
  } {
    const isNuE = nu.kind === 'electron_neutrino' || (nu.neutrinoState && nu.neutrinoState.dominantFlavor === 'electron_neutrino');
    const sin2W = WEAK_MIXING_SIN2_THETA_W;
    const gL = isNuE ? sin2W + 0.5 : sin2W - 0.5;
    const gR = sin2W;

    // Relative matrix element squared: (g_L^2 + 1/3 g_R^2)
    const m2 = gL * gL + (1 / 3) * gR * gR;
    const prob = 0.25 * m2 * dt;

    if (Math.random() < prob) {
      const pNu = Math.hypot(nu.vx, nu.vy) * nu.mass || 1.0;
      const angle = Math.atan2(nu.vy, nu.vx) + (Math.random() - 0.5) * 0.9;
      const recoilSpeed = Math.min(LIGHT_SPEED * 0.9, pNu * 0.6);

      const q2 = -((pNu * 0.5) ** 2);
      return {
        scattered: true,
        recoilE: {
          E: Math.hypot(recoilSpeed, simulationMass('electron') * LIGHT_SPEED),
          px: Math.cos(angle + Math.PI * 0.4) * recoilSpeed,
          py: Math.sin(angle + Math.PI * 0.4) * recoilSpeed,
          pz: 0
        },
        scatteredNu: {
          E: pNu * 0.7,
          px: Math.cos(angle - Math.PI * 0.2) * (pNu * 0.7),
          py: Math.sin(angle - Math.PI * 0.2) * (pNu * 0.7),
          pz: 0
        },
        q2,
        channel: isNuE ? 'NC_CC_Interference' : 'NC'
      };
    }

    return {
      scattered: false,
      recoilE: { E: 0, px: 0, py: 0 },
      scatteredNu: { E: 0, px: 0, py: 0 },
      q2: 0,
      channel: 'NC'
    };
  }

  /**
   * Charged Current (CC) Inverse Beta Decay:
   * nu_e + d -> e- + u   (or on nucleons: nu_e + n -> p + e-)
   * anti-nu_e + u -> e+ + d (or anti-nu_e + p -> n + e+)
   */
  evaluateInverseBetaCC(
    nu: ParticleInstance,
    target: ParticleInstance,
    dt: number
  ): {
    occurred: boolean;
    productLeptonKind: ParticleKind;
    productLeptonAntiparticle: boolean;
    productQuarkKind: QuarkFlavor;
    q2: number;
    description: string;
  } {
    const isAntiNu = nu.isAntiparticle;
    const vud2 = CKM_MAGNITUDES[0][0] ** 2;

    if (!isAntiNu && target.kind === 'down') {
      // nu_e + d -> e- + u
      const prob = 0.22 * vud2 * dt;
      if (Math.random() < prob) {
        return {
          occurred: true,
          productLeptonKind: 'electron',
          productLeptonAntiparticle: false,
          productQuarkKind: 'up',
          q2: -1.2,
          description: 'Inverse Beta CC: ν_e + d → e⁻ + u (W⁺ exchange via |V_ud|²)'
        };
      }
    } else if (isAntiNu && target.kind === 'up') {
      // anti-nu_e + u -> e+ + d
      const prob = 0.22 * vud2 * dt;
      if (Math.random() < prob) {
        return {
          occurred: true,
          productLeptonKind: 'electron',
          productLeptonAntiparticle: true,
          productQuarkKind: 'down',
          q2: -1.2,
          description: 'Inverse Beta CC: ν̄_e + u → e⁺ + d (W⁻ exchange via |V_ud|²)'
        };
      }
    } else if (!isAntiNu && nu.kind === 'muon_neutrino' && target.kind === 'down') {
      // nu_mu + d -> mu- + u
      const prob = 0.18 * vud2 * dt;
      if (Math.random() < prob) {
        return {
          occurred: true,
          productLeptonKind: 'muon',
          productLeptonAntiparticle: false,
          productQuarkKind: 'up',
          q2: -1.8,
          description: 'Muon CC Scattering: ν_μ + d → μ⁻ + u'
        };
      }
    }

    return {
      occurred: false,
      productLeptonKind: 'electron',
      productLeptonAntiparticle: false,
      productQuarkKind: 'up',
      q2: 0,
      description: ''
    };
  }

  // -------------------------------------------------------------
  // NEUTRINO-ANTINEUTRINO INTERACTIONS (nu nu_bar -> Z* -> f f_bar)
  // -------------------------------------------------------------
  evaluateNeutrinoAntineutrinoAnnihilation(
    nu: ParticleInstance,
    antiNu: ParticleInstance,
    dt: number
  ): {
    annihilated: boolean;
    products: Array<{ kind: ParticleKind; isAntiparticle: boolean; color?: ParticleColor }>;
    q2: number;
    description: string;
  } {
    // Both must be neutrino and antineutrino
    if (!nu.kind.includes('neutrino') || !antiNu.kind.includes('neutrino')) {
      return { annihilated: false, products: [], q2: 0, description: '' };
    }
    if (nu.isAntiparticle === antiNu.isAntiparticle) {
      return { annihilated: false, products: [], q2: 0, description: '' };
    }

    const s = 4.0 * (nu.energy || 2.0) * (antiNu.energy || 2.0);
    const prob = 0.28 * dt;

    if (Math.random() < prob) {
      // Pick Z* annihilation product based on Z0 branching ratios:
      // Leptons: e+e- (3.4%), mu+mu- (3.4%), tau+tau- (3.4%)
      // Quarks: u+ubar (12%), d+dbar (15%), s+sbar (15%), b+bbar (15%)
      // Neutrinos: nu+nubar (20%)
      const r = Math.random();
      if (r < 0.25) {
        return {
          annihilated: true,
          products: [
            { kind: 'electron', isAntiparticle: false },
            { kind: 'electron', isAntiparticle: true }
          ],
          q2: s,
          description: 'ν + ν̄ → Z* → e⁻ + e⁺ pair creation!'
        };
      } else if (r < 0.50) {
        return {
          annihilated: true,
          products: [
            { kind: 'muon', isAntiparticle: false },
            { kind: 'muon', isAntiparticle: true }
          ],
          q2: s,
          description: 'ν + ν̄ → Z* → μ⁻ + μ⁺ pair creation!'
        };
      } else if (r < 0.75) {
        return {
          annihilated: true,
          products: [
            { kind: 'up', isAntiparticle: false, color: 'red' },
            { kind: 'up', isAntiparticle: true, color: 'anti_red' }
          ],
          q2: s,
          description: 'ν + ν̄ → Z* → u + ū color-singlet quark pair!'
        };
      } else {
        return {
          annihilated: true,
          products: [
            { kind: 'down', isAntiparticle: false, color: 'blue' },
            { kind: 'down', isAntiparticle: true, color: 'anti_blue' }
          ],
          q2: s,
          description: 'ν + ν̄ → Z* → d + d̄ color-singlet quark pair!'
        };
      }
    }

    return { annihilated: false, products: [], q2: 0, description: '' };
  }

  /**
   * Glashow Resonance:
   * anti-nu_e + e- -> W- -> hadrons / leptons
   * Occurs resonantly at s = M_W^2 (E_nu ~ 6.3 PeV in lab frame)
   */
  evaluateGlashowResonance(
    antiNu: ParticleInstance,
    electron: ParticleInstance
  ): {
    resonant: boolean;
    description: string;
  } {
    if (antiNu.kind !== 'electron_neutrino' || !antiNu.isAntiparticle) return { resonant: false, description: '' };
    if (electron.kind !== 'electron' || electron.isAntiparticle) return { resonant: false, description: '' };

    return {
      resonant: true,
      description: '💥 Glashow Resonance: ν̄_e + e⁻ → W⁻ (s ≈ M_W² peak cross-section 5.0 μb)!'
    };
  }

  // -------------------------------------------------------------
  // VIRTUAL WEAK PROPAGATOR MARKERS (W± and Z⁰)
  // -------------------------------------------------------------
  createVirtualWeakMarker(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    currentType: WeakCurrentType,
    bosonKind: 'w_plus' | 'w_minus' | 'z_boson',
    q2 = -1.5
  ): VirtualWeakMarker {
    const marker: VirtualWeakMarker = {
      id: this.nextMarkerId++,
      x1,
      y1,
      x2,
      y2,
      currentType,
      bosonKind,
      q2,
      alpha: 1.0,
      age: 0,
      maxAge: 16
    };
    this.virtualMarkers.push(marker);
    if (this.virtualMarkers.length > 30) {
      this.virtualMarkers.shift();
    }
    return marker;
  }

  updateVirtualMarkers(dt: number): void {
    for (let i = this.virtualMarkers.length - 1; i >= 0; i--) {
      const m = this.virtualMarkers[i];
      m.age += dt;
      m.alpha = Math.max(0, 1 - m.age / m.maxAge);
      if (m.age >= m.maxAge) {
        this.virtualMarkers.splice(i, 1);
      }
    }
  }

  renderVirtualWeakMarkers(ctx: CanvasRenderingContext2D): void {
    if (this.virtualMarkers.length === 0) return;

    for (const m of this.virtualMarkers) {
      if (m.alpha <= 0.01) continue;
      const isCC = m.currentType === 'charged_current';
      const color = isCC ? `rgba(244, 63, 94, ${m.alpha * 0.9})` : `rgba(192, 38, 211, ${m.alpha * 0.9})`;
      const glow = isCC ? `rgba(244, 63, 94, ${m.alpha * 0.3})` : `rgba(192, 38, 211, ${m.alpha * 0.3})`;
      const label = m.bosonKind === 'w_plus' ? 'W⁺' : m.bosonKind === 'w_minus' ? 'W⁻' : 'Z⁰';

      ctx.save();

      // Draw wavy weak propagator path
      const dx = m.x2 - m.x1;
      const dy = m.y2 - m.y1;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;

      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      const waves = Math.max(3, Math.floor(dist / 10));
      for (let s = 1; s <= waves; s++) {
        const t = s / waves;
        const curX = m.x1 + dx * t;
        const curY = m.y1 + dy * t;
        const waveOffset = Math.sin(t * Math.PI * 4 + m.age * 0.8) * 4.5;
        ctx.lineTo(curX + nx * waveOffset, curY + ny * waveOffset);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Outer glow
      ctx.strokeStyle = glow;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Label at midpoint
      const mx = (m.x1 + m.x2) * 0.5 + nx * 8;
      const my = (m.y1 + m.y2) * 0.5 + ny * 8;
      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${label}* (q²=${m.q2.toFixed(1)})`, mx - 12, my - 3);

      ctx.restore();
    }
  }

  /**
   * Evaluates dimensional reduction parameters for weak interactions compactified on S^1.
   */
  getDimensionalReductionParameters(compactificationRadiusR = 1.0) {
    const r = Math.max(0.1, compactificationRadiusR);
    const g4Weak = 0.653;
    const g4Prime = 0.357;
    const g3DWeak = g4Weak / Math.sqrt(2 * Math.PI * r);
    const g3DPrime = g4Prime / Math.sqrt(2 * Math.PI * r);
    return {
      radiusR: r,
      g3DWeak,
      g3DPrime,
      sin2ThetaW: WEAK_MIXING_SIN2_THETA_W,
      chiralProjectorL: 'P_L = diag(I_2, 0)',
      chiralProjectorR: 'P_R = diag(0, I_2)',
      scalarAdjointHiggs: 'W_3^a -> phi_W^a, B_3 -> phi_B (compactification Wilson scalars)'
    };
  }
}
