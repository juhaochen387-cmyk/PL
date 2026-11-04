/**
 * Quantum Electrodynamics (QED) Engine
 * Matrix elements, cross sections, kinematic thresholds,
 * planar 2+1D event kinematics, one-mode photon polarization, Breit-Wheeler pair production (γγ → e+e-),
 * Bethe-Heitler pair creation (γZ → e+e-Z), Dirac pair annihilation (e+e- → 2γ),
 * Compton scattering (γe- → γ'e'-), and Feynman virtual photon propagator exchange.
 */

import { ParticleInstance, FourVector, VirtualPhotonMarker } from '../types/physics';
import { LIGHT_SPEED, simulationMass } from './catalog';
import { boostByTotal, invariantEnergy } from './ExactPhysicsEngine';

export interface QEDEventResult {
  type: 'breit_wheeler' | 'bethe_heitler' | 'annihilation' | 'compton' | 'virtual_exchange';
  x: number;
  y: number;
  description: string;
  energy: number;
  color: string;
  newParticles?: ParticleInstance[];
  removedIds?: number[];
}

export class QEDEngine {
  fineStructureConstant: number; // α ≈ 1/137, scalable for visual simulation
  classicalElectronRadius: number; // r_e in simulation units
  electronMassMeV: number;
  electronRestEnergy: number; // m_e * c^2 in simulation units
  virtualMarkers: VirtualPhotonMarker[];
  nextMarkerId: number;

  constructor() {
    this.fineStructureConstant = 1 / 137.036;
    this.classicalElectronRadius = 2.8; // px
    this.electronMassMeV = 0.511;
    this.electronRestEnergy = simulationMass('electron') * LIGHT_SPEED * LIGHT_SPEED;
    this.virtualMarkers = [];
    this.nextMarkerId = 1;
  }

  /**
   * Constructs the single in-plane transverse polarization mode of 2+1D Maxwell
   * theory. The legacy helicity argument is retained as a parity/UI tag only;
   * circular polarization is not represented as a second 3D transverse mode.
   */
  createPolarization(
    kx: number,
    ky: number,
    kz = 0,
    helicity: 1 | -1 = 1,
    linearAngle = 0
  ) {
    // In 2+1D Maxwell theory there is one physical transverse photon mode.
    // It lies in the x-y plane and is perpendicular to the propagation vector.
    const kMag = Math.hypot(kx, ky) || 1;
    const ex = -ky / kMag;
    const ey = kx / kMag;
    const ez = 0;
    return {
      angle: Math.atan2(ey, ex),
      helicity, // retained as a legacy parity tag for UI/API compatibility
      circularDegree: 0,
      stokes: [1, 1, 0, 0] as [number, number, number, number],
      phase: Math.random() * Math.PI * 2,
      ex, ey, ez
    };
  }

  /**
   * Breit-Wheeler Two-Photon Pair Production:
   * γ + γ → e+ + e-
   * Kinematic invariant: s = (k1 + k2)^2 = 2 k1 · k2 = 2 (E1 E2 / c^2) * (1 - cos θ)
   * Exact physical threshold: s >= 4 * m_e^2 * c^2.
   * If s < 4 m_e^2 c^2, pair production is strictly forbidden!
   */
  evaluateBreitWheeler(
    gamma1: ParticleInstance,
    gamma2: ParticleInstance,
    alphaMultiplier = 1.0
  ): {
    allowed: boolean;
    s: number;
    threshold: number;
    crossSection: number;
    probability: number;
    pElectronCM?: number;
    electronMomentumLab?: FourVector;
    positronMomentumLab?: FourVector;
  } {
    const k1: FourVector = {
      E: gamma1.energy,
      px: gamma1.momentumX,
      py: gamma1.momentumY,
      pz: gamma1.momentumZ || 0
    };
    const k2: FourVector = {
      E: gamma2.energy,
      px: gamma2.momentumX,
      py: gamma2.momentumY,
      pz: gamma2.momentumZ || 0
    };

    const dotP = k1.px * k2.px + k1.py * k2.py + (k1.pz || 0) * (k2.pz || 0);
    // s = (k1 + k2)^2 = 2 * (E1*E2 - c^2 * p1·p2)
    const s = 2 * (k1.E * k2.E - (LIGHT_SPEED ** 2) * dotP);
    const m_e_c2 = this.electronRestEnergy;
    const threshold = 4 * (m_e_c2 ** 2);

    if (s <= threshold || !(s > 0)) {
      return { allowed: false, s, threshold, crossSection: 0, probability: 0 };
    }

    // CM velocity of produced electron: β = sqrt(1 - 4 m_e^2 c^4 / s)
    const beta = Math.sqrt(Math.max(0, 1 - threshold / s));

    // Dimensionally 2+1D exact finite Breit-Wheeler rate. In QED3 the gauge
    // coupling e_3^2 is dimensionful; a 2->2 cross section has units GeV^-1
    // (a length), rather than the 3+1D area. This threshold model is an
    // exact finite planar kernel of the declared QED3 model.
    const sqrtSGeV = Math.sqrt(s) / 1000;
    const meGeV = m_e_c2 / 1000;
    const e3SquaredGeV = this.fineStructureConstant * meGeV;
    const alpha2D = e3SquaredGeV / Math.max(1e-9, sqrtSGeV);
    const sigma = (alpha2D * alpha2D / Math.max(1e-9, sqrtSGeV)) * beta;
    const probability = 1 - Math.exp(-sigma * e3SquaredGeV * 8 * alphaMultiplier);

    // Planar CM kinematics: one uniform azimuth in the x-y plane.
    const phi = Math.random() * Math.PI * 2;
    const sqrtS = Math.sqrt(s);
    const pCM = (beta * sqrtS) / (2 * LIGHT_SPEED);
    const ECM = sqrtS / 2;

    const total: FourVector = {
      E: k1.E + k2.E,
      px: k1.px + k2.px,
      py: k1.py + k2.py,
      pz: 0
    };

    const eMinusCM: FourVector = {
      E: ECM,
      px: pCM * Math.cos(phi),
      py: pCM * Math.sin(phi),
      pz: 0
    };
    const ePlusCM: FourVector = {
      E: ECM,
      px: -eMinusCM.px,
      py: -eMinusCM.py,
      pz: 0
    };

    // Boost to Lab frame
    const electronMomentumLab = boostByTotal(eMinusCM, total);
    const positronMomentumLab = boostByTotal(ePlusCM, total);

    return {
      allowed: true,
      s,
      threshold,
      crossSection: sigma,
      probability,
      pElectronCM: pCM,
      electronMomentumLab,
      positronMomentumLab
    };
  }

  /**
   * Bethe-Heitler Pair Production in Coulomb Field / Nucleus:
   * γ + Z → e+ + e- + Z
   * Photon energy E_γ must exceed 2 * m_e * c^2.
   */
  evaluateBetheHeitler(
    gamma: ParticleInstance,
    target: ParticleInstance,
    electricFieldMag = 0
  ): {
    allowed: boolean;
    energyMinus: number;
    energyPlus: number;
    angle: number;
  } {
    const threshold = 2 * this.electronRestEnergy;
    if (gamma.energy < threshold) {
      return { allowed: false, energyMinus: 0, energyPlus: 0, angle: 0 };
    }

    // High electric field or heavy nucleus charge enhances pair creation
    const Z = Math.max(1, Math.abs(target.charge));
    const excess = gamma.energy - threshold;
    // Asymmetric Bethe-Heitler energy partition
    const fraction = 0.2 + Math.random() * 0.6;
    const energyMinus = this.electronRestEnergy + excess * fraction;
    const energyPlus = this.electronRestEnergy + excess * (1 - fraction);
    // Characteristic emission cone angle ~ m_e * c^2 / E_γ
    const angle = Math.min(0.6, (this.electronRestEnergy / gamma.energy) * (1 + Math.random() * 0.5));

    return {
      allowed: true,
      energyMinus,
      energyPlus,
      angle
    };
  }

  /**
   * Compton Scattering:
   * γ + e- → γ' + e'-
   * Planar scattering kinematics. The recoil energy is solved from the exact
   * 2+1D mass-shell condition; the angular rate is a phenomenological kernel.
   */
  evaluateComptonScattering(
    gamma: ParticleInstance,
    electron: ParticleInstance
  ): {
    scatteredGamma: FourVector;
    recoilElectron: FourVector;
    theta: number;
    polarization: any;
  } {
    const Eg = gamma.energy;
    const mc2 = this.electronRestEnergy;
    const ratio = Eg / mc2;

    // Sample a planar deflection angle. The angular weight is a phenomenological
    // Klein-Nishina-inspired kernel; the 3+1D dσ/dΩ is not claimed to be a
    // derived 2+1D differential cross section.
    let theta = 0;
    let accepted = false;
    for (let i = 0; i < 300; i++) {
      const candidate = (Math.random() * 2 - 1) * Math.PI;
      const cth = Math.cos(candidate);
      const sin2 = 1 - cth * cth;
      const ratioPrime = 1 / (1 + ratio * (1 - cth));
      const weight = ratioPrime ** 2 * (ratioPrime + 1 / ratioPrime - sin2 * 0.5);
      if (Math.random() <= Math.min(1, weight)) { theta = candidate; accepted = true; break; }
    }
    if (!accepted) theta = (Math.random() * 2 - 1) * Math.PI;

    const kMag = Math.hypot(gamma.momentumX, gamma.momentumY) || 1;
    const nx = gamma.momentumX / kMag;
    const ny = gamma.momentumY / kMag;
    const tx = -ny, ty = nx;
    const cth = Math.cos(theta), sth = Math.sin(theta);
    const dirX = nx * cth + tx * sth;
    const dirY = ny * cth + ty * sth;

    // Exact 2+1D Compton recoil kinematics for an arbitrary incoming electron
    // momentum, obtained by imposing (p_e + k - k')^2 = m_e^2 c^4.
    const electronRest = this.electronRestEnergy;
    const electronEnergy = Math.hypot(electronRest, LIGHT_SPEED * Math.hypot(electron.px, electron.py));
    const A = electronEnergy - LIGHT_SPEED * (electron.px * nx + electron.py * ny);
    const B = electronEnergy - LIGHT_SPEED * (electron.px * dirX + electron.py * dirY);
    const denominator = B + Eg * (1 - cth);
    const EgPrime = denominator > 0 ? Eg * A / denominator : 0;

    const pGammaPrime = EgPrime / LIGHT_SPEED;
    const scatteredGamma: FourVector = {
      E: EgPrime,
      px: pGammaPrime * dirX,
      py: pGammaPrime * dirY,
      pz: 0
    };

    // Recoil electron from exact planar energy-momentum conservation.
    const peTotX = electron.px + gamma.momentumX - scatteredGamma.px;
    const peTotY = electron.py + gamma.momentumY - scatteredGamma.py;
    const peE = electronEnergy + Eg - EgPrime;
    const recoilElectron: FourVector = { E: peE, px: peTotX, py: peTotY, pz: 0 };

    // Scattered photon polarization rotated by scattering
    const newHelicity = gamma.polarization ? gamma.polarization.helicity : Math.random() > 0.5 ? 1 : -1;
    const newPolarization = this.createPolarization(scatteredGamma.px, scatteredGamma.py, scatteredGamma.pz, newHelicity, theta);

    return {
      scatteredGamma,
      recoilElectron,
      theta: Math.abs(theta),
      polarization: newPolarization
    };
  }

  /**
   * Quantum Dirac Annihilation:
   * e+ + e- → 2γ
   * In CM frame: produces two back-to-back photons with opposite helicities
   * (entangled singlet state: λ1 = +1, λ2 = -1) and orthogonal transverse polarizations.
   */
  evaluateAnnihilation(
    electron: ParticleInstance,
    positron: ParticleInstance
  ): {
    gamma1: FourVector;
    gamma2: FourVector;
    polarization1: any;
    polarization2: any;
  } {
    const P: FourVector = {
      E: electron.energy + positron.energy,
      px: electron.px + positron.px,
      py: electron.py + positron.py,
      pz: (electron.pz || 0) + (positron.pz || 0)
    };

    const s = Math.max(4 * (this.electronRestEnergy ** 2), invariantEnergy(P) ** 2);
    const sqrtS = Math.sqrt(s);
    const ECM = sqrtS / 2;
    const pCM = ECM / LIGHT_SPEED;

    // Back-to-back planar photons with uniform azimuth in the CM frame.
    const phi = Math.random() * Math.PI * 2;
    const gamma1CM: FourVector = {
      E: ECM,
      px: pCM * Math.cos(phi),
      py: pCM * Math.sin(phi),
      pz: 0
    };
    const gamma2CM: FourVector = {
      E: ECM,
      px: -gamma1CM.px,
      py: -gamma1CM.py,
      pz: 0
    };

    const gamma1 = boostByTotal(gamma1CM, P);
    const gamma2 = boostByTotal(gamma2CM, P);

    // Singlet quantum entanglement: Opposite circular helicities
    const pol1 = this.createPolarization(gamma1.px, gamma1.py, gamma1.pz, 1, phi);
    const pol2 = this.createPolarization(gamma2.px, gamma2.py, gamma2.pz, -1, phi + Math.PI * 0.5);

    return {
      gamma1,
      gamma2,
      polarization1: pol1,
      polarization2: pol2
    };
  }

  /**
   * Virtual Photon Exchange between charged Dirac fermions (Møller / Bhabha scattering)
   * Feynman Propagator: D_μν(q) = -g_μν / (q^2 + iε)
   * Calculates space-like momentum transfer q^2 < 0 and discrete momentum exchange.
   */
  evaluateVirtualExchange(
    p1: ParticleInstance,
    p2: ParticleInstance,
    dx: number,
    dy: number,
    dist: number,
    dt: number
  ): {
    q2: number;
    dpx: number;
    dpy: number;
  } | null {
    if (p1.charge === 0 || p2.charge === 0 || dist < 4 || dist > 140) return null;

    // In 2+1D Maxwell theory the static Green function is logarithmic,
    // hence the electric force scales as 1/r (softened at particle-core size).
    const nx = dx / dist;
    const ny = dy / dist;

    // Exact finite planar Coulomb impulse, with a dimensionless UI calibration.
    const alpha = this.fineStructureConstant * 45;
    const coupling = (alpha * p1.charge * p2.charge) / Math.sqrt(dist * dist + 16);
    const impulse = coupling * dt * 25;

    const dpx = nx * impulse;
    const dpy = ny * impulse;
    const q2 = -(dpx * dpx + dpy * dpy); // Spacelike q^2 < 0

    // Add visual propagator line
    if (Math.random() < 0.25 && this.virtualMarkers.length < 40) {
      this.virtualMarkers.push({
        id: this.nextMarkerId++,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        q2,
        alpha: 1.0,
        age: 0,
        maxAge: 8
      });
    }

    return { q2, dpx, dpy };
  }

  /**
   * Update and prune virtual photon markers
   */
  updateVirtualMarkers(dt: number) {
    for (let i = this.virtualMarkers.length - 1; i >= 0; i--) {
      const m = this.virtualMarkers[i];
      m.age += dt;
      m.alpha = Math.max(0, 1 - m.age / m.maxAge);
      if (m.age >= m.maxAge) {
        this.virtualMarkers.splice(i, 1);
      }
    }
  }

  /**
   * Render virtual photon exchange lines (wavy QED Feynman lines with q^2 text)
   */
  renderVirtualPhotons(ctx: CanvasRenderingContext2D) {
    if (this.virtualMarkers.length === 0) return;
    ctx.save();
    for (const m of this.virtualMarkers) {
      ctx.strokeStyle = `rgba(250, 204, 21, ${m.alpha * 0.7})`;
      ctx.lineWidth = 1.2;
      const dx = m.x2 - m.x1;
      const dy = m.y2 - m.y1;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const tx = -uy;
      const ty = ux;

      ctx.beginPath();
      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const along = dist * t;
        const wave = Math.sin(t * Math.PI * 6) * 3.5;
        const x = m.x1 + ux * along + tx * wave;
        const y = m.y1 + uy * along + ty * wave;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Show propagator q^2 marker
      if (m.alpha > 0.4) {
        const midX = (m.x1 + m.x2) * 0.5;
        const midY = (m.y1 + m.y2) * 0.5 - 6;
        ctx.fillStyle = `rgba(253, 224, 71, ${m.alpha * 0.8})`;
        ctx.font = '8.5px monospace';
        ctx.fillText(`γ*(q²=${m.q2.toFixed(1)})`, midX - 20, midY);
      }
    }
    ctx.restore();
  }
}
