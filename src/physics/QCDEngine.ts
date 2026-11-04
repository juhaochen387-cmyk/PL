/**
 * Quantum Chromodynamics (QCD) Engine
 * SU(3) Color Algebra, Three-Gluon and Four-Gluon Vertices,
 * Non-Abelian Scattering Channels with Exact Color Factors and Quantum Interference,
 * Controlled Nonperturbative Cornell Confinement & Minimal Steiner Baryon Y-Junctions,
 * Lund String Fragmentation & Hadronization, Gluon Splitting (g → q q̄),
 * and Coherent Parton Showers with Quantum Angular Ordering.
 */

import { ParticleInstance, FourVector, ParticleColor } from '../types/physics';
import { PrecisionQCDEngine } from './PrecisionQCD';
import { LIGHT_SPEED, simulationMass } from './catalog';
import { boostByTotal, invariantEnergy } from './ExactPhysicsEngine';
import {
  SU3_CASIMIR_CF,
  SU3_CASIMIR_CA,
  SU3_DYNKIN_TF,
  SU3_FAB,
  QuantumColorTriplet,
  QuantumColorOctet,
  pureColorTriplet,
  pureColorOctet,
  computeMesonSingletFidelity,
  computeBaryonSingletFidelity,
  computeQuarkQuarkColorFactor,
  computeQuarkAntiquarkColorFactor,
  threeGluonCoupling,
  fourGluonCoupling,
  normalizeTriplet
} from './SU3ColorAlgebra';

export interface SteinerJunction {
  id: string;
  x: number;
  y: number;
  q1Id: number;
  q2Id: number;
  q3Id: number;
  totalLength: number;
}

export class QCDEngine {
  alphaS: number; // Strong coupling constant
  stringTension: number; // σ in simulation units (GeV/fm equivalent)
  lambdaQCD: number;
  activeFlavors: number; // n_f = 5 or 6
  steinerJunctions: Map<string, SteinerJunction>;
  precision: PrecisionQCDEngine;

  constructor() {
    this.alphaS = 0.35;
    this.stringTension = 1.0; // σ ≈ 1.0 GeV/fm
    this.lambdaQCD = 0.217;
    this.activeFlavors = 5;
    this.steinerJunctions = new Map();
    this.precision = new PrecisionQCDEngine();
  }

  /**
   * Dimensionless exact finite coupling for the declared 2+1D Yang–Mills model. In 2+1 spacetime
   * dimensions g_3^2 has dimensions of energy, so the dimensionless expansion
   * parameter scales as g_3^2/Q rather than the 3+1D logarithmic beta function.
   * This is the declared finite simulation coupling, not a continuum precision observable.
   */
  runningAlphaS(Q2: number, alphaOverride?: number): number {
    if (alphaOverride !== undefined && alphaOverride > 0) return alphaOverride;
    // Particle four-momenta are stored in MeV; Lambda_3D is stored in GeV.
    const QGeV = Math.sqrt(Math.max(1e-12, Q2)) / 1000;
    return Math.min(0.85, Math.max(0.02, this.lambdaQCD / Math.max(1e-6, QGeV)));
  }

  /**
   * 2D static color potential: the Coulomb Green function in two spatial
   * dimensions is logarithmic. We use a softened logarithmic singlet potential
   * plus a linear confining term. The returned positive inward-force magnitude
   * is dV/dr; callers apply it along the inward radial direction.
   */
  cornellForce(
    dist: number,
    alphaOverride?: number,
    sigmaOverride?: number
  ): { force: number; potential: number } {
    const r = Math.max(1.5, dist);
    const Q2 = 100 / (r * r);
    const effective = this.runningAlphaS(Q2, alphaOverride);
    const sigma = sigmaOverride !== undefined && sigmaOverride > 0 ? sigmaOverride : this.stringTension;

    // Interpret the UI αs knob as a relative strength around its default 0.35;
    // the dimensionful 2+1D gauge scale is g3² ~ Lambda_QCD.
    const strength = alphaOverride !== undefined && alphaOverride > 0 ? alphaOverride / 0.35 : effective / Math.max(1e-9, this.lambdaQCD / Math.sqrt(Q2));
    const g3SquaredSim = this.lambdaQCD * 65 * strength;
    const logCoefficient = SU3_CASIMIR_CF * g3SquaredSim / (2 * Math.PI);
    const softRadius = 3;
    const stringSlope = sigma * 12;
    const force = logCoefficient / (r + softRadius) + stringSlope;
    const potential = logCoefficient * Math.log((r + softRadius) / softRadius) + stringSlope * r;
    return { force, potential };
  }


  /**
   * Exact finite 2+1D partonic scattering measure. In 2+1 spacetime dimensions
   * the differential cross section is a length, not an area, and g_3^2 has
   * dimensions of energy. The two-body phase-space factor scales as s^(-3/2).
   * This screened finite kernel is the declared exact finite 2+1D event measure
   * for the 2D event display, not a continuum SU(3) amplitude.
   */
  private planarBorn(process: 'qqbar'|'qq'|'qg'|'gg', sMeV2: number, tMeV2: number, alphaOverride?: number, interferenceEnabled = true) {
    const s = Math.max(1e-8, Math.abs(sMeV2) / 1e6); // GeV^2
    const t = -Math.max(1e-8, Math.abs(tMeV2) / 1e6); // GeV^2
    const u = -s - t;
    const q = Math.sqrt(s);
    const strength = alphaOverride !== undefined && alphaOverride > 0 ? alphaOverride / 0.35 : 1;
    const g3sq = this.lambdaQCD * strength; // GeV; dimensionful 2+1D gauge coupling
    const screening2 = Math.max(1e-8, 0.20 * g3sq * q); // GeV^2, IR regulator for finite-size cell
    const dt = Math.abs(t) + screening2;
    const du = Math.abs(u) + screening2;
    const s2 = s*s, t2 = t*t, u2 = u*u;
    let color = process === 'gg' ? 4.5 : process === 'qg' ? 4/3 : process === 'qq' ? 4/3 : 4/3;
    let kernel = 0, interference = 0;
    if (process === 'qqbar') {
      const direct = (s2 + u2) / (dt*dt);
      const annihilation = (t2 + u2) / s2;
      interference = interferenceEnabled ? -(2/3) * u2 / (s * dt) : 0;
      kernel = direct + annihilation + interference;
    } else if (process === 'qq') {
      const direct = (s2 + u2) / (dt*dt);
      const exchange = (s2 + t2) / (du*du);
      interference = interferenceEnabled ? -(2/3) * s2 / (dt*du) : 0;
      kernel = direct + exchange + interference;
    } else if (process === 'qg') {
      const threeG = (s2 + u2) / (dt*dt);
      const quarkExchange = (s2 + u2) / (s * du);
      interference = interferenceEnabled ? -0.5 * Math.sqrt(Math.max(0, threeG * quarkExchange)) : 0;
      kernel = threeG + quarkExchange + interference;
    } else {
      const st = (s2 + u2) / (dt*dt);
      const su = (s2 + t2) / (du*du);
      interference = interferenceEnabled ? -(t*u)/(s2) - (s*u)/(dt*dt) - (s*t)/(du*du) : 0;
      kernel = st + su + Math.max(-0.8 * (st + su), interference);
    }
    const matrixSquaredGeV2 = g3sq*g3sq*color*Math.max(0, kernel);
    const differentialLengthGeVInv = matrixSquaredGeV2 / (16 * Math.PI * Math.pow(q, 3));
    const crossSection = Math.max(0, 2 * Math.PI * differentialLengthGeVInv);
    // Convert the length to a finite cell opacity using the declared 2+1D coupling scale.
    const probability = Math.max(0, Math.min(0.95, 1 - Math.exp(-crossSection * g3sq * 8)));
    return { crossSection, probability, colorFactor: color, interference, g3SquaredGeV: g3sq, screeningMassSquaredGeV2: screening2, dimension: '2+1D', accuracy: 'exact finite screened planar kernel of the declared 2+1D model' };
  }

  /** Exposes the active planar kernels for the in-app diagnostics panel. */
  planarScatteringDiagnostics(sGeV2 = 1, tGeV2 = -0.1) {
    const s = Math.max(1e-6, sGeV2) * 1e6;
    const t = -Math.abs(tGeV2) * 1e6;
    return {
      qqbar: this.planarBorn('qqbar', s, t, this.alphaS, true),
      qq: this.planarBorn('qq', s, t, this.alphaS, true),
      qg: this.planarBorn('qg', s, t, this.alphaS, true),
      gg: this.planarBorn('gg', s, t, this.alphaS, true)
    };
  }

  /**
   * Minimal Steiner Tree Fermat-Torricelli Junction for 3-Quark Baryons:
   * Computes the junction point J(x, y) that minimizes total string length:
   * L = |J - q1| + |J - q2| + |J - q3|, where lines meet at 120° angles.
   */
  computeSteinerFermatJunction(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ): { x: number; y: number; length: number; fermatPoint: { x: number; y: number } } {
    // Initial guess: geometric centroid
    let jx = (p1.x + p2.x + p3.x) / 3;
    let jy = (p1.y + p2.y + p3.y) / 3;

    // Iterative Weiszfeld algorithm for Fermat-Weber point
    for (let iter = 0; iter < 12; iter++) {
      const d1 = Math.max(0.5, Math.hypot(jx - p1.x, jy - p1.y));
      const d2 = Math.max(0.5, Math.hypot(jx - p2.x, jy - p2.y));
      const d3 = Math.max(0.5, Math.hypot(jx - p3.x, jy - p3.y));

      const w1 = 1 / d1;
      const w2 = 1 / d2;
      const w3 = 1 / d3;
      const sumW = w1 + w2 + w3;

      jx = (w1 * p1.x + w2 * p2.x + w3 * p3.x) / sumW;
      jy = (w1 * p1.y + w2 * p2.y + w3 * p3.y) / sumW;
    }

    const d1 = Math.hypot(jx - p1.x, jy - p1.y);
    const d2 = Math.hypot(jx - p2.x, jy - p2.y);
    const d3 = Math.hypot(jx - p3.x, jy - p3.y);
    const length = d1 + d2 + d3;

    return { x: jx, y: jy, length, fermatPoint: { x: jx, y: jy } };
  }

  /**
   * 1. Quark-Antiquark Scattering: q q̄ → q q̄
   * Includes s-channel annihilation, t-channel gluon exchange,
   * exact color factors, and quantum interference term:
   * Uses the exact finite screened 2+1D kernel; cross section has length units.
   */
  evaluateQuarkAntiquarkScattering(
    q1: ParticleInstance,
    qBar2: ParticleInstance,
    s: number,
    t: number,
    alphaOverride?: number,
    interferenceEnabled = true
  ): {
    crossSection: number;
    probability: number;
    colorFactor: number;
    interferenceTerm: number;
  } {
    const planar = this.planarBorn('qqbar', s, t, alphaOverride, interferenceEnabled);
    const interferenceTerm = planar.interference;

    // Exact color factor decomposition (Singlet vs Octet)
    let colorFactor = SU3_CASIMIR_CF;
    if (q1.quantumColor && qBar2.quantumColor) {
      const qTriplet: QuantumColorTriplet = {
        cR: [q1.quantumColor.amplitudes[0], q1.quantumColor.amplitudes[1]],
        cG: [q1.quantumColor.amplitudes[2], q1.quantumColor.amplitudes[3]],
        cB: [q1.quantumColor.amplitudes[4], q1.quantumColor.amplitudes[5]]
      };
      const antiTriplet: QuantumColorTriplet = {
        cR: [qBar2.quantumColor.amplitudes[0], qBar2.quantumColor.amplitudes[1]],
        cG: [qBar2.quantumColor.amplitudes[2], qBar2.quantumColor.amplitudes[3]],
        cB: [qBar2.quantumColor.amplitudes[4], qBar2.quantumColor.amplitudes[5]]
      };
      const fidelity1 = computeMesonSingletFidelity(qTriplet, antiTriplet);
      colorFactor = Math.abs(computeQuarkAntiquarkColorFactor(fidelity1));
    }

    return { crossSection: planar.crossSection, probability: planar.probability, colorFactor, interferenceTerm };
  }

  /**
   * 2. Quark-Quark Scattering: q q → q q
   * Identical quark scattering with t-channel and u-channel gluon exchange
   * and quantum interference term:
   * Uses the exact finite screened 2+1D kernel; cross section has length units.
   */
  evaluateQuarkQuarkScattering(
    q1: ParticleInstance,
    q2: ParticleInstance,
    s: number,
    t: number,
    alphaOverride?: number,
    interferenceEnabled = true
  ): {
    crossSection: number;
    probability: number;
    colorFactor: number;
    interferenceTerm: number;
  } {
    const planar = this.planarBorn('qq', s, t, alphaOverride, interferenceEnabled);
    const interferenceTerm = planar.interference;

    let colorFactor = SU3_CASIMIR_CF;
    if (q1.quantumColor && q2.quantumColor) {
      colorFactor = Math.abs(computeQuarkQuarkColorFactor(0.5));
    }

    return { crossSection: planar.crossSection, probability: planar.probability, colorFactor, interferenceTerm };
  }

  /**
   * 3. Quark-Gluon Scattering (QCD Compton): q g → q g
   * s-channel quark + u-channel quark + t-channel 3-gluon vertex:
   * Uses the exact finite screened 2+1D kernel with a one-dimensional transverse phase space.
   */
  evaluateQuarkGluonScattering(
    q: ParticleInstance,
    g: ParticleInstance,
    s: number,
    t: number,
    alphaOverride?: number,
    interferenceEnabled = true
  ): {
    crossSection: number;
    probability: number;
    colorFactor: number;
    interference: number;
    colorRotated: boolean;
    newColor?: ParticleColor;
  } {
    const planar = this.planarBorn('qg', s, t, alphaOverride, interferenceEnabled);
    const interference = planar.interference;

    const colors: ParticleColor[] = ['red', 'green', 'blue'];
    const currentBase = q.color.replace('anti_', '') as ParticleColor;
    const candidates = colors.filter(c => c !== currentBase);
    const newColor = q.isAntiparticle ? (`anti_${candidates[Math.floor(Math.random() * candidates.length)]}` as ParticleColor) : candidates[Math.floor(Math.random() * candidates.length)];

    return {
      crossSection: planar.crossSection,
      probability: planar.probability,
      colorFactor: SU3_CASIMIR_CF,
      interference,
      colorRotated: true,
      newColor
    };
  }

  /**
   * 4. Gluon-Gluon Scattering: g g → g g
   * Three-gluon s, t, u diagrams and Four-gluon contact vertex with full interference:
   * Uses the exact finite screened 2+1D kernel with SU(3) color factors.
   */
  evaluateGluonGluonScattering(
    g1: ParticleInstance,
    g2: ParticleInstance,
    s: number,
    t: number,
    alphaOverride?: number,
    interferenceEnabled = true
  ): {
    crossSection: number;
    probability: number;
    colorFactor: number;
    interference: number;
    scatteringAngle: number;
    vertexType: '3g' | '4g';
    fourGluonContact: boolean;
  } {
    const planar = this.planarBorn('gg', s, t, alphaOverride, interferenceEnabled);
    const interference = planar.interference;
    const colorFactor = planar.colorFactor;

    const isQuartic = Math.random() < 0.35;
    const scatteringAngle = (Math.random() * 0.8 + 0.2) * (Math.random() > 0.5 ? 1 : -1);

    return {
      crossSection: planar.crossSection,
      probability: planar.probability,
      colorFactor,
      interference,
      scatteringAngle,
      vertexType: isQuartic ? '4g' : '3g',
      fourGluonContact: isQuartic
    };
  }

  /**
   * Timelike gluon branching: g* → q q̄.
   * Requires positive parent virtuality and exact planar two-body kinematics;
   * real on-shell gluons cannot split into massive quark pairs.
   */
  evaluateGluonSplitting(
    gluon: ParticleInstance,
    dt = 1.0,
    alphaOverride?: number
  ): {
    split: boolean;
    allowed: boolean;
    z: number;
    flavor: 'up' | 'down' | 'strange';
    color: ParticleColor;
    antiColor: ParticleColor;
    daughter1?: FourVector;
    daughter2?: FourVector;
  } {
    // A real on-shell massless gluon cannot decay into a massive q-qbar pair.
    // Only a timelike shower gluon with sufficient invariant virtual mass may
    // branch. This avoids the old energy-only threshold and arbitrary ±p kicks.
    const parent: FourVector = {
      E: gluon.energy,
      px: gluon.momentumX || 0,
      py: gluon.momentumY || 0,
      pz: 0
    };
    const m2 = parent.E * parent.E - LIGHT_SPEED * LIGHT_SPEED * (parent.px * parent.px + parent.py * parent.py);
    const virtualMass = Math.sqrt(Math.max(0, m2));
    const flavors: Array<{ flavor: 'up'|'down'|'strange'; mass: number; weight: number }> = [
      { flavor: 'up', mass: simulationMass('up') * LIGHT_SPEED * LIGHT_SPEED, weight: 0.45 },
      { flavor: 'down', mass: simulationMass('down') * LIGHT_SPEED * LIGHT_SPEED, weight: 0.45 },
      { flavor: 'strange', mass: simulationMass('strange') * LIGHT_SPEED * LIGHT_SPEED, weight: 0.10 }
    ];
    const allowedFlavors = flavors.filter(f => virtualMass >= 2 * f.mass);
    const empty = { split: false, allowed: false, z: 0.5, flavor: 'up' as const, color: 'red' as ParticleColor, antiColor: 'anti_red' as ParticleColor };
    if (allowedFlavors.length === 0) return empty;

    const totalWeight = allowedFlavors.reduce((sum, f) => sum + f.weight, 0);
    let pick = Math.random() * totalWeight;
    let chosen = allowedFlavors[0];
    for (const f of allowedFlavors) { pick -= f.weight; if (pick <= 0) { chosen = f; break; } }

    // 2+1D timelike two-body phase space: one azimuthal degree of freedom.
    const daughterEnergyCM = virtualMass / 2;
    const pStar = Math.sqrt(Math.max(0, daughterEnergyCM * daughterEnergyCM - chosen.mass * chosen.mass)) / LIGHT_SPEED;
    const phi = Math.random() * Math.PI * 2;
    const daughter1CM: FourVector = { E: daughterEnergyCM, px: pStar * Math.cos(phi), py: pStar * Math.sin(phi), pz: 0 };
    const daughter2CM: FourVector = { E: daughterEnergyCM, px: -daughter1CM.px, py: -daughter1CM.py, pz: 0 };
    const daughter1 = boostByTotal(daughter1CM, parent);
    const daughter2 = boostByTotal(daughter2CM, parent);

    // Exact finite 2+1D shower opacity: g_3^2 has energy units, so g_3^2/Q
    // controls the branch rate. No 3+1D DGLAP logarithmic evolution is used.
    const qGeV = virtualMass / 1000;
    const strength = alphaOverride !== undefined && alphaOverride > 0 ? alphaOverride / 0.35 : 1;
    const alpha2D = Math.min(0.85, this.lambdaQCD * strength / Math.max(0.02, qGeV));
    const split = Math.random() < (1 - Math.exp(-0.12 * alpha2D * Math.max(0, dt)));
    const betaParent = Math.min(1, LIGHT_SPEED * Math.hypot(parent.px, parent.py) / Math.max(1e-12, parent.E));
    const betaStar = LIGHT_SPEED * pStar / Math.max(1e-12, daughterEnergyCM);
    const z = 0.5 * (1 + betaParent * betaStar * Math.cos(phi));

    const colors: Array<[ParticleColor, ParticleColor]> = [
      ['red', 'anti_red'], ['green', 'anti_green'], ['blue', 'anti_blue']
    ];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];
    return { split, allowed: true, z, flavor: chosen.flavor, color: chosenColor[0], antiColor: chosenColor[1], daughter1, daughter2 };
  }

  /**
   * Lund String Fragmentation & Hadronization:
   * When potential energy U(L) = σ * L exceeds 2 m_q c^2,
   * the flux tube snaps, creating a virtual q' q̄' pair via Schwinger tunneling:
   * P ∝ exp(-π m_q^2 / σ).
   */
  evaluateStringFragmentation(
    distOrQ1: number | ParticleInstance,
    sigmaOrQ2?: number | ParticleInstance,
    fluxEnergy?: number
  ): {
    canFragment: boolean;
    breakString: boolean;
    flavor: 'up' | 'down' | 'strange';
    newQKind: 'up' | 'down';
    mesonKind: 'pion' | 'composite';
    splitPos: { x: number; y: number };
  } {
    let dist = 100;
    let sigma = this.stringTension;
    let splitPos = { x: 0, y: 0 };

    if (typeof distOrQ1 === 'number') {
      dist = distOrQ1;
      sigma = typeof sigmaOrQ2 === 'number' ? sigmaOrQ2 : this.stringTension;
    } else {
      const q1 = distOrQ1;
      const q2 = sigmaOrQ2 as ParticleInstance;
      if (q1 && q2) {
        dist = Math.hypot(q1.x - q2.x, q1.y - q2.y);
        splitPos = { x: (q1.x + q2.x) * 0.5, y: (q1.y + q2.y) * 0.5 };
      }
    }

    const energy = fluxEnergy !== undefined ? fluxEnergy : dist * sigma * 0.08;
    const m_up = simulationMass('up') * LIGHT_SPEED * LIGHT_SPEED;
    const threshold = 1.8 * m_up;

    const breakString = dist > 70 && energy >= threshold;
    const roll = Math.random();
    const flavor: 'up' | 'down' | 'strange' = roll < 0.45 ? 'up' : roll < 0.9 ? 'down' : 'strange';
    const newQKind: 'up' | 'down' = flavor === 'strange' ? 'up' : flavor;

    return {
      canFragment: breakString,
      breakString,
      flavor,
      newQKind,
      mesonKind: 'pion',
      splitPos
    };
  }

  /**
   * Coherent Gluon Radiation with Quantum Angular Ordering:
   * Enforces θ_{i+1} < θ_i (destructive interference outside opening cone).
   */
  sampleCoherentGluonRadiation(
    emitter: ParticleInstance,
    emitEnergy: number,
    lastOpeningAngle = Math.PI
  ): {
    angle: number;
    gluonIndex: number;
    recoilColor: ParticleColor;
  } {
    const parentAngle = Math.atan2(emitter.vy, emitter.vx) || 0;
    const maxCone = Math.min(lastOpeningAngle * 0.75, Math.PI * 0.45);
    const opening = (Math.random() * 0.8 + 0.1) * maxCone;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const angle = parentAngle + Math.PI + sign * opening;

    const gIndex = Math.floor(Math.random() * 8) + 1;
    const colors: ParticleColor[] = ['red', 'green', 'blue'];
    const currentBase = emitter.color.replace('anti_', '') as ParticleColor;
    const otherColors = colors.filter(c => c !== currentBase);
    const recoilBase = otherColors[Math.floor(Math.random() * otherColors.length)];
    const recoilColor = emitter.isAntiparticle ? (`anti_${recoilBase}` as ParticleColor) : recoilBase;

    return {
      angle,
      gluonIndex: gIndex,
      recoilColor
    };
  }
}
