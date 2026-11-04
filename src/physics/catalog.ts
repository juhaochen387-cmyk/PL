/**
 * Standard Model of Elementary Particles Catalog
 * Explicitly storing: Mass (MeV), Electric Charge (Q), Spin (s),
 * Color Representation, Lepton Number (L), Baryon Number (B),
 * Isospin (I_3), and Hypercharge (Y).
 *
 * NOTE: Gravity is NOT part of the Standard Model; no graviton is counted.
 */

import { ParticleDefinition, ParticleKind, SU3GluonState } from '../types/physics';

export const STANDARD_MODEL_PARTICLES: Record<ParticleKind, ParticleDefinition> = {
  // ==========================================
  // QUARKS (6 Flavors, Spin 1/2 Fermions, Color Triplet, B = 1/3, L = 0)
  // ==========================================
  up: {
    kind: 'up',
    name: 'Up Quark',
    symbol: 'u',
    family: 'quark',
    generation: 1,
    massMeV: 2.16,
    charge: 2 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: 0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    description: 'Stable 1st generation quark. Primary constituent of protons (uud) and neutrons (udd).'
  },
  down: {
    kind: 'down',
    name: 'Down Quark',
    symbol: 'd',
    family: 'quark',
    generation: 1,
    massMeV: 4.67,
    charge: -1 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: -0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.6)',
    description: '1st generation quark. Undergoes weak beta decay into up quark, electron, and antineutrino.'
  },
  charm: {
    kind: 'charm',
    name: 'Charm Quark',
    symbol: 'c',
    family: 'quark',
    generation: 2,
    massMeV: 1270,
    charge: 2 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: 0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.6)',
    description: '2nd generation heavy quark (1.27 GeV). Decays predominantly into strange quarks via CKM.'
  },
  strange: {
    kind: 'strange',
    name: 'Strange Quark',
    symbol: 's',
    family: 'quark',
    generation: 2,
    massMeV: 93.4,
    charge: -1 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: -0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.6)',
    description: '2nd generation quark with strangeness S = -1. Decays into up quarks via weak interaction.'
  },
  top: {
    kind: 'top',
    name: 'Top Quark',
    symbol: 't',
    family: 'quark',
    generation: 3,
    massMeV: 172690,
    charge: 2 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: 0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.7)',
    description: '3rd generation ultra-heavy quark (172.7 GeV). Decays before hadronization into W+ and bottom.'
  },
  bottom: {
    kind: 'bottom',
    name: 'Bottom Quark',
    symbol: 'b',
    family: 'quark',
    generation: 3,
    massMeV: 4180,
    charge: -1 / 3,
    spin: 0.5,
    baryonNumber: 1 / 3,
    leptonNumber: 0,
    isospin3: -0.5,
    hypercharge: 1 / 3,
    colorRepresentation: 'triplet',
    isFermion: true,
    hasColor: true,
    baseColor: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.6)',
    description: '3rd generation heavy quark (4.18 GeV). Primary decay channel of the 125 GeV Higgs boson.'
  },

  // ==========================================
  // LEPTONS (6 Flavors: 3 Charged, 3 Neutrinos; Spin 1/2, Color Singlet, B = 0, L = 1)
  // ==========================================
  electron: {
    kind: 'electron',
    name: 'Electron',
    symbol: 'e⁻',
    family: 'lepton',
    generation: 1,
    massMeV: 0.511,
    charge: -1,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: -0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.8)',
    description: 'Stable 1st generation charged lepton. Binds with atomic nuclei via electromagnetic Coulomb attraction.'
  },
  electron_neutrino: {
    kind: 'electron_neutrino',
    name: 'Electron Neutrino',
    symbol: 'ν_e',
    family: 'lepton',
    generation: 1,
    massMeV: 0.0000001,
    charge: 0,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: 0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    description: '1st generation neutral lepton. Undergoes unitary PMNS lepton flavor mixing and beta decay transitions.'
  },
  muon: {
    kind: 'muon',
    name: 'Muon',
    symbol: 'μ⁻',
    family: 'lepton',
    generation: 2,
    massMeV: 105.66,
    charge: -1,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: -0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#2dd4bf',
    glowColor: 'rgba(45, 212, 191, 0.7)',
    description: '2nd generation charged lepton (105.7 MeV). Mean lifetime 2.2 μs; decays into e⁻ + ν̄_e + ν_μ.'
  },
  muon_neutrino: {
    kind: 'muon_neutrino',
    name: 'Muon Neutrino',
    symbol: 'ν_μ',
    family: 'lepton',
    generation: 2,
    massMeV: 0.0000001,
    charge: 0,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: 0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    description: '2nd generation neutral lepton. Produced in charged pion and muon decays.'
  },
  tau: {
    kind: 'tau',
    name: 'Tau Lepton',
    symbol: 'τ⁻',
    family: 'lepton',
    generation: 3,
    massMeV: 1776.86,
    charge: -1,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: -0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.7)',
    description: '3rd generation heavy lepton (1.78 GeV). Only lepton massive enough to decay into hadrons (pions).'
  },
  tau_neutrino: {
    kind: 'tau_neutrino',
    name: 'Tau Neutrino',
    symbol: 'ν_τ',
    family: 'lepton',
    generation: 3,
    massMeV: 0.0000001,
    charge: 0,
    spin: 0.5,
    baryonNumber: 0,
    leptonNumber: 1,
    isospin3: 0.5,
    hypercharge: -1,
    colorRepresentation: 'singlet',
    isFermion: true,
    hasColor: false,
    baseColor: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    description: '3rd generation neutral lepton. Participates in 3-flavor neutrino oscillations.'
  },

  // ==========================================
  // GAUGE BOSONS (Spin 1 Vector Bosons)
  // ==========================================
  photon: {
    kind: 'photon',
    name: 'Photon',
    symbol: 'γ',
    family: 'gauge_boson',
    generation: 0,
    massMeV: 0,
    charge: 0,
    spin: 1,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: 0,
    hypercharge: 0,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    carriesForce: 'electromagnetism',
    baseColor: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.9)',
    description: 'Massless U(1) electromagnetic gauge boson. Mediates Coulomb/Lorentz forces and Breit-Wheeler pair production.'
  },
  gluon: {
    kind: 'gluon',
    name: 'Gluon',
    symbol: 'g',
    family: 'gauge_boson',
    generation: 0,
    massMeV: 0,
    charge: 0,
    spin: 1,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: 0,
    hypercharge: 0,
    colorRepresentation: 'octet',
    isFermion: false,
    hasColor: true,
    carriesForce: 'strong',
    baseColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.9)',
    description: 'Strong-force gauge boson. 8 Gell-Mann color octet states (g₁–g₈) mediating SU(3) confinement & self-interaction.'
  },
  w_plus: {
    kind: 'w_plus',
    name: 'W+ Boson',
    symbol: 'W⁺',
    family: 'gauge_boson',
    generation: 0,
    massMeV: 80377,
    charge: 1,
    spin: 1,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: 1,
    hypercharge: 0,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    carriesForce: 'weak',
    baseColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.8)',
    description: 'Positively charged weak vector boson (80.4 GeV). Mediates charged-current weak interactions and beta-plus decay.'
  },
  w_minus: {
    kind: 'w_minus',
    name: 'W- Boson',
    symbol: 'W⁻',
    family: 'gauge_boson',
    generation: 0,
    massMeV: 80377,
    charge: -1,
    spin: 1,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: -1,
    hypercharge: 0,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    carriesForce: 'weak',
    baseColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.8)',
    description: 'Negatively charged weak vector boson (80.4 GeV). Mediates charged-current transitions and beta-minus decay (d → u + W⁻*).'
  },
  z_boson: {
    kind: 'z_boson',
    name: 'Z Boson',
    symbol: 'Z⁰',
    family: 'gauge_boson',
    generation: 0,
    massMeV: 91187.6,
    charge: 0,
    spin: 1,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: 0,
    hypercharge: 0,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    carriesForce: 'weak',
    baseColor: '#be123c',
    glowColor: 'rgba(190, 18, 60, 0.8)',
    description: 'Neutral weak vector boson (91.19 GeV). Mediates neutral-current weak scattering and neutrino interactions.'
  },

  // ==========================================
  // SCALAR BOSON (Spin 0 Higgs Field Excitation)
  // ==========================================
  higgs: {
    kind: 'higgs',
    name: 'Higgs Boson',
    symbol: 'H⁰',
    family: 'scalar_boson',
    generation: 0,
    massMeV: 125250,
    charge: 0,
    spin: 0,
    baryonNumber: 0,
    leptonNumber: 0,
    isospin3: -0.5,
    hypercharge: 1,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    carriesForce: 'higgs',
    baseColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.9)',
    description: 'Scalar excitation (125.25 GeV) of the Higgs field after EWSB. Generates particle masses via Yukawa couplings.'
  },

  // ==========================================
  // EXACT FINITE COMPOSITE NUCLEUS (FOR WKB / EXPERIMENTS)
  // ==========================================
  alpha: {
    kind: 'alpha',
    name: 'Alpha Nucleus (finite composite)',
    symbol: 'α',
    family: 'composite',
    generation: 0,
    massMeV: 3727.38,
    charge: 2,
    spin: 0,
    baryonNumber: 4,
    leptonNumber: 0,
    isospin3: 0,
    hypercharge: 2,
    colorRepresentation: 'singlet',
    isFermion: false,
    hasColor: false,
    baseColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.7)',
    description: 'Exact finite Helium-4 composite for Coulomb-barrier and WKB transmission experiments.'
  }
};

// ==========================================
// SU(3) GELL-MANN COLOR OCTET (8 INDIVIDUAL GLUON STATES)
// ==========================================
export const SU3_GLUON_OCTET: SU3GluonState[] = [
  {
    index: 1,
    symbol: 'g₁',
    formula: '¹⁄√2 (R Ḡ + G R̄)',
    description: 'Symmetric transition between Red and Green',
    colorShiftMap: { red: 'green', green: 'red', blue: 'blue' },
    isDiagonal: false
  },
  {
    index: 2,
    symbol: 'g₂',
    formula: '-ⁱ⁄√2 (R Ḡ - G R̄)',
    description: 'Antisymmetric transition between Red and Green with complex phase',
    colorShiftMap: { red: 'green', green: 'red', blue: 'blue' },
    isDiagonal: false
  },
  {
    index: 3,
    symbol: 'g₃',
    formula: '¹⁄√2 (R R̄ - G Ḡ)',
    description: 'Diagonal isospin state preserving color flavor',
    colorShiftMap: { red: 'red', green: 'green', blue: 'blue' },
    isDiagonal: true
  },
  {
    index: 4,
    symbol: 'g₄',
    formula: '¹⁄√2 (R B̄ + B R̄)',
    description: 'Symmetric transition between Red and Blue',
    colorShiftMap: { red: 'blue', green: 'green', blue: 'red' },
    isDiagonal: false
  },
  {
    index: 5,
    symbol: 'g₅',
    formula: '-ⁱ⁄√2 (R B̄ - B R̄)',
    description: 'Antisymmetric transition between Red and Blue with complex phase',
    colorShiftMap: { red: 'blue', green: 'green', blue: 'red' },
    isDiagonal: false
  },
  {
    index: 6,
    symbol: 'g₆',
    formula: '¹⁄√2 (G B̄ + B Ḡ)',
    description: 'Symmetric transition between Green and Blue',
    colorShiftMap: { red: 'red', green: 'blue', blue: 'green' },
    isDiagonal: false
  },
  {
    index: 7,
    symbol: 'g₇',
    formula: '-ⁱ⁄√2 (G B̄ - B Ḡ)',
    description: 'Antisymmetric transition between Green and Blue with complex phase',
    colorShiftMap: { red: 'red', green: 'blue', blue: 'green' },
    isDiagonal: false
  },
  {
    index: 8,
    symbol: 'g₈',
    formula: '¹⁄√6 (R R̄ + G Ḡ - 2 B B̄)',
    description: 'Hypercharge octet state balancing all three color charges',
    colorShiftMap: { red: 'red', green: 'green', blue: 'blue' },
    isDiagonal: true
  }
];

// ==========================================
// ANTIPARTICLE QUANTUM NUMBER CONJUGATION
// ==========================================
export function getAntiparticleProperties(def: ParticleDefinition): {
  symbol: string;
  name: string;
  charge: number;
  baryonNumber: number;
  leptonNumber: number;
  isospin3: number;
  hypercharge: number;
  colorRepresentation: 'antitriplet' | 'triplet' | 'octet' | 'singlet';
} {
  const isQuark = def.family === 'quark';
  const isLepton = def.family === 'lepton';

  let symbol = def.symbol;
  let name = `Anti-${def.name}`;

  if (def.kind === 'electron') {
    symbol = 'e⁺';
    name = 'Positron (e⁺)';
  } else if (def.kind === 'muon') {
    symbol = 'μ⁺';
    name = 'Antimuon (μ⁺)';
  } else if (def.kind === 'tau') {
    symbol = 'τ⁺';
    name = 'Antitau (τ⁺)';
  } else if (def.kind.includes('neutrino')) {
    symbol = `ν̄_${def.kind.split('_')[0][0]}`;
    name = `${def.name.replace('Neutrino', 'Antineutrino')}`;
  } else if (isQuark) {
    symbol = `${def.symbol}̄`;
    name = `Anti-${def.name}`;
  } else if (def.kind === 'w_plus') {
    symbol = 'W⁻';
    name = 'W- Boson';
  } else if (def.kind === 'w_minus') {
    symbol = 'W⁺';
    name = 'W+ Boson';
  }

  return {
    symbol,
    name,
    charge: -def.charge,
    baryonNumber: -def.baryonNumber,
    leptonNumber: -def.leptonNumber,
    isospin3: -def.isospin3,
    hypercharge: -def.hypercharge,
    colorRepresentation: isQuark ? 'antitriplet' : def.colorRepresentation
  };
}

// ==========================================
// COLOR SYSTEM
// ==========================================
export const PRIMARY_COLORS = ['red', 'green', 'blue'] as const;
export const ANTI_COLORS = ['anti_red', 'anti_green', 'anti_blue'] as const;

export const COLOR_CHARGE_STYLES: Record<string, { fill: string; border: string; label: string }> = {
  red: { fill: '#ef4444', label: 'Red (R)', border: '#f87171' },
  green: { fill: '#22c55e', label: 'Green (G)', border: '#4ade80' },
  blue: { fill: '#3b82f6', label: 'Blue (B)', border: '#60a5fa' },
  anti_red: { fill: '#06b6d4', label: 'Anti-Red (Cyan R̄)', border: '#22d3ee' },
  anti_green: { fill: '#d946ef', label: 'Anti-Green (Magenta Ḡ)', border: '#e879f9' },
  anti_blue: { fill: '#eab308', label: 'Anti-Blue (Yellow B̄)', border: '#facc15' },
  white: { fill: '#f8fafc', label: 'Color Neutral (Singlet)', border: '#ffffff' },
  none: { fill: '#64748b', label: 'Colorless', border: '#94a3b8' }
};

export const COLOR_INDEX_BY_NAME: Record<string, number> = Object.freeze({
  red: 0,
  green: 1,
  blue: 2
});

export const COLOR_NAME_BY_INDEX = Object.freeze(['red', 'green', 'blue']);

export const COLOR_UNIT_VECTORS = Object.freeze([
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
]);

export function isAntiColorName(color: string): boolean {
  return typeof color === 'string' && color.startsWith('anti_');
}

export function colorBaseName(color: string): string {
  return isAntiColorName(color) ? color.slice(5) : color;
}

export function colorIndex(color: string): number | null {
  const idx = COLOR_INDEX_BY_NAME[colorBaseName(color)];
  return idx === undefined ? null : idx;
}

export function colorNameFromIndex(index: number, anti = false): string {
  const base = COLOR_NAME_BY_INDEX[index];
  if (!base) return 'none';
  return anti ? `anti_${base}` : base;
}

export function fundamentalColorVector(color: string): [number, number, number] {
  if (color === 'none' || !color) return [0, 0, 0];
  const sign = color.startsWith('anti_') ? -1 : 1;
  const base = color.replace('anti_', '');
  if (base === 'red') return [sign, 0, 0];
  if (base === 'green') return [0, sign, 0];
  if (base === 'blue') return [0, 0, sign];
  return [0, 0, 0];
}

export function gluonColorVectorFromIndices(colorIdx: number | null, antiColorIdx: number | null): [number, number, number] {
  if (colorIdx === null || antiColorIdx === null) return [0, 0, 0];
  const c = COLOR_UNIT_VECTORS[colorIdx];
  const a = COLOR_UNIT_VECTORS[antiColorIdx];
  return [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
}

export function addColorVectors(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function colorVectorsEqual(a: [number, number, number], b: [number, number, number], eps = 1e-9): boolean {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps;
}

// ==========================================
// CKM MATRIX (QUARK MIXING)
// ==========================================
export const CKM_MATRIX = {
  upQuarks: ['up', 'charm', 'top'] as const,
  downQuarks: ['down', 'strange', 'bottom'] as const,
  coefficients: [
    [0.974, 0.225, 0.003],
    [0.225, 0.973, 0.041],
    [0.009, 0.040, 0.999]
  ]
};

// ==========================================
// DECAY CHANNELS
// ==========================================
export const SINGLE_PARTICLE_DECAYS: Record<string, Array<{ products: Array<{ kind: ParticleKind; isAntiparticle?: boolean }>; decayRateBase: number }>> = {
  top: [{ products: [{ kind: 'w_plus' }, { kind: 'bottom' }], decayRateBase: 0.15 }],
  bottom: [
    { products: [{ kind: 'charm' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.04 },
    { products: [{ kind: 'charm' }, { kind: 'muon' }, { kind: 'muon_neutrino', isAntiparticle: true }], decayRateBase: 0.04 }
  ],
  charm: [{ products: [{ kind: 'strange' }, { kind: 'electron', isAntiparticle: true }, { kind: 'electron_neutrino' }], decayRateBase: 0.05 }],
  strange: [{ products: [{ kind: 'up' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.02 }],
  down: [{ products: [{ kind: 'up' }, { kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.008 }],
  muon: [{ products: [{ kind: 'electron' }, { kind: 'muon_neutrino' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.03 }],
  tau: [
    { products: [{ kind: 'muon' }, { kind: 'tau_neutrino' }, { kind: 'muon_neutrino', isAntiparticle: true }], decayRateBase: 0.06 },
    { products: [{ kind: 'electron' }, { kind: 'tau_neutrino' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.06 }
  ],
  w_minus: [
    { products: [{ kind: 'electron' }, { kind: 'electron_neutrino', isAntiparticle: true }], decayRateBase: 0.25 },
    { products: [{ kind: 'muon' }, { kind: 'muon_neutrino', isAntiparticle: true }], decayRateBase: 0.25 }
  ],
  w_plus: [
    { products: [{ kind: 'electron', isAntiparticle: true }, { kind: 'electron_neutrino' }], decayRateBase: 0.25 },
    { products: [{ kind: 'muon', isAntiparticle: true }, { kind: 'muon_neutrino' }], decayRateBase: 0.25 }
  ],
  z_boson: [{ products: [{ kind: 'electron' }, { kind: 'electron', isAntiparticle: true }], decayRateBase: 0.2 }],
  higgs: [
    { products: [{ kind: 'bottom' }, { kind: 'bottom', isAntiparticle: true }], decayRateBase: 0.12 },
    { products: [{ kind: 'photon' }, { kind: 'photon' }], decayRateBase: 0.06 }
  ]
};

export const LIGHT_SPEED = 12.0;
export const HBAR_SIM = 18.0;

/**
 * Consistent High-Energy Physical Units System:
 * Energy: MeV
 * Rest Mass: MeV/c²
 * Momentum: MeV/c
 * Speed of Light: c (LIGHT_SPEED = 12.0 px/tick)
 * Invariant relation: E² = m²c⁴ + p²c²
 * Velocity: v = c² p / E (< c for massive particles, = c for massless)
 * Proper time: dτ = dt / γ = dt (m c² / E)
 */
export function simulationMass(kind: ParticleKind): number {
  const cfg = STANDARD_MODEL_PARTICLES[kind];
  if (!cfg) return 1.0;
  return cfg.massMeV;
}

/**
 * Exact Relativistic Invariant Energy-Momentum Relation:
 * E = sqrt(m²c⁴ + |p|²c²)
 */
export function physicalEnergyFromMomentum(
  massMeV: number,
  pxMeV: number,
  pyMeV: number,
  pzMeV: number = 0,
  c: number = LIGHT_SPEED
): number {
  const pSq = pxMeV * pxMeV + pyMeV * pyMeV + pzMeV * pzMeV;
  const m2c4 = (massMeV * c * c) ** 2;
  return Math.sqrt(m2c4 + pSq * c * c);
}

/**
 * Exact Relativistic Velocity from Invariant 4-Momentum:
 * v = c² p / E
 */
export function physicalVelocityFromMomentum(
  massMeV: number,
  pxMeV: number,
  pyMeV: number,
  pzMeV: number = 0,
  c: number = LIGHT_SPEED
): { vx: number; vy: number; vz: number; speed: number; gamma: number; E: number } {
  const E = physicalEnergyFromMomentum(massMeV, pxMeV, pyMeV, pzMeV, c);
  if (E <= 0) return { vx: 0, vy: 0, vz: 0, speed: 0, gamma: 1.0, E: 0 };

  const vx = (c * c * pxMeV) / E;
  const vy = (c * c * pyMeV) / E;
  const vz = (c * c * pzMeV) / E;
  const speed = Math.hypot(vx, vy, vz);
  const beta = Math.min(0.9999999, speed / c);
  const gamma = 1 / Math.sqrt(Math.max(1e-12, 1 - beta * beta));

  return { vx, vy, vz, speed, gamma, E };
}

/**
 * Relativistic Proper Time increment:
 * dτ = dt / γ = dt (m c² / E)
 */
export function relativisticProperTime(dt: number, gamma: number): number {
  return dt / Math.max(1.0, gamma);
}

