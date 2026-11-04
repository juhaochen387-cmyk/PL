/**
 * Standard Model Higgs Mechanism & Electroweak Symmetry Breaking (EWSB) Engine
 * 1. The Higgs Field doublet Phi = [phi+, phi0]^T
 * 2. The Mexican Hat Potential: V(Phi) = -mu^2 Phi^dagger Phi + lambda (Phi^dagger Phi)^2
 * 3. Electroweak Symmetry Breaking (EWSB): SU(2)_L x U(1)_Y -> U(1)_em
 * 4. Yukawa Couplings for all 12 fermions: L_Y = -y_f psi_bar Phi psi
 * 5. Dynamic fermion mass generation: m_f(v) = y_f * v / sqrt(2)
 * 6. Gauge couplings (HWW, HHWW, HZZ, HHZZ) & Self-couplings (HHH, HHHH)
 * 7. Higgs Production channels (ggF, VBF, VH, ttH) & Exact 9 Decay channels with branching ratios
 */

import {
  ParticleInstance,
  ParticleKind,
  ParticleColor,
  YukawaDefinition,
  HiggsProductionChannel,
  DecayChannelDefinition,
  FourVector
} from '../types/physics';
import { LIGHT_SPEED, STANDARD_MODEL_PARTICLES, simulationMass } from './catalog';

// ==========================================
// PHYSICAL CONSTANTS (HIGGS SECTOR)
// ==========================================
export const HIGGS_VEV_STANDARD_GEV = 246.22; // v = (sqrt(2) G_F)^(-1/2) = 246.22 GeV
export const HIGGS_MASS_STANDARD_GEV = 125.25; // m_H = 125.25 GeV
export const HIGGS_TOTAL_WIDTH_MEV = 4.07; // Gamma_H = 4.07 MeV
export const HIGGS_LAMBDA_STANDARD = (HIGGS_MASS_STANDARD_GEV ** 2) / (2 * HIGGS_VEV_STANDARD_GEV ** 2); // ~ 0.1293
export const HIGGS_MU2_STANDARD = HIGGS_LAMBDA_STANDARD * (HIGGS_VEV_STANDARD_GEV ** 2); // ~ 7843.8 GeV^2

// Electroweak gauge couplings
export const WEAK_COUPLING_G = 0.6517; // g = e / sin(theta_W)
export const WEAK_COUPLING_GPRIME = 0.3574; // g' = e / cos(theta_W)

// ==========================================
// YUKAWA COUPLINGS BASELINE (y_f = sqrt(2) * m_f / v)
// ==========================================
export const YUKAWA_BASELINE: Record<string, { kind: ParticleKind; name: string; symbol: string; family: 'quark' | 'lepton'; generation: number; massMeV: number }> = {
  top: { kind: 'top', name: 'Top Quark', symbol: 't', family: 'quark', generation: 3, massMeV: 172690 },
  bottom: { kind: 'bottom', name: 'Bottom Quark', symbol: 'b', family: 'quark', generation: 3, massMeV: 4180 },
  charm: { kind: 'charm', name: 'Charm Quark', symbol: 'c', family: 'quark', generation: 2, massMeV: 1270 },
  strange: { kind: 'strange', name: 'Strange Quark', symbol: 's', family: 'quark', generation: 2, massMeV: 93.4 },
  down: { kind: 'down', name: 'Down Quark', symbol: 'd', family: 'quark', generation: 1, massMeV: 4.67 },
  up: { kind: 'up', name: 'Up Quark', symbol: 'u', family: 'quark', generation: 1, massMeV: 2.16 },
  tau: { kind: 'tau', name: 'Tau Lepton', symbol: 'τ', family: 'lepton', generation: 3, massMeV: 1776.86 },
  muon: { kind: 'muon', name: 'Muon', symbol: 'μ', family: 'lepton', generation: 2, massMeV: 105.66 },
  electron: { kind: 'electron', name: 'Electron', symbol: 'e', family: 'lepton', generation: 1, massMeV: 0.511 },
  tau_neutrino: { kind: 'tau_neutrino', name: 'Tau Neutrino', symbol: 'ν_τ', family: 'lepton', generation: 3, massMeV: 0.05e-6 },
  muon_neutrino: { kind: 'muon_neutrino', name: 'Muon Neutrino', symbol: 'ν_μ', family: 'lepton', generation: 2, massMeV: 0.009e-6 },
  electron_neutrino: { kind: 'electron_neutrino', name: 'Electron Neutrino', symbol: 'ν_e', family: 'lepton', generation: 1, massMeV: 0.001e-6 }
};

export class HiggsEngine {
  vev: number; // Vacuum Expectation Value v (GeV)
  lambda: number; // Quartic self-coupling lambda
  mu2: number; // Tachyonic mass parameter mu^2 (GeV^2)
  isBroken: boolean; // EWSB Broken phase (true) vs Symmetric phase (false, T > T_c)
  fieldPhaseTime: number;

  constructor() {
    this.vev = HIGGS_VEV_STANDARD_GEV;
    this.lambda = HIGGS_LAMBDA_STANDARD;
    this.mu2 = HIGGS_MU2_STANDARD;
    this.isBroken = true;
    this.fieldPhaseTime = 0;
  }

  // -------------------------------------------------------------
  // HIGGS POTENTIAL V(Phi) = -mu^2 Phi^dagger Phi + lambda (Phi^dagger Phi)^2
  // -------------------------------------------------------------
  /**
   * Calculates the Mexican Hat potential energy V(phi) for radial scalar field magnitude phi = sqrt(2 |Phi|^2)
   */
  evaluatePotential(phi: number, mu2 = this.mu2, lambda = this.lambda, isBroken = this.isBroken): number {
    if (!isBroken) {
      // Symmetric phase (T > T_c): finite model mu_eff^2 < 0, stable single minimum at phi = 0
      return 0.5 * Math.abs(mu2) * (phi ** 2) + 0.25 * lambda * (phi ** 4);
    }
    // Broken phase (Mexican hat / Sombrero): V(phi) = -1/2 mu^2 phi^2 + 1/4 lambda phi^4
    return -0.5 * mu2 * (phi ** 2) + 0.25 * lambda * (phi ** 4);
  }

  /**
   * Potential curvature / second derivative d^2 V / d phi^2:
   * Yields physical Higgs boson mass m_H = sqrt(2 lambda v^2) = sqrt(2 mu^2) at minimum
   */
  evaluatePotentialCurvature(phi: number, mu2 = this.mu2, lambda = this.lambda, isBroken = this.isBroken): number {
    if (!isBroken) {
      return Math.abs(mu2) + 3 * lambda * (phi ** 2);
    }
    return -mu2 + 3 * lambda * (phi ** 2);
  }

  /**
   * Minimum location of potential:
   * Broken phase: v = sqrt(mu^2 / lambda)
   * Symmetric phase: v = 0
   */
  computeVev(mu2 = this.mu2, lambda = this.lambda, isBroken = this.isBroken): number {
    if (!isBroken || mu2 <= 0 || lambda <= 0) return 0;
    return Math.sqrt(mu2 / lambda);
  }

  /**
   * Physical Higgs mass m_H = sqrt(2 lambda v^2)
   */
  computeHiggsMass(lambda = this.lambda, vev = this.vev, isBroken = this.isBroken): number {
    if (!isBroken || vev <= 0) return 0;
    return Math.sqrt(2 * lambda) * vev;
  }

  /**
   * Vacuum energy density rho_vac = V(v) = -mu^4 / (4 lambda) = -1/4 lambda v^4
   */
  computeVacuumEnergy(mu2 = this.mu2, lambda = this.lambda, isBroken = this.isBroken): number {
    if (!isBroken) return 0;
    return -0.25 * lambda * (this.computeVev(mu2, lambda, true) ** 4);
  }

  // -------------------------------------------------------------
  // ELECTROWEAK SYMMETRY BREAKING & DYNAMIC MASS GENERATION
  // -------------------------------------------------------------
  setEWSBPhase(isBroken: boolean): void {
    this.isBroken = isBroken;
    this.vev = isBroken ? HIGGS_VEV_STANDARD_GEV : 0;
  }

  setHiggsParameters(mu2: number, lambda: number, isBroken = this.isBroken): void {
    this.mu2 = Math.max(10, mu2);
    this.lambda = Math.max(0.01, lambda);
    this.isBroken = isBroken;
    this.vev = this.computeVev(this.mu2, this.lambda, isBroken);
  }

  /**
   * Gauge Boson Masses generated by EWSB:
   * M_W = 1/2 g v
   * M_Z = 1/2 sqrt(g^2 + g'^2) v = M_W / cos(theta_W)
   * M_gamma = 0 (unbroken U(1)_em)
   */
  getGaugeBosonMasses(vev = this.vev, isBroken = this.isBroken): { mwGeV: number; mzGeV: number; mGammaGeV: number } {
    if (!isBroken || vev <= 0) {
      return { mwGeV: 0, mzGeV: 0, mGammaGeV: 0 };
    }
    const mw = 0.5 * WEAK_COUPLING_G * vev;
    const mz = 0.5 * Math.sqrt(WEAK_COUPLING_G ** 2 + WEAK_COUPLING_GPRIME ** 2) * vev;
    return { mwGeV: mw, mzGeV: mz, mGammaGeV: 0 };
  }

  // -------------------------------------------------------------
  // YUKAWA COUPLINGS & FERMION MASSES
  // -------------------------------------------------------------
  /**
   * Generates the complete Yukawa coupling table for all 12 fermions:
   * y_f = sqrt(2) * m_f / v_0
   * Resulting mass in current VEV: m_f(v) = y_f * v / sqrt(2)
   */
  getYukawaCatalog(vev = this.vev, isBroken = this.isBroken): YukawaDefinition[] {
    const list: YukawaDefinition[] = [];
    const v0 = HIGGS_VEV_STANDARD_GEV;

    for (const key of Object.keys(YUKAWA_BASELINE)) {
      const base = YUKAWA_BASELINE[key];
      const massGeV = base.massMeV / 1000;
      // Exact dimensionless Yukawa coupling constant y_f
      const yF = (Math.sqrt(2) * massGeV) / v0;

      // Current mass dynamically scaled by current VEV v
      const currentMassMeV = isBroken ? (yF * vev * 1000) / Math.sqrt(2) : 0;
      const gHff = isBroken ? yF / Math.sqrt(2) : 0;

      list.push({
        kind: base.kind,
        name: base.name,
        symbol: base.symbol,
        family: base.family,
        generation: base.generation,
        yukawaCoupling: yF,
        physicalMassMeV: base.massMeV,
        currentMassMeV,
        couplingToHiggs: gHff
      });
    }

    return list;
  }

  /**
   * Returns dynamically generated mass for any particle kind depending on EWSB state and VEV
   */
  getDynamicMassMeV(kind: ParticleKind, vev = this.vev, isBroken = this.isBroken): number {
    if (!isBroken) {
      // In unbroken symmetric phase, all fundamental fermions and weak gauge bosons are massless!
      if (kind === 'photon' || kind === 'gluon') return 0;
      return 0;
    }
    const ratio = vev / HIGGS_VEV_STANDARD_GEV;
    const std = STANDARD_MODEL_PARTICLES[kind];
    if (!std) return 0;
    if (kind === 'photon' || kind === 'gluon') return 0;
    return std.massMeV * ratio;
  }

  // -------------------------------------------------------------
  // HIGGS COUPLINGS (GAUGE & SELF-INTERACTIONS)
  // -------------------------------------------------------------
  /**
   * Gauge & Self-Coupling constants:
   * g_HWW = 2 M_W^2 / v = g M_W
   * g_HZZ = 2 M_Z^2 / v = (g / cos theta_W) M_Z
   * g_HHWW = 2 M_W^2 / v^2 = g^2 / 2
   * g_HHZZ = 2 M_Z^2 / v^2 = (g^2 + g'^2) / 2
   * lambda_3H = 3 m_H^2 / v (cubic self-coupling)
   * lambda_4H = 3 m_H^2 / v^2 (quartic contact self-coupling)
   */
  getHiggsCouplings(vev = this.vev, lambda = this.lambda, isBroken = this.isBroken): {
    gHWW: number;
    gHZZ: number;
    gHHWW: number;
    gHHZZ: number;
    lambda3H: number;
    lambda4H: number;
  } {
    if (!isBroken || vev <= 0) {
      return { gHWW: 0, gHZZ: 0, gHHWW: 0, gHHZZ: 0, lambda3H: 0, lambda4H: 6 * lambda };
    }
    const { mwGeV, mzGeV } = this.getGaugeBosonMasses(vev, true);
    const mH = this.computeHiggsMass(lambda, vev, true);

    return {
      gHWW: (2 * mwGeV ** 2) / vev,
      gHZZ: (2 * mzGeV ** 2) / vev,
      gHHWW: (2 * mwGeV ** 2) / (vev ** 2),
      gHHZZ: (2 * mzGeV ** 2) / (vev ** 2),
      lambda3H: (3 * mH ** 2) / vev,
      lambda4H: (3 * mH ** 2) / (vev ** 2)
    };
  }

  // -------------------------------------------------------------
  // HIGGS PRODUCTION CHANNELS AT COLLIDERS
  // -------------------------------------------------------------
  getProductionChannels(): HiggsProductionChannel[] {
    return [
      {
        id: 'ggF',
        name: 'Gluon-Gluon Fusion (ggF)',
        symbol: 'g + g → H',
        crossSectionPb: 48.58,
        fractionPercent: 87.2,
        initialState: 'Two gluons via virtual top-quark triangle loop',
        mediator: 'Top-quark loop (y_t ≈ 1.0)',
        description: 'Dominant LHC production channel with high gluon parton luminosity at high energy.'
      },
      {
        id: 'VBF',
        name: 'Vector Boson Fusion (VBF)',
        symbol: 'W⁺W⁻ / Z⁰Z⁰ → H',
        crossSectionPb: 3.78,
        fractionPercent: 6.8,
        initialState: 'Two forward quarks emitting spacelike W/Z bosons',
        mediator: 't-channel W⁺W⁻ or Z⁰Z⁰ vector boson fusion',
        description: 'Distinctive experimental signature with two high-rapidity forward tagging jets.'
      },
      {
        id: 'VH',
        name: 'Associated Production (Higgsstrahlung)',
        symbol: 'q + q̄ → W/Z + H',
        crossSectionPb: 2.25,
        fractionPercent: 4.0,
        initialState: 'Quark-antiquark annihilation into off-shell vector boson',
        mediator: 's-channel virtual W* or Z* radiating a Higgs boson',
        description: 'Clean leptonic tags from decaying W/Z vector bosons.'
      },
      {
        id: 'ttH',
        name: 'Associated Production with Top Quarks',
        symbol: 'g + g → t + t̄ + H',
        crossSectionPb: 0.51,
        fractionPercent: 0.9,
        initialState: 'Gluon-gluon collision producing top-quark pair',
        mediator: 'Direct tree-level top Yukawa coupling y_t',
        description: 'Direct measurement of the top-quark Yukawa coupling without quantum loop ambiguities.'
      }
    ];
  }

  // -------------------------------------------------------------
  // HIGGS INTERACTION EVALUATIONS (VBF, HIGGSSTRAHLUNG, SELF-COUPLING)
  // -------------------------------------------------------------
  /**
   * Vector Boson Fusion (VBF):
   * W+ + W- -> H  or  Z0 + Z0 -> H
   */
  evaluateVectorBosonFusion(
    v1: ParticleInstance,
    v2: ParticleInstance,
    dt: number
  ): { fused: boolean; higgsMomentum: FourVector; description: string } {
    if (!this.isBroken) return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };
    const isW = (v1.kind === 'w_plus' && v2.kind === 'w_minus') || (v1.kind === 'w_minus' && v2.kind === 'w_plus');
    const isZ = v1.kind === 'z_boson' && v2.kind === 'z_boson';
    if (!isW && !isZ) return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };

    const prob = (isW ? 0.35 : 0.25) * dt;
    if (Math.random() < prob) {
      const eTot = (v1.energy || 4.0) + (v2.energy || 4.0);
      const px = (v1.momentumX || v1.vx) + (v2.momentumX || v2.vx);
      const py = (v1.momentumY || v1.vy) + (v2.momentumY || v2.vy);
      return {
        fused: true,
        higgsMomentum: { E: eTot, px, py, pz: 0 },
        description: isW
          ? '⚡ Vector Boson Fusion: W⁺ + W⁻ → H⁰ (mediated by g_HWW = 2 M_W²/v)!'
          : '⚡ Vector Boson Fusion: Z⁰ + Z⁰ → H⁰ (mediated by g_HZZ = 2 M_Z²/v)!'
      };
    }
    return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };
  }

  /**
   * Associated Production / Higgsstrahlung:
   * e+ + e- -> Z* -> Z + H
   */
  evaluateHiggsstrahlung(
    e1: ParticleInstance,
    e2: ParticleInstance,
    dt: number
  ): { produced: boolean; zMomentum: FourVector; hMomentum: FourVector; description: string } {
    if (!this.isBroken) return { produced: false, zMomentum: { E: 0, px: 0, py: 0 }, hMomentum: { E: 0, px: 0, py: 0 }, description: '' };
    const isPair = (e1.kind === 'electron' && e2.kind === 'electron' && e1.isAntiparticle !== e2.isAntiparticle);
    if (!isPair) return { produced: false, zMomentum: { E: 0, px: 0, py: 0 }, hMomentum: { E: 0, px: 0, py: 0 }, description: '' };

    const prob = 0.20 * dt;
    if (Math.random() < prob) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5;
      return {
        produced: true,
        zMomentum: { E: 5.0, px: Math.cos(angle) * speed, py: Math.sin(angle) * speed },
        hMomentum: { E: 5.0, px: -Math.cos(angle) * speed, py: -Math.sin(angle) * speed },
        description: '⚛ Higgsstrahlung: e⁺ + e⁻ → Z* → Z⁰ + H⁰ (Associated Production)!'
      };
    }
    return { produced: false, zMomentum: { E: 0, px: 0, py: 0 }, hMomentum: { E: 0, px: 0, py: 0 }, description: '' };
  }

  /**
   * Higgs Self-Interactions:
   * H + H -> H + H via quartic contact vertex lambda_4H and s/t-channel HHH exchange
   */
  evaluateHiggsSelfScattering(
    h1: ParticleInstance,
    h2: ParticleInstance,
    dt: number
  ): { scattered: boolean; angle: number; description: string } {
    if (h1.kind !== 'higgs' || h2.kind !== 'higgs') return { scattered: false, angle: 0, description: '' };
    const prob = 0.3 * this.lambda * dt;
    if (Math.random() < prob) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      return {
        scattered: true,
        angle,
        description: `🌟 Higgs Self-Scattering: H⁰ + H⁰ → H⁰ + H⁰ via Quartic Contact (λ = ${this.lambda.toFixed(3)}) & Trilinear HHH Coupling!`
      };
    }
    return { scattered: false, angle: 0, description: '' };
  }

  /**
   * Gluon-Gluon Fusion (ggF):
   * g + g -> (top loop) -> H
   */
  evaluateGluonFusion(
    g1: ParticleInstance,
    g2: ParticleInstance,
    dt: number
  ): { fused: boolean; higgsMomentum: FourVector; description: string } {
    if (!this.isBroken) return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };
    if (g1.kind !== 'gluon' || g2.kind !== 'gluon') return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };

    const s = 4.0 * (g1.energy || 2.5) * (g2.energy || 2.5);
    // Threshold condition
    if (s < 12.0) return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };

    const prob = 0.22 * dt;
    if (Math.random() < prob) {
      const eTot = (g1.energy || 3) + (g2.energy || 3);
      const px = (g1.vx + g2.vx) * 0.5;
      const py = (g1.vy + g2.vy) * 0.5;
      return {
        fused: true,
        higgsMomentum: { E: eTot, px, py, pz: 0 },
        description: '💥 Gluon-Gluon Fusion (ggF): g + g → [Top Quark Loop] → H⁰ (Dominant Production Channel)!'
      };
    }
    return { fused: false, higgsMomentum: { E: 0, px: 0, py: 0 }, description: '' };
  }

  // -------------------------------------------------------------
  // HIGGS FIELD CONDENSATE & VACUUM OVERLAY RENDERING
  // -------------------------------------------------------------
  /**
   * Renders the continuous scalar vacuum condensate <Phi> across the simulation space.
   * Visualizes vacuum energy waves and VEV background density:
   * In broken phase: warm magenta scalar vacuum condensate.
   * In symmetric phase: translucent blue unbroken vacuum.
   */
  renderHiggsFieldCondensate(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number
  ): void {
    this.fieldPhaseTime += dt * 0.04;
    const t = this.fieldPhaseTime;

    ctx.save();
    const isBroken = this.isBroken;
    const intensity = isBroken ? Math.min(1.0, this.vev / HIGGS_VEV_STANDARD_GEV) : 0.15;

    // Smooth wave pattern for scalar field vacuum expectation value
    const cols = Math.ceil(width / 64);
    const rows = Math.ceil(height / 64);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * 64 + 32;
        const y = r * 64 + 32;
        const wave = Math.sin(x * 0.015 + t) * Math.cos(y * 0.015 + t * 0.8);
        const alpha = Math.max(0, 0.015 + 0.02 * wave * intensity);

        ctx.fillStyle = isBroken
          ? `rgba(236, 72, 153, ${alpha})` // Pink/Magenta for broken EWSB phase
          : `rgba(56, 189, 248, ${alpha})`; // Cyan for symmetric unbroken phase

        ctx.fillRect(c * 64, r * 64, 64, 64);
      }
    }

    // Small status indicator on bottom right of field if EWSB phase is symmetric
    if (!isBroken) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('UNBROKEN EWSB PHASE (v = 0 GeV, m_all = 0)', width - 260, height - 16);
    }

    ctx.restore();
  }
}
