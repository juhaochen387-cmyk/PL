/**
 * Simulation Presets for Standard Model Quantum Simulation
 */

import { ParticleKind, ParticleColor, EngineSettings } from '../types/physics';
import { ExactPhysicsEngine } from './ExactPhysicsEngine';
import { LIGHT_SPEED } from './catalog';

export interface PresetInitialParticle {
  kind: ParticleKind;
  count: number;
  color?: ParticleColor;
  isAntiparticle?: boolean;
  pinned?: boolean;
  speed?: number;
  spread?: number;
}

export interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  forceSettings: Partial<EngineSettings>;
  initialParticles: PresetInitialParticle[];
  setup?: (engine: ExactPhysicsEngine) => void;
}

export const PRESETS: Preset[] = [
  {
    id: 'su3_color_algebra_lab',
    name: 'SU(3) Color Algebra & Non-Abelian Gauge Bosons (3g, 4g, g → qq̄)',
    badge: 'SU(3) Tᵃ = λᵃ/2',
    description: 'Full SU(3) color algebra with 8 Gell-Mann generators Tᵃ = λᵃ/2, continuous quantum color states in ℂ³ / ℂ⁸, 3-gluon & 4-gluon self-interaction vertices, and Altarelli-Parisi gluon splitting g → q + q̄.',
    forceSettings: {
      su3ColorAlgebraEnabled: true,
      gluonSelfInteractionsEnabled: true,
      threeGluonVertexEnabled: true,
      fourGluonVertexEnabled: true,
      qcdInterferenceEnabled: true,
      gluonSplittingEnabled: true,
      coherentShowerAngularOrdering: true,
      qcdAlphaS: 0.38,
      strongForceEnabled: true,
      electromagnetismEnabled: false,
      gravityEnabled: false
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // 1. Set up high-energy radiation gluon for Altarelli-Parisi splitting g → qqbar
      engine.addParticle({
        kind: 'gluon',
        x: cx - 200,
        y: cy - 90,
        vx: LIGHT_SPEED * 0.9,
        vy: 0,
        isRadiation: true,
        energy: 6.8,
        gluonIndex: 1
      });

      // 2. Set up colliding gluons for 3-gluon non-Abelian vertex if^{abc}
      engine.addParticle({
        kind: 'gluon',
        x: cx - 180,
        y: cy,
        vx: LIGHT_SPEED * 0.85,
        vy: 0,
        isRadiation: true,
        energy: 5.2,
        gluonIndex: 1
      });
      engine.addParticle({
        kind: 'gluon',
        x: cx + 180,
        y: cy,
        vx: -LIGHT_SPEED * 0.85,
        vy: 0,
        isRadiation: true,
        energy: 5.2,
        gluonIndex: 2
      });

      // 3. Set up crossing gluons for 4-gluon quartic contact vertex
      engine.addParticle({
        kind: 'gluon',
        x: cx - 150,
        y: cy + 120,
        vx: LIGHT_SPEED * 0.7,
        vy: -LIGHT_SPEED * 0.35,
        isRadiation: true,
        energy: 5.0,
        gluonIndex: 4
      });
      engine.addParticle({
        kind: 'gluon',
        x: cx + 150,
        y: cy + 120,
        vx: -LIGHT_SPEED * 0.7,
        vy: -LIGHT_SPEED * 0.35,
        isRadiation: true,
        energy: 5.0,
        gluonIndex: 5
      });

      // 4. Valence quarks with continuous quantum color states
      engine.addParticle({ kind: 'up', x: cx - 80, y: cy - 140, vx: 1.2, vy: 0.5, color: 'red' });
      engine.addParticle({ kind: 'down', x: cx + 80, y: cy - 140, vx: -1.2, vy: -0.5, color: 'green' });
    }
  },
  {
    id: 'steiner_baryon_lab',
    name: 'Steiner Minimal Tree Fermat Y-Junction (Baryon 3-Quark Confinement)',
    badge: 'Steiner 120° Fermat Y-Junction',
    description: '3-quark baryon confinement governed by the nonperturbative minimal Steiner tree Fermat-Torricelli junction. Flux tubes meet at 120° angles minimizing field energy, directly reproducing lattice QCD simulations.',
    forceSettings: {
      steinerBaryonJunctionEnabled: true,
      cornellConfinementEnabled: true,
      su3ColorAlgebraEnabled: true,
      qcdAlphaS: 0.35,
      stringTensionSigma: 1.2,
      strongForceEnabled: true,
      electromagnetismEnabled: true,
      macroparticleFormationEnabled: true,
      gravityEnabled: false
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // Spawn Proton (uud) with minimal Steiner tree Fermat Y-junction
      engine.spawnSteinerBaryon('proton');

      // Spawn Neutron (udd) slightly offset
      const R = 32;
      const nx = cx + 180;
      const ny = cy;
      const u = engine.addParticle({ kind: 'up', x: nx, y: ny - R, color: 'red' });
      const d1 = engine.addParticle({ kind: 'down', x: nx - R * 0.866, y: ny + R * 0.5, color: 'green' });
      const d2 = engine.addParticle({ kind: 'down', x: nx + R * 0.866, y: ny + R * 0.5, color: 'blue' });
      engine.formMacroparticle('neutron', [u, d1, d2]);
    }
  },
  {
    id: 'lund_fragmentation_lab',
    name: 'Cornell Potential & Lund String Fragmentation (Schwinger Tunneling)',
    badge: 'Cornell V(r) & Lund Hadronization',
    description: 'Relativistic quark-antiquark pair flies apart. The nonperturbative Cornell potential V(r) = -4/3 α_s/r + σr stores field energy until the Schwinger vacuum tunneling threshold is exceeded, breaking into color-singlet hadrons.',
    forceSettings: {
      cornellConfinementEnabled: true,
      lundFragmentationEnabled: true,
      su3ColorAlgebraEnabled: true,
      strongForceEnabled: true,
      stringTensionSigma: 1.2,
      qcdAlphaS: 0.35,
      electromagnetismEnabled: false,
      gravityEnabled: false
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // Pair 1: Relativistic high-tension jet pair
      const q1 = engine.addParticle({
        kind: 'up',
        x: cx - 60,
        y: cy - 70,
        vx: -3.6,
        vy: 0,
        color: 'red'
      });
      const q2 = engine.addParticle({
        kind: 'up',
        x: cx + 60,
        y: cy - 70,
        vx: 3.6,
        vy: 0,
        isAntiparticle: true,
        color: 'anti_red'
      });
      engine.createBond(q1, q2);

      // Pair 2: Strange quark pair
      const s1 = engine.addParticle({
        kind: 'strange',
        x: cx - 40,
        y: cy + 70,
        vx: -2.8,
        vy: 0,
        color: 'green'
      });
      const s2 = engine.addParticle({
        kind: 'strange',
        x: cx + 40,
        y: cy + 70,
        vx: 2.8,
        vy: 0,
        isAntiparticle: true,
        color: 'anti_green'
      });
      engine.createBond(s1, s2);
    }
  },
  {
    id: 'qed_breit_wheeler_lab',
    name: 'QED Breit-Wheeler Pair Production (γγ → e⁺e⁻)',
    badge: 'QED s ≥ 4mₑ²c⁴',
    description: 'Relativistic photon beams collide head-on. Below threshold s < 4mₑ²c⁴, photons pass through; above threshold, Breit-Wheeler cross section creates real electron-positron pairs with quantum angular distributions.',
    forceSettings: {
      electromagnetismEnabled: true,
      maxwellFieldEnabled: true,
      lorentzForceEnabled: true,
      qedInteractionsEnabled: true,
      breitWheelerEnabled: true,
      betheHeitlerEnabled: true,
      comptonScatteringEnabled: true,
      virtualPhotonExchangeEnabled: true,
      fineStructureConstant: 1 / 137.036,
      boundaryMode: 'bounce',
      radiationEnabled: true,
      strongForceEnabled: false,
      gravityEnabled: false
    },
    initialParticles: [],
    setup(engine) {
      // Setup head-on photon collision pairs with sufficient invariant energy s >= 4 m_e^2 c^4
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      for (let i = 0; i < 3; i++) {
        const y = cy + (i - 1) * 70;
        const g1 = engine.addParticle({
          kind: 'photon',
          x: cx - 220,
          y,
          vx: LIGHT_SPEED,
          vy: 0,
          isRadiation: true,
          energy: 5.5 + i * 0.5
        });
        g1.polarization = engine.qed.createPolarization(LIGHT_SPEED, 0, 0, 1, 0);

        const g2 = engine.addParticle({
          kind: 'photon',
          x: cx + 220,
          y,
          vx: -LIGHT_SPEED,
          vy: 0,
          isRadiation: true,
          energy: 5.5 + i * 0.5
        });
        g2.polarization = engine.qed.createPolarization(-LIGHT_SPEED, 0, 0, -1, 0);
      }

      // Add a heavy stationary target for Bethe-Heitler pair creation demonstration
      engine.addParticle({
        kind: 'top',
        x: cx,
        y: cy + 160,
        vx: 0,
        vy: 0,
        pinned: true
      });
      const gH = engine.addParticle({
        kind: 'photon',
        x: cx - 240,
        y: cy + 160,
        vx: LIGHT_SPEED,
        vy: 0,
        isRadiation: true,
        energy: 7.2
      });
      gH.polarization = engine.qed.createPolarization(LIGHT_SPEED, 0, 0, 1, Math.PI * 0.25);
    }
  },
  {
    id: 'time_dependent_maxwell_lab',
    name: 'Time-Dependent Maxwell Field & EM Waves',
    badge: 'c = 12 px/tick · Retardation',
    description: 'Moving charges and currents generate electric fields and magnetic flux Bz on a 2D Maxwell lattice. Accelerations launch causal EM waves that propagate strictly at light speed c. Observe Poynting energy flow S = E×B.',
    forceSettings: {
      electromagnetismEnabled: true,
      maxwellFieldEnabled: true,
      lorentzForceEnabled: true,
      timeDependentRetardation: true,
      emStrength: 1.8,
      strongForceEnabled: false,
      gravityEnabled: false,
      friction: 0.005,
      boundaryMode: 'bounce',
      showMagneticFieldHeatmap: true,
      showElectricFieldVectors: true,
      showPoyntingVectors: true
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // Orbiting dipole pair (electron + positron) continuously radiating spiral EM waves
      engine.addParticle({
        kind: 'electron',
        x: cx - 35,
        y: cy,
        vx: 0,
        vy: -5.5,
        isAntiparticle: false
      });
      engine.addParticle({
        kind: 'electron',
        x: cx + 35,
        y: cy,
        vx: 0,
        vy: 5.5,
        isAntiparticle: true
      });

      // Linear oscillating charge in background
      engine.addParticle({
        kind: 'up',
        color: 'red',
        x: cx - 220,
        y: cy - 90,
        vx: 6.2,
        vy: 0
      });
      engine.addParticle({
        kind: 'down',
        color: 'blue',
        x: cx + 220,
        y: cy + 90,
        vx: -6.2,
        vy: 0
      });
    }
  },
  {
    id: 'lorentz_cyclotron_lab',
    name: 'Lorentz Force: Cyclotron & E×B Drift',
    badge: 'F = q(E + v×B)',
    description: 'Charged fermions in uniform and current-generated magnetic field Bz execute relativistic cyclotron orbits (r_L = γmv / qB). Cross electric fields induce transverse drift v_d = (E×B)/B².',
    forceSettings: {
      electromagnetismEnabled: true,
      maxwellFieldEnabled: true,
      lorentzForceEnabled: true,
      magneticFieldBiasZ: 0.18,
      emStrength: 1.5,
      strongForceEnabled: false,
      gravityEnabled: false,
      friction: 0,
      boundaryMode: 'bounce',
      showMagneticFieldHeatmap: true,
      showElectricFieldVectors: true
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // Fast electrons and positrons in magnetic field executing opposing gyromotion
      for (let i = 0; i < 4; i++) {
        const radius = 60 + i * 25;
        const angle = (i * Math.PI) / 2;
        const speed = 4.8 + i * 1.0;
        engine.addParticle({
          kind: 'electron',
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          isAntiparticle: i % 2 === 1
        });
      }

      // Add a heavy proton undergoing larger gyroradius
      engine.addParticle({
        kind: 'up',
        color: 'red',
        x: cx - 120,
        y: cy,
        vx: 0,
        vy: 5.8
      });
    }
  },
  {
    id: 'compton_helicity_lab',
    name: 'Compton Scattering & Photon Helicity',
    badge: 'Klein-Nishina · λ = ±1',
    description: 'High-energy circularly polarized photons (helicity λ = +1 or -1) collide with electrons. Klein-Nishina differential scattering shifts the photon frequency and imparts recoil four-momentum to the electron.',
    forceSettings: {
      electromagnetismEnabled: true,
      maxwellFieldEnabled: true,
      lorentzForceEnabled: true,
      qedInteractionsEnabled: true,
      comptonScatteringEnabled: true,
      fineStructureConstant: 1 / 137.036,
      boundaryMode: 'bounce',
      radiationEnabled: true,
      strongForceEnabled: false,
      gravityEnabled: false,
      showPhotonPolarization: true
    },
    initialParticles: [],
    setup(engine) {
      const cx = engine.width * 0.5;
      const cy = engine.height * 0.5;

      // Target electrons
      for (let i = 0; i < 3; i++) {
        const y = cy + (i - 1) * 80;
        engine.addParticle({
          kind: 'electron',
          x: cx,
          y,
          vx: 0,
          vy: 0
        });

        // Incoming high-energy polarized photons with right-handed circular (λ = +1)
        const g = engine.addParticle({
          kind: 'photon',
          x: cx - 220,
          y,
          vx: LIGHT_SPEED,
          vy: 0,
          isRadiation: true,
          energy: 6.2 + i * 0.8
        });
        g.polarization = engine.qed.createPolarization(LIGHT_SPEED, 0, 0, i % 2 === 0 ? 1 : -1, (i * Math.PI) / 4);
      }
    }
  },
  {
    id: 'standard_particle_life',
    name: 'All 17 Fundamental Particles: Standard Model Life',
    badge: 'Full Standard Model & QED',
    description: 'Empty 2+1D Standard Model laboratory. Choose particles from the table and add them deliberately; no particles are spawned automatically.',
    forceSettings: {
      electromagnetismEnabled: true,
      maxwellFieldEnabled: true,
      lorentzForceEnabled: true,
      qedInteractionsEnabled: true,
      breitWheelerEnabled: true,
      betheHeitlerEnabled: true,
      comptonScatteringEnabled: true,
      virtualPhotonExchangeEnabled: true,
      strongForceEnabled: true,
      weakForceEnabled: true,
      gravityEnabled: false,
      pauliExclusionEnabled: true,
      higgsCouplingEnabled: true,
      macroparticleFormationEnabled: true,
      singleParticleDecaysEnabled: true,
      // Keep stochastic visualization radiation off in the general particle
      // laboratory. The dedicated radiation_lab preset opts in explicitly.
      radiationEnabled: false,
      bremsstrahlungEnabled: false,
      gluonRadiationEnabled: false,
      emStrength: 1.2,
      strongStrength: 2.0,
      weakStrength: 1.0,
      gravityStrength: 0.6,
      friction: 0,
      pauliStrength: 1.4,
      bindingDistance: 38,
      subSteps: 4
    },
    initialParticles: []
  },
  {
    id: 'hadron_genesis',
    name: 'Hadron Genesis (Nucleosynthesis)',
    badge: 'Strong Force & Color Neutrality',
    description: 'Quarks (u & d) carrying Red, Green, and Blue color charges interact via gluon-mediated strong force and snap into color-neutral Protons (uud) and Neutrons (udd) when within binding distance.',
    forceSettings: {
      strongForceEnabled: true,
      electromagnetismEnabled: true,
      weakForceEnabled: true,
      gravityEnabled: false,
      pauliExclusionEnabled: true,
      macroparticleFormationEnabled: true,
      singleParticleDecaysEnabled: true,
      strongStrength: 2.4,
      emStrength: 1.0,
      bindingDistance: 40,
      confinementTension: 0.9,
      subSteps: 4
    },
    initialParticles: [
      { kind: 'up', count: 4, color: 'red' },
      { kind: 'up', count: 4, color: 'green' },
      { kind: 'up', count: 4, color: 'blue' },
      { kind: 'down', count: 4, color: 'red' },
      { kind: 'down', count: 4, color: 'green' },
      { kind: 'down', count: 4, color: 'blue' },
      { kind: 'electron', count: 6 }
    ]
  },
  {
    id: 'radiation_lab',
    name: 'Radiation & Parton Showers',
    badge: 'Bremsstrahlung & Gluon Emission',
    description: 'Fast electrons and quarks scatter from pinned heavy top-quark centers. Deflection produces amber bremsstrahlung photons and curly color-carrying gluon packets. Watch kinetic energy convert into radiation and recoil.',
    forceSettings: {
      strongForceEnabled: true,
      electromagnetismEnabled: true,
      weakForceEnabled: false,
      gravityEnabled: false,
      pauliExclusionEnabled: true,
      higgsCouplingEnabled: false,
      macroparticleFormationEnabled: false,
      singleParticleDecaysEnabled: false,
      emStrength: 1.4,
      strongStrength: 2.0,
      confinementTension: 0.25,
      confinementGrowth: 0.5,
      subSteps: 4,
      friction: 0.02,
      boundaryMode: 'bounce',
      radiationEnabled: true,
      bremsstrahlungEnabled: true,
      gluonRadiationEnabled: true,
      radiationStrength: 2.2,
      radiationMinEnergy: 0.04
    },
    initialParticles: [
      { kind: 'top', count: 2, pinned: true, speed: 0, spread: 0.12 },
      { kind: 'electron', count: 12, speed: 6.5, spread: 0.42 },
      { kind: 'electron', count: 12, isAntiparticle: true, speed: 6.5, spread: 0.42 },
      { kind: 'up', count: 6, color: 'red', speed: 5.5, spread: 0.35 },
      { kind: 'down', count: 6, color: 'blue', speed: 5.5, spread: 0.35 }
    ]
  },
  {
    id: 'relativistic_lab',
    name: 'Relativistic & Quantum Lab',
    badge: 'c · WKB · E=mc²',
    description: 'Opposing electron/positron beams annihilate into real photons (e⁻ + e⁺ → 2γ). Observe exact relativistic momentum conservation.',
    forceSettings: {
      gravityEnabled: false,
      weakForceEnabled: false,
      friction: 0,
      boundaryMode: 'bounce',
      radiationEnabled: true,
      electromagnetismEnabled: true,
      strongForceEnabled: false
    },
    initialParticles: [],
    setup(engine) {
      for (let i = 0; i < 4; i++) {
        const y = engine.height * (0.25 + i * 0.15);
        engine.addParticle({ kind: 'electron', x: engine.width * 0.25, y, vx: LIGHT_SPEED * 0.94, vy: 0 });
        engine.addParticle({ kind: 'electron', isAntiparticle: true, x: engine.width * 0.75, y, vx: -LIGHT_SPEED * 0.94, vy: 0 });
      }
    }
  },
  {
    id: 'quantum_barrier_lab',
    name: 'Quantum Tunneling — Barrier / Well',
    badge: 'WKB transmission',
    description: 'A stream of low-energy electrons approaches a finite potential barrier. Watch transmitted and reflected particles according to WKB exponential penetration.',
    forceSettings: {
      gravityEnabled: false,
      weakForceEnabled: false,
      friction: 0,
      boundaryMode: 'bounce',
      tunnelingEnabled: true,
      barrierHeight: 18,
      barrierWidth: 10
    },
    initialParticles: [],
    setup(engine) {
      engine.addBarrier();
      for (let i = 0; i < 16; i++) {
        engine.addParticle({
          kind: 'electron',
          x: engine.width * (0.12 + 0.018 * (i % 4)),
          y: engine.height * (0.22 + 0.14 * Math.floor(i / 4)),
          vx: 3.8,
          vy: 0
        });
      }
    }
  },
  {
    id: 'weak_vertex_lab',
    name: 'Neutron Beta Decay — W* Vertices',
    badge: 'Weak Transitions',
    description: 'Neutrons undergo d → u + W⁻*, followed by W⁻* → e⁻ + ν̄_e. Stable protons do not decay. Lifetimes use exact Poisson sampling.',
    forceSettings: {
      macroparticleFormationEnabled: true,
      weakForceEnabled: true,
      singleParticleDecaysEnabled: true,
      decayRateMultiplier: 1.5
    },
    initialParticles: [],
    setup(engine) {
      for (let i = 0; i < 3; i++) {
        engine.spawnNucleon('neutron', engine.width * (0.25 + i * 0.25), engine.height * 0.5);
      }
    }
  },
  {
    id: 'string_energy_lab',
    name: 'QCD String Energy — Threshold Pair Creation',
    badge: 'U(L) → 2mc²',
    description: 'Separating quarks stretch a persistent flux tube. Kinetic energy fills its explicit potential-energy ledger; at threshold the tube breaks into a real quark/antiquark pair.',
    forceSettings: {
      strongForceEnabled: true,
      radiationEnabled: false,
      confinementTension: 3.8,
      confinementGrowth: 0.2,
      strongStrength: 1.0
    },
    initialParticles: [],
    setup(engine) {
      const x = engine.width * 0.5, y = engine.height * 0.55;
      const a = engine.addParticle({ kind: 'up', color: 'red', x: x - 12, y, vx: -11.4, vy: 0 });
      const b = engine.addParticle({ kind: 'down', isAntiparticle: true, color: 'anti_red', x: x + 12, y, vx: 11.4, vy: 0 });
      engine.assignSingletGroup([a, b], 'meson', 'demo-string');
      engine.createBond(a, b);
      engine.logEvent('confinement', x, y, 'Stretching flux tube: kinetic energy becomes U(L); pair created at 2mc² threshold.', '#fb923c');
    }
  },
  {
    id: 'higgs_gravity_well',
    name: 'Higgs Mass Generation & Gravity',
    badge: 'Spacetime Curvature',
    description: 'Massive Higgs bosons and top quarks generate gravitational attraction in an external spacetime curvature background (non-Standard Model).',
    forceSettings: {
      gravityEnabled: true,
      gravityStrength: 2.2,
      electromagnetismEnabled: true,
      emStrength: 0.8,
      strongForceEnabled: false
    },
    initialParticles: [
      { kind: 'higgs', count: 2, pinned: true, speed: 0 },
      { kind: 'top', count: 3, speed: 2.0 },
      { kind: 'electron', count: 12, speed: 4.5 }
    ]
  },
  {
    id: 'electroweak_currents',
    name: 'Electroweak Currents (CC W± vs NC Z⁰)',
    badge: 'CKM Mixing & Competing Channels',
    description: 'Separation of Charged-Current (W± mediated with CKM quark mixing) and Neutral-Current (Z⁰ mediated flavor-conserving) interactions, complete fermion weak vertices, and matrix-element decay branching ratios.',
    forceSettings: {
      weakForceEnabled: true,
      chargedCurrentEnabled: true,
      neutralCurrentEnabled: true,
      neutrinoScatteringEnabled: true,
      showWeakVirtualBosons: true,
      electromagnetismEnabled: true,
      strongForceEnabled: true,
      singleParticleDecaysEnabled: true,
      weakStrength: 1.4,
      subSteps: 4
    },
    initialParticles: [
      { kind: 'down', count: 4, color: 'blue' },
      { kind: 'up', count: 4, color: 'red' },
      { kind: 'strange', count: 2, color: 'green' },
      { kind: 'charm', count: 2, color: 'anti_red' },
      { kind: 'electron', count: 4 },
      { kind: 'muon', count: 3 },
      { kind: 'electron_neutrino', count: 4 },
      { kind: 'muon_neutrino', count: 3 },
      { kind: 'w_plus', count: 2 },
      { kind: 'w_minus', count: 2 },
      { kind: 'z_boson', count: 2 }
    ]
  },
  {
    id: 'msw_matter_oscillations',
    name: 'MSW Matter-Induced Neutrino Oscillations',
    badge: 'Solar & Supernova Resonance',
    description: 'Propagating electron neutrinos interact coherently with ambient electron matter density (V_CC = √2 G_F N_e), triggering the Mikheyev-Smirnov-Wolfenstein (MSW) resonance for maximal flavor conversion into ν_μ and ν_τ.',
    forceSettings: {
      weakForceEnabled: true,
      neutrinoOscillationEnabled: true,
      pmnsMixingEnabled: true,
      mswMatterOscillationsEnabled: true,
      matterElectronDensity: 0.54,
      showNeutrinoOscillationGauges: true,
      showWavepackets: true,
      electromagnetismEnabled: true,
      strongForceEnabled: true,
      subSteps: 4
    },
    initialParticles: [
      { kind: 'electron', count: 14, speed: 1.2 },
      { kind: 'electron_neutrino', count: 6, speed: 7.5 },
      { kind: 'muon_neutrino', count: 2, speed: 7.5 }
    ],
    setup(engine) {
      // Spawn two dense nucleons to form a steep matter density gradient
      engine.spawnNucleon('proton', engine.width * 0.45, engine.height * 0.45);
      engine.spawnNucleon('neutron', engine.width * 0.55, engine.height * 0.55);
      engine.logEvent(
        'msw_setup_init',
        engine.width * 0.5,
        engine.height * 0.5,
        '🌌 Initialized MSW Resonance environment with dense matter core (N_e = 0.54 resonance threshold)!',
        '#c084fc',
        4.0
      );
    }
  },
  {
    id: 'neutrino_antineutrino_collider',
    name: 'νν̄ Annihilation & Glashow Resonance Collider',
    badge: 'ν + ν̄ → Z* → ff̄ & W⁻',
    description: 'Opposing beams of neutrinos and antineutrinos collide to annihilate via virtual Z* bosons into charged leptons and quark-antiquark pairs, alongside resonant Glashow production (ν̄_e + e⁻ → W⁻).',
    forceSettings: {
      weakForceEnabled: true,
      neutrinoAntineutrinoEnabled: true,
      neutralCurrentEnabled: true,
      chargedCurrentEnabled: true,
      showWeakVirtualBosons: true,
      electromagnetismEnabled: true,
      subSteps: 4
    },
    initialParticles: [
      { kind: 'electron', count: 6, speed: 0.8 },
      { kind: 'electron_neutrino', count: 4, speed: 6.5 },
      { kind: 'electron_neutrino', count: 4, isAntiparticle: true, speed: 6.5 },
      { kind: 'muon_neutrino', count: 3, speed: 6.5 },
      { kind: 'muon_neutrino', count: 3, isAntiparticle: true, speed: 6.5 }
    ]
  }
];
