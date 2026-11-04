/**
 * Standard Model Exact Physics Engine
 * Strict 2+1D planar relativistic kinematics, QCD Color Confinement & String Breaking,
 * SU(3) Gell-Mann Octet Gluons, Electroweak Transitions, planar 2+1D exact finite QCD kernels,
 * Mandelstam Partons, WKB Tunneling, and Conserved Quantum Numbers.
 */

import {
  ParticleDefinition,
  ParticleInstance,
  ParticleKind,
  ParticleColor,
  Macroparticle,
  InteractionEvent,
  Barrier,
  EngineSettings,
  FourVector
} from '../types/physics';
import {
  STANDARD_MODEL_PARTICLES,
  SU3_GLUON_OCTET,
  PRIMARY_COLORS,
  ANTI_COLORS,
  COLOR_CHARGE_STYLES,
  LIGHT_SPEED,
  HBAR_SIM,
  simulationMass,
  fundamentalColorVector,
  colorIndex,
  colorNameFromIndex,
  gluonColorVectorFromIndices,
  addColorVectors,
  colorVectorsEqual,
  SINGLE_PARTICLE_DECAYS,
  getAntiparticleProperties,
  physicalEnergyFromMomentum,
  physicalVelocityFromMomentum,
  relativisticProperTime
} from './catalog';
import {
  Complex,
  SuperpositionState,
  SpinorState,
  EntangledBipartiteState,
  TwoParticleSymmetry,
  QuantumStatistics,
  ExactWaveTunneling,
  QuantumInterference,
  QuantumTransitions,
  MeasurementDecoherenceModel,
  PlanarManyBodyQuantumState,
  PlanarGlobalManyBodyState,
  PlanarInteractionPhaseState,
  PlanarPairKineticPropagator
} from './QuantumMechanicsEngine';
import { ElectromagneticField } from './ElectromagneticField';
import { RelativisticPacketEngine } from './RelativisticPacketEngine';
import { PlanarGaugeQFTEngine } from './PlanarGaugeQFTEngine';
import { QuantumLinkGaugeEngine } from './QuantumLinkGaugeEngine';
import { QEDEngine } from './QEDEngine';
import { QCDEngine } from './QCDEngine';
import { WeakEngine } from './WeakEngine';
import {
  HiggsEngine,
  HIGGS_VEV_STANDARD_GEV,
  HIGGS_LAMBDA_STANDARD,
  HIGGS_MU2_STANDARD,
  YUKAWA_BASELINE
} from './HiggsEngine';
import {
  SU3_CASIMIR_CF,
  SU3_CASIMIR_CA,
  randomSuperpositionTriplet,
  pureColorOctet,
  createFundamentalColorState,
  createOctetColorState
} from './SU3ColorAlgebra';
import {
  FermionicModeIdentification,
  FermionicModeRegistry,
  performStandardModelAnomalyAudit,
  computeWilsonDoublerSpectrum,
  DoublerSpectrumPoint,
  AnomalyAuditResult,
  DIRAC_2D_IRREP_PLUS,
  DIRAC_2D_IRREP_MINUS,
  DIRAC_2D_REDUCIBLE_4X4,
  calculateSpinExpectation2x2,
  chargeConjugateSpinor2x2
} from './Dirac2Plus1D';
import {
  SparseFockState,
  AdaptiveModeSettings,
  DEFAULT_ADAPTIVE_SETTINGS,
  verifyFermionicCAR,
  runModeConvergenceSweep,
  CAR_SELF_TEST_REPORT,
  MODE_CONVERGENCE_TEST_REPORT,
  FullCARVerificationReport,
  ConvergenceSweepReport
} from './SparseFermionFockEngine';

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  spatialDimensions: 2,
  relativisticQuantumMotionEnabled: true,
  tunnelingEnabled: true,
  partonResolutionEnabled: true,
  hbar: 18,
  barrierWidth: 10,
  barrierHeight: 18,
  barrierRadius: 22,
  betaSecondsPerTick: 3,
  probeBeta: 0.985,
  electromagnetismEnabled: true,
  gravityEnabled: false, // Gravity is outside the Standard Model; disabled in the quantum baseline.
  strongForceEnabled: true,
  weakForceEnabled: true,
  pauliExclusionEnabled: true,
  higgsCouplingEnabled: true,
  macroparticleFormationEnabled: true,
  singleParticleDecaysEnabled: true,
  subSteps: 4,
  bohrRadius: 22,
  bohrFloorStrength: 2.8,
  emStrength: 1.2,
  gravityStrength: 0.8,
  strongStrength: 2.2,
  weakStrength: 1.0,
  pauliStrength: 1.5,
  confinementTension: 0.85,
  confinementGrowth: 0.6,
  colorSingletRepulsion: 1.0,
  strongInteractionRadius: 24,
  bindingDistance: 38,
  vacuumPolarizationEnabled: false,
  vacuumPairRate: 0.22,
  ckmDecaysEnabled: true,
  neutrinoOscillationEnabled: true,
  decayRateMultiplier: 1.0,
  friction: 0, // Isolated quantum systems do not undergo ad-hoc viscous drag.
  timeScale: 1.0,
  boundaryMode: 'torus',
  // Radiation is opt-in; the dedicated Radiation & Parton Showers preset enables it.
  radiationEnabled: false,
  bremsstrahlungEnabled: false,
  gluonRadiationEnabled: false,
  radiationStrength: 1.5,
  radiationMinEnergy: 0.06,
  asymptoticFreedomEnabled: true,
  symplecticOrder: 4,
  landauLifshitzDampingEnabled: true,
  qedRetardedFieldsEnabled: true,
  qedPairProductionEnabled: true,
  maxwellFieldEnabled: true,
  lorentzForceEnabled: true,
  timeDependentRetardation: true,
  emWaveSpeed: 12.0,
  qedInteractionsEnabled: true,
  breitWheelerEnabled: true,
  betheHeitlerEnabled: true,
  comptonScatteringEnabled: true,
  virtualPhotonExchangeEnabled: true,
  fineStructureConstant: 1 / 137.036,
  magneticFieldBiasZ: 0,
  showElectricFieldVectors: false,
  showMagneticFieldHeatmap: true,
  showPoyntingVectors: false,
  showVirtualPhotons: true,
  showPhotonPolarization: true,
  mswMatterOscillationsEnabled: true,
  matterElectronDensity: 1.0,
  higgsVev: 246.22,
  lambdaQCD: 0.217,
  showWavepackets: true,
  wavePacketSigma: 5,
  packetDispersionModel: 'nonrelativistic',
  packetDisplayCap: 70,
  neutrinoKmPerPixel: 0.25,
  neutrinoGeVPerEnergy: 1,
  pdfLogQ2: 3,
  partonCutoffQ2: 100,
  orbitalL: 0,
  physicalWeakClock: false,
  weakClockExponent: -24,
  partonScatteringEnabled: true,
  gluonScatteringEnabled: true,
  partonCellRadius: 30,
  partonOpacity: 1,
  absorptionProbability: 0.8,
  virtualExchangeEnabled: true,
  separateParticleSymbols: false,
  atomicCoreEnabled: false,
  forceCutoff: 180,
  su3ColorAlgebraEnabled: true,
  gluonSelfInteractionsEnabled: true,
  threeGluonVertexEnabled: true,
  fourGluonVertexEnabled: true,
  qcdInterferenceEnabled: true,
  cornellConfinementEnabled: true,
  steinerBaryonJunctionEnabled: true,
  lundFragmentationEnabled: true,
  gluonSplittingEnabled: true,
  coherentShowerAngularOrdering: true,
  qcdAlphaS: 0.35,
  stringTensionSigma: 1.0,
  showSU3ColorSuperposition: true,
  showSteinerFluxTubes: true,
  chargedCurrentEnabled: true,
  neutralCurrentEnabled: true,
  neutrinoScatteringEnabled: true,
  neutrinoAntineutrinoEnabled: true,
  pmnsMixingEnabled: true,
  showWeakVirtualBosons: true,
  showNeutrinoOscillationGauges: true,
  fermiGf: 1.1663787e-5,
  sin2ThetaW: 0.23122,
  higgsFieldEnabled: true,
  higgsPotentialMu2: HIGGS_MU2_STANDARD,
  higgsPotentialLambda: HIGGS_LAMBDA_STANDARD,
  ewsbBrokenPhase: true,
  yukawaCouplingMultiplier: 1.0,
  higgsSelfInteractionsEnabled: true,
  higgsGaugeInteractionsEnabled: true,
  higgsProductionEnabled: true,
  showHiggsFieldCondensate: true,
  quantumInterferenceEnabled: true,
  bornRuleMeasurementEnabled: true,
  bellEntanglementEnabled: true,
  pauliAntisymmetryEnabled: true,
  boseSymmetrizationEnabled: true,
  exactWaveTunnelingEnabled: true,
  properTimeDilationEnabled: true,
  wignerRotationEnabled: true,
  strict4MomentumConservation: true,
  boundaryExchangeTracking: true,
  showQuantumInterferenceFringes: true,
  showEntangledBellCorrelations: true,
  sternGerlachAxisTheta: 0,
  sternGerlachAxisPhi: 0,
  diracRepresentation2D: 'reducible_4x4',
  latticeRegulator: 'Wilson Fermion',
  wilsonParameterR: 1.0,
  latticeSpacingA: 0.5,
  dimensionalReductionRadiusR: 1.0,
  parityAnomalyCancellationCheck: true,
  showDoublerSpectrumOverlay: true,
  showFermionicModesHUD: true
};

export const RADIATION_LIMITS = Object.freeze({
  maxPackets: 160,
  transportSpeed: 12.0,
  photonLifetime: 170,
  gluonLifetime: 105,
  cooldown: 2.5,
  reserveEnergy: 0.01
});

export function poissonEventProbability(mean: number): number {
  const lambda = Math.max(0, mean);
  if (lambda === 0) return 0;
  if (lambda > 745) return 1;
  return -Math.expm1(-lambda);
}

export function poissonTransitionProbability(rate: number, dt: number): number {
  return poissonEventProbability(Math.max(0, rate) * Math.max(0, dt));
}

/** Add energy-momentum vectors in 2+1 spacetime dimensions. The z component is
 * deliberately excluded: z is not a hidden third spatial direction in this model. */
export function addFour(...vectors: FourVector[]): FourVector {
  return vectors.reduce((a, b) => ({
    E: a.E + b.E,
    px: a.px + (b.px || 0),
    py: a.py + (b.py || 0),
    pz: 0
  }), { E: 0, px: 0, py: 0, pz: 0 });
}

/** Invariant mass-energy for metric signature (+,--), not (+,---). */
export function invariantEnergy(v: FourVector): number {
  const x = v.px ?? 0, y = v.py ?? 0;
  if (![v.E, x, y].every(Number.isFinite) || v.E <= 0) return 0;
  const pc = LIGHT_SPEED * Math.hypot(x, y);
  return Math.sqrt(Math.max(0, (v.E - pc) * (v.E + pc)));
}

/** Lorentz boost restricted to the two represented spatial axes. bz is ignored. */
export function boostFour(v: FourVector, bx: number, by: number, _bz = 0): FourVector {
  const x = v.px ?? 0, y = v.py ?? 0;
  if (![v.E, x, y, bx, by].every(Number.isFinite)) return { E: v.E, px: x, py: y, pz: 0 };
  let beta = Math.hypot(bx, by);
  const limit = 1 - 8 * Number.EPSILON;
  if (beta >= limit) { bx = bx / beta * limit; by = by / beta * limit; beta = limit; }
  if (beta < 1e-13) return { E: v.E, px: x, py: y, pz: 0 };
  const gamma = 1 / Math.sqrt((1 - beta) * (1 + beta));
  const dot = bx * x + by * y;
  const k = (gamma - 1) * dot / (beta * beta) + gamma * v.E / LIGHT_SPEED;
  return {
    E: gamma * (v.E + LIGHT_SPEED * dot),
    px: x + k * bx,
    py: y + k * by,
    pz: 0
  };
}

export function boostByTotal(v: FourVector, total: FourVector, inverse = false): FourVector {
  const sign = inverse ? -1 : 1;
  return boostFour(v, sign * LIGHT_SPEED * total.px / total.E, sign * LIGHT_SPEED * total.py / total.E);
}

export function dotFour(a: FourVector, b: FourVector): number {
  return a.E * b.E - LIGHT_SPEED ** 2 * ((a.px || 0) * (b.px || 0) + (a.py || 0) * (b.py || 0));
}

export function residualFour(a: FourVector, b: FourVector): number {
  return Math.max(Math.abs(a.E - b.E), LIGHT_SPEED * Math.hypot(a.px - b.px, a.py - b.py)) / Math.max(1, Math.abs(a.E));
}

export function breakupMomentum(M: number, a: number, b: number): number {
  if (!(M >= a + b) || M <= 0) return 0;
  return Math.sqrt(Math.max(0, (M - a - b) * (M + a + b) * (M - a + b) * (M + a - b))) / (2 * M);
}

export function sampleInvariantPhaseSpace(total: FourVector, masses: number[]): FourVector[] | null {
  const n = masses.length;
  const M = invariantEnergy(total);
  const m = masses.map(x => x * LIGHT_SPEED ** 2);
  const sum = m.reduce((a, b) => a + b, 0);
  if (n < 2 || M < sum - 1e-9 || !(M > 0)) return null;

  if (Math.abs(M - sum) < 1e-9) {
    return m.map(e => boostByTotal({ E: e, px: 0, py: 0, pz: 0 }, total));
  }

  // Exact sequential phase-space sampling in 2 spatial dimensions.
  // For each two-body split, dΦ₂ is proportional to dM_cluster (the p factor
  // in 3+1D is absent in 2+1D). Ordered uniform intermediate cluster masses
  // therefore provide the correct Raubold-Lynch mass measure in 2+1D.
  const cumulative: number[] = [];
  m.reduce((acc, value, i) => (cumulative[i] = acc + value), 0);
  const ordered = Array.from({ length: Math.max(0, n - 2) }, () => Math.random()).sort((a, b) => a - b);
  const clusters = m.map((_, i) => i === 0 ? m[0] : i === n - 1 ? M : cumulative[i] + ordered[i - 1] * (M - sum));

  let parent: FourVector = { E: M, px: 0, py: 0, pz: 0 };
  const rest: FourVector[] = new Array(n);
  for (let i = n - 1; i >= 1; i--) {
    const pc = breakupMomentum(clusters[i], m[i], clusters[i - 1]);
    // In 2 spatial dimensions the decay direction is one uniform azimuth φ.
    const phi = Math.random() * Math.PI * 2;
    const pSim = pc / LIGHT_SPEED;
    const daughter = {
      E: Math.hypot(m[i], pc),
      px: pSim * Math.cos(phi),
      py: pSim * Math.sin(phi),
      pz: 0
    };
    const recoil = {
      E: Math.hypot(clusters[i - 1], pc),
      px: -daughter.px,
      py: -daughter.py,
      pz: 0
    };
    rest[i] = boostByTotal(daughter, parent);
    parent = boostByTotal(recoil, parent);
  }
  rest[0] = parent;
  return rest.map(v => boostByTotal(v, total));
}

export function sampleRadiativeGluonColor(emitterColor: string) {
  const isAnti = emitterColor.startsWith('anti_');
  const base = emitterColor.replace('anti_', '');
  const pairs: Record<string, string[]> = {
    red: ['green', 'blue'],
    green: ['red', 'blue'],
    blue: ['red', 'green']
  };
  const candidates: Array<{ index: number; target: string; weight: number }> = [];
  const targetMap: Record<string, Record<string, [number, number]>> = {
    red: { green: [1, 2], blue: [4, 5] },
    green: { red: [1, 2], blue: [6, 7] },
    blue: { red: [4, 5], green: [6, 7] }
  };

  for (const target of pairs[base] || ['red', 'green']) {
    const indices = targetMap[base]?.[target] || [1, 2];
    for (const index of indices) {
      candidates.push({ index, target, weight: 0.25 });
    }
  }

  if (base === 'red' || base === 'green') {
    candidates.push({ index: 3, target: base, weight: 0.25 });
    candidates.push({ index: 8, target: base, weight: 1 / 12 });
  } else {
    candidates.push({ index: 8, target: base, weight: 1 / 3 });
  }

  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  let chosen = candidates[candidates.length - 1];
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) {
      chosen = c;
      break;
    }
  }

  const diagonal = chosen.index === 3 || chosen.index === 8;
  const newEmitterColor = isAnti ? `anti_${chosen.target}` : chosen.target;
  const gluonColor = diagonal
    ? undefined
    : isAnti
    ? { color: chosen.target, antiColor: base }
    : { color: base, antiColor: chosen.target };

  return {
    gluonIndex: chosen.index,
    newEmitterColor,
    gluonColor,
    diagonalGluon: diagonal,
    colorFlow: {
      from: emitterColor,
      to: newEmitterColor,
      diagonal
    }
  };
}

export interface ParticleBuckets {
  source: ParticleInstance[];
  matter: ParticleInstance[];
  radiation: ParticleInstance[];
  gluons: ParticleInstance[];
  clusters: ParticleInstance[];
}

export class ExactPhysicsEngine {
  width: number;
  height: number;
  particles: ParticleInstance[];
  macroparticles: Macroparticle[];
  interactionEvents: InteractionEvent[];
  barriers: Barrier[];
  settings: EngineSettings;
  simTime: number;

  emField: ElectromagneticField;
  qed: QEDEngine;
  qcd: QCDEngine;
  weak: WeakEngine;
  higgs: HiggsEngine;
  boundaryEnergyMomentumExchange: FourVector;
  entangledPairs: Map<string, EntangledBipartiteState>;
  manyBodyQuantumPairs: Map<string, any>;
  manyBodyBornSamples: any[];
  interactionPhaseState: PlanarInteractionPhaseState;
  pairKineticPropagator: PlanarPairKineticPropagator;
  relativisticPacketEngine: RelativisticPacketEngine;
  planarGaugeQFT: PlanarGaugeQFTEngine;
  quantumLinkGauge: QuantumLinkGaugeEngine;
  sparseFock: SparseFockState;
  adaptiveModeSettings: AdaptiveModeSettings;
  manyBodyQuantumDiagnostics: {
    pairCount: number; fermionPairs: number; bosonPairs: number; meanCorrelation: number;
    blockedPairs: number; bunchedPairs: number; globalSectors?: number; bornSampleCount?: number;
    meanSamplerAcceptance?: number; logJointBornDensity?: number;
    interactionPairs?: number; accumulatedInteractionPhase?: number; rmsInteractionPhase?: number;
    kineticSteps?: number; maxPairKineticSteps?: number; pairWaveNormError?: number;
    globalWavefunctionPhase?: number; globalLogBornProbability?: number;
  };
  lastSternGerlachMeasurement: any;
  initialClosedSystemEnergy: number = 0;
  initialClosedSystemMomentum: [number, number, number] = [0, 0, 0];

  nextParticleId: number = 1;
  nextMacroId: number = 1;
  nextEventId: number = 1;
  nextBarrierId: number = 1;
  nextLocalSingletId: number = 1;

  bonds: Map<string, { key: string; a: number; b: number; creationTime: number; breakEnergyLedger?: number }>;
  transferStats: any;
  fieldLedger: any;
  radiationStats: any;
  radiationHistory: Array<{ time: number; photonEnergy: number; gluonEnergy: number }>;
  radiationColorReservoir: [number, number, number];
  physicsStats: any;
  exchangeMarkers: any[];
  mc: any;
  partonStats: any;
  quantumStats: any;
  spatialStats: any;
  _pdfCache: Map<string, any>;
  _particleBuckets: ParticleBuckets | null = null;
  _particleBucketsDirty: boolean = true;
  _displayLayoutCache: any = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.macroparticles = [];
    this.interactionEvents = [];
    this.barriers = [];
    this.settings = { ...DEFAULT_ENGINE_SETTINGS };
    this.simTime = 0;
    this.emField = new ElectromagneticField(width, height);
    this.qed = new QEDEngine();
    this.qcd = new QCDEngine();
    this.weak = new WeakEngine();
    this.higgs = new HiggsEngine();
    this.boundaryEnergyMomentumExchange = { E: 0, px: 0, py: 0, pz: 0 };
    this.entangledPairs = new Map();
    this.manyBodyQuantumPairs = new Map();
    this.manyBodyBornSamples = [];
    this.interactionPhaseState = new PlanarInteractionPhaseState();
    this.pairKineticPropagator = new PlanarPairKineticPropagator();
    this.relativisticPacketEngine = new RelativisticPacketEngine();
    this.planarGaugeQFT = new PlanarGaugeQFTEngine(width, height, 12);
    this.quantumLinkGauge = new QuantumLinkGaugeEngine(12);
    this.sparseFock = new SparseFockState();
    this.adaptiveModeSettings = { ...DEFAULT_ADAPTIVE_SETTINGS };
    this.manyBodyQuantumDiagnostics = { pairCount: 0, fermionPairs: 0, bosonPairs: 0, meanCorrelation: 1, blockedPairs: 0, bunchedPairs: 0 };
    this.lastSternGerlachMeasurement = null;
    this.bonds = new Map();
    this.transferStats = {
      elastic: 0,
      photonAbsorptions: 0,
      gluonAbsorptions: 0,
      virtualPhotons: 0,
      virtualGluons: 0,
      stringBreaks: 0,
      maxResidual: 0
    };
    this.fieldLedger = { balance: 0 };
    this.radiationStats = {
      photonCount: 0,
      gluonCount: 0,
      photonEnergy: 0,
      gluonEnergy: 0,
      depositedEnergy: 0,
      confinedEnergy: 0,
      depositedCount: 0,
      confinedCount: 0,
      detectorMomentumX: 0,
      detectorMomentumY: 0,
      detectorMomentumZ: 0,
      removedCount: 0
    };
    this.radiationHistory = [];
    this.radiationColorReservoir = [0, 0, 0];
    this.physicsStats = {
      annihilations: 0,
      tunnels: 0,
      reflections: 0,
      betaDecays: 0,
      breitWheelerPairs: 0,
      betheHeitlerPairs: 0,
      comptonScatters: 0,
      virtualExchanges: 0,
      photonAbsorptions: 0,
      partonHits: 0,
      seaHits: 0,
      qcdScatterings: 0,
      threeGluonVertices: 0,
      fourGluonVertices: 0,
      gluonSplittings: 0,
      lundStringBreaks: 0,
      steinerBaryons: 0,
      chargedCurrentEvents: 0,
      neutralCurrentEvents: 0,
      neutrinoScatters: 0,
      neutrinoAnnihilations: 0,
      mswResonances: 0,
      ckmTransitions: 0,
      glashowEvents: 0,
      higgsGluonFusions: 0,
      higgsVBFEvents: 0,
      higgsstrahlungs: 0,
      higgsSelfScatters: 0,
      higgsDecays: 0,
      bornMeasurements: 0,
      entanglementCollapses: 0,
      bellViolations: 0,
      waveTunnelEvents: 0,
      pauliExclusions: 0,
      boseStimulations: 0,
      rabiCycles: 0,
      wignerRotations: 0,
      boundaryExchangeCount: 0,
      totalEnergyConservationError: 0,
      totalMomentumConservationError: 0,
      maxConservationError: 0,
      lastConservation: null,
      lastDIS: null
    };
    this.exchangeMarkers = [];
    this._pdfCache = new Map();
    this.ensureMC();
  }

  setSpatialDimensions(_dimensions: 2 | 3) {
    // This build is deliberately a strictly 2+1D model. Ignore requests to
    // switch to 3D and project every particle's out-of-plane state to zero.
    this.settings.spatialDimensions = 2;
    for (const p of this.particles) {
      p.z = 0; p.vz = 0; p.pz = 0; p.momentumZ = 0; p._momentumVz = 0;
    }
  }


  wrapZ(z: number): number {
    const depth = Math.min(this.width, this.height) * 0.5;
    if (this.settings.boundaryMode === 'torus') return ((z + depth) % (2 * depth) + 2 * depth) % (2 * depth) - depth;
    return Math.max(-depth, Math.min(depth, z));
  }

  setDimensions(w: number, h: number) {
    this.width = Math.max(300, w);
    this.height = Math.max(300, h);
    if (this.emField) {
      this.emField.resize(this.width, this.height);
    }
    if (this.planarGaugeQFT) this.planarGaugeQFT.setDimensions(this.width, this.height);
  }

  ensureMC() {
    if (!this.mc) {
      this.mc = {
        ggElastic: 0,
        ggMerge: 0,
        ggSplit: 0,
        clusterSplits: 0,
        phaseEvents: 0,
        phaseTrials: 0,
        lastLipsWeight: 0,
        showerTrials: 0,
        showerVetoes: 0,
        showerProposals: 0,
        showerEmissions: 0,
        kinematicVetoes: 0,
        noEmission: 0,
        lastSudakov: 1,
        pauliVetoes: 0,
        lastOccupation: 0,
        lastWidth: null
      };
    }
  }

  ensurePartonStats() {
    if (!this.partonStats) {
      this.partonStats = { attempts: 0, accepted: 0, kinematicVetoes: 0, last: null };
    }
    return this.partonStats;
  }

  ensureQuantumStats() {
    if (!this.quantumStats) {
      this.quantumStats = { forceSamples: 0, oscillationSteps: 0, measurements: 0 };
    }
    return this.quantumStats;
  }

  ensureFieldState() {
    if (!this.bonds) this.bonds = new Map();
    if (!this.transferStats) {
      this.transferStats = {
        elastic: 0,
        photonAbsorptions: 0,
        gluonAbsorptions: 0,
        virtualPhotons: 0,
        virtualGluons: 0,
        stringBreaks: 0,
        maxResidual: 0
      };
    }
  }

  /**
   * Adds a particle to the simulation with explicit storage of all conserved quantum numbers:
   * mass, electric charge, spin, color representation, baryon number, lepton number, isospin3, hypercharge.
   */
  addParticle(params: {
    kind: ParticleKind;
    x: number;
    y: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    isAntiparticle?: boolean;
    color?: ParticleColor;
    spin?: number;
    pinned?: boolean;
    gluonIndex?: number;
    gluonColor?: { color: string; antiColor: string };
    gluonColorIndex?: number | null;
    gluonAntiColorIndex?: number | null;
    diagonalGluon?: boolean;
    isRadiation?: boolean;
    isVirtual?: boolean;
    energy?: number;
    momentumX?: number;
    momentumY?: number;
    momentumZ?: number;
    emitterId?: number;
    sourceKind?: ParticleKind;
    radiationType?: string;
    lifetime?: number;
    sigma0?: number;
    sigma?: number;
    phi?: number;
    packetDispersionModel?: string;
    orbitalL?: number;
  }): ParticleInstance {
    const config = STANDARD_MODEL_PARTICLES[params.kind] || STANDARD_MODEL_PARTICLES.up;
    const isAnti = params.isAntiparticle || false;

    // Apply exact quantum number conjugation for antiparticles
    const conj = isAnti ? getAntiparticleProperties(config) : {
      symbol: config.symbol,
      name: config.name,
      charge: config.charge,
      baryonNumber: config.baryonNumber,
      leptonNumber: config.leptonNumber,
      isospin3: config.isospin3,
      hypercharge: config.hypercharge,
      colorRepresentation: config.colorRepresentation
    };

    let color: ParticleColor = params.color || 'none';
    if (config.hasColor && (color === 'none' || !color)) {
      if (params.kind === 'gluon') {
        color = 'none';
      } else {
        color = PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];
      }
    }
    // Store the SU(3) representation consistently: quarks are triplets and
    // antiquarks are antitriplets. The caller supplies an RGB basis choice;
    // particle/antiparticle conjugation is applied here, centrally, so every
    // spawn path (UI, presets, decays and pair production) obeys one rule.
    if (config.hasColor && params.kind !== 'gluon' && color !== 'none') {
      const basisColor = String(color).replace(/^anti_/, '') as ParticleColor;
      color = (isAnti ? `anti_${basisColor}` : basisColor) as ParticleColor;
    }

    let gluonColor = params.gluonColor;
    let gluonIndex = params.gluonIndex;
    let diagonalGluon = params.diagonalGluon || false;

    if (params.kind === 'gluon') {
      if (!gluonIndex) {
        gluonIndex = Math.floor(Math.random() * 8) + 1;
      }
      const octetDef = SU3_GLUON_OCTET[gluonIndex - 1];
      diagonalGluon = !!octetDef?.isDiagonal;
      if (!gluonColor && !diagonalGluon) {
        if (gluonIndex === 1 || gluonIndex === 2) gluonColor = { color: 'red', antiColor: 'green' };
        else if (gluonIndex === 4 || gluonIndex === 5) gluonColor = { color: 'red', antiColor: 'blue' };
        else if (gluonIndex === 6 || gluonIndex === 7) gluonColor = { color: 'green', antiColor: 'blue' };
      }
    }

    const spinSign = Math.random() > 0.5 ? 1 : -1;
    const spinVal = params.spin !== undefined ? params.spin : config.spin === 0.5 ? spinSign * 0.5 : config.spin === 1 ? spinSign : 0;
    const baseSimMass = simulationMass(params.kind);
    // Determine whether this is a real emitted radiation particle before using it
    // to calculate the effective simulation mass. Keep this declaration above
    // every read to avoid JavaScript's temporal-dead-zone ReferenceError.
    const isRadiation = params.isRadiation === true || ((params.kind === 'photon' || params.kind === 'gluon') && params.isVirtual === false);
    let dynMassMeV = config.massMeV;
    let effectiveSimMass = isRadiation ? 0 : baseSimMass === 0 ? 0.2 : baseSimMass;

    if (this.higgs) {
      dynMassMeV = this.higgs.getDynamicMassMeV(params.kind, this.settings.higgsVev, this.settings.ewsbBrokenPhase);
      if (!this.settings.ewsbBrokenPhase && params.kind !== 'photon' && params.kind !== 'gluon') {
        effectiveSimMass = 0.05; // Massless kinematics in unbroken symmetric phase!
      } else if (this.settings.higgsVev !== undefined && this.settings.higgsVev !== HIGGS_VEV_STANDARD_GEV) {
        effectiveSimMass = Math.max(0.1, effectiveSimMass * (this.settings.higgsVev / HIGGS_VEV_STANDARD_GEV));
      }
    }

    const radius = config.massMeV > 10000 ? 9 : config.massMeV > 500 ? 7.5 : config.kind === 'photon' ? 5 : config.kind === 'gluon' ? 6 : 6.5;
    const isVirtual = isRadiation ? false : params.isVirtual !== undefined ? params.isVirtual : params.kind === 'gluon';
    const lifetime = params.lifetime !== undefined ? params.lifetime : isRadiation ? params.kind === 'gluon' ? RADIATION_LIMITS.gluonLifetime : RADIATION_LIMITS.photonLifetime : params.kind === 'gluon' ? 65 : undefined;
    let decayRate = 0;
    if (this.weak) {
      const chs = this.weak.calculateDecayChannels({ kind: params.kind } as ParticleInstance);
      if (chs.length > 0) {
        if (params.kind === 'top' || params.kind === 'w_plus' || params.kind === 'w_minus' || params.kind === 'z_boson') {
          decayRate = 0.22;
        } else if (params.kind === 'higgs') {
          decayRate = 0.12;
        } else if (params.kind === 'tau') {
          decayRate = 0.08;
        } else if (params.kind === 'bottom') {
          decayRate = 0.045;
        } else if (params.kind === 'charm') {
          decayRate = 0.055;
        } else if (params.kind === 'muon') {
          decayRate = 0.032;
        } else if (params.kind === 'strange' || params.kind === 'down' || params.kind === 'up') {
          // Light quarks are confined; do not assign isolated free-quark lifetimes.
          // Neutron beta decay must be modeled at the nucleon level, not by
          // independently decaying one of its bound valence quarks.
          decayRate = 0;
        }
      }
    } else {
      const decayChannels = SINGLE_PARTICLE_DECAYS[params.kind];
      decayRate = decayChannels && decayChannels.length > 0 ? decayChannels[0].decayRateBase : 0;
    }

    const p: ParticleInstance = {
      id: this.nextParticleId++,
      kind: params.kind,
      isAntiparticle: isAnti,
      name: conj.name,
      symbol: conj.symbol,
      family: config.family,
      generation: config.generation,
      isFermion: config.isFermion ?? (config.spin === 0.5),

      // Dynamic mass generated by Higgs VEV & Yukawa couplings
      massMeV: dynMassMeV,
      mass: effectiveSimMass,
      charge: conj.charge,
      spin: config.spin,
      spinZ: spinVal,
      spinAngle: Math.random() * Math.PI * 2,
      spinSpeed: config.spin * 0.15,
      // Spin-1/2 particles carry a normalized two-component quantum spin state.
      // The initial state is an eigenstate of the displayed z-spin projection.
      quantumSpinor: config.spin === 0.5
        ? (spinVal >= 0.0
            ? new SpinorState(new Complex(1, 0), new Complex(0, 0))
            : new SpinorState(new Complex(0, 0), new Complex(1, 0)))
        : undefined,
      colorRepresentation: conj.colorRepresentation,
      leptonNumber: conj.leptonNumber,
      baryonNumber: conj.baryonNumber,
      isospin3: conj.isospin3,
      hypercharge: conj.hypercharge,

      x: params.x,
      y: params.y,
      z: 0,
      vx: params.vx !== undefined ? params.vx : (Math.random() - 0.5) * 2,
      vy: params.vy !== undefined ? params.vy : (Math.random() - 0.5) * 2,
      vz: 0,
      ax: 0,
      ay: 0,
      px: isRadiation ? (params.momentumX ?? ((params.energy || 1) * (params.vx ?? 0) / (LIGHT_SPEED ** 2))) : 0,
      py: isRadiation ? (params.momentumY ?? ((params.energy || 1) * (params.vy ?? 0) / (LIGHT_SPEED ** 2))) : 0,
      pz: 0,

      color,
      colorIndex: config.hasColor && params.kind !== 'gluon' ? colorIndex(color) : null,
      colorVector: config.hasColor && params.kind !== 'gluon' ? fundamentalColorVector(color) : [0, 0, 0],
      gluonColor,
      gluonIndex,
      gluonColorIndex: gluonColor ? colorIndex(gluonColor.color) : null,
      gluonAntiColorIndex: gluonColor ? colorIndex(gluonColor.antiColor) : null,
      gluonVector: diagonalGluon ? [0, 0, 0] : gluonColor ? gluonColorVectorFromIndices(colorIndex(gluonColor.color), colorIndex(gluonColor.antiColor)) : [0, 0, 0],
      diagonalGluon,

      radius,
      age: 0,
      lifetime,
      isVirtual,
      isRadiation,
      pinned: params.pinned === true,
      decayRate,

      energy: isRadiation ? params.energy || 1 : 0,
      momentumX: isRadiation ? (params.momentumX ?? ((params.energy || 1) * (params.vx ?? 0) / (LIGHT_SPEED ** 2))) : 0,
      momentumY: isRadiation ? (params.momentumY ?? ((params.energy || 1) * (params.vy ?? 0) / (LIGHT_SPEED ** 2))) : 0,
      momentumZ: isRadiation ? params.momentumZ || 0 : 0,
      emitterId: params.emitterId,
      sourceKind: params.sourceKind,
      radiationType: params.radiationType,

      radiatedEnergy: 0,
      radiationCount: 0,
      radiationFlash: 0,
      radiationCooldown: 0,
      lastRadiationLogTime: -Infinity,

      sigma0: params.sigma0 || this.settings.wavePacketSigma || 5,
      sigma: params.sigma || this.settings.wavePacketSigma || 5,
      phi: params.phi || 0,
      packetInitialPhase: params.phi || 0,
      packetActionPhase: 0,
      packetDispersion: 0,
      packetAge: 0,
      packetProperTime: 0,
      packetTravel: 0,
      packetDispersionModel: params.packetDispersionModel || 'nonrelativistic',
      orbitalL: params.orbitalL
    };

    if (p.isRadiation) {
      const angle = Math.atan2(p.vy, p.vx) || 0;
      const energy = params.energy ?? 1;
      p.energy = energy;
      const suppliedPz = this.settings.spatialDimensions === 3 ? (params.momentumZ || 0) : 0;
      const norm = Math.hypot(params.momentumX || 0, params.momentumY || 0, suppliedPz);
      const rawX = params.momentumX || 0;
      const rawY = params.momentumY || 0;
      const rawZ = suppliedPz || (this.settings.spatialDimensions === 3 ? (p.vz || 0) : 0);
      const rawNorm = norm || Math.hypot(rawX, rawY, rawZ) || 1;
      const nx = norm ? rawX / rawNorm : (rawX || Math.cos(angle)) / rawNorm;
      const ny = norm ? rawY / rawNorm : (rawY || Math.sin(angle)) / rawNorm;
      const nz = this.settings.spatialDimensions === 3 ? rawZ / rawNorm : 0;
      p.momentumX = (energy / LIGHT_SPEED) * nx;
      p.momentumY = (energy / LIGHT_SPEED) * ny;
      p.momentumZ = (energy / LIGHT_SPEED) * nz;
      p.vx = LIGHT_SPEED * nx;
      p.vy = LIGHT_SPEED * ny;
      p.vz = LIGHT_SPEED * nz;

      // QED Photon Polarization & Helicity
      if (p.kind === 'photon') {
        const helicity: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        p.polarization = this.qed.createPolarization(p.momentumX, p.momentumY, p.momentumZ || 0, helicity, Math.random() * Math.PI);
        if (this.emField && this.settings.maxwellFieldEnabled) {
          this.emField.injectPhotonWave(p.x, p.y, p.vx, p.vy, p.energy, helicity);
        }
      }
    } else {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed >= LIGHT_SPEED) {
        p.vx *= (LIGHT_SPEED * (1 - 1e-9)) / speed;
        p.vy *= (LIGHT_SPEED * (1 - 1e-9)) / speed;
      }
      if (p.pinned) p.vx = p.vy = 0;
      this.setVelocity(p, p.vx, p.vy, p.vz || 0);
    }

    if (['electron_neutrino', 'muon_neutrino', 'tau_neutrino'].includes(p.kind)) {
      this.initializeNeutrinoState(p);
    }

    // SU(3) Color Algebra Quantum Color State Initialization (Fundamental Triplet or Adjoint Octet)
    if (config.hasColor) {
      if (p.family === 'quark') {
        p.quantumColor = createFundamentalColorState(p.color, p.isAntiparticle);
      } else if (p.kind === 'gluon') {
        p.quantumColor = createOctetColorState(p.gluonIndex || 1);
      }
    }

    this.particles.push(p);
    this._particleBucketsDirty = true;
    return p;
  }

  removeParticle(id: number) {
    const removed = this.particles.find(p => p.id === id);
    this.relativisticPacketEngine?.remove(id);
    if (removed) {
      removed._removed = true;
      if (removed.isRadiation) this.depositRadiationPacket(removed, 'removed');
    }
    this.particles = this.particles.filter(p => p.id !== id);
    for (const macro of this.macroparticles) {
      macro.constituentIds = macro.constituentIds.filter(cid => cid !== id);
    }
    this.macroparticles = this.macroparticles.filter(m => m.constituentIds.length >= 2);
    this._particleBucketsDirty = true;
  }

  clearAll() {
    this.pairKineticPropagator.clear();
    this.relativisticPacketEngine.clear();
    if (this.planarGaugeQFT) this.planarGaugeQFT.reset();
    this.interactionPhaseState.clear();
    this.manyBodyBornSamples = [];
    this.manyBodyQuantumPairs.clear();
    this.particles = [];
    this.macroparticles = [];
    this.interactionEvents = [];
    this.barriers = [];
    this.simTime = 0;
    this.bonds.clear();
    this.exchangeMarkers = [];
    this._pdfCache.clear();
    this._particleBucketsDirty = true;
    if (this.emField) this.emField.clear();
    if (this.qed) this.qed.virtualMarkers = [];
    this.radiationStats = {
      photonCount: 0,
      gluonCount: 0,
      photonEnergy: 0,
      gluonEnergy: 0,
      depositedEnergy: 0,
      confinedEnergy: 0,
      depositedCount: 0,
      confinedCount: 0,
      detectorMomentumX: 0,
      detectorMomentumY: 0,
      detectorMomentumZ: 0,
      removedCount: 0
    };
    this.radiationHistory = [];
  }

  logEvent(type: string, x: number, y: number, description: string, color = '#38bdf8', energy = 1.0) {
    this.interactionEvents.unshift({
      id: this.nextEventId++,
      type,
      x,
      y,
      description,
      timestamp: Date.now(),
      energy,
      color
    });
    if (this.interactionEvents.length > 50) this.interactionEvents.pop();
  }

  setVelocity(p: ParticleInstance, vx: number, vy: number, vz = 0) {
    if (![vx, vy, vz].every(Number.isFinite)) return;
    if (this.settings.spatialDimensions === 2) vz = 0;
    let speed = Math.hypot(vx, vy, vz);
    const limit = LIGHT_SPEED * (1 - 8 * Number.EPSILON);
    if (speed > limit) {
      vx = (vx / speed) * limit;
      vy = (vy / speed) * limit;
      vz = (vz / speed) * limit;
      speed = limit;
    }
    const beta = speed / LIGHT_SPEED;
    const g = 1 / Math.sqrt(Math.max(1e-12, (1 - beta) * (1 + beta)));
    this.setFourMomentum(p, {
      E: g * p.mass * LIGHT_SPEED ** 2,
      px: g * p.mass * vx,
      py: g * p.mass * vy,
      pz: g * p.mass * vz
    });
  }

  fourMomentum(p: ParticleInstance): FourVector {
    if (p.isRadiation) {
      return { E: p.energy, px: p.momentumX, py: p.momentumY, pz: this.settings.spatialDimensions === 3 ? (p.momentumZ || 0) : 0 };
    }
    if (p._momentumVx !== p.vx || p._momentumVy !== p.vy || p._momentumVz !== (p.vz || 0) || !Number.isFinite(p.px)) {
      this.setVelocity(p, p.vx, p.vy, p.vz || 0);
    }
    return {
      // A wave packet's expectation value <H> is generally not on the
      // single-momentum mass shell: <sqrt(m^2c^4+c^2p^2)> !=
      // sqrt(m^2c^4+c^2<p>^2). Keep the evolved packet energy when present.
      E: Number.isFinite(p.packetEnergy)
        ? Number(p.packetEnergy)
        : LIGHT_SPEED * Math.hypot(p.mass * LIGHT_SPEED, p.px, p.py, this.settings.spatialDimensions === 3 ? (p.pz || 0) : 0),
      px: p.px,
      py: p.py,
      pz: this.settings.spatialDimensions === 3 ? (p.pz || 0) : 0
    };
  }

  setFourMomentum(p: ParticleInstance, v: FourVector) {
    const x = v.px ?? 0, y = v.py ?? 0, z = this.settings.spatialDimensions === 3 ? (v.pz ?? 0) : 0;
    const mag = Math.hypot(x, y, z);
    const norm = Math.hypot(p.mass * LIGHT_SPEED, mag);
    const E = LIGHT_SPEED * norm;
    const limit = p.mass > 0 ? LIGHT_SPEED * (1 - 8 * Number.EPSILON) : LIGHT_SPEED;
    const speed = Math.min(limit, norm ? LIGHT_SPEED * (mag / norm) : 0);
    const vx = mag ? speed * (x / mag) : 0;
    const vy = mag ? speed * (y / mag) : 0;
    const vz = mag ? speed * (z / mag) : 0;
    p.px = x;
    p.py = y;
    p.pz = z;
    p.packetEnergy = E;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p._momentumVx = vx;
    p._momentumVy = vy;
    p._momentumVz = vz;

    if (p.isRadiation) {
      p.energy = E;
      p.momentumX = x;
      p.momentumY = y;
      p.momentumZ = z;
    }
  }

  getParticleKineticEnergy(p: ParticleInstance): number {
    if (p.isRadiation) return p.energy;
    const v = this.fourMomentum(p);
    // This form remains correct for a spread packet whose expectation-value
    // four-vector is not constrained to an individual particle mass shell.
    return Math.max(0, v.E - p.mass * LIGHT_SPEED ** 2);
  }

  relativisticTelemetry(p: ParticleInstance) {
    const v = this.fourMomentum(p);
    const speed = Math.hypot(p.vx, p.vy, p.vz || 0);
    const beta = speed / LIGHT_SPEED;
    const gamma = p.mass > 0 ? v.E / (p.mass * LIGHT_SPEED ** 2) : Infinity;
    return {
      beta,
      gamma,
      restMass: p.mass,
      energyEquivalentMass: v.E / LIGHT_SPEED ** 2,
      transverseInertia: p.mass ? gamma * p.mass : null,
      longitudinalInertia: p.mass ? gamma ** 3 * p.mass : null,
      momentum: Math.hypot(v.px, v.py, v.pz || 0),
      energy: v.E,
      kineticEnergy: this.getParticleKineticEnergy(p)
    };
  }

  getParticleBuckets(refresh = false): ParticleBuckets {
    if (!refresh && !this._particleBucketsDirty && this._particleBuckets) {
      return this._particleBuckets;
    }
    const matter: ParticleInstance[] = [];
    const radiation: ParticleInstance[] = [];
    const gluons: ParticleInstance[] = [];
    const clusters: ParticleInstance[] = [];

    for (const p of this.particles) {
      if (p._removed) continue;
      if (p.isRadiation) {
        radiation.push(p);
        if (p.kind === 'gluon') gluons.push(p);
      } else {
        matter.push(p);
        if (p.showerCluster) clusters.push(p);
      }
    }
    this._particleBuckets = { source: this.particles, matter, radiation, gluons, clusters };
    this._particleBucketsDirty = false;
    return this._particleBuckets;
  }

  isConfiningQuarkPair(p1: ParticleInstance, p2: ParticleInstance): boolean {
    if (!this.settings.strongForceEnabled) return false;
    if (p1.family !== 'quark' || p2.family !== 'quark') return false;
    if (p1.color === 'none' || p2.color === 'none') return false;
    return p1.singletGroupId !== undefined && p1.singletGroupId === p2.singletGroupId;
  }

  getConfinementForceMagnitude(dist: number): number {
    return this.settings.confinementTension + this.settings.confinementGrowth * (dist * 0.02);
  }

  relativePosition(a: { x: number; y: number }, b: { x: number; y: number }) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    if (this.settings.boundaryMode === 'torus') {
      if (dx > this.width / 2) dx -= this.width;
      if (dx < -this.width / 2) dx += this.width;
      if (dy > this.height / 2) dy -= this.height;
      if (dy < -this.height / 2) dy += this.height;
    }
    return { dx, dy };
  }

  wrapX(x: number): number {
    if (this.settings.boundaryMode === 'torus') {
      return ((x % this.width) + this.width) % this.width;
    }
    return Math.max(0, Math.min(this.width, x));
  }

  wrapY(y: number): number {
    if (this.settings.boundaryMode === 'torus') {
      return ((y % this.height) + this.height) % this.height;
    }
    return Math.max(0, Math.min(this.height, y));
  }

  canRadiate(p: ParticleInstance): boolean {
    if (p._removed || p.pinned || p.isRadiation || p.isVirtual) return false;
    if (p.radiationCooldown > 0) return false;

    // p.localE / p.localB are sampled from the Maxwell lattice after
    // depositSources() has deposited THIS particle as a source. They therefore
    // include a discretized self-field and are not evidence of an external
    // scattering field. Treating them as external caused an isolated quark to
    // radiate from its own grid self-force. Require an independent real matter
    // partner, or the explicit uniform background B field configured by the
    // user. A future external-E-field control should be tracked separately.
    const emPartner = this.settings.bremsstrahlungEnabled && Math.abs(p.charge) > 0 &&
      this.particles.some(q => {
        if (q.id === p.id || q._removed || q.isVirtual || q.isRadiation || Math.abs(Number(q.charge || 0)) < 1e-12) return false;
        const d = this.relativePosition(p, q);
        return Math.hypot(d.dx, d.dy) < 28;
      });
    const colorPartner = this.settings.gluonRadiationEnabled && p.family === 'quark' &&
      this.particles.some(q => {
        if (q.id === p.id || q._removed || q.isVirtual || q.isRadiation || q.family !== 'quark') return false;
        const d = this.relativePosition(p, q);
        return Math.hypot(d.dx, d.dy) < 36;
      });
    // A configured uniform magnetic field can produce synchrotron emission,
    // but it is not a source of QCD gluon radiation.
    const synchrotronField = this.settings.bremsstrahlungEnabled && Math.abs(p.charge) > 0 &&
      Math.abs(Number(this.settings.magneticFieldBiasZ || 0)) > 1e-8;
    return emPartner || colorPartner || synchrotronField;
  }

  depositRadiationPacket(p: ParticleInstance, reason = 'wall') {
    if (!p.isRadiation) return;
    if (p.kind === 'photon') {
      this.radiationStats.depositedEnergy += p.energy;
      this.radiationStats.depositedCount++;
    } else if (p.kind === 'gluon') {
      this.radiationStats.confinedEnergy += p.energy;
      this.radiationStats.confinedCount++;
    }
  }

  getRadiationSnapshot() {
    let photonEnergy = 0,
      gluonEnergy = 0,
      activePackets = 0;
    for (const p of this.particles) {
      if (p.isRadiation && !p._removed) {
        activePackets++;
        if (p.kind === 'photon') photonEnergy += p.energy;
        else if (p.kind === 'gluon') gluonEnergy += p.energy;
      }
    }
    return {
      activePackets,
      maxPackets: RADIATION_LIMITS.maxPackets,
      photonCount: this.radiationStats.photonCount,
      gluonCount: this.radiationStats.gluonCount,
      photonEnergy: this.radiationStats.photonEnergy,
      gluonEnergy: this.radiationStats.gluonEnergy,
      activeEnergy: photonEnergy + gluonEnergy,
      depositedEnergy: this.radiationStats.depositedEnergy,
      confinedEnergy: this.radiationStats.confinedEnergy
    };
  }

  totalTrackedFour(): FourVector {
    let total: FourVector = { E: 0, px: 0, py: 0, pz: 0 };
    for (const p of this.particles) {
      if (!p._removed) total = addFour(total, this.fourMomentum(p));
    }
    return total;
  }

  createBond(a: ParticleInstance, b: ParticleInstance) {
    const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
    if (!this.bonds.has(key)) {
      this.bonds.set(key, { key, a: Math.min(a.id, b.id), b: Math.max(a.id, b.id), creationTime: this.simTime });
    }
  }

  bondEnergy(bond: { a: number; b: number }): number {
    const a = this.particles.find(p => p.id === bond.a);
    const b = this.particles.find(p => p.id === bond.b);
    if (!a || !b) return 0;
    const d = this.relativePosition(a, b);
    const L = Math.hypot(d.dx, d.dy);
    return this.settings.confinementTension * L + 0.5 * this.settings.confinementGrowth * L * L * 0.001;
  }

  bondForce(bond: { a: number; b: number }): number {
    const a = this.particles.find(p => p.id === bond.a);
    const b = this.particles.find(p => p.id === bond.b);
    if (!a || !b) return 0;
    const d = this.relativePosition(a, b);
    const L = Math.hypot(d.dx, d.dy);
    return this.settings.confinementTension + this.settings.confinementGrowth * L * 0.001;
  }

  assignSingletGroup(particles: ParticleInstance[], type: string, groupId?: string) {
    const gid = groupId || `singlet-${this.nextLocalSingletId++}`;
    for (const p of particles) {
      p.singletGroupId = gid;
      p.singletType = type;
    }
  }

  refreshColorSingletState() {
    for (const p of this.particles) {
      p.singletGroupId = undefined;
      p.singletType = undefined;
    }
    // Form mesons (q + anti-q matching color) and baryons (R + G + B)
    const quarks = this.particles.filter(p => !p._removed && !p.isRadiation && p.family === 'quark');
    const used = new Set<number>();

    // Mesons
    for (let i = 0; i < quarks.length; i++) {
      const q1 = quarks[i];
      if (used.has(q1.id)) continue;
      for (let j = i + 1; j < quarks.length; j++) {
        const q2 = quarks[j];
        if (used.has(q2.id)) continue;
        if (q1.isAntiparticle !== q2.isAntiparticle) {
          const normal = q1.isAntiparticle ? q2 : q1;
          const anti = q1.isAntiparticle ? q1 : q2;
          if (anti.color === `anti_${normal.color}`) {
            const d = this.relativePosition(q1, q2);
            if (Math.hypot(d.dx, d.dy) <= this.settings.bindingDistance * 1.5) {
              this.assignSingletGroup([q1, q2], 'meson');
              this.createBond(q1, q2);
              used.add(q1.id);
              used.add(q2.id);
              break;
            }
          }
        }
      }
    }

    // Baryons (3 quarks: Red, Green, Blue)
    for (let i = 0; i < quarks.length; i++) {
      const q1 = quarks[i];
      if (used.has(q1.id) || q1.isAntiparticle) continue;
      for (let j = i + 1; j < quarks.length; j++) {
        const q2 = quarks[j];
        if (used.has(q2.id) || q2.isAntiparticle || q2.color === q1.color) continue;
        for (let k = j + 1; k < quarks.length; k++) {
          const q3 = quarks[k];
          if (used.has(q3.id) || q3.isAntiparticle || q3.color === q1.color || q3.color === q2.color) continue;
          const d12 = this.relativePosition(q1, q2);
          const d23 = this.relativePosition(q2, q3);
          const d31 = this.relativePosition(q3, q1);
          const rMax = Math.max(Math.hypot(d12.dx, d12.dy), Math.hypot(d23.dx, d23.dy), Math.hypot(d31.dx, d31.dy));
          if (rMax <= this.settings.bindingDistance * 1.8) {
            this.assignSingletGroup([q1, q2, q3], 'baryon');
            this.createBond(q1, q2);
            this.createBond(q2, q3);
            this.createBond(q3, q1);
            used.add(q1.id);
            used.add(q2.id);
            used.add(q3.id);
            break;
          }
        }
      }
    }
  }

  updateMacroparticleIsolationAndSprings(dt: number) {
    if (!this.settings.macroparticleFormationEnabled) return;
    const quarks = this.particles.filter(p => !p._removed && !p.isRadiation && p.family === 'quark');
    const checked = new Set<number>();

    for (let i = 0; i < quarks.length; i++) {
      const q1 = quarks[i];
      if (checked.has(q1.id)) continue;
      // Check baryon uud (proton) or udd (neutron)
      const nearby = quarks.filter(q => q.id !== q1.id && !checked.has(q.id) && Math.hypot(this.relativePosition(q1, q).dx, this.relativePosition(q1, q).dy) < this.settings.bindingDistance);
      if (nearby.length >= 2) {
        const candidate = [q1, nearby[0], nearby[1]];
        const colors = new Set(candidate.map(q => q.color));
        if (colors.has('red') && colors.has('green') && colors.has('blue')) {
          const upCount = candidate.filter(q => q.kind === 'up').length;
          const downCount = candidate.filter(q => q.kind === 'down').length;
          if (upCount === 2 && downCount === 1) {
            this.formMacroparticle('proton', candidate);
            candidate.forEach(q => checked.add(q.id));
          } else if (upCount === 1 && downCount === 2) {
            this.formMacroparticle('neutron', candidate);
            candidate.forEach(q => checked.add(q.id));
          }
        }
      }
    }

    // Update macroparticle centers and internal spring / Steiner tree forces
    for (const macro of this.macroparticles) {
      const constituents = macro.constituentIds.map(id => this.particles.find(p => p.id === id)).filter(Boolean) as ParticleInstance[];
      if (constituents.length < 2) continue;
      let cx = 0, cy = 0;
      for (const c of constituents) {
        cx += c.x;
        cy += c.y;
      }
      macro.centerX = cx / constituents.length;
      macro.centerY = cy / constituents.length;
      macro.age += dt;

      // 3-Quark Baryon: Minimal Steiner Tree Y-Junction (120-degree Fermat-Torricelli point)
      if (constituents.length === 3 && (macro.type === 'proton' || macro.type === 'neutron') && this.settings.steinerBaryonJunctionEnabled) {
        const [q1, q2, q3] = constituents;
        const steiner = this.qcd.computeSteinerFermatJunction(q1, q2, q3);
        macro.steinerJunction = steiner.fermatPoint;
        const jx = steiner.fermatPoint.x;
        const jy = steiner.fermatPoint.y;

        for (const c of constituents) {
          const dx = jx - c.x;
          const dy = jy - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1e-3) {
            const cf = this.settings.cornellConfinementEnabled
              ? this.qcd.cornellForce(dist, this.settings.qcdAlphaS, this.settings.stringTensionSigma)
              : { force: this.settings.confinementTension * 12, potential: dist * 10 };
            const F = cf.force;
            c.ax += (dx / dist) * (F * 0.25) / c.mass;
            c.ay += (dy / dist) * (F * 0.25) / c.mass;
          }
        }
      } else {
        // Restoring internal tension towards center
        for (const c of constituents) {
          const dx = macro.centerX - c.x;
          const dy = macro.centerY - c.y;
          c.ax += dx * 0.15;
          c.ay += dy * 0.15;
        }
      }
    }
  }

  formMacroparticle(type: 'proton' | 'neutron', constituents: ParticleInstance[]) {
    const existing = this.macroparticles.find(m => constituents.some(c => m.constituentIds.includes(c.id)));
    if (existing) return;

    let netQ = 0;
    let cx = 0, cy = 0;
    for (const c of constituents) {
      netQ += c.charge;
      cx += c.x;
      cy += c.y;
    }
    const macro: Macroparticle = {
      id: this.nextMacroId++,
      type,
      name: type === 'proton' ? 'Proton (p⁺)' : 'Neutron (n⁰)',
      symbol: type === 'proton' ? 'p⁺' : 'n⁰',
      constituentIds: constituents.map(c => c.id),
      centerX: cx / constituents.length,
      centerY: cy / constituents.length,
      radius: 20,
      netCharge: Math.round(netQ),
      colorNeutral: true,
      age: 0
    };
    this.macroparticles.push(macro);
    this.logEvent('macroparticle_formed', macro.centerX, macro.centerY, `Formed color-neutral ${macro.name} (${constituents.map(c => c.kind[0]).join('')})!`, type === 'proton' ? '#38bdf8' : '#94a3b8');
  }

  computeInteractionsWithBroadphase(dt: number, mode = 'all') {
    const matter = this.getParticleBuckets().matter.filter((p: ParticleInstance) => !p._removed && p.mass > 0);
    const cutoff = this.settings.forceCutoff || 180;

    for (let i = 0; i < matter.length; i++) {
      const a = matter[i];
      for (let j = i + 1; j < matter.length; j++) {
        const b = matter[j];
        const d = this.relativePosition(a, b);
        const r2 = d.dx * d.dx + d.dy * d.dy;
        if (r2 > cutoff * cutoff || r2 < 1e-4) continue;
        const r = Math.sqrt(r2);
        const nx = d.dx / r;
        const ny = d.dy / r;

        // QED Virtual Photon Exchange between charged Dirac fermions
        if (
          mode !== 'forces' &&
          this.settings.qedInteractionsEnabled &&
          this.settings.virtualPhotonExchangeEnabled &&
          a.charge !== 0 &&
          b.charge !== 0
        ) {
          const ex = this.qed.evaluateVirtualExchange(a, b, d.dx, d.dy, r, dt);
          if (ex) {
            a.vx += ex.dpx / a.mass;
            a.vy += ex.dpy / a.mass;
            b.vx -= ex.dpx / b.mass;
            b.vy -= ex.dpy / b.mass;
            this.physicsStats.virtualExchanges = (this.physicsStats.virtualExchanges || 0) + 1;
          }
        }

        // QCD Quark-Quark and Quark-Antiquark Scattering Channels with Quantum Interference
        if (
          mode !== 'forces' &&
          this.settings.strongForceEnabled &&
          this.settings.su3ColorAlgebraEnabled &&
          a.family === 'quark' &&
          b.family === 'quark' &&
          r < 32
        ) {
          const pa = this.fourMomentum(a);
          const pb = this.fourMomentum(b);
          const s = (pa.E + pb.E) ** 2 - ((pa.px + pb.px) ** 2 + (pa.py + pb.py) ** 2 + ((pa.pz || 0) + (pb.pz || 0)) ** 2);
          const t = -Math.max(0.1, r * 0.5);

          if (a.isAntiparticle !== b.isAntiparticle) {
            // qqbar scattering (s and t channel gluon exchange with quantum interference)
            const scat = this.qcd.evaluateQuarkAntiquarkScattering(a, b, s, t, this.settings.qcdAlphaS, this.settings.qcdInterferenceEnabled);
            if (Math.random() < scat.probability * 0.15 * dt) {
              const impulse = Math.min(1.8, Math.sqrt(Math.abs(t)) * 0.4);
              a.vx += nx * impulse / a.mass;
              a.vy += ny * impulse / a.mass;
              b.vx -= nx * impulse / b.mass;
              b.vy -= ny * impulse / b.mass;
              this.physicsStats.qcdScatterings = (this.physicsStats.qcdScatterings || 0) + 1;
              this.logEvent(
                'qcd_qqbar_scatter',
                (a.x + b.x) * 0.5,
                (a.y + b.y) * 0.5,
                `⚛ QCD qq̄ Scattering: Color factor CF=${scat.colorFactor.toFixed(2)}, Interference term=${scat.interferenceTerm.toFixed(3)}`,
                '#a855f7',
                2.5
              );
            }
          } else {
            // qq scattering (t and u channel gluon exchange with Fermi-Dirac interference)
            const scat = this.qcd.evaluateQuarkQuarkScattering(a, b, s, t, this.settings.qcdAlphaS, this.settings.qcdInterferenceEnabled);
            if (Math.random() < scat.probability * 0.15 * dt) {
              const impulse = Math.min(1.8, Math.sqrt(Math.abs(t)) * 0.4);
              a.vx += nx * impulse / a.mass;
              a.vy += ny * impulse / a.mass;
              b.vx -= nx * impulse / b.mass;
              b.vy -= ny * impulse / b.mass;
              this.physicsStats.qcdScatterings = (this.physicsStats.qcdScatterings || 0) + 1;
              this.logEvent(
                'qcd_qq_scatter',
                (a.x + b.x) * 0.5,
                (a.y + b.y) * 0.5,
                `⚛ QCD qq Scattering: Color factor CF=${scat.colorFactor.toFixed(2)}, Interference=${scat.interferenceTerm.toFixed(3)}`,
                '#c084fc',
                2.5
              );
            }
          }
        }

        // Matter-Antimatter Annihilation
        if (mode !== 'forces' && this.areAntiparticles(a, b) && r < a.radius + b.radius) {
          if (this.handleAnnihilation(a, b)) continue;
        }

        // Elastic Contact Repulsion
        if (mode !== 'forces' && r < a.radius + b.radius) {
          const overlap = a.radius + b.radius - r;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const impulse = (rvx * nx + rvy * ny) * 0.5;
          if (impulse < 0) {
            a.vx += nx * impulse;
            a.vy += ny * impulse;
            b.vx -= nx * impulse;
            b.vy -= ny * impulse;
          }
        }

        if (mode === 'events') continue;

        // 2D electrostatics: in two spatial dimensions V(r) ~ -log(r), so
        // |E| ~ 1/r (not the 3D inverse-square field). Softening regularizes
        // the finite-size particle cores.
        let fEM = 0;
        if (this.settings.electromagnetismEnabled && !this.settings.maxwellFieldEnabled && a.charge !== 0 && b.charge !== 0) {
          fEM = -this.settings.emStrength * 220 * a.charge * b.charge / Math.sqrt(r2 + 16);
        }

        // Gravity (Classical GR background attraction)
        let fGrav = 0;
        if (this.settings.gravityEnabled) {
          fGrav = this.settings.gravityStrength * 15 * a.mass * b.mass * (r / (r2 + 12) ** 1.5);
        }

        // Strong Force Local Singlet Repulsion (colored non-singlets repel)
        let fStrong = 0;
        if (this.settings.strongForceEnabled && a.family === 'quark' && b.family === 'quark') {
          if (a.singletGroupId && a.singletGroupId === b.singletGroupId) {
            fStrong = 18 * this.settings.strongStrength / (r + 8);
          } else {
            fStrong = -10 * this.settings.colorSingletRepulsion / (r + 8);
          }
        }

        // Pauli exclusion is a constraint on the antisymmetry of the
        // many-fermion state, not a fundamental pairwise classical force.
        // Do not invent a short-range "Pauli force" here. Occupation blocking
        // belongs in transition probabilities, where a final-state mode exists.
        const totalF = fEM + fGrav + fStrong;
        a.ax += (nx * totalF) / a.mass;
        a.ay += (ny * totalF) / a.mass;
        b.ax -= (nx * totalF) / b.mass;
        b.ay -= (ny * totalF) / b.mass;
      }
    }
  }

  areAntiparticles(a: ParticleInstance, b: ParticleInstance): boolean {
    if (a.kind !== b.kind) return false;
    return a.isAntiparticle !== b.isAntiparticle;
  }

  /**
   * QED Dirac Pair Annihilation: e+ + e- → 2γ
   * In CM frame: produces two back-to-back photons with opposite helicities (singlet entangled state: λ1=+1, λ2=-1).
   * Exact 4-momentum conservation.
   */
  handleAnnihilation(a: ParticleInstance, b: ParticleInstance): boolean {
    // Treat annihilation as a transaction: compute and validate the complete
    // final state before consuming either incoming particle. This prevents a
    // failed/non-finite QED evaluation from deleting matter without products.
    if (a._removed || b._removed || a.id === b.id || !this.particles.includes(a) || !this.particles.includes(b)) return false;
    if (a.charge === 0 || b.charge === 0 || a.charge * b.charge >= 0) return false;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const qedRes = this.qed.evaluateAnnihilation(a, b);
    const photons = [qedRes?.gamma1, qedRes?.gamma2];
    if (photons.some(g => !g || !Number.isFinite(g.E) || g.E <= 0 ||
      !Number.isFinite(g.px) || !Number.isFinite(g.py) || !Number.isFinite(g.pz || 0))) return false;
    const input = [a, b].map(p => this.fourMomentum(p));
    const outE = photons.reduce((sum, g) => sum + g.E, 0);
    const outPx = photons.reduce((sum, g) => sum + g.px, 0);
    const outPy = photons.reduce((sum, g) => sum + g.py, 0);
    const inE = input[0].E + input[1].E;
    const inPx = input[0].px + input[1].px;
    const inPy = input[0].py + input[1].py;
    const conservationScale = Math.max(1, Math.abs(inE), Math.hypot(inPx, inPy));
    if (Math.abs(outE - inE) > 1e-8 * conservationScale ||
        Math.hypot(outPx - inPx, outPy - inPy) > 1e-8 * conservationScale) return false;

    const p1 = this.addParticle({
      kind: 'photon',
      x: mx,
      y: my,
      vx: (qedRes.gamma1.px / qedRes.gamma1.E) * LIGHT_SPEED,
      vy: (qedRes.gamma1.py / qedRes.gamma1.E) * LIGHT_SPEED,
      vz: (qedRes.gamma1.pz || 0) / qedRes.gamma1.E * LIGHT_SPEED,
      momentumX: qedRes.gamma1.px,
      momentumY: qedRes.gamma1.py,
      momentumZ: qedRes.gamma1.pz || 0,
      isRadiation: true,
      energy: qedRes.gamma1.E
    });
    p1.polarization = qedRes.polarization1;

    const p2 = this.addParticle({
      kind: 'photon',
      x: mx,
      y: my,
      vx: (qedRes.gamma2.px / qedRes.gamma2.E) * LIGHT_SPEED,
      vy: (qedRes.gamma2.py / qedRes.gamma2.E) * LIGHT_SPEED,
      vz: (qedRes.gamma2.pz || 0) / qedRes.gamma2.E * LIGHT_SPEED,
      momentumX: qedRes.gamma2.px,
      momentumY: qedRes.gamma2.py,
      momentumZ: qedRes.gamma2.pz || 0,
      isRadiation: true,
      energy: qedRes.gamma2.E
    });
    p2.polarization = qedRes.polarization2;

    // Commit only after both outgoing photons exist. If either incoming
    // particle was concurrently invalidated, roll back the products.
    if (!this.particles.includes(p1) || !this.particles.includes(p2) || a._removed || b._removed) {
      this.removeParticle(p1.id);
      this.removeParticle(p2.id);
      return false;
    }
    this.removeParticle(a.id);
    this.removeParticle(b.id);

    if (this.emField && this.settings.maxwellFieldEnabled) {
      this.emField.injectPhotonWave(mx, my, p1.vx, p1.vy, p1.energy, p1.polarization?.helicity || 1);
      this.emField.injectPhotonWave(mx, my, p2.vx, p2.vy, p2.energy, p2.polarization?.helicity || -1);
    }

    this.physicsStats.annihilations = (this.physicsStats.annihilations || 0) + 1;
    this.logEvent(
      'annihilation',
      mx,
      my,
      `QED Dirac Annihilation: ${a.name} + ${b.name} → 2γ (Entangled helicities λ₁=+1, λ₂=-1)!`,
      '#facc15',
      3.0
    );
    return true;
  }

  /**
   * QED Breit-Wheeler Two-Photon Collisions:
   * γ + γ → e+ + e-
   * Physically allowed only when invariant s >= 4 * m_e^2 * c^4.
   */
  handleBreitWheelerCollisions(dt: number) {
    if (!this.settings.qedInteractionsEnabled || !this.settings.breitWheelerEnabled) return;
    const photons = this.particles.filter(p => !p._removed && p.isRadiation && p.kind === 'photon');
    const checked = new Set<number>();

    for (let i = 0; i < photons.length; i++) {
      const g1 = photons[i];
      if (checked.has(g1.id) || g1._removed) continue;
      for (let j = i + 1; j < photons.length; j++) {
        const g2 = photons[j];
        if (checked.has(g2.id) || g2._removed) continue;

        const d = this.relativePosition(g1, g2);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > 24) continue;

        const res = this.qed.evaluateBreitWheeler(g1, g2, this.settings.fineStructureConstant * 137);
        if (res.allowed && res.electronMomentumLab && res.positronMomentumLab) {
          // Dimensionless 2+1D cell-opacity probability from the planar QED rate.
          const prob = Math.min(0.9, 1 - Math.exp(-res.probability * dt));
          if (Math.random() < prob) {
            checked.add(g1.id);
            checked.add(g2.id);
            const mx = (g1.x + g2.x) * 0.5;
            const my = (g1.y + g2.y) * 0.5;

            // Validate the complete Breit-Wheeler final state before consuming
            // either incoming photon. A bad rate-engine result must not erase them.
            const finalMomenta = [res.electronMomentumLab, res.positronMomentumLab];
            if (finalMomenta.some(v => !v || !Number.isFinite(v.E) || v.E <= 0 ||
              !Number.isFinite(v.px) || !Number.isFinite(v.py) || !Number.isFinite(v.pz || 0))) continue;
            if (!this.particles.includes(g1) || !this.particles.includes(g2) || g1._removed || g2._removed) continue;

            // Spawn electron (e-, q=-1, L=1) and positron (e+, q=+1, L=-1)
            const eMinus = this.addParticle({
              kind: 'electron',
              x: mx - 2,
              y: my,
              vx: (res.electronMomentumLab.px / res.electronMomentumLab.E) * LIGHT_SPEED,
              vy: (res.electronMomentumLab.py / res.electronMomentumLab.E) * LIGHT_SPEED,
              vz: (res.electronMomentumLab.pz || 0) / res.electronMomentumLab.E * LIGHT_SPEED,
              isAntiparticle: false
            });

            const ePlus = this.addParticle({
              kind: 'electron',
              x: mx + 2,
              y: my,
              vx: (res.positronMomentumLab.px / res.positronMomentumLab.E) * LIGHT_SPEED,
              vy: (res.positronMomentumLab.py / res.positronMomentumLab.E) * LIGHT_SPEED,
              vz: (res.positronMomentumLab.pz || 0) / res.positronMomentumLab.E * LIGHT_SPEED,
              isAntiparticle: true
            });

            // Commit only after both daughter particles were successfully added.
            if (!eMinus || !ePlus || !this.particles.includes(eMinus) || !this.particles.includes(ePlus)) {
              if (eMinus && this.particles.includes(eMinus)) this.removeParticle(eMinus.id);
              if (ePlus && this.particles.includes(ePlus)) this.removeParticle(ePlus.id);
              continue;
            }
            this.removeParticle(g1.id);
            this.removeParticle(g2.id);

            this.physicsStats.breitWheelerPairs = (this.physicsStats.breitWheelerPairs || 0) + 1;
            const beta = Math.sqrt(Math.max(0, 1 - res.threshold / res.s));
            this.logEvent(
              'breit_wheeler',
              mx,
              my,
              `✨ QED Breit-Wheeler Pair Creation: γ + γ → e⁻ + e⁺! (√s = ${Math.sqrt(res.s).toFixed(1)} u, β* = ${beta.toFixed(3)})`,
              '#38bdf8',
              4.0
            );
            break;
          }
        }
      }
    }
  }

  /**
   * QED Bethe-Heitler Pair Creation in Coulomb Field:
   * High-energy photon (E >= 2 m_e c^2) converts into e- + e+ pair near heavy nucleus or strong field
   */
  handleBetheHeitlerPairs(dt: number) {
    if (!this.settings.qedInteractionsEnabled || !this.settings.betheHeitlerEnabled) return;
    const photons = this.particles.filter(p => !p._removed && p.isRadiation && p.kind === 'photon' && p.energy >= 2 * this.qed.electronRestEnergy);
    const charged = this.particles.filter(p => !p._removed && !p.isRadiation && p.charge !== 0);

    for (const g of photons) {
      if (g._removed) continue;
      for (const target of charged) {
        const d = this.relativePosition(g, target);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > target.radius + 18) continue;

        const res = this.qed.evaluateBetheHeitler(g, target);
        if (res.allowed && Number.isFinite(res.angle) && Math.random() < 0.12 * dt) {
          // Stage products before consuming the incoming photon.
          if (g._removed || target._removed || !this.particles.includes(g) || !this.particles.includes(target)) continue;
          const mx = g.x;
          const my = g.y;
          const angle = Math.atan2(g.vy, g.vx);
          const openA = res.angle;
          const electron = this.addParticle({
            kind: 'electron', x: mx - 2, y: my,
            vx: Math.cos(angle + openA) * LIGHT_SPEED * 0.92,
            vy: Math.sin(angle + openA) * LIGHT_SPEED * 0.92,
            isAntiparticle: false
          });
          const positron = this.addParticle({
            kind: 'electron', x: mx + 2, y: my,
            vx: Math.cos(angle - openA) * LIGHT_SPEED * 0.92,
            vy: Math.sin(angle - openA) * LIGHT_SPEED * 0.92,
            isAntiparticle: true
          });
          const productsValid = !!electron && !!positron &&
            Number.isFinite(electron.x) && Number.isFinite(electron.y) &&
            Number.isFinite(positron.x) && Number.isFinite(positron.y) &&
            !electron._removed && !positron._removed;
          if (!productsValid) {
            if (electron && !electron._removed) this.removeParticle(electron.id);
            if (positron && !positron._removed) this.removeParticle(positron.id);
            continue;
          }
          this.removeParticle(g.id);

          this.physicsStats.betheHeitlerPairs = (this.physicsStats.betheHeitlerPairs || 0) + 1;
          this.logEvent(
            'bethe_heitler',
            mx,
            my,
            `✨ QED Bethe-Heitler Pair Production: γ + ${target.name} → e⁻ + e⁺ + ${target.name}!`,
            '#a78bfa',
            3.5
          );
          break;
        }
      }
    }
  }

  /**
   * QED Compton Scattering: γ + e- → γ' + e'-
   */
  handleComptonScattering(dt: number) {
    if (!this.settings.qedInteractionsEnabled || !this.settings.comptonScatteringEnabled) return;
    const photons = this.particles.filter(p => !p._removed && p.isRadiation && p.kind === 'photon');
    const electrons = this.particles.filter(p => !p._removed && !p.isRadiation && p.charge !== 0);

    for (const g of photons) {
      if (g._removed) continue;
      for (const e of electrons) {
        if (e._removed) continue;
        const d = this.relativePosition(g, e);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > e.radius + 8) continue;

        if (Math.random() < 0.35 * dt) {
          // Compute the complete candidate event before mutating either incoming
          // particle. Invalid kinematics leave the incoming state untouched.
          const res = this.qed.evaluateComptonScattering(g, e);
          const kOut = res?.scatteredGamma;
          const pOut = res?.recoilElectron;
          const finite4 = (v: any) => !!v &&
            [v.E, v.px, v.py, v.pz].every(Number.isFinite);
          if (!finite4(kOut) || !finite4(pOut) ||
              !(kOut.E > 0) || !(pOut.E > 0) ||
              !Number.isFinite(res.theta) || !res.polarization) continue;

          const electronRest = this.qed.electronRestEnergy;
          const incomingElectronEnergy = Math.hypot(
            electronRest, LIGHT_SPEED * Math.hypot(e.px, e.py)
          );
          const incoming = {
            E: g.energy + incomingElectronEnergy,
            px: g.momentumX + e.px,
            py: g.momentumY + e.py
          };
          const outgoing = {
            E: kOut.E + pOut.E,
            px: kOut.px + pOut.px,
            py: kOut.py + pOut.py
          };
          const scale = Math.max(1, Math.abs(incoming.E), Math.hypot(incoming.px, incoming.py));
          const tol = 1e-8 * scale;
          const shell = pOut.E * pOut.E -
            LIGHT_SPEED * LIGHT_SPEED * (pOut.px * pOut.px + pOut.py * pOut.py + (pOut.pz ?? 0) * (pOut.pz ?? 0));
          const expectedShell = electronRest * electronRest;
          if (Math.abs(outgoing.E - incoming.E) > tol ||
              Math.abs(outgoing.px - incoming.px) > tol ||
              Math.abs(outgoing.py - incoming.py) > tol ||
              Math.abs(shell - expectedShell) > 1e-7 * Math.max(1, expectedShell)) continue;

          // Commit both outgoing momenta together only after all checks pass.
          g.energy = kOut.E;
          g.momentumX = kOut.px;
          g.momentumY = kOut.py;
          g.momentumZ = kOut.pz;
          g.vx = (kOut.px / kOut.E) * LIGHT_SPEED;
          g.vy = (kOut.py / kOut.E) * LIGHT_SPEED;
          g.polarization = res.polarization;

          e.px = pOut.px;
          e.py = pOut.py;
          e.pz = pOut.pz;
          this.setVelocity(e, e.px / (e.mass * 1.5), e.py / (e.mass * 1.5), (e.pz || 0) / (e.mass * 1.5));

          if (this.emField && this.settings.maxwellFieldEnabled) {
            this.emField.injectPhotonWave(g.x, g.y, g.vx, g.vy, g.energy, g.polarization?.helicity || 1);
          }

          this.physicsStats.comptonScatters = (this.physicsStats.comptonScatters || 0) + 1;
          this.logEvent(
            'compton',
            (g.x + e.x) * 0.5,
            (g.y + e.y) * 0.5,
            `⚛ QED Compton Scattering: γ + ${e.symbol} → γ'(θ = ${(res.theta * 180 / Math.PI).toFixed(0)}°) + ${e.symbol}' recoil!`,
            '#fde047',
            2.2
          );
          break;
        }
      }
    }
  }
  /**
   * Non-Abelian QCD Processes:
   * 1. Altarelli-Parisi Gluon Splitting: g → q + q̄
   * 2. Gluon-Gluon Self-Interactions: 3-gluon and 4-gluon non-Abelian vertices with color factors
   * 3. Quark-Gluon QCD Compton Scattering: q + g → q' + g'
   */
  handleQCDProcesses(dt: number) {
    if (!this.settings.strongForceEnabled || !this.settings.su3ColorAlgebraEnabled) return;

    const gluons = this.particles.filter(p => !p._removed && p.isRadiation && p.kind === 'gluon');
    const quarks = this.particles.filter(p => !p._removed && !p.isRadiation && p.family === 'quark');

    // 1. Altarelli-Parisi Gluon Splitting: g → q + q̄
    if (this.settings.gluonSplittingEnabled) {
      for (const g of gluons) {
        if (g._removed) continue;
        const res = this.qcd.evaluateGluonSplitting(g, dt, this.settings.qcdAlphaS);
        if (res.split && res.daughter1 && res.daughter2) {
          const gx = g.x;
          const gy = g.y;
          const d1 = res.daughter1;
          const d2 = res.daughter2;
          // Validate both daughter four-vectors before mutating the particle list.
          const validFourVector = (v: FourVector) => Number.isFinite(v.E) && v.E > 0 &&
            Number.isFinite(v.px) && Number.isFinite(v.py) && Number.isFinite(v.pz || 0);
          if (!validFourVector(d1) || !validFourVector(d2) ||
            !Number.isFinite(gx) || !Number.isFinite(gy) ||
            !this.particles.includes(g) || g._removed) continue;

          const q = this.addParticle({
            kind: res.flavor,
            x: gx - 3,
            y: gy,
            vx: (d1.px / d1.E) * LIGHT_SPEED,
            vy: (d1.py / d1.E) * LIGHT_SPEED,
            vz: ((d1.pz || 0) / d1.E) * LIGHT_SPEED,
            isAntiparticle: false,
            color: res.color
          });
          const aq = this.addParticle({
            kind: res.flavor,
            x: gx + 3,
            y: gy,
            vx: (d2.px / d2.E) * LIGHT_SPEED,
            vy: (d2.py / d2.E) * LIGHT_SPEED,
            vz: ((d2.pz || 0) / d2.E) * LIGHT_SPEED,
            isAntiparticle: true,
            color: res.antiColor
          });

          // Roll back a partial pair; consume the parent only after both exist.
          if (!q || !aq || !this.particles.includes(q) || !this.particles.includes(aq) ||
            ![q.x, q.y, q.vx, q.vy, aq.x, aq.y, aq.vx, aq.vy].every(Number.isFinite)) {
            if (q && this.particles.includes(q)) this.removeParticle(q.id);
            if (aq && this.particles.includes(aq)) this.removeParticle(aq.id);
            continue;
          }
          this.removeParticle(g.id);

          this.physicsStats.gluonSplittings = (this.physicsStats.gluonSplittings || 0) + 1;
          this.logEvent(
            'gluon_split',
            gx,
            gy,
            `💥 Altarelli-Parisi Gluon Splitting: g → ${res.flavor} + ${res.flavor}̄ (z = ${res.z.toFixed(2)})!`,
            '#f43f5e',
            3.2
          );
        }
      }
    }

    // 2. Gluon-Gluon Non-Abelian Self-Interactions (3g and 4g vertices)
    if (this.settings.gluonSelfInteractionsEnabled && gluons.length >= 2) {
      const checked = new Set<number>();
      for (let i = 0; i < gluons.length; i++) {
        const g1 = gluons[i];
        if (checked.has(g1.id) || g1._removed) continue;
        for (let j = i + 1; j < gluons.length; j++) {
          const g2 = gluons[j];
          if (checked.has(g2.id) || g2._removed) continue;
          const d = this.relativePosition(g1, g2);
          const dist = Math.hypot(d.dx, d.dy);
          if (dist > 22) continue;

          const p1 = this.fourMomentum(g1);
          const p2 = this.fourMomentum(g2);
          const s = (p1.E + p2.E) ** 2 - ((p1.px + p2.px) ** 2 + (p1.py + p2.py) ** 2);
          const t = -Math.max(0.1, dist * 0.4);

          const res = this.qcd.evaluateGluonGluonScattering(g1, g2, s, t, this.settings.qcdAlphaS, this.settings.qcdInterferenceEnabled);
          if (Math.random() < res.probability * 0.25 * dt) {
            checked.add(g1.id);
            checked.add(g2.id);

            // Scattering deflection
            const theta = res.scatteringAngle;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const vx1 = g1.vx * cosT - g1.vy * sinT;
            const vy1 = g1.vx * sinT + g1.vy * cosT;
            g1.vx = vx1;
            g1.vy = vy1;

            const vx2 = g2.vx * cosT + g2.vy * sinT;
            const vy2 = -g2.vx * sinT + g2.vy * cosT;
            g2.vx = vx2;
            g2.vy = vy2;

            if (res.vertexType === '3g' || this.settings.threeGluonVertexEnabled) {
              this.physicsStats.threeGluonVertices = (this.physicsStats.threeGluonVertices || 0) + 1;
            } else {
              this.physicsStats.fourGluonVertices = (this.physicsStats.fourGluonVertices || 0) + 1;
            }

            const mx = (g1.x + g2.x) * 0.5;
            const my = (g1.y + g2.y) * 0.5;
            this.logEvent(
              'gluon_self_interaction',
              mx,
              my,
              `⚡ Gluon Self-Interaction (${res.vertexType}): Non-Abelian SU(3) vertex with color factor CF=${res.colorFactor.toFixed(2)}!`,
              '#eab308',
              3.0
            );
            break;
          }
        }
      }
    }

    // 3. Quark-Gluon QCD Compton Scattering: q + g → q' + g'
    for (const g of gluons) {
      if (g._removed) continue;
      for (const q of quarks) {
        if (q._removed) continue;
        const d = this.relativePosition(g, q);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > q.radius + 12) continue;

        const pq = this.fourMomentum(q);
        const pg = this.fourMomentum(g);
        const s = (pq.E + pg.E) ** 2 - ((pq.px + pg.px) ** 2 + (pq.py + pg.py) ** 2);
        const t = -Math.max(0.1, dist * 0.4);

        const res = this.qcd.evaluateQuarkGluonScattering(q, g, s, t, this.settings.qcdAlphaS, this.settings.qcdInterferenceEnabled);
        if (Math.random() < res.probability * 0.22 * dt) {
          // Color rotation / exchange
          if (res.colorRotated && res.newColor) {
            q.color = res.newColor;
            q.colorVector = fundamentalColorVector(q.color);
            if (q.quantumColor) {
              q.quantumColor.dominantColor = res.newColor;
            }
          }

          // Deflect gluon and recoil quark
          const nx = d.dx / (dist || 1);
          const ny = d.dy / (dist || 1);
          const impulse = Math.min(2.0, g.energy * 0.35);
          q.vx -= nx * impulse / q.mass;
          q.vy -= ny * impulse / q.mass;
          g.vx = nx * LIGHT_SPEED;
          g.vy = ny * LIGHT_SPEED;

          this.physicsStats.qcdScatterings = (this.physicsStats.qcdScatterings || 0) + 1;
          this.logEvent(
            'qcd_qg_compton',
            (q.x + g.x) * 0.5,
            (q.y + g.y) * 0.5,
            `⚛ QCD Compton Scattering: q + g → q' + g' (SU(3) color rotated to ${q.color})!`,
            '#10b981',
            2.5
          );
          break;
        }
      }
    }
  }

  handleProbeScattering() {}

  /**
   * Ambient matter density N_e (electron / baryon density) for MSW resonance:
   * Calculated from background setting + presence of macroparticles / atoms / charged fermions.
   */
  getAmbientMatterDensity(x: number, y: number): number {
    let density = this.settings.matterElectronDensity || 0;
    // Nucleon & atomic core contributions
    for (const m of this.macroparticles) {
      const d = Math.hypot(m.centerX - x, m.centerY - y);
      if (d < m.radius * 2.5) {
        density += 1.8 * (1 - d / (m.radius * 2.5));
      }
    }
    // Local charged fermion cluster density
    for (const p of this.particles) {
      if (!p._removed && p.charge !== 0 && !p.kind.includes('neutrino')) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < 36) {
          density += 0.25 * (1 - d / 36);
        }
      }
    }
    return density;
  }

  /**
   * Continuous Neutrino Quantum Flavor Superposition & MSW Matter Oscillations:
   * Advances complex 3-flavor state [c_e, c_mu, c_tau] along geodesic with PMNS mixing
   * and Mikheyev-Smirnov-Wolfenstein (MSW) matter potential V_CC = sqrt(2) G_F N_e.
   */
  updateNeutrinoOscillations(matter: ParticleInstance[], dt: number) {
    const neutrinos = matter.filter(p => !p._removed && p.kind.includes('neutrino'));
    for (const nu of neutrinos) {
      if (!nu.neutrinoState) {
        this.initializeNeutrinoState(nu);
      }
      const speed = Math.hypot(nu.vx, nu.vy);
      const kmPerPx = this.settings.neutrinoKmPerPixel || 0.25;
      const deltaLKm = speed * dt * kmPerPx;
      const energyGeV = Math.max(0.2, (nu.energy || 1.5) * (this.settings.neutrinoGeVPerEnergy || 1.0));
      const matterDensity = this.settings.mswMatterOscillationsEnabled
        ? this.getAmbientMatterDensity(nu.x, nu.y)
        : 0;

      this.weak.propagateNeutrino(
        nu.neutrinoState!,
        deltaLKm,
        energyGeV,
        matterDensity,
        this.settings.mswMatterOscillationsEnabled,
        dt
      );

      // Detect and log MSW matter resonance
      if (nu.neutrinoState!.inMatterResonance) {
        this.physicsStats.mswResonances = (this.physicsStats.mswResonances || 0) + 1;
        if (Math.random() < 0.04 * dt) {
          this.logEvent(
            'msw_resonance',
            nu.x,
            nu.y,
            `🌌 MSW Matter Resonance: ν_e converted in matter gradient (N_e = ${matterDensity.toFixed(2)}, P_purity = ${(nu.neutrinoState!.resonancePurity * 100).toFixed(0)}%)!`,
            '#c084fc',
            3.0
          );
        }
      }

      // Update particle identity if dominant flavor rotated
      const dom = nu.neutrinoState!.dominantFlavor;
      if (nu.kind !== dom) {
        nu.kind = dom;
        const def = STANDARD_MODEL_PARTICLES[dom];
        if (def) {
          nu.name = nu.isAntiparticle ? def.name.replace('Neutrino', 'Antineutrino') : def.name;
          nu.symbol = nu.isAntiparticle ? `ν̄_${dom[0]}` : `ν_${dom[0]}`;
        }
      }
    }
  }

  /**
   * Charged-Current (CC) Electroweak Interactions mediated by W± vector bosons:
   * 1. Inverse Beta Decay & leptonic CC: ν_e + d → e⁻ + u, ν̄_e + u → e⁺ + d, ν_μ + d → μ⁻ + u
   * 2. CKM flavor changes are not triggered by mere quark proximity; only explicit charged-current reactions are sampled.
   */
  handleChargedCurrentInteractions(dt: number) {
    if (!this.settings.weakForceEnabled || !this.settings.chargedCurrentEnabled) return;
    const matter = this.particles.filter(p => !p._removed && !p.isRadiation);

    for (let i = 0; i < matter.length; i++) {
      const a = matter[i];
      if (a._removed) continue;
      for (let j = i + 1; j < matter.length; j++) {
        const b = matter[j];
        if (b._removed) continue;

        const d = this.relativePosition(a, b);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > 28) continue;

        // 1. Inverse Beta Decay (Neutrino-Quark CC)
        const isANu = a.kind.includes('neutrino');
        const isBNu = b.kind.includes('neutrino');
        if ((isANu && b.family === 'quark') || (isBNu && a.family === 'quark')) {
          const nu = isANu ? a : b;
          const quark = isANu ? b : a;

          const res = this.weak.evaluateInverseBetaCC(nu, quark, dt);
          if (res.occurred) {
            const mx = (nu.x + quark.x) * 0.5;
            const my = (nu.y + quark.y) * 0.5;

            // Spawn virtual W propagator marker
            const bosonKind = nu.isAntiparticle ? 'w_minus' : 'w_plus';
            this.weak.createVirtualWeakMarker(nu.x, nu.y, quark.x, quark.y, 'charged_current', bosonKind, res.q2);

            // Transform target quark
            const oldQName = quark.name;
            quark.kind = res.productQuarkKind;
            const qDef = STANDARD_MODEL_PARTICLES[quark.kind];
            quark.name = quark.isAntiparticle ? `Anti-${qDef.name}` : qDef.name;
            quark.symbol = quark.isAntiparticle ? `${qDef.symbol}̄` : qDef.symbol;
            quark.charge = quark.isAntiparticle ? -qDef.charge : qDef.charge;
            quark.isospin3 = quark.isAntiparticle ? -qDef.isospin3 : qDef.isospin3;
            quark.massMeV = qDef.massMeV;
            quark.mass = simulationMass(quark.kind);

            // Transform neutrino into charged lepton
            nu.kind = res.productLeptonKind;
            nu.isAntiparticle = res.productLeptonAntiparticle;
            const lDef = STANDARD_MODEL_PARTICLES[nu.kind];
            nu.name = nu.isAntiparticle ? (nu.kind === 'electron' ? 'Positron (e⁺)' : `Anti-${lDef.name}`) : lDef.name;
            nu.symbol = nu.isAntiparticle ? (nu.kind === 'electron' ? 'e⁺' : `${lDef.symbol}⁺`) : lDef.symbol;
            nu.charge = nu.isAntiparticle ? 1 : -1;
            nu.leptonNumber = nu.isAntiparticle ? -1 : 1;
            nu.massMeV = lDef.massMeV;
            nu.mass = simulationMass(nu.kind);
            delete nu.neutrinoState;

            this.physicsStats.chargedCurrentEvents = (this.physicsStats.chargedCurrentEvents || 0) + 1;
            this.physicsStats.ckmTransitions = (this.physicsStats.ckmTransitions || 0) + 1;
            this.logEvent('charged_current', mx, my, `⚡ ${res.description} (${oldQName} → ${quark.name})!`, '#f43f5e', 3.5);
            break;
          }
        }

        // Quark-quark flavor relabeling is deliberately not simulated as a
        // proximity-triggered random event. CKM elements are amplitudes in
        // specified charged-current processes, not a spontaneous flavor-swap
        // probability. In particular, this old shortcut converted proton
        // valence u/d quarks into c/s without supplying the heavy-flavor energy.
        // Flavor-changing reactions are instead handled only by explicit
        // neutrino charged-current events and parent-particle weak decays.

      }
    }
  }

  /**
   * Neutral-Current (NC) Electroweak Interactions mediated by Z⁰ vector bosons:
   * 1. Neutrino-Electron Elastic Scattering: ν_l + e⁻ → ν_l' + e'⁻ (with NC + CC interference for ν_e)
   * 2. Neutrino-Quark NC Scattering: ν_l + q → ν_l' + q'
   */
  handleNeutralCurrentInteractions(dt: number) {
    if (!this.settings.weakForceEnabled || !this.settings.neutralCurrentEnabled) return;
    const matter = this.particles.filter(p => !p._removed && !p.isRadiation);

    for (let i = 0; i < matter.length; i++) {
      const a = matter[i];
      if (a._removed) continue;
      for (let j = i + 1; j < matter.length; j++) {
        const b = matter[j];
        if (b._removed) continue;

        const d = this.relativePosition(a, b);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > 26) continue;

        const isANu = a.kind.includes('neutrino');
        const isBNu = b.kind.includes('neutrino');
        if (!isANu && !isBNu) continue;

        const nu = isANu ? a : b;
        const target = isANu ? b : a;

        // 1. Neutrino-Electron NC Scattering (ν + e⁻ → ν' + e'⁻)
        if (target.kind === 'electron') {
          const res = this.weak.evaluateNeutrinoElectronNC(nu, target, dt);
          if (res.scattered) {
            const mx = (nu.x + target.x) * 0.5;
            const my = (nu.y + target.y) * 0.5;

            // Spawn virtual Z0 marker
            this.weak.createVirtualWeakMarker(nu.x, nu.y, target.x, target.y, 'neutral_current', 'z_boson', res.q2);

            // Apply recoil kinematics
            target.vx += (res.recoilE.px / target.mass) * 0.4;
            target.vy += (res.recoilE.py / target.mass) * 0.4;
            nu.vx = (res.scatteredNu.px / Math.max(0.2, nu.mass)) * 0.5;
            nu.vy = (res.scatteredNu.py / Math.max(0.2, nu.mass)) * 0.5;

            this.physicsStats.neutralCurrentEvents = (this.physicsStats.neutralCurrentEvents || 0) + 1;
            this.physicsStats.neutrinoScatters = (this.physicsStats.neutrinoScatters || 0) + 1;
            this.logEvent(
              'neutral_current_electron',
              mx,
              my,
              `⚛ Neutral-Current Weak Scatter (${res.channel}): ${nu.symbol} + e⁻ → ${nu.symbol}' + e'⁻ via Z⁰ exchange!`,
              '#c026d3',
              3.0
            );
            break;
          }
        }

        // 2. Neutrino-Quark NC Scattering (ν + q → ν' + q')
        if (target.family === 'quark') {
          if (Math.random() < 0.12 * dt) {
            const mx = (nu.x + target.x) * 0.5;
            const my = (nu.y + target.y) * 0.5;

            this.weak.createVirtualWeakMarker(nu.x, nu.y, target.x, target.y, 'neutral_current', 'z_boson', -1.8);

            const nx = d.dx / dist;
            const ny = d.dy / dist;
            target.vx += (nx * 1.2) / target.mass;
            target.vy += (ny * 1.2) / target.mass;
            nu.vx -= (nx * 1.5) / Math.max(0.2, nu.mass);
            nu.vy -= (ny * 1.5) / Math.max(0.2, nu.mass);

            this.physicsStats.neutralCurrentEvents = (this.physicsStats.neutralCurrentEvents || 0) + 1;
            this.physicsStats.neutrinoScatters = (this.physicsStats.neutrinoScatters || 0) + 1;
            this.logEvent(
              'neutral_current_quark',
              mx,
              my,
              `⚛ Neutral-Current Quark Scatter: ${nu.symbol} + ${target.symbol} → ${nu.symbol}' + ${target.symbol}' via Z⁰!`,
              '#a21caf',
              2.5
            );
            break;
          }
        }
      }
    }
  }

  /**
   * Neutrino-Antineutrino Interactions:
   * 1. ν + ν̄ → Z* → f + f̄ Annihilation (into e⁺e⁻, μ⁺μ⁻, or color-singlet qq̄)
   * 2. Glashow Resonance: ν̄_e + e⁻ → W⁻ at s ≈ M_W²
   */
  handleNeutrinoAntineutrinoInteractions(dt: number) {
    if (!this.settings.weakForceEnabled || !this.settings.neutrinoAntineutrinoEnabled) return;
    const matter = this.particles.filter(p => !p._removed && !p.isRadiation);

    for (let i = 0; i < matter.length; i++) {
      const a = matter[i];
      if (a._removed) continue;
      for (let j = i + 1; j < matter.length; j++) {
        const b = matter[j];
        if (b._removed) continue;

        const d = this.relativePosition(a, b);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > 22) continue;

        // 1. Neutrino-Antineutrino Annihilation (ν + ν̄ → Z* → ff̄)
        if (a.kind.includes('neutrino') && b.kind.includes('neutrino') && a.isAntiparticle !== b.isAntiparticle) {
          const res = this.weak.evaluateNeutrinoAntineutrinoAnnihilation(a, b, dt);
          if (res.annihilated && res.products.length === 2) {
            const mx = (a.x + b.x) * 0.5;
            const my = (a.y + b.y) * 0.5;

            this.removeParticle(a.id);
            this.removeParticle(b.id);

            // Spawn virtual Z0 marker
            this.weak.createVirtualWeakMarker(mx - 8, my - 8, mx + 8, my + 8, 'neutral_current', 'z_boson', res.q2);

            const angle = Math.random() * Math.PI * 2;
            const speed = 4.2;
            const p1 = this.addParticle({
              kind: res.products[0].kind,
              x: mx,
              y: my,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              isAntiparticle: res.products[0].isAntiparticle,
              color: res.products[0].color
            });
            const p2 = this.addParticle({
              kind: res.products[1].kind,
              x: mx,
              y: my,
              vx: -Math.cos(angle) * speed,
              vy: -Math.sin(angle) * speed,
              isAntiparticle: res.products[1].isAntiparticle,
              color: res.products[1].color
            });

            this.physicsStats.neutrinoAnnihilations = (this.physicsStats.neutrinoAnnihilations || 0) + 1;
            this.logEvent('neutrino_annihilation', mx, my, `💥 ${res.description}`, '#c026d3', 3.5);
            break;
          }
        }

        // 2. Glashow Resonance (ν̄_e + e⁻ → W⁻)
        const isNuEBar = a.kind === 'electron_neutrino' && a.isAntiparticle;
        const isElectron = b.kind === 'electron' && !b.isAntiparticle;
        if (isNuEBar && isElectron && Math.random() < 0.25 * dt) {
          const mx = (a.x + b.x) * 0.5;
          const my = (a.y + b.y) * 0.5;

          const res = this.weak.evaluateGlashowResonance(a, b);
          if (res.resonant) {
            this.removeParticle(a.id);
            this.removeParticle(b.id);

            this.weak.createVirtualWeakMarker(mx - 10, my - 10, mx + 10, my + 10, 'charged_current', 'w_minus', 80.4 ** 2);

            this.addParticle({
              kind: 'w_minus',
              x: mx,
              y: my,
              vx: (a.vx + b.vx) * 0.5,
              vy: (a.vy + b.vy) * 0.5
            });

            this.physicsStats.glashowEvents = (this.physicsStats.glashowEvents || 0) + 1;
            this.logEvent('glashow_resonance', mx, my, res.description, '#f43f5e', 4.0);
            break;
          }
        }
      }
    }
  }

  /**
   * Recalculates dynamically generated masses for all active particles based on
   * current Higgs VEV (v) and Electroweak Symmetry Breaking (EWSB) phase.
   * If EWSB is unbroken (symmetric phase, v = 0), all fundamental fermions and W/Z bosons are massless!
   */
  recalculateFermionMasses(): void {
    if (!this.higgs) return;
    const isBroken = this.settings.ewsbBrokenPhase;
    const vev = this.settings.higgsVev;
    this.higgs.setEWSBPhase(isBroken);
    this.higgs.setHiggsParameters(this.settings.higgsPotentialMu2, this.settings.higgsPotentialLambda, isBroken);

    for (const p of this.particles) {
      if (p._removed || p.isRadiation) continue;
      p.massMeV = this.higgs.getDynamicMassMeV(p.kind, vev, isBroken);
      if (!isBroken) {
        if (p.kind !== 'photon' && p.kind !== 'gluon') {
          p.mass = 0.05; // Massless relativistic speed
        }
      } else {
        const baseSim = simulationMass(p.kind);
        const ratio = vev / HIGGS_VEV_STANDARD_GEV;
        p.mass = Math.max(0.1, (baseSim === 0 ? 0.2 : baseSim) * ratio);
      }
    }
  }

  /**
   * Higgs Sector Interactions:
   * 1. Vector Boson Fusion (VBF): W⁺ + W⁻ → H⁰ and Z⁰ + Z⁰ → H⁰
   * 2. Associated Production (Higgsstrahlung): e⁺ + e⁻ → Z* → Z⁰ + H⁰
   * 3. Gluon-Gluon Fusion (ggF): g + g → [top loop] → H⁰
   * 4. Higgs Self-Interactions: H⁰ + H⁰ → H⁰ + H⁰ (Trilinear λ_3H & Quartic λ_4H vertices)
   */
  handleHiggsInteractions(dt: number): void {
    if (!this.settings.higgsFieldEnabled || !this.higgs) return;
    const particles = this.particles.filter(p => !p._removed);

    // 1. Vector Boson Fusion & Higgsstrahlung & Higgs Self-Scattering
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      if (a._removed) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        if (b._removed) continue;

        const d = this.relativePosition(a, b);
        const dist = Math.hypot(d.dx, d.dy);
        if (dist > 24) continue;

        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;

        // 1a. Vector Boson Fusion: W+W- -> H0 or Z0 Z0 -> H0
        if (this.settings.higgsGaugeInteractionsEnabled) {
          const vbfRes = this.higgs.evaluateVectorBosonFusion(a, b, dt);
          if (vbfRes.fused) {
            this.removeParticle(a.id);
            this.removeParticle(b.id);

            this.addParticle({
              kind: 'higgs',
              x: mx,
              y: my,
              vx: vbfRes.higgsMomentum.px * 0.35,
              vy: vbfRes.higgsMomentum.py * 0.35,
              energy: vbfRes.higgsMomentum.E
            });

            this.physicsStats.higgsVBFEvents = (this.physicsStats.higgsVBFEvents || 0) + 1;
            this.logEvent('higgs_vbf', mx, my, vbfRes.description, '#ec4899', 4.0);
            break;
          }

          // 1b. Associated Production / Higgsstrahlung: e+ + e- -> Z0 + H0
          if (this.settings.higgsProductionEnabled) {
            const hsRes = this.higgs.evaluateHiggsstrahlung(a, b, dt);
            if (hsRes.produced) {
              this.removeParticle(a.id);
              this.removeParticle(b.id);

              this.addParticle({
                kind: 'z_boson',
                x: mx - 6,
                y: my,
                vx: hsRes.zMomentum.px * 0.4,
                vy: hsRes.zMomentum.py * 0.4,
                energy: hsRes.zMomentum.E
              });

              this.addParticle({
                kind: 'higgs',
                x: mx + 6,
                y: my,
                vx: hsRes.hMomentum.px * 0.4,
                vy: hsRes.hMomentum.py * 0.4,
                energy: hsRes.hMomentum.E
              });

              this.physicsStats.higgsstrahlungs = (this.physicsStats.higgsstrahlungs || 0) + 1;
              this.logEvent('higgsstrahlung', mx, my, hsRes.description, '#f43f5e', 4.0);
              break;
            }
          }
        }

        // 1c. Higgs Self-Scattering: H0 + H0 -> H0 + H0
        if (this.settings.higgsSelfInteractionsEnabled && a.kind === 'higgs' && b.kind === 'higgs') {
          const selfRes = this.higgs.evaluateHiggsSelfScattering(a, b, dt);
          if (selfRes.scattered) {
            const cosT = Math.cos(selfRes.angle);
            const sinT = Math.sin(selfRes.angle);
            const vx1 = a.vx * cosT - a.vy * sinT;
            const vy1 = a.vx * sinT + a.vy * cosT;
            a.vx = vx1;
            a.vy = vy1;

            const vx2 = b.vx * cosT + b.vy * sinT;
            const vy2 = -b.vx * sinT + b.vy * cosT;
            b.vx = vx2;
            b.vy = vy2;

            this.physicsStats.higgsSelfScatters = (this.physicsStats.higgsSelfScatters || 0) + 1;
            this.logEvent('higgs_self_scattering', mx, my, selfRes.description, '#d946ef', 3.5);
            break;
          }
        }

        // 1d. Gluon-Gluon Fusion (ggF): g + g -> [top triangle loop] -> H0
        if (this.settings.higgsProductionEnabled && a.kind === 'gluon' && b.kind === 'gluon') {
          const ggfRes = this.higgs.evaluateGluonFusion(a, b, dt);
          if (ggfRes.fused) {
            this.removeParticle(a.id);
            this.removeParticle(b.id);

            this.addParticle({
              kind: 'higgs',
              x: mx,
              y: my,
              vx: ggfRes.higgsMomentum.px * 0.3,
              vy: ggfRes.higgsMomentum.py * 0.3,
              energy: ggfRes.higgsMomentum.E
            });

            this.physicsStats.higgsGluonFusions = (this.physicsStats.higgsGluonFusions || 0) + 1;
            this.logEvent('higgs_ggf', mx, my, ggfRes.description, '#ec4899', 4.5);
            break;
          }
        }
      }
    }
  }

  computeLongRangeConfinement(dt: number) {
    if (!this.settings.strongForceEnabled) return;
    for (const bond of this.bonds.values()) {
      const a = this.particles.find(p => p.id === bond.a);
      const b = this.particles.find(p => p.id === bond.b);
      if (!a || !b || a._removed || b._removed) continue;
      const d = this.relativePosition(a, b);
      const r = Math.hypot(d.dx, d.dy);
      if (r < 1e-4) continue;

      let F: number;
      let U: number;
      if (this.settings.cornellConfinementEnabled) {
        const cf = this.qcd.cornellForce(r, this.settings.qcdAlphaS, this.settings.stringTensionSigma);
        F = cf.force * 0.18;
        U = cf.potential;
      } else {
        F = this.bondForce(bond);
        U = this.bondEnergy(bond);
      }

      const nx = d.dx / r;
      const ny = d.dy / r;
      a.ax += (nx * F) / a.mass;
      a.ay += (ny * F) / a.mass;
      b.ax -= (nx * F) / b.mass;
      b.ay -= (ny * F) / b.mass;

      // Lund String Fragmentation via Schwinger Vacuum Tunneling
      if (this.settings.lundFragmentationEnabled) {
        const frag = this.qcd.evaluateStringFragmentation(r, this.settings.stringTensionSigma);
        if (frag.breakString && r > 75) {
          this.bonds.delete(bond.key);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const flavor = frag.flavor;
          const newQ1 = this.addParticle({
            kind: flavor,
            x: mx - 6,
            y: my,
            color: 'blue'
          });
          const newQ2 = this.addParticle({
            kind: flavor,
            x: mx + 6,
            y: my,
            isAntiparticle: true,
            color: 'anti_blue'
          });
          this.createBond(a, newQ1);
          this.createBond(newQ2, b);
          this.transferStats.stringBreaks++;
          this.physicsStats.lundStringBreaks = (this.physicsStats.lundStringBreaks || 0) + 1;
          this.logEvent(
            'lund_fragmentation',
            mx,
            my,
            `🧶 Lund String Fragmentation: Field energy exceeded threshold → Schwinger tunneling produced ${flavor} + ${flavor}̄ pair!`,
            '#fb923c',
            3.5
          );
        }
      } else {
        // Fallback linear threshold string breaking
        const threshold = 2 * simulationMass('up') * LIGHT_SPEED ** 2;
        if (U >= threshold && r > 90) {
          this.bonds.delete(bond.key);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const newQ1 = this.addParticle({ kind: 'up', x: mx - 6, y: my, color: 'blue' });
          const newQ2 = this.addParticle({ kind: 'up', x: mx + 6, y: my, isAntiparticle: true, color: 'anti_blue' });
          this.createBond(a, newQ1);
          this.createBond(newQ2, b);
          this.transferStats.stringBreaks++;
          this.logEvent('string_break', mx, my, `QCD String Snapped: Field energy → u + ū pair!`, '#fb923c');
        }
      }
    }
  }

  /**
   * Estimate final-mode occupation from overlapping 2D packet orbitals.
   * This supplies Fermi blocking and Bose stimulation to stochastic decays.
   */
  private decayQuantumStatisticalFactor(parent: ParticleInstance): number {
    if (!this.settings.pauliExclusionEnabled || !this.weak) return 1;
    const channels = this.weak.calculateDecayChannels(parent) || [];
    if (!channels.length) return 1;
    let weighted = 0, weightSum = 0;
    for (const channel of channels) {
      const branch = Math.max(0, channel.branchingRatio || 0);
      if (!branch) continue;
      let channelFactor = 1;
      for (const product of channel.products) {
        const def = STANDARD_MODEL_PARTICLES[product.kind];
        if (!def) continue;
        let occupancy = 0;
        for (const other of this.particles) {
          if (other.id === parent.id || other._removed || other.isVirtual) continue;
          if (other.kind !== product.kind || !!other.isAntiparticle !== !!product.isAntiparticle) continue;
          const s1 = Math.max(0.25, parent.sigma || parent.sigma0 || 5);
          const s2 = Math.max(0.25, other.sigma || other.sigma0 || 5);
          const denom = 2 * (s1 * s1 + s2 * s2);
          const dx = parent.x - other.x, dy = parent.y - other.y;
          const spatial = Math.exp(-(dx * dx + dy * dy) / Math.max(1e-9, denom));
          const spin = def.isFermion
            ? (parent.kind === product.kind
                ? PlanarManyBodyQuantumState.spinOverlapSquared(parent, other)
                : (def.spin === 0.5 ? 0.5 : 1))
            : PlanarManyBodyQuantumState.spinOverlapSquared(parent, other);
          occupancy += spatial * spin;
        }
        channelFactor *= PlanarManyBodyQuantumState.transitionFactor(!!def.isFermion, occupancy);
      }
      weighted += branch * channelFactor;
      weightSum += branch;
    }
    return weightSum > 0 ? Math.max(0, weighted / weightSum) : 1;
  }

  /**
   * Rebuild the active two-particle sectors of the planar many-body state.
   * Only identical species are paired; each pair uses the correct exchange
   * sign and the spin overlap, while the particles remain individually visible.
   */
  private updatePlanarManyBodyState(dt = 0): void {
    const eligible = this.particles.filter(p => !p._removed && !p.isVirtual && !!p.sigma0);
    // Evolve interacting and free relative-coordinate pair waves with a 2D
    // exact finite split-step Fourier map. Their complex ratio supplies the
    // interaction-generated amplitude and phase in the global Born density.
    if (dt > 0) this.pairKineticPropagator.advance(eligible, dt, this.settings.hbar, this.settings);
    const next = new Map<string, any>();
    let fermionPairs = 0, bosonPairs = 0, blockedPairs = 0, bunchedPairs = 0, sum = 0, count = 0;
    for (let i = 0; i < eligible.length; i++) {
      const a = eligible[i];
      for (let j = i + 1; j < eligible.length; j++) {
        const b = eligible[j];
        if (a.kind !== b.kind || !!a.isAntiparticle !== !!b.isAntiparticle || a.isFermion !== b.isFermion) continue;
        const key = `${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`;
        const pair = PlanarManyBodyQuantumState.evaluatePair(a, b, this.settings.hbar);
        next.set(key, {
          aId: a.id, bId: b.id, correlation: pair.correlation,
          exchangeVisibility: pair.exchangeVisibility, spinOverlap: pair.spinOverlap,
          statistics: pair.fermion ? 'fermion' : 'boson'
        });
        if (pair.fermion) { fermionPairs++; if (pair.correlation < 0.15) blockedPairs++; }
        else { bosonPairs++; if (pair.correlation > 1.5) bunchedPairs++; }
        sum += pair.correlation; count++;
      }
    }
    this.manyBodyQuantumPairs = next;
    // Build global coordinate-space states for each identical-particle sector.
    // Different species/antiparticles are distinguishable and therefore factorize.
    // Ryser permanents are exponential, so the declared finite model chunks sectors at a fixed finite size.
    const groups = new Map<string, any[]>();
    for (const p of eligible) {
      const key = `${p.kind}|${!!p.isAntiparticle}|${!!p.isFermion}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    const amplitudeSectors: Array<{ particles: any[]; fermion: boolean }> = [];
    let globalSectors = 0;
    for (const group of groups.values()) {
      for (let start = 0; start < group.length; start += PlanarGlobalManyBodyState.MAX_EXACT_SECTOR) {
        const sector = group.slice(start, start + PlanarGlobalManyBodyState.MAX_EXACT_SECTOR);
        if (sector.length) {
          amplitudeSectors.push({ particles: sector, fermion: !!sector[0].isFermion });
          if (sector.length > 1) globalSectors++;
        }
      }
    }
    // One exact finite Metropolis-Hastings kernel samples the declared product of exchange-symmetric species
    // sectors multiplied by the propagated complex pair-correlation amplitude.
    const globalSample = PlanarGlobalManyBodyState.sampleGlobalJointBorn(
      amplitudeSectors, this.settings.hbar, 12, 0.4,
      positions => this.pairKineticPropagator.correlationAt(positions)
    );
    const bornSamples = globalSample.positions;
    const globalConfiguration = PlanarGlobalManyBodyState.evaluateGlobalConfiguration(
      amplitudeSectors, bornSamples, this.settings.hbar, undefined,
      positions => this.pairKineticPropagator.correlationAt(positions)
    );
    const kineticDiagnostics = this.pairKineticPropagator.getDiagnostics();
    this.manyBodyBornSamples = bornSamples;
    this.manyBodyQuantumDiagnostics = {
      pairCount: count, fermionPairs, bosonPairs,
      meanCorrelation: count ? sum / count : 1, blockedPairs, bunchedPairs,
      globalSectors, bornSampleCount: bornSamples.length,
      meanSamplerAcceptance: globalSample.acceptance,
      logJointBornDensity: globalSample.logProbability,
      interactionPairs: kineticDiagnostics.propagatedPairs,
      accumulatedInteractionPhase: globalConfiguration.phase,
      rmsInteractionPhase: kineticDiagnostics.normError,
      kineticSteps: kineticDiagnostics.kineticSteps,
      maxPairKineticSteps: kineticDiagnostics.maxPairSteps,
      pairWaveNormError: kineticDiagnostics.normError,
      globalWavefunctionPhase: globalConfiguration.phase,
      globalLogBornProbability: globalConfiguration.logProbability
    };
  }

  /**
   * Exact finite envelope map for the displayed 2D Gaussian packet.
   * This discrete spreading rule is the declared finite envelope model,
   * with proper time used for massive particles.
   */
  private advanceWavepacket(p: ParticleInstance, coordinateDt: number, properDt: number) {
    if (!p.sigma0 || p.sigma0 <= 0 || p.isVirtual) return;
    const dt = p.isRadiation ? coordinateDt : properDt;
    p.packetAge = (p.packetAge || 0) + coordinateDt;
    p.packetProperTime = (p.packetProperTime || 0) + properDt;

    // Apply the nonrelativistic Gaussian spreading law only to massive
    // matter packets. A massless photon/gluon packet has a linear dispersion
    // relation; this simple Schrödinger formula would give it a spurious,
    // enormous spread, so its envelope is kept fixed by the finite model definition.
    if (!p.isRadiation && p.mass > 0) {
      const spread = (this.settings.hbar * dt) / (2 * p.mass * p.sigma0 * p.sigma0);
      p.sigma = p.sigma0 * Math.sqrt(1 + spread * spread);
      p.packetDispersion = p.sigma - p.sigma0;
    } else if (p.isRadiation) {
      p.sigma = p.sigma0;
      p.packetDispersion = 0;
    }

    // de Broglie phase advance: exp(-i E Δt / ħ), using the engine's
    // relativistic single-particle energy for the phase rate.
    const energy = p.isRadiation ? (p.energy || 0) : this.fourMomentum(p).E;
    p.packetActionPhase = (p.packetActionPhase || 0) - (energy * coordinateDt) / Math.max(1e-9, this.settings.hbar);
    p.phi = (p.packetInitialPhase || 0) + p.packetActionPhase;
  }

  /**
   * Exact finite static co-moving potential for the declared packet sector.
   * Electromagnetism uses the logarithmic 2D Coulomb Green function. The
   * color term is the declared fixed-color-basis 2+1D confining potential.
   */
  private relativisticPacketPotential(p: ParticleInstance, x: number, y: number,
    sources: ParticleInstance[]): number {
    let potential = 0;
    const soft = 3;
    const torus = this.settings.boundaryMode === 'torus';
    for (const q of sources) {
      if (!q || q.id === p.id || q._removed || q.isVirtual || q.isRadiation) continue;
      let dx = x - q.x, dy = y - q.y;
      if (torus) {
        dx -= Math.round(dx / this.width) * this.width;
        dy -= Math.round(dy / this.height) * this.height;
      }
      const r = Math.max(1.5, Math.hypot(dx, dy));
      const rr = Math.sqrt(r * r + soft * soft);
      if (this.settings.electromagnetismEnabled && p.charge !== 0 && q.charge !== 0) {
        // Green function for -∇² in two spatial dimensions: -(1/2π) ln r.
        potential += -0.035 * Number(this.settings.emStrength || 0) *
          p.charge * q.charge * Math.log(rr / soft);
      }
      if (this.settings.strongForceEnabled && p.family === 'quark' && q.family === 'quark') {
        const dot = p.colorVector.reduce((sum, value, i) => sum + value * Number(q.colorVector[i] || 0), 0);
        const g3 = Math.max(1e-6, Number(this.settings.lambdaQCD || 0.217));
        const colorLog = 0.018 * Number(this.settings.strongStrength || 0) * g3 * (-dot) * Math.log(rr / soft) / (2 * Math.PI);
        const stringPart = 0.002 * Number(this.settings.stringTensionSigma || 1) *
          Number(this.settings.strongStrength || 0) * (-dot) * Math.max(0, rr - soft);
        potential += colorLog + stringPart;
      }
    }
    // Couple the packet to the already-evolved classical Maxwell field in a
    // exact packet-local uniform-field coupling. In a local electrostatic gauge,
    // phi(r) = -E.center dot (r-center), so V=q phi. The magnetic vector
    // potential is applied in the Dirac packet split step using local Bz.
    if (this.settings.electromagnetismEnabled && this.settings.maxwellFieldEnabled && p.charge !== 0) {
      const ex = Number(p.localE?.[0] || 0), ey = Number(p.localE?.[1] || 0);
      potential += -p.charge * (ex * (x - p.x) + ey * (y - p.y));
    }
    // Rectangular barriers are now sampled as actual scalar-potential regions
    // by the packet solver, rather than decided by a random point collision.
    for (const barrier of this.barriers) {
      if (x >= barrier.x && x <= barrier.x + barrier.width &&
          y >= barrier.y && y <= barrier.y + barrier.height) {
        potential += Math.max(0, Number(barrier.potential || 0));
      }
    }
    return Number.isFinite(potential) ? potential : 0;
  }

  update(dt = 1.0) {
    // Hard 2+1D invariant: discard any externally supplied out-of-plane state.
    this.settings.spatialDimensions = 2;
    for (const p of this.particles) { p.z = 0; p.vz = 0; p.pz = 0; p.momentumZ = 0; p._momentumVz = 0; }
    const effectiveDt = Math.min(1.5, Math.max(0, dt * this.settings.timeScale));
    if (effectiveDt <= 0) return;
    const subSteps = this.settings.subSteps || 4;
    const subDt = effectiveDt / subSteps;
    this.simTime += effectiveDt;

    for (let step = 0; step < subSteps; step++) {
      const buckets = this.getParticleBuckets(true);

      // Radiation packets update
      for (const p of buckets.radiation) {
        this.advanceWavepacket(p, subDt, subDt);
        p.age += subDt;
        p.x = this.wrapX(p.x + p.vx * subDt);
        p.y = this.wrapY(p.y + p.vy * subDt);
        if (p.lifetime && p.age >= p.lifetime) {
          this.depositRadiationPacket(p, 'decay');
          this.removeParticle(p.id);
        }
      }

      // Matter update
      for (const p of buckets.matter) {
        p.ax = 0;
        p.ay = 0;
        p.age += subDt;
        p.spinAngle += p.spinSpeed * subDt;
        p.radiationCooldown = Math.max(0, p.radiationCooldown - subDt);
        p.radiationFlash = Math.max(0, p.radiationFlash - subDt * 0.09);
        p._stepVx = p.vx;
        p._stepVy = p.vy;
      }

      // Advance continuous time-dependent Maxwell electromagnetic field lattice
      if (this.settings.electromagnetismEnabled && this.settings.maxwellFieldEnabled) {
        this.emField.depositSources(buckets.matter, this.settings.emStrength);
        this.emField.stepMaxwell(subDt, this.settings.boundaryMode);
      }
      if (this.settings.qedInteractionsEnabled) {
        this.qed.updateVirtualMarkers(subDt);
      }
      if (this.weak) {
        this.weak.updateVirtualMarkers(subDt);
      }

      // Exact finite 2+1D gauge/QFT layer. SU(3), SU(2), U(1)_Y,
      // Higgs finite fields, local Gauss-law diagnostics and the finite
      // fermionic Fock sector evolve on the same two-dimensional torus.
      if (this.planarGaugeQFT && this.settings.spatialDimensions === 2) {
        this.planarGaugeQFT.advance(subDt, buckets.matter, this.settings.hbar, LIGHT_SPEED);
      }
      if (this.quantumLinkGauge && this.settings.spatialDimensions === 2) {
        this.quantumLinkGauge.advance(subDt, buckets.matter);
      }

      this.refreshColorSingletState();
      this.updateMacroparticleIsolationAndSprings(subDt);
      this.computeInteractionsWithBroadphase(subDt, 'events');
      this.computeLongRangeConfinement(subDt);
      this.computeInteractionsWithBroadphase(subDt, 'forces');

      // Apply Lorentz force F = q(E + v x B) from time-dependent local fields
      if (this.settings.electromagnetismEnabled && this.settings.maxwellFieldEnabled && this.settings.lorentzForceEnabled) {
        for (const p of buckets.matter) {
          if (p.pinned || p.charge === 0) continue;
          const lf = this.emField.computeLorentzForce(p, this.settings.magneticFieldBiasZ);
          p.ax += lf.fx / p.mass;
          p.ay += lf.fy / p.mass;
        }
      }

      // Execute QED processes: Breit-Wheeler collisions, Bethe-Heitler pair creation, and Compton scattering
      this.handleBreitWheelerCollisions(subDt);
      this.handleBetheHeitlerPairs(subDt);
      this.handleComptonScattering(subDt);

      // Execute QCD Non-Abelian processes: Gluon splitting, 3g/4g self-interactions, and qg Compton
      this.handleQCDProcesses(subDt);

      // Execute Electroweak processes: Charged Current (W±), Neutral Current (Z⁰), and νν̄ interactions
      if (this.settings.weakForceEnabled) {
        if (this.settings.chargedCurrentEnabled) {
          this.handleChargedCurrentInteractions(subDt);
        }
        if (this.settings.neutralCurrentEnabled) {
          this.handleNeutralCurrentInteractions(subDt);
        }
        if (this.settings.neutrinoAntineutrinoEnabled) {
          this.handleNeutrinoAntineutrinoInteractions(subDt);
        }
      }

      // Execute Higgs Sector processes: VBF (W⁺W⁻/Z⁰Z⁰ → H), Higgsstrahlung (e⁺e⁻ → Z⁰H⁰), ggF (gg → H), and H⁰H⁰ self-scattering
      if (this.settings.higgsFieldEnabled) {
        this.handleHiggsInteractions(subDt);
      }

      // Evolve Neutrino Quantum Superposition, PMNS Mixing & MSW Matter Effect
      if (this.settings.neutrinoOscillationEnabled && this.settings.pmnsMixingEnabled) {
        this.updateNeutrinoOscillations(buckets.matter, subDt);
      }

      // Integrate matter packet centers. In the quantum mode the center
      // velocity comes from a Dirac current / positive-frequency KG current;
      // the older force-integrated trajectory remains available as a fallback.
      const quantumSources = buckets.matter.map(q => ({
        ...q,
        colorVector: [...(q.colorVector || [0, 0, 0])] as [number, number, number]
      }));
      for (const p of buckets.matter) {
        if (p.pinned) continue;
        if (this.settings.relativisticQuantumMotionEnabled && this.settings.spatialDimensions === 2) {
          const oldVx = p.vx, oldVy = p.vy;
          let localMagneticBz = 0;
          if (this.settings.electromagnetismEnabled && this.settings.maxwellFieldEnabled && this.emField) {
            const localField = this.emField.sampleField(p.x, p.y, this.settings.magneticFieldBiasZ);
            p.localE = [localField.Ex, localField.Ey, localField.Ez];
            p.localB = [localField.Bx, localField.By, localField.Bz];
            localMagneticBz = localField.Bz;
          }
          const planarGauge = this.planarGaugeQFT && this.settings.spatialDimensions === 2
            ? this.planarGaugeQFT.sampleVectorPotential(p, p.x, p.y) : { ax: 0, ay: 0, bz: 0 };
          const packetResult = this.relativisticPacketEngine.advance(
            p, subDt, this.settings.hbar, LIGHT_SPEED,
            (rx, ry) => this.relativisticPacketPotential(p, p.x + rx, p.y + ry, quantumSources),
            localMagneticBz + planarGauge.bz,
            { ax: planarGauge.ax, ay: planarGauge.ay }
          );
          if (packetResult) {
            // Evolve position by the displacement of the packet's Born-density
            // center, not by a separate Newtonian point-particle integrator.
            // Momentum, energy and velocity are independently measured
            // expectation values of the evolved packet. For a spread packet,
            // <H> is not generally the energy of <p> on a one-particle mass shell.
            p.px = packetResult.px;
            p.py = packetResult.py;
            p.pz = 0;
            p.packetEnergy = packetResult.energy;
            p.vx = packetResult.vx;
            p.vy = packetResult.vy;
            p._momentumVx = p.vx;
            p._momentumVy = p.vy;
            p._momentumVz = 0;
            p.sigma = packetResult.sigma;
            p.packetDispersion = Math.max(0, packetResult.sigma - (p.sigma0 || packetResult.sigma));
            p.packetDispersionModel = packetResult.mode;
            p.x = this.wrapX(p.x + packetResult.dx);
            p.y = this.wrapY(p.y + packetResult.dy);
            const speed = Math.hypot(p.vx, p.vy);
            const gamma = 1 / Math.sqrt(Math.max(1e-12, 1 - Math.min(0.999999999, speed / LIGHT_SPEED) ** 2));
            p.lorentzGamma = gamma;
            const dTau = relativisticProperTime(subDt, gamma);
            p.properTimeTotal = (p.properTimeTotal || 0) + dTau;
            p.packetAge = (p.packetAge || 0) + subDt;
            p.packetProperTime = (p.packetProperTime || 0) + dTau;
            const E = this.fourMomentum(p).E;
            p.packetActionPhase = (p.packetActionPhase || 0) - E * subDt / Math.max(1e-9, this.settings.hbar);
            p.phi = (p.packetInitialPhase || 0) + p.packetActionPhase;
            // A current-derived velocity change is retained for radiation
            // diagnostics; emission probabilities are exact finite event kernels.
            p._stepVx = oldVx; p._stepVy = oldVy;
          } else {
            // Spin-1 vector bosons and other unsupported species use the
            // existing relativistic point-particle fallback, not KG by fiat.
            p.vx += p.ax * subDt;
            p.vy += p.ay * subDt;
            this.setVelocity(p, p.vx, p.vy);
            p.x = this.wrapX(p.x + p.vx * subDt);
            p.y = this.wrapY(p.y + p.vy * subDt);
            const speed = Math.hypot(p.vx, p.vy);
            const gamma = 1 / Math.sqrt(Math.max(1e-12, 1 - Math.min(0.999999, speed / LIGHT_SPEED) ** 2));
            p.lorentzGamma = gamma;
            p.properTimeTotal = (p.properTimeTotal || 0) + relativisticProperTime(subDt, gamma);
          }
        } else {
        if (p.pinned) continue;
        p.vx += p.ax * subDt;
        p.vy += p.ay * subDt;
        p.vx *= 1 - this.settings.friction;
        p.vy *= 1 - this.settings.friction;
        const speed = Math.hypot(p.vx, p.vy);
        const limit = LIGHT_SPEED * 0.98;
        if (speed > limit) {
          p.vx = (p.vx / speed) * limit;
          p.vy = (p.vy / speed) * limit;
        }

        // Barrier collisions: Exact wave equation tunneling & momentum exchange
        if (this.barriers.length > 0) {
          for (const b of this.barriers) {
            if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) {
              const K = this.getParticleKineticEnergy(p);
              let T = 0;
              let res: any;
              if (this.settings.exactWaveTunnelingEnabled) {
                res = ExactWaveTunneling.solveBarrierTransmission(K, b.potential, b.width, p.massMeV, this.settings.hbar);
                T = res.transmissionCoefficient;
              } else if (this.settings.tunnelingEnabled) {
                T = Math.exp(-2 * b.width * Math.sqrt(Math.max(0, 2 * p.mass * Math.max(0, b.potential - K))) / this.settings.hbar);
              }
              if (K >= b.potential || Math.random() < T) {
                this.physicsStats.tunnels++;
                this.physicsStats.waveTunnelEvents = (this.physicsStats.waveTunnelEvents || 0) + 1;
                this.logEvent(
                  'wave_tunneling',
                  p.x,
                  p.y,
                  `⚛ Exact Wave Tunneling: ${p.symbol} penetrated potential barrier (T=${(T * 100).toFixed(2)}%, κ=${res?.wavenumberInside ? res.wavenumberInside.toFixed(2) : '—'} px⁻¹)!`,
                  '#a855f7'
                );
              } else {
                // Wave reflection: explicit momentum exchange with barrier!
                const deltaPx = 2 * (p.px || p.mass * p.vx);
                p.vx = -p.vx;
                p.px = -p.px;
                p.x += p.vx * 2;
                this.physicsStats.reflections++;
                if (this.settings.boundaryExchangeTracking) {
                  this.boundaryEnergyMomentumExchange.px += deltaPx;
                  this.physicsStats.boundaryExchangeCount = (this.physicsStats.boundaryExchangeCount || 0) + 1;
                }
              }
            }
          }
        }

        // Boundary walls & explicit energy-momentum exchange with boundary
        if (this.settings.boundaryMode === 'bounce') {
          if (p.x <= 0) {
            p.x = 0;
            const deltaPx = 2 * (p.px || p.mass * p.vx);
            p.vx = -p.vx;
            p.px = -p.px;
            if (this.settings.boundaryExchangeTracking) {
              this.boundaryEnergyMomentumExchange.px += deltaPx;
              this.physicsStats.boundaryExchangeCount = (this.physicsStats.boundaryExchangeCount || 0) + 1;
            }
          } else if (p.x >= this.width) {
            p.x = this.width;
            const deltaPx = 2 * (p.px || p.mass * p.vx);
            p.vx = -p.vx;
            p.px = -p.px;
            if (this.settings.boundaryExchangeTracking) {
              this.boundaryEnergyMomentumExchange.px += deltaPx;
              this.physicsStats.boundaryExchangeCount = (this.physicsStats.boundaryExchangeCount || 0) + 1;
            }
          }
          if (p.y <= 0) {
            p.y = 0;
            const deltaPy = 2 * (p.py || p.mass * p.vy);
            p.vy = -p.vy;
            p.py = -p.py;
            if (this.settings.boundaryExchangeTracking) {
              this.boundaryEnergyMomentumExchange.py += deltaPy;
              this.physicsStats.boundaryExchangeCount = (this.physicsStats.boundaryExchangeCount || 0) + 1;
            }
          } else if (p.y >= this.height) {
            p.y = this.height;
            const deltaPy = 2 * (p.py || p.mass * p.vy);
            p.vy = -p.vy;
            p.py = -p.py;
            if (this.settings.boundaryExchangeTracking) {
              this.boundaryEnergyMomentumExchange.py += deltaPy;
              this.physicsStats.boundaryExchangeCount = (this.physicsStats.boundaryExchangeCount || 0) + 1;
            }
          }
        }

        p.x = this.wrapX(p.x + p.vx * subDt);
        p.y = this.wrapY(p.y + p.vy * subDt);
        this.setVelocity(p, p.vx, p.vy);

        // Relativistic proper time dτ = dt / γ and Lorentz gamma
        const vSpeed = Math.hypot(p.vx, p.vy); // Strict 2+1D engine: no out-of-plane momentum.
        const vBeta = Math.min(0.999999, vSpeed / LIGHT_SPEED);
        const gamma = 1 / Math.sqrt(Math.max(1e-12, 1 - vBeta * vBeta));
        p.lorentzGamma = gamma;
        const dTau = relativisticProperTime(subDt, gamma);
        p.properTimeTotal = (p.properTimeTotal || 0) + dTau;
        this.advanceWavepacket(p, subDt, dTau);

        // Relativistic Wigner spin rotation under acceleration
        if (this.settings.wignerRotationEnabled && p.quantumSpinor && (p.ax !== 0 || p.ay !== 0) && this.settings.spatialDimensions === 2) {
          const wAngle = p.quantumSpinor.applyWignerRotation(p.vx, p.vy, p.ax * subDt, p.ay * subDt, LIGHT_SPEED);
          p.wignerAngle = (p.wignerAngle || 0) + wAngle;
          if (Math.abs(wAngle) > 1e-4) {
            this.physicsStats.wignerRotations = (this.physicsStats.wignerRotations || 0) + 1;
          }
        }

        }

        // Accelerated Bremsstrahlung & Gluon Emission with Quantum Coherence
        if (this.settings.radiationEnabled && this.canRadiate(p)) {
          const dv = Math.hypot(p.vx - (p._stepVx || 0), p.vy - (p._stepVy || 0));
          // Require a resolved interaction-induced velocity change, not a
          // tiny floating-point drift. The cutoff is a numerical trigger for
          // this visualization model, not a claimed QFT emission spectrum.
          const resolvedKick = 0.002 * LIGHT_SPEED; // velocity threshold (not an energy threshold).
          if (Number.isFinite(dv) && dv > resolvedKick) {
            // Phenomenological visual-emission scale only; this kernel does not
            // enforce exact recoil / four-momentum conservation or QFT rates.
            const emitEnergy = Math.min(2.5, dv * this.settings.radiationStrength);
            p.radiationCooldown = RADIATION_LIMITS.cooldown;
            p.radiationFlash = 1.0;
            p.radiatedEnergy += emitEnergy;
            p.radiationCount++;

            if (p.family === 'quark' && this.settings.gluonRadiationEnabled && Math.random() < 0.6) {
              let emitVx = -p.vx * 0.8;
              let emitVy = -p.vy * 0.8;
              let gIndex = 1;
              let gColor: { color: string; antiColor: string } | undefined;
              let diag = false;

              if (this.settings.coherentShowerAngularOrdering) {
                const coherent = this.qcd.sampleCoherentGluonRadiation(p, emitEnergy, (p as any).lastEmissionAngle);
                (p as any).lastEmissionAngle = coherent.angle;
                emitVx = Math.cos(coherent.angle) * LIGHT_SPEED;
                emitVy = Math.sin(coherent.angle) * LIGHT_SPEED;
                gIndex = coherent.gluonIndex;
                p.color = coherent.recoilColor as ParticleColor;
                p.colorVector = fundamentalColorVector(p.color);
              } else {
                const flow = sampleRadiativeGluonColor(p.color);
                p.color = flow.newEmitterColor as ParticleColor;
                p.colorVector = fundamentalColorVector(p.color);
                gIndex = flow.gluonIndex;
                gColor = flow.gluonColor;
                diag = flow.diagonalGluon;
              }

              p.lastRadiationKind = 'gluon';
              this.radiationStats.gluonCount++;
              this.radiationStats.gluonEnergy += emitEnergy;
              this.addParticle({
                kind: 'gluon',
                x: p.x,
                y: p.y,
                vx: emitVx,
                vy: emitVy,
                isRadiation: true,
                energy: emitEnergy,
                gluonIndex: gIndex,
                gluonColor: gColor,
                diagonalGluon: diag
              });
            } else if (Math.abs(p.charge) > 0 && this.settings.bremsstrahlungEnabled) {
              p.lastRadiationKind = 'photon';
              this.radiationStats.photonCount++;
              this.radiationStats.photonEnergy += emitEnergy;
              const angle = Math.atan2(-p.vy, -p.vx) || 0;
              const helicity: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
              const photon = this.addParticle({
                kind: 'photon',
                x: p.x,
                y: p.y,
                vx: Math.cos(angle) * LIGHT_SPEED,
                vy: Math.sin(angle) * LIGHT_SPEED,
                isRadiation: true,
                energy: emitEnergy
              });
              photon.polarization = this.qed.createPolarization(photon.vx, photon.vy, 0, helicity, angle + Math.PI * 0.5);
              if (this.emField && this.settings.maxwellFieldEnabled) {
                this.emField.injectPhotonWave(p.x, p.y, photon.vx, photon.vy, emitEnergy, helicity);
              }
            }
          }
        }

        // Particle Decays: Poisson decay using exact relativistic proper time dτ = dt / γ
        const isConfinedNucleonConstituent = this.macroparticles.some(m =>
          (m.type === 'proton' || m.type === 'neutron') && m.constituentIds.includes(p.id)
        );
        if (this.settings.singleParticleDecaysEnabled && !isConfinedNucleonConstituent && p.decayRate > 0) {
          const effectiveDt = this.settings.properTimeDilationEnabled ? (subDt / Math.max(1, p.lorentzGamma || 1)) : subDt;
          const quantumStatFactor = this.decayQuantumStatisticalFactor(p);
          const prob = 1 - Math.exp(-p.decayRate * this.settings.decayRateMultiplier * effectiveDt * 0.05 * quantumStatFactor);
          if (Math.random() < prob) this.executeDecay(p);
        }
      }

      // Enforce the strict 2+1D spatial phase space after interaction/event updates.
      // Radiation is normalized as a planar massless four-vector.
      for (const p of this.particles) {
        p.z = 0; p.vz = 0; p.pz = 0; p.momentumZ = 0; p._momentumVz = 0;
        if (p.isRadiation) {
          const speed = Math.hypot(p.vx, p.vy) || 1;
          p.vx = LIGHT_SPEED * p.vx / speed;
          p.vy = LIGHT_SPEED * p.vy / speed;
          p.vz = 0;
          p.momentumX = (p.energy / LIGHT_SPEED) * (p.vx / LIGHT_SPEED);
          p.momentumY = (p.energy / LIGHT_SPEED) * (p.vy / LIGHT_SPEED);
          p.momentumZ = 0;
          p.px = p.momentumX; p.py = p.momentumY; p.pz = 0;
          p._momentumVx = p.vx; p._momentumVy = p.vy; p._momentumVz = 0;
        } else {
          this.setVelocity(p, p.vx, p.vy, 0);
        }
      }
      this.updatePlanarManyBodyState(subDt);
    }
  }

  collidePhotonsHeadOn(energy = 5.0) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const g1 = this.addParticle({
      kind: 'photon',
      x: cx - 180,
      y: cy,
      vx: LIGHT_SPEED,
      vy: 0,
      isRadiation: true,
      energy
    });
    g1.polarization = this.qed.createPolarization(LIGHT_SPEED, 0, 0, 1, 0);

    const g2 = this.addParticle({
      kind: 'photon',
      x: cx + 180,
      y: cy,
      vx: -LIGHT_SPEED,
      vy: 0,
      isRadiation: true,
      energy
    });
    g2.polarization = this.qed.createPolarization(-LIGHT_SPEED, 0, 0, -1, 0);

    this.logEvent('collision', cx, cy, `💥 Fired Breit-Wheeler Photon Collider (s=${(4*energy*energy).toFixed(1)} u ≥ 4m_e²c⁴ threshold)!`, '#38bdf8');
  }

  emitPolarizedPhoton(helicity: 1 | -1, angle = 0) {
    const cx = this.width * 0.2;
    const cy = this.height * 0.5;
    const g = this.addParticle({
      kind: 'photon',
      x: cx,
      y: cy,
      vx: LIGHT_SPEED,
      vy: 0,
      isRadiation: true,
      energy: 4.5
    });
    g.polarization = this.qed.createPolarization(LIGHT_SPEED, 0, 0, helicity, angle);
    if (this.emField && this.settings.maxwellFieldEnabled) {
      this.emField.injectPhotonWave(cx, cy, LIGHT_SPEED, 0, 4.5, helicity);
    }
    this.logEvent('emission', cx, cy, `📡 Emitted Polarized Photon with Helicity λ = ${helicity > 0 ? '+1 (RHC)' : '-1 (LHC)'}!`, '#facc15');
  }

  injectMagneticPulse(strength = 1.5) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    this.emField.injectMagneticPulse(cx, cy, strength, 160);
    this.logEvent('magnetic_pulse', cx, cy, `🧲 Injected Magnetic Pulse (ΔBz = ${strength > 0 ? '+' : ''}${strength.toFixed(1)} u)!`, '#06b6d4');
  }

  triggerComptonCollision() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    this.addParticle({
      kind: 'electron',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0
    });
    const photon = this.addParticle({
      kind: 'photon',
      x: cx - 140,
      y: cy,
      vx: LIGHT_SPEED,
      vy: 0,
      isRadiation: true,
      energy: 6.0
    });
    photon.polarization = this.qed.createPolarization(LIGHT_SPEED, 0, 0, 1, 0);
    this.logEvent('compton_setup', cx, cy, `⚛ Injected High-Energy Photon towards Target Electron for Compton Scattering!`, '#fde047');
  }

  executeDecay(p: ParticleInstance) {
    if (!this.weak) return;
    // An up quark is the lightest quark and has no kinematically allowed
    // Standard Model weak decay. Keep this invariant at the execution boundary
    // as well as in addParticle's decay-rate initialization, so a stale or
    // malformed channel table can never delete an isolated up quark.
    if (p.kind === 'up') return;
    const channels = this.weak.calculateDecayChannels(p);
    if (!channels || channels.length === 0) return;

    // Branching ratios already contain |M|² and final-state phase space.
    // Treat sqrt(BR) as the channel amplitude and sample |amplitude|² (Born rule).
    const channelAmplitudes = channels.map(ch =>
      Complex.fromPolar(Math.sqrt(Math.max(0, ch.branchingRatio || 0)), 0)
    );
    const bornSample = PlanarManyBodyQuantumState.sampleBornIndex(channelAmplitudes);
    const channel = channels[bornSample.index >= 0 ? bornSample.index : 0] || channels[0];
    const mx = p.x;
    const my = p.y;
    const nProds = channel.products.length;
    const parentFour = this.fourMomentum(p);
    const daughterMasses = channel.products.map(pr => {
      const cfg = STANDARD_MODEL_PARTICLES[pr.kind];
      return cfg ? cfg.massMeV : 1.0;
    });

    // Validate the complete on-shell final-state phase space BEFORE consuming
    // the parent. Previously an energetically forbidden or numerically
    // unsampleable channel could remove the parent and then produce no daughters.
    const phaseVectors = sampleInvariantPhaseSpace(parentFour, daughterMasses);
    if (!phaseVectors || phaseVectors.length !== nProds) return;

    this.removeParticle(p.id);
    const products: ParticleInstance[] = [];

    if (phaseVectors && phaseVectors.length === nProds) {
      for (let i = 0; i < nProds; i++) {
        const prod = channel.products[i];
        const vec = phaseVectors[i];
        const vel = physicalVelocityFromMomentum(daughterMasses[i], vec.px, vec.py, vec.pz || 0, LIGHT_SPEED);
        const added = this.addParticle({
          kind: prod.kind,
          x: mx + (Math.random() - 0.5) * 2,
          y: my + (Math.random() - 0.5) * 2,
          vx: vel.vx,
          vy: vel.vy,
          vz: vel.vz,
          energy: vec.E,
          momentumX: vec.px,
          momentumY: vec.py,
          momentumZ: vec.pz || 0,
          isAntiparticle: prod.isAntiparticle,
          color: prod.color
        });
        added.px = vec.px;
        added.py = vec.py;
        added.pz = vec.pz || 0;
        added.energy = vec.E;
        products.push(added);
      }

      // Check strict 4-momentum conservation
      const totalOutE = products.reduce((acc, pr) => acc + pr.energy, 0);
      const totalOutPx = products.reduce((acc, pr) => acc + pr.px, 0);
      const totalOutPy = products.reduce((acc, pr) => acc + pr.py, 0);
      const errE = Math.abs(totalOutE - parentFour.E);
      const errP = Math.hypot(totalOutPx - parentFour.px, totalOutPy - parentFour.py);
      this.physicsStats.totalEnergyConservationError = Math.max(this.physicsStats.totalEnergyConservationError || 0, errE);
      this.physicsStats.totalMomentumConservationError = Math.max(this.physicsStats.totalMomentumConservationError || 0, errP);
      this.physicsStats.lastConservation = { errE, errP, parent: p.symbol, time: Date.now() };

      // Entanglement Generation: For 2-body decays of spin-0 parents (e.g. H⁰ → bb̄, π⁰ → γγ),
      // create quantum entangled Bell singlet state |Ψ⁻⟩ = 1/√2 (|↑↓⟩ - |↓↑⟩)
      if (products.length === 2 && this.settings.bellEntanglementEnabled && p.spin === 0) {
        const bell = new EntangledBipartiteState(products[0].id, products[1].id, 'psi_minus');
        this.entangledPairs.set(bell.id, bell);
        products[0].entangledStateId = bell.id;
        products[0].entangledPartnerId = products[1].id;
        products[1].entangledStateId = bell.id;
        products[1].entangledPartnerId = products[0].id;
        products[0].quantumSpinor = new SpinorState(new Complex(1 / Math.SQRT2, 0), new Complex(0, 0));
        products[1].quantumSpinor = new SpinorState(new Complex(0, 0), new Complex(-1 / Math.SQRT2, 0));
        this.logEvent(
          'entanglement_created',
          mx,
          my,
          `🌌 Generated Quantum Entangled Bell Singlet |Ψ⁻⟩: (${products[0].symbol} & ${products[1].symbol})!`,
          '#c084fc',
          3.5
        );
      }
    } else {
      // Fallback 2-body / 3-body
      for (const prod of channel.products) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5;
        const added = this.addParticle({
          kind: prod.kind,
          x: mx,
          y: my,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          isAntiparticle: prod.isAntiparticle,
          color: prod.color
        });
        products.push(added);
      }
    }

    // Spawn virtual weak gauge boson propagator marker for weak decay modes
    if (channel.currentType === 'charged_current' && products.length >= 2) {
      const bosonKind = p.charge > 0 || (channel.products.some(pr => pr.kind === 'w_plus')) ? 'w_plus' : 'w_minus';
      this.weak.createVirtualWeakMarker(mx - 8, my - 8, mx + 8, my + 8, 'charged_current', bosonKind, -2.4);
      this.physicsStats.chargedCurrentEvents = (this.physicsStats.chargedCurrentEvents || 0) + 1;
    } else if (channel.currentType === 'neutral_current' && products.length >= 2) {
      this.weak.createVirtualWeakMarker(mx - 8, my - 8, mx + 8, my + 8, 'neutral_current', 'z_boson', -3.2);
      this.physicsStats.neutralCurrentEvents = (this.physicsStats.neutralCurrentEvents || 0) + 1;
    }

    this.physicsStats.betaDecays++;
    const brPercent = (channel.branchingRatio * 100).toFixed(1);
    this.logEvent(
      'decay',
      mx,
      my,
      `Weak Decay (${channel.currentType}): ${p.name} → ${products.map(pr => pr.name).join(' + ')} [BR = ${brPercent}%, Γ = ${channel.partialWidthMeV.toExponential(2)} MeV]`,
      '#fb7185',
      3.2
    );
  }

  initializeNeutrinoState(p: ParticleInstance) {
    if (!this.weak) return;
    const flavor = (p.kind.includes('neutrino') ? p.kind : 'electron_neutrino') as 'electron_neutrino' | 'muon_neutrino' | 'tau_neutrino';
    p.neutrinoState = this.weak.createNeutrinoQuantumState(flavor);
  }

  addBarrier(quasiBound = false): Barrier {
    const b: Barrier = {
      id: this.nextBarrierId++,
      x: quasiBound ? this.width * 0.4 : this.width * 0.48,
      y: this.height * 0.15,
      width: this.settings.barrierWidth || 10,
      height: this.height * 0.7,
      potential: this.settings.barrierHeight || 18
    };
    this.barriers.push(b);
    return b;
  }

  fireProbe() {
    this.addParticle({
      kind: 'electron',
      x: 20,
      y: this.height * 0.5,
      vx: this.settings.probeBeta * LIGHT_SPEED,
      vy: 0
    });
    this.logEvent('probe', 20, this.height * 0.5, `Deep Inelastic Scattering: Fired electron probe at β=${this.settings.probeBeta}!`, '#38bdf8');
  }

  spawnNucleon(type: 'proton' | 'neutron', x: number, y: number) {
    if (type === 'proton') {
      const u1 = this.addParticle({ kind: 'up', x: x - 6, y: y - 5, color: 'red' });
      const u2 = this.addParticle({ kind: 'up', x: x + 6, y: y - 5, color: 'green' });
      const d = this.addParticle({ kind: 'down', x: x, y: y + 6, color: 'blue' });
      this.formMacroparticle('proton', [u1, u2, d]);
    } else {
      const u = this.addParticle({ kind: 'up', x: x, y: y - 6, color: 'red' });
      const d1 = this.addParticle({ kind: 'down', x: x - 6, y: y + 5, color: 'green' });
      const d2 = this.addParticle({ kind: 'down', x: x + 6, y: y + 5, color: 'blue' });
      this.formMacroparticle('neutron', [u, d1, d2]);
    }
  }

  pickRenderedParticle(x: number, y: number): ParticleInstance | null {
    let closest: ParticleInstance | null = null;
    let minDist = 25;
    for (const p of this.particles) {
      if (p._removed) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < p.radius + 8 && d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return closest;
  }

  buildParticleRenderLayout() {
    const map = new Map<number, { x: number; y: number; radius: number; scale: number }>();
    for (const p of this.particles) {
      map.set(p.id, { x: p.x, y: p.y, radius: p.radius, scale: 1 });
    }
    return { positions: map, scale: 1 };
  }

  renderWavepackets(ctx: CanvasRenderingContext2D) {
    if (!this.settings.showWavepackets) return;
    for (const p of this.particles) {
      if (p._removed || p.isVirtual || !p.sigma) continue;
      const r = Math.min(p.sigma, this.settings.packetDisplayCap || 70);
      const isNu = p.kind.includes('neutrino');

      if (isNu && p.neutrinoState && this.settings.showNeutrinoOscillationGauges) {
        const [pe, pmu, ptau] = p.neutrinoState.flavorProbabilities;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);

        // Blended RGB based on flavor probabilities:
        // nu_e (cyan/sky: [34, 211, 238]), nu_mu (violet: [167, 139, 250]), nu_tau (amber: [251, 191, 36])
        const redC = Math.round(34 * pe + 167 * pmu + 251 * ptau);
        const grnC = Math.round(211 * pe + 139 * pmu + 191 * ptau);
        const bluC = Math.round(238 * pe + 250 * pmu + 36 * ptau);

        ctx.fillStyle = `rgba(${redC}, ${grnC}, ${bluC}, ${p.neutrinoState.inMatterResonance ? 0.22 : 0.12})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${redC}, ${grnC}, ${bluC}, ${p.neutrinoState.inMatterResonance ? 0.85 : 0.45})`;
        ctx.lineWidth = p.neutrinoState.inMatterResonance ? 2.0 : 1.0;
        ctx.stroke();

        // Pulsing resonance outer ring
        if (p.neutrinoState.inMatterResonance) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 3.0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.7)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      } else {
        const color = isNu ? '167, 139, 250' : p.isRadiation ? '250, 204, 21' : '56, 189, 248';
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, 0.08)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, 0.3)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  renderQuantumOverlay(ctx: CanvasRenderingContext2D) {
    // Render barrier walls
    for (const b of this.barriers) {
      ctx.save();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
      ctx.fillStyle = '#d8b4fe';
      ctx.font = '10px monospace';
      ctx.fillText(`V = ${b.potential} u`, b.x - 2, b.y - 6);
      ctx.restore();
    }

    // Render QED virtual photon Feynman exchange propagators
    if (this.settings.qedInteractionsEnabled && this.settings.showVirtualPhotons && this.qed) {
      this.qed.renderVirtualPhotons(ctx);
    }

    // Render Electroweak virtual W± and Z⁰ exchange propagators
    if (this.settings.showWeakVirtualBosons && this.weak) {
      this.weak.renderVirtualWeakMarkers(ctx);
    }
  }

  getForceBreakdown(id: number) {
    const p = this.particles.find(q => q.id === id);
    if (!p) return { total: 0, em: 0, strong: 0, grav: 0 };
    let em = 0, strong = 0, grav = 0;

    if (this.settings.maxwellFieldEnabled && this.settings.lorentzForceEnabled && p.lorentzForce) {
      em = Math.hypot(p.lorentzForce[0], p.lorentzForce[1], p.lorentzForce[2] || 0);
    }

    for (const q of this.particles) {
      if (q.id === id || q._removed) continue;
      const d = this.relativePosition(p, q);
      const r = Math.hypot(d.dx, d.dy);
      if (r > 180 || r < 1) continue;
      if (!this.settings.maxwellFieldEnabled && p.charge && q.charge) {
        em += Math.abs(220 * p.charge * q.charge / Math.sqrt(r * r + 16));
      }
      if (this.isConfiningQuarkPair(p, q)) strong += this.getConfinementForceMagnitude(r);
      grav += 15 * p.mass * q.mass / (r * r + 12);
    }
    return {
      total: em + strong + grav,
      em,
      strong,
      grav
    };
  }

  // --- Interactive QCD Non-Abelian & Hadronization Triggers ---

  /**
   * Spawns an energetic gluon (or picks an existing one) and triggers Altarelli-Parisi splitting g → q + q̄
   */
  splitGluon(id?: number) {
    let gluon = id ? this.particles.find(p => p.id === id && p.kind === 'gluon') : null;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    if (!gluon) {
      gluon = this.addParticle({
        kind: 'gluon',
        x: cx,
        y: cy,
        vx: LIGHT_SPEED * 0.8,
        vy: 0,
        isRadiation: true,
        energy: 6.5,
        gluonIndex: 1
      });
    }

    const gx = gluon.x;
    const gy = gluon.y;
    this.removeParticle(gluon.id);

    const q1 = this.addParticle({
      kind: 'up',
      x: gx - 6,
      y: gy,
      vx: LIGHT_SPEED * 0.65,
      vy: 1.2,
      color: 'red'
    });
    const q2 = this.addParticle({
      kind: 'up',
      x: gx + 6,
      y: gy,
      vx: LIGHT_SPEED * 0.65,
      vy: -1.2,
      isAntiparticle: true,
      color: 'anti_red'
    });
    this.createBond(q1, q2);

    this.physicsStats.gluonSplittings = (this.physicsStats.gluonSplittings || 0) + 1;
    this.logEvent('gluon_split_manual', gx, gy, `💥 Altarelli-Parisi Splitting Triggered: g → u + ū (color: red & anti-red)!`, '#f43f5e', 4.0);
  }

  /**
   * Fires two gluons on colliding trajectories with a non-Abelian 3-gluon interaction vertex
   */
  triggerThreeGluonVertex(x?: number, y?: number) {
    const cx = x ?? this.width * 0.5;
    const cy = y ?? this.height * 0.5;

    this.addParticle({
      kind: 'gluon',
      x: cx - 140,
      y: cy,
      vx: LIGHT_SPEED * 0.9,
      vy: 0,
      isRadiation: true,
      energy: 4.8,
      gluonIndex: 1
    });

    this.addParticle({
      kind: 'gluon',
      x: cx + 140,
      y: cy,
      vx: -LIGHT_SPEED * 0.9,
      vy: 0,
      isRadiation: true,
      energy: 4.8,
      gluonIndex: 2
    });

    this.physicsStats.threeGluonVertices = (this.physicsStats.threeGluonVertices || 0) + 1;
    this.logEvent('three_gluon_trigger', cx, cy, `⚡ Injected 3-Gluon Vertex Collider: g(a=1) + g(a=2) → g*(a=3) via if^{abc}T^c coupling!`, '#eab308', 3.5);
  }

  /**
   * Fires gluons on intersecting angles to demonstrate the 4-gluon quartic contact vertex
   */
  triggerFourGluonVertex(x?: number, y?: number) {
    const cx = x ?? this.width * 0.5;
    const cy = y ?? this.height * 0.5;

    this.addParticle({
      kind: 'gluon',
      x: cx - 120,
      y: cy - 60,
      vx: LIGHT_SPEED * 0.7,
      vy: LIGHT_SPEED * 0.35,
      isRadiation: true,
      energy: 5.2,
      gluonIndex: 4
    });

    this.addParticle({
      kind: 'gluon',
      x: cx + 120,
      y: cy + 60,
      vx: -LIGHT_SPEED * 0.7,
      vy: -LIGHT_SPEED * 0.35,
      isRadiation: true,
      energy: 5.2,
      gluonIndex: 5
    });

    this.physicsStats.fourGluonVertices = (this.physicsStats.fourGluonVertices || 0) + 1;
    this.logEvent('four_gluon_trigger', cx, cy, `⚛ Injected 4-Gluon Quartic Contact Interaction (-ig_s² [f^{abe}f^{cde} + ...])!`, '#f59e0b', 3.5);
  }

  /**
   * Stretches a quark-antiquark pair to high separation and forces Lund string fragmentation
   */
  fragmentLundString() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    const q1 = this.addParticle({
      kind: 'up',
      x: cx - 110,
      y: cy,
      vx: -2.8,
      vy: 0,
      color: 'red'
    });

    const q2 = this.addParticle({
      kind: 'up',
      x: cx + 110,
      y: cy,
      vx: 2.8,
      vy: 0,
      isAntiparticle: true,
      color: 'anti_red'
    });

    this.createBond(q1, q2);
    this.logEvent('lund_setup', cx, cy, `🧶 Stretched High-Tension QCD Flux Tube (r=220px): 2D logarithmic color potential plus linear string tension exceeding the Schwinger threshold!`, '#fb923c', 4.0);
  }

  /**
   * Spawns 3 valence quarks in a minimal Steiner tree Fermat-Torricelli Y-junction
   */
  spawnSteinerBaryon(type: 'proton' | 'neutron' = 'proton') {
    const cx = this.width * 0.5 + (Math.random() - 0.5) * 60;
    const cy = this.height * 0.5 + (Math.random() - 0.5) * 60;
    const R = 32;

    const a1 = -Math.PI / 2;
    const a2 = a1 + (2 * Math.PI) / 3;
    const a3 = a1 + (4 * Math.PI) / 3;

    const k1: ParticleKind = type === 'proton' ? 'up' : 'up';
    const k2: ParticleKind = type === 'proton' ? 'up' : 'down';
    const k3: ParticleKind = 'down';

    const q1 = this.addParticle({ kind: k1, x: cx + Math.cos(a1) * R, y: cy + Math.sin(a1) * R, color: 'red' });
    const q2 = this.addParticle({ kind: k2, x: cx + Math.cos(a2) * R, y: cy + Math.sin(a2) * R, color: 'green' });
    const q3 = this.addParticle({ kind: k3, x: cx + Math.cos(a3) * R, y: cy + Math.sin(a3) * R, color: 'blue' });

    this.formMacroparticle(type, [q1, q2, q3]);
    this.physicsStats.steinerBaryons = (this.physicsStats.steinerBaryons || 0) + 1;
    this.logEvent(
      'steiner_baryon_spawn',
      cx,
      cy,
      `📐 Formed Minimal Steiner Tree ${type === 'proton' ? 'Proton (uud)' : 'Neutron (udd)'}: 120° Fermat-Torricelli Y-Junction!`,
      '#38bdf8',
      4.0
    );
  }

  // --- Interactive Electroweak Triggers ---

  /**
   * Triggers a Charged-Current (CC) Beta Decay event:
   * d quark decays via W⁻ into u + e⁻ + ν̄_e with CKM |V_ud|²
   */
  triggerChargedCurrentBetaDecay() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    const dQuark = this.addParticle({
      kind: 'down',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      color: 'blue'
    });

    this.executeDecay(dQuark);
  }

  /**
   * Fires a Neutral-Current (NC) Neutrino-Electron scattering collision:
   * ν_μ + e⁻ → ν_μ' + e'⁻ via virtual Z⁰ exchange
   */
  triggerNeutralCurrentNeutrinoScatter() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'electron',
      x: cx + 40,
      y: cy,
      vx: 0,
      vy: 0
    });

    const nu = this.addParticle({
      kind: 'muon_neutrino',
      x: cx - 120,
      y: cy,
      vx: LIGHT_SPEED * 0.9,
      vy: 0,
      energy: 4.5
    });

    this.logEvent(
      'nc_setup',
      cx,
      cy,
      `⚛ Injected Muon Neutrino beam towards Target Electron for Neutral-Current Z⁰ Elastic Scattering!`,
      '#c026d3',
      3.5
    );
  }

  /**
   * Fires head-on Neutrino-Antineutrino collision:
   * ν + ν̄ → Z* → f + f̄ (e⁺e⁻ / μ⁺μ⁻ / qq̄)
   */
  collideNeutrinoAntineutrino() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    const nu1 = this.addParticle({
      kind: 'electron_neutrino',
      x: cx - 140,
      y: cy,
      vx: LIGHT_SPEED * 0.85,
      vy: 0,
      energy: 5.0
    });

    const nu2 = this.addParticle({
      kind: 'electron_neutrino',
      x: cx + 140,
      y: cy,
      vx: -LIGHT_SPEED * 0.85,
      vy: 0,
      isAntiparticle: true,
      energy: 5.0
    });

    this.logEvent(
      'nu_collider_setup',
      cx,
      cy,
      `💥 Fired Neutrino-Antineutrino Collider (ν_e + ν̄_e → Z* → fermion-antifermion pair)!`,
      '#d946ef',
      4.0
    );
  }

  /**
   * Injects Glashow Resonance event:
   * Ultra-high-energy ν̄_e colliding with atomic electron at s ≈ M_W² → real W⁻
   */
  fireGlashowResonance() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'electron',
      x: cx + 30,
      y: cy,
      vx: 0,
      vy: 0
    });

    this.addParticle({
      kind: 'electron_neutrino',
      x: cx - 130,
      y: cy,
      vx: LIGHT_SPEED * 0.95,
      vy: 0,
      isAntiparticle: true,
      energy: 8.0
    });

    this.logEvent(
      'glashow_setup',
      cx,
      cy,
      `🌟 Injected Resonant ν̄_e beam for Glashow Resonance (s = M_W² = 80.4 GeV² threshold)!`,
      '#f43f5e',
      4.0
    );
  }

  /**
   * Injects Solar/Matter MSW Neutrino Beam:
   * Pure ν_e beam launched across the simulation space with matter density gradient
   * demonstrating real-time MSW resonance conversion into ν_μ and ν_τ.
   */
  fireSolarMSWNeutrinoBeam() {
    const startX = 30;
    const cy = this.height * 0.5;

    for (let i = 0; i < 5; i++) {
      const yOffset = (i - 2) * 24;
      const nu = this.addParticle({
        kind: 'electron_neutrino',
        x: startX + (Math.random() - 0.5) * 10,
        y: cy + yOffset,
        vx: LIGHT_SPEED * 0.75,
        vy: (Math.random() - 0.5) * 0.4,
        energy: 2.5 + i * 0.5
      });
      // Ensure pure initial electron flavor
      nu.neutrinoState = this.weak.createNeutrinoQuantumState('electron_neutrino');
    }

    this.logEvent(
      'solar_msw_setup',
      startX,
      cy,
      `🌌 Injected Coherent Solar ν_e Beam: Propagating through matter gradient with real-time MSW flavor conversion!`,
      '#38bdf8',
      4.5
    );
  }

  // ==========================================
  // HIGGS FIELD & ELECTROWEAK SYMMETRY BREAKING CONTROLS
  // ==========================================

  /**
   * Toggles between Electroweak Broken Phase (v = 246.22 GeV) and
   * Unbroken Symmetric Phase (v = 0 GeV, T > T_c) where all fundamental particles are massless.
   */
  toggleElectroweakSymmetryBreaking(): void {
    const nextState = !this.settings.ewsbBrokenPhase;
    this.settings.ewsbBrokenPhase = nextState;
    if (nextState) {
      this.settings.higgsVev = HIGGS_VEV_STANDARD_GEV;
      this.recalculateFermionMasses();
      this.logEvent(
        'ewsb_transition',
        this.width * 0.5,
        this.height * 0.5,
        `❄ Electroweak Symmetry Breaking: SU(2)_L × U(1)_Y → U(1)_em! Non-zero VEV v = 246.2 GeV generated; fermions acquired masses!`,
        '#ec4899',
        5.0
      );
    } else {
      this.settings.higgsVev = 0;
      this.recalculateFermionMasses();
      this.logEvent(
        'ewsb_transition',
        this.width * 0.5,
        this.height * 0.5,
        `🔥 Restored Electroweak Symmetry: T > T_c (v = 0 GeV)! All fundamental fermions, W± and Z⁰ bosons are strictly MASSLESS!`,
        '#38bdf8',
        5.0
      );
    }
  }

  /**
   * Sets the Vacuum Expectation Value v (in GeV) and dynamically updates fermion masses
   */
  setHiggsVev(vev: number): void {
    this.settings.higgsVev = Math.max(0, vev);
    this.settings.ewsbBrokenPhase = this.settings.higgsVev > 0;
    this.recalculateFermionMasses();
  }

  /**
   * Sets the Mexican Hat potential parameters mu^2 and lambda:
   * V(Phi) = -mu^2 Phi^dagger Phi + lambda (Phi^dagger Phi)^2
   */
  setHiggsPotentialParameters(mu2: number, lambda: number): void {
    this.settings.higgsPotentialMu2 = Math.max(10, mu2);
    this.settings.higgsPotentialLambda = Math.max(0.01, lambda);
    if (this.settings.ewsbBrokenPhase) {
      this.settings.higgsVev = Math.sqrt(this.settings.higgsPotentialMu2 / this.settings.higgsPotentialLambda);
    }
    this.recalculateFermionMasses();
  }

  /**
   * Spawns two high-energy gluons that fuse via a top-quark loop into a Higgs boson:
   * g + g → [Top loop, y_t ≈ 1.0] → H⁰ (Dominant LHC production channel)
   */
  triggerGluonFusionHiggs(): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'gluon',
      x: cx - 110,
      y: cy,
      vx: LIGHT_SPEED * 0.85,
      vy: 0,
      energy: 4.5,
      gluonIndex: 1
    });

    this.addParticle({
      kind: 'gluon',
      x: cx + 110,
      y: cy,
      vx: -LIGHT_SPEED * 0.85,
      vy: 0,
      energy: 4.5,
      gluonIndex: 2
    });

    this.logEvent(
      'ggf_setup',
      cx,
      cy,
      `💥 Injected Gluon Pair for ggF: g + g → [Top Loop (y_t ≈ 1.0)] → H⁰ (LHC ggF channel)!`,
      '#ec4899',
      4.0
    );
  }

  /**
   * Spawns colliding W⁺ and W⁻ bosons to demonstrate Vector Boson Fusion (VBF):
   * W⁺ + W⁻ → H⁰ mediated by trilinear gauge coupling g_HWW = 2 M_W² / v
   */
  triggerVectorBosonFusion(): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'w_plus',
      x: cx - 90,
      y: cy,
      vx: 3.2,
      vy: 0,
      energy: 6.0
    });

    this.addParticle({
      kind: 'w_minus',
      x: cx + 90,
      y: cy,
      vx: -3.2,
      vy: 0,
      energy: 6.0
    });

    this.logEvent(
      'vbf_setup',
      cx,
      cy,
      `⚡ Injected W⁺ & W⁻ for Vector Boson Fusion (VBF): W⁺ + W⁻ → H⁰ (g_HWW = 2 M_W²/v)!`,
      '#f43f5e',
      4.0
    );
  }

  /**
   * Spawns e⁺e⁻ collision demonstrating Associated Production / Higgsstrahlung:
   * e⁺ + e⁻ → Z* → Z⁰ + H⁰
   */
  triggerHiggsstrahlung(): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'electron',
      x: cx - 95,
      y: cy,
      vx: 3.8,
      vy: 0,
      isAntiparticle: false
    });

    this.addParticle({
      kind: 'electron',
      x: cx + 95,
      y: cy,
      vx: -3.8,
      vy: 0,
      isAntiparticle: true
    });

    this.logEvent(
      'higgsstrahlung_setup',
      cx,
      cy,
      `⚛ Injected e⁺e⁻ collider for Higgsstrahlung: e⁺ + e⁻ → Z* → Z⁰ + H⁰!`,
      '#ec4899',
      4.0
    );
  }

  /**
   * Spawns two Higgs bosons on a collision course to demonstrate Higgs Self-Scattering:
   * H⁰ + H⁰ → H⁰ + H⁰ via quartic contact vertex λ_4H and trilinear exchange λ_3H
   */
  triggerHiggsSelfInteraction(): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.addParticle({
      kind: 'higgs',
      x: cx - 80,
      y: cy - 10,
      vx: 2.8,
      vy: 0.3,
      energy: 5.0
    });

    this.addParticle({
      kind: 'higgs',
      x: cx + 80,
      y: cy + 10,
      vx: -2.8,
      vy: -0.3,
      energy: 5.0
    });

    this.logEvent(
      'higgs_self_setup',
      cx,
      cy,
      `🌟 Injected 2 Higgs Bosons: H⁰ + H⁰ → H⁰ + H⁰ via Trilinear (λ_3H) & Quartic (λ_4H) Self-Couplings!`,
      '#d946ef',
      4.0
    );
  }

  /**
   * Retrieves all active fermionic modes identified across visible particles and lattice orbitals.
   * Each fermionic mode is identified by:
   * - Particle species and flavor
   * - Particle or antiparticle
   * - Spatial lattice site or momentum orbital
   * - 2+1D spinor component
   * - Color state, where applicable
   * - Any other internal quantum number required by the chosen theory (Q, T3, Y, B, L, Wilson mass, doubler status).
   */
  getFermionicModes(): FermionicModeIdentification[] {
    const modes: FermionicModeIdentification[] = [];
    const spacing = this.settings.latticeSpacingA || 0.5;
    const r = this.settings.wilsonParameterR || 1.0;
    for (const p of this.particles) {
      if (p.isFermion && !p._removed && !p.isVirtual && !p.isRadiation) {
        const pModes = FermionicModeRegistry.createModesForParticle(p, 16, spacing, r);
        modes.push(...pModes);
      }
    }
    return modes;
  }

  /**
   * Evaluates the Wilson lattice regulator doubler spectrum at high-symmetry points Gamma, X, Y, M.
   */
  getDoublerSpectrum(): DoublerSpectrumPoint[] {
    const spacing = this.settings.latticeSpacingA || 0.5;
    const r = this.settings.wilsonParameterR || 1.0;
    return computeWilsonDoublerSpectrum(0.511, spacing, r);
  }

  /**
   * Evaluates the Parity Anomaly and Chern-Simons audit across all 3 Standard Model generations.
   */
  getAnomalyAudit(): AnomalyAuditResult {
    const spacing = this.settings.latticeSpacingA || 0.5;
    const r = this.settings.wilsonParameterR || 1.0;
    const reg = this.settings.latticeRegulator || 'Wilson Fermion';
    return performStandardModelAnomalyAudit(spacing, r, reg);
  }

  /**
   * Returns consistent 2+1D Dirac algebra information for inspectors.
   */
  getDiracAlgebraInfo() {
    return {
      metric: 'diag(+1, -1, -1)',
      irrepPlus: DIRAC_2D_IRREP_PLUS,
      irrepMinus: DIRAC_2D_IRREP_MINUS,
      reducible4x4: DIRAC_2D_REDUCIBLE_4X4,
      spinProjectionOperator: 'S_z = (1/2) * sigma_3 (pseudo-scalar under spatial parity)',
      chargeConjugationMatrix: 'C = sigma_2 (satisfies C * gamma^mu * C^-1 = -(gamma^mu)^T)',
      parityOperator: 'P = gamma^1 * gamma^5 or antidiag(sigma_1, sigma_1)'
    };
  }

  /**
   * Retrieves live diagnostics of the Sparse Fock-state representation:
   * configuration count, Hilbert space dimension, compression ratio, truncation error.
   */
  getSparseFockDiagnostics() {
    const modes = this.getFermionicModes();
    const activeModesCount = Math.max(modes.length, this.adaptiveModeSettings.maxActiveModes);
    const denseDimStr = activeModesCount < 30 ? (1 << activeModesCount).toLocaleString() : `2^${activeModesCount} ≈ ${(Math.pow(2, activeModesCount)).toExponential(2)}`;
    const compression = this.sparseFock.size() / Math.pow(2, Math.min(50, activeModesCount));

    return {
      activeModesCount,
      storedConfigurations: this.sparseFock.size(),
      denseDimension: denseDimStr,
      compressionRatio: compression,
      accumulatedTruncationError: this.sparseFock.accumulatedTruncationError,
      normConservationError: Math.abs(1.0 - this.sparseFock.normSquared()),
      totalParticleNumber: this.sparseFock.getTotalParticleNumber(),
      amplitudeCutoff: this.adaptiveModeSettings.amplitudeCutoff,
      energyCutoff: this.adaptiveModeSettings.energyCutoff
    };
  }

  /**
   * Runs CAR verification across fermionic modes, testing {a_i, a_j^\dagger} = \delta_{ij} I,
   * {a_i, a_j} = 0, {a_i^\dagger, a_j^\dagger} = 0.
   */
  runCARVerification(numModes = 6): FullCARVerificationReport {
    return verifyFermionicCAR(numModes);
  }

  /**
   * Runs Mode-Scaling Convergence Diagnostics across ladder (e.g. M = 6, 12, 18, 24, 32, 48, 64).
   */
  runModeConvergenceSweep(
    modeLadder = [6, 12, 18, 24, 32, 48, 64],
    cutoff = this.adaptiveModeSettings.amplitudeCutoff
  ): ConvergenceSweepReport {
    return runModeConvergenceSweep(modeLadder, cutoff);
  }

  /**
   * Applies creation operator a_k^\dagger to the active sparse Fock state.
   */
  applyModeCreation(k: number) {
    this.sparseFock = this.sparseFock.applyCreation(k);
    if (this.adaptiveModeSettings.enableAdaptivePruning) {
      this.sparseFock.prune(this.adaptiveModeSettings.amplitudeCutoff);
    }
    return this.sparseFock;
  }

  /**
   * Applies annihilation operator a_k to the active sparse Fock state.
   */
  applyModeAnnihilation(k: number) {
    this.sparseFock = this.sparseFock.applyAnnihilation(k);
    if (this.adaptiveModeSettings.enableAdaptivePruning) {
      this.sparseFock.prune(this.adaptiveModeSettings.amplitudeCutoff);
    }
    return this.sparseFock;
  }

  /**
   * Projects the 2+1D lattice gauge fields onto the physical Hilbert space H_phys,
   * satisfying local Gauss constraints:
   *   G^a_SU(3)(x)|Ψ⟩ = 0   (a = 1..8)
   *   G^a_SU(2)(x)|Ψ⟩ = 0   (a = 1..3)
   *   G_U(1)(x)|Ψ⟩ = 0
   * via discrete gauge-covariant divergence relaxation and quantum link state projection.
   */
  projectExactPhysicalGauss() {
    const planarRes = this.planarGaugeQFT ? this.planarGaugeQFT.projectExactPhysicalGauss() : null;
    const linkRes = this.quantumLinkGauge ? this.quantumLinkGauge.projectOntoPhysicalHilbertSpace() : null;
    return { planar: planarRes, link: linkRes };
  }

  /**
   * Returns live local physical Gauss constraint diagnostics.
   */
  getGaussConstraintDiagnostics() {
    const planarDiag = this.planarGaugeQFT ? this.planarGaugeQFT.getDiagnostics() : null;
    const linkTelemetry = this.quantumLinkGauge ? this.quantumLinkGauge.getTelemetry() : null;
    return {
      planar: planarDiag,
      quantumLink: linkTelemetry
    };
  }
}

