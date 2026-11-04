/**
 * Standard Model Physics & Quantum Life Simulation Types
 */

export type QuarkFlavor = 'up' | 'down' | 'charm' | 'strange' | 'top' | 'bottom';
export type LeptonFlavor = 'electron' | 'electron_neutrino' | 'muon' | 'muon_neutrino' | 'tau' | 'tau_neutrino';
export type GaugeBosonKind = 'photon' | 'gluon' | 'w_plus' | 'w_minus' | 'z_boson';
export type ScalarBosonKind = 'higgs';
export type CompositeKind = 'alpha' | 'proton' | 'neutron' | 'pion';

export type ParticleKind = QuarkFlavor | LeptonFlavor | GaugeBosonKind | ScalarBosonKind | 'alpha';

export type ColorRepresentation = 'triplet' | 'antitriplet' | 'octet' | 'singlet';

export type PrimaryColor = 'red' | 'green' | 'blue';
export type AntiColor = 'anti_red' | 'anti_green' | 'anti_blue';
export type ParticleColor = PrimaryColor | AntiColor | 'white' | 'none';

export interface SU3GluonState {
  index: number;
  symbol: string;
  formula: string;
  description: string;
  colorShiftMap: Record<string, string>;
  isDiagonal?: boolean;
}

export interface ParticleDefinition {
  kind: ParticleKind;
  name: string;
  symbol: string;
  family: 'quark' | 'lepton' | 'gauge_boson' | 'scalar_boson' | 'composite';
  generation: number; // 1, 2, 3 for fermions; 0 for bosons
  massMeV: number;
  charge: number; // Electric charge Q in units of e
  spin: number; // Spin quantum number s
  baryonNumber: number; // Baryon number B
  leptonNumber: number; // Lepton number L
  isospin3: number; // Weak isospin I_3
  hypercharge: number; // Hypercharge Y = 2(Q - I_3)
  colorRepresentation: ColorRepresentation;
  isFermion: boolean;
  hasColor: boolean;
  carriesForce?: 'electromagnetism' | 'strong' | 'weak' | 'higgs';
  baseColor: string;
  glowColor: string;
  description: string;
}

export interface FourVector {
  E: number;
  px: number;
  py: number;
  pz?: number;
}

export interface ParticleInstance {
  id: number;
  kind: ParticleKind;
  isAntiparticle: boolean;
  symbol: string;
  name: string;
  family: string;
  generation: number;
  isFermion: boolean;

  // Conserved Quantum Numbers
  massMeV: number;
  mass: number; // scaled simulation mass
  packetEnergy?: number; // expectation value <H> for a propagated relativistic packet
  fockOccupancy?: number; // occupation expectation of the represented particle/antiparticle mode
  fockConjugateOccupancy?: number; // occupation of its charge-conjugate partner mode
  charge: number;
  spin: number;
  spinZ: number;
  spinAngle: number;
  spinSpeed: number;
  colorRepresentation: ColorRepresentation;
  leptonNumber: number;
  baryonNumber: number;
  isospin3: number;
  hypercharge: number;

  // Spatial & Kinematics
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  ax: number;
  ay: number;
  az?: number;
  px: number;
  py: number;
  pz?: number;

  radius: number;
  age: number;
  lifetime?: number;
  pinned: boolean;

  // QCD Color
  color: ParticleColor;
  colorIndex: number | null;
  colorVector: [number, number, number];
  gluonColor?: { color: string; antiColor: string };
  gluonIndex?: number;
  gluonColorIndex?: number | null;
  gluonAntiColorIndex?: number | null;
  gluonVector?: [number, number, number];
  diagonalGluon?: boolean;
  colorFlow?: any;

  // SU(3) Color Algebra Quantum State
  quantumColor?: {
    // 3-component complex spinor in fundamental triplet space |ψ> = c_R|R> + c_G|G> + c_B|B>
    // Stored as [Re(R), Im(R), Re(G), Im(G), Re(B), Im(B)]
    amplitudes: [number, number, number, number, number, number];
    // 8-component adjoint vector A^1 ... A^8 for gluons
    octetAmplitudes?: [number, number, number, number, number, number, number, number];
    casimir: number; // <T^a T^a>: 4/3 for fundamental triplet, 3 for adjoint octet
    dominantColor: ParticleColor;
    phase: number;
  };

  // QED Photon Polarization & Helicity
  polarization?: {
    angle: number; // Linear polarization angle theta in radians [-pi, pi]
    helicity: 1 | -1; // Circular helicity lambda: +1 (RHC) or -1 (LHC)
    circularDegree: number; // Degree of circular polarization V/S0 in [-1, 1]
    stokes: [number, number, number, number]; // [S0, S1, S2, S3]
    phase: number; // Current wave oscillation phase
    ex: number; // Transverse electric unit vector x
    ey: number; // Transverse electric unit vector y
    ez: number; // Transverse electric unit vector z
  };

  // Local Field & Lorentz Force Telemetry
  localE?: [number, number, number]; // [Ex, Ey, Ez]
  localB?: [number, number, number]; // [Bx, By, Bz]
  lorentzForce?: [number, number, number]; // [Fx, Fy, Fz]
  spinHelicity?: number;

  // States
  isVirtual: boolean;
  isRadiation: boolean;
  is_shielded?: boolean;
  energy: number;
  momentumX: number;
  momentumY: number;
  momentumZ?: number;
  decayRate: number;
  decayRateBase?: number;
  radiationType?: string;
  sourceKind?: ParticleKind;
  emitterId?: number;
  singletGroupId?: string;
  singletType?: string;
  clusterId?: number;
  showerCluster?: boolean;

  // Radiative tracking
  radiatedEnergy: number;
  radiationCount: number;
  radiationFlash: number;
  radiationCooldown: number;
  lastRadiationLogTime: number;
  lastRadiationKind?: string;

  // Wavepacket & Neutrino
  sigma0?: number;
  sigma?: number;
  phi?: number;
  packetInitialPhase?: number;
  packetActionPhase?: number;
  packetDispersion?: number;
  packetAge?: number;
  packetProperTime?: number;
  packetTravel?: number;
  packetDispersionModel?: string;
  neutrinoState?: NeutrinoQuantumState;
  orbitalL?: number;

  // Quantum Formalism & Relativistic Kinematics
  quantumSpinor?: any;
  entangledStateId?: string;
  entangledPartnerId?: number;
  properTimeTotal?: number;
  wignerAngle?: number;
  lorentzGamma?: number;


  // Internal flags
  _removed?: boolean;
  _stepVx?: number;
  _stepVy?: number;
  _closeColorInteraction?: boolean;
  _colorInteractionPartnerId?: number;
  _formationUntil?: number;
  _ggAfter?: number;
  _absorbAfter?: number;
  _clusterFlows?: any;
  _clusterSplitAt?: number;
  _nuStepDistance?: number;
  _nuStepLE?: number;
  _momentumVx?: number;
  _momentumVy?: number;
  _momentumVz?: number;
  _radiationDeposited?: boolean;
  weakVirtualW?: boolean;
  weakProducts?: any[];
  weakDecayAt?: number;
  weakProperAge?: number;
  _invariantDecayRest?: FourVector[];
}

export type WeakCurrentType = 'charged_current' | 'neutral_current';

export interface NeutrinoQuantumState {
  // [Re(nu_e), Im(nu_e), Re(nu_mu), Im(nu_mu), Re(nu_tau), Im(nu_tau)]
  flavorAmplitudes: [number, number, number, number, number, number];
  flavorProbabilities: [number, number, number]; // [P(nu_e), P(nu_mu), P(nu_tau)]
  massEigenstates: [number, number, number]; // [|nu_1|^2, |nu_2|^2, |nu_3|^2]
  baselineKm: number;
  phaseRad: number;
  effectiveMatterPotential: number; // V_CC = sqrt(2)*G_F*N_e
  inMatterResonance: boolean; // MSW resonance condition met
  resonancePurity: number; // 0 to 1
  dominantFlavor: 'electron_neutrino' | 'muon_neutrino' | 'tau_neutrino';
}

export interface VirtualWeakMarker {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  currentType: WeakCurrentType;
  bosonKind: 'w_plus' | 'w_minus' | 'z_boson';
  q2: number; // Invariant 4-momentum transfer squared (GeV^2)
  alpha: number;
  age: number;
  maxAge: number;
}

export interface WeakVertex {
  currentType: WeakCurrentType;
  incoming: ParticleKind;
  outgoing: ParticleKind;
  mediator: 'w_plus' | 'w_minus' | 'z_boson';
  couplingConstant: number;
  matrixElementFactor: number; // CKM V_ij for quarks, 1 for leptons, g_V / g_A for NC
  description: string;
}

export interface DecayChannelDefinition {
  id: string;
  name: string;
  currentType: WeakCurrentType | 'electromagnetic' | 'strong' | 'higgs';
  products: Array<{ kind: ParticleKind; isAntiparticle?: boolean; color?: ParticleColor }>;
  matrixElementSquared: number;
  phaseSpaceFactor: number;
  partialWidthMeV: number;
  branchingRatio: number;
  description: string;
}

export interface YukawaDefinition {
  kind: ParticleKind;
  name: string;
  symbol: string;
  family: 'quark' | 'lepton';
  generation: number;
  yukawaCoupling: number; // y_f = sqrt(2) * m_f / v
  physicalMassMeV: number;
  currentMassMeV: number; // m_f(v) = y_f * v / sqrt(2)
  couplingToHiggs: number; // g_Hff = m_f / v
}

export interface HiggsProductionChannel {
  id: string;
  name: string;
  symbol: string;
  crossSectionPb: number;
  fractionPercent: number;
  initialState: string;
  mediator: string;
  description: string;
}

export interface VirtualPhotonMarker {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  q2: number; // Invariant momentum transfer squared (spacelike q^2 < 0)
  alpha: number;
  age: number;
  maxAge: number;
}

export interface Macroparticle {
  id: number;
  name: string;
  symbol: string;
  type: 'proton' | 'neutron' | 'pion' | 'hydrogen' | 'composite';
  constituentIds: number[];
  centerX: number;
  centerY: number;
  radius: number;
  netCharge: number;
  colorNeutral: boolean;
  age: number;
  steinerJunction?: { x: number; y: number };
}

export interface InteractionEvent {
  id: number;
  type: string;
  x: number;
  y: number;
  description: string;
  timestamp: number;
  energy: number;
  color: string;
}

export interface Barrier {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  potential: number;
}

export interface EngineSettings {
  spatialDimensions: 2 | 3;
  relativisticQuantumMotionEnabled: boolean;
  tunnelingEnabled: boolean;
  partonResolutionEnabled: boolean;
  hbar: number;
  barrierWidth: number;
  barrierHeight: number;
  barrierRadius?: number;
  betaSecondsPerTick: number;
  probeBeta: number;
  electromagnetismEnabled: boolean;
  gravityEnabled: boolean;
  strongForceEnabled: boolean;
  weakForceEnabled: boolean;
  pauliExclusionEnabled: boolean;
  higgsCouplingEnabled: boolean;
  macroparticleFormationEnabled: boolean;
  singleParticleDecaysEnabled: boolean;
  subSteps: number;
  bohrRadius: number;
  bohrFloorStrength: number;
  emStrength: number;
  gravityStrength: number;
  strongStrength: number;
  weakStrength: number;
  pauliStrength: number;
  confinementTension: number;
  confinementGrowth: number;
  colorSingletRepulsion: number;
  strongInteractionRadius: number;
  bindingDistance: number;
  vacuumPolarizationEnabled: boolean;
  vacuumPairRate: number;
  ckmDecaysEnabled: boolean;
  neutrinoOscillationEnabled: boolean;
  decayRateMultiplier: number;
  friction: number;
  timeScale: number;
  boundaryMode: 'torus' | 'bounce';
  radiationEnabled: boolean;
  bremsstrahlungEnabled: boolean;
  gluonRadiationEnabled: boolean;
  radiationStrength: number;
  radiationMinEnergy: number;
  asymptoticFreedomEnabled: boolean;
  symplecticOrder: number;
  landauLifshitzDampingEnabled: boolean;
  qedRetardedFieldsEnabled: boolean;
  qedPairProductionEnabled: boolean;
  maxwellFieldEnabled: boolean;
  lorentzForceEnabled: boolean;
  timeDependentRetardation: boolean;
  emWaveSpeed: number;
  qedInteractionsEnabled: boolean;
  breitWheelerEnabled: boolean;
  betheHeitlerEnabled: boolean;
  comptonScatteringEnabled: boolean;
  virtualPhotonExchangeEnabled: boolean;
  fineStructureConstant: number;
  magneticFieldBiasZ: number;
  showElectricFieldVectors: boolean;
  showMagneticFieldHeatmap: boolean;
  showPoyntingVectors: boolean;
  showVirtualPhotons: boolean;
  showPhotonPolarization: boolean;
  su3ColorAlgebraEnabled: boolean;
  gluonSelfInteractionsEnabled: boolean;
  threeGluonVertexEnabled: boolean;
  fourGluonVertexEnabled: boolean;
  qcdInterferenceEnabled: boolean;
  cornellConfinementEnabled: boolean;
  steinerBaryonJunctionEnabled: boolean;
  lundFragmentationEnabled: boolean;
  gluonSplittingEnabled: boolean;
  coherentShowerAngularOrdering: boolean;
  qcdAlphaS: number;
  stringTensionSigma: number;
  showSU3ColorSuperposition: boolean;
  showSteinerFluxTubes: boolean;
  mswMatterOscillationsEnabled: boolean;
  matterElectronDensity: number;
  chargedCurrentEnabled: boolean;
  neutralCurrentEnabled: boolean;
  neutrinoScatteringEnabled: boolean;
  neutrinoAntineutrinoEnabled: boolean;
  pmnsMixingEnabled: boolean;
  showWeakVirtualBosons: boolean;
  showNeutrinoOscillationGauges: boolean;
  fermiGf: number;
  sin2ThetaW: number;
  higgsVev: number;
  higgsFieldEnabled: boolean;
  higgsPotentialMu2: number;
  higgsPotentialLambda: number;
  ewsbBrokenPhase: boolean;
  yukawaCouplingMultiplier: number;
  higgsSelfInteractionsEnabled: boolean;
  higgsGaugeInteractionsEnabled: boolean;
  higgsProductionEnabled: boolean;
  showHiggsFieldCondensate: boolean;
  lambdaQCD: number;
  showWavepackets?: boolean;
  wavePacketSigma?: number;
  packetDispersionModel?: string;
  packetDisplayCap?: number;
  neutrinoKmPerPixel?: number;
  neutrinoGeVPerEnergy?: number;
  pdfLogQ2?: number;
  partonCutoffQ2?: number;
  orbitalL?: number;
  physicalWeakClock?: boolean;
  weakClockExponent?: number;
  partonScatteringEnabled?: boolean;
  gluonScatteringEnabled?: boolean;
  partonCellRadius?: number;
  partonOpacity?: number;
  absorptionProbability?: number;
  virtualExchangeEnabled?: boolean;
  separateParticleSymbols?: boolean;
  atomicCoreEnabled?: boolean;
  forceCutoff?: number;
  quantumInterferenceEnabled: boolean;
  bornRuleMeasurementEnabled: boolean;
  bellEntanglementEnabled: boolean;
  pauliAntisymmetryEnabled: boolean;
  boseSymmetrizationEnabled: boolean;
  exactWaveTunnelingEnabled: boolean;
  properTimeDilationEnabled: boolean;
  wignerRotationEnabled: boolean;
  strict4MomentumConservation: boolean;
  boundaryExchangeTracking: boolean;
  showQuantumInterferenceFringes: boolean;
  showEntangledBellCorrelations: boolean;
  sternGerlachAxisTheta: number;
  sternGerlachAxisPhi: number;
  diracRepresentation2D?: 'irreducible_2x2' | 'reducible_4x4';
  latticeRegulator?: 'Wilson Fermion' | 'Overlap' | 'Naive Central Difference';
  wilsonParameterR?: number;
  latticeSpacingA?: number;
  dimensionalReductionRadiusR?: number;
  parityAnomalyCancellationCheck?: boolean;
  showDoublerSpectrumOverlay?: boolean;
  showFermionicModesHUD?: boolean;
}
