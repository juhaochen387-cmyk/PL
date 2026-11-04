/**
 * Full SU(3) Color Algebra
 * Explicit generators: T^a = λ^a / 2 (a = 1...8)
 * Complete Gell-Mann matrices λ^a
 * Antisymmetric structure constants f^abc ([T^a, T^b] = i f^abc T^c)
 * Symmetric tensor d^abc ({T^a, T^b} = (1/3)δ^ab I + d^abc T^c)
 * Casimir operators: C_F = 4/3, C_A = 3, T_F = 1/2
 * Continuous quantum color states in C^3 and C^8
 */

import { ParticleColor } from '../types/physics';

export type Complex = [number, number]; // [real, imag]

export function cAdd(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

export function cSub(a: Complex, b: Complex): Complex {
  return [a[0] - b[0], a[1] - b[1]];
}

export function cMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function cScale(a: Complex, s: number): Complex {
  return [a[0] * s, a[1] * s];
}

export function cConj(a: Complex): Complex {
  return [a[0], -a[1]];
}

export function cAbs2(a: Complex): number {
  return a[0] * a[0] + a[1] * a[1];
}

export function cAbs(a: Complex): number {
  return Math.hypot(a[0], a[1]);
}

// 3x3 Complex Matrix: 9 elements in row-major order [ [re, im], ... ]
export type Matrix3x3 = Complex[];

export function mat3Zero(): Matrix3x3 {
  return Array.from({ length: 9 }, () => [0, 0] as Complex);
}

export function mat3Identity(): Matrix3x3 {
  const m = mat3Zero();
  m[0] = [1, 0];
  m[4] = [1, 0];
  m[8] = [1, 0];
  return m;
}

export function mat3Mul(A: Matrix3x3, B: Matrix3x3): Matrix3x3 {
  const C = mat3Zero();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum: Complex = [0, 0];
      for (let k = 0; k < 3; k++) {
        sum = cAdd(sum, cMul(A[r * 3 + k], B[k * 3 + c]));
      }
      C[r * 3 + c] = sum;
    }
  }
  return C;
}

export function mat3Commutator(A: Matrix3x3, B: Matrix3x3): Matrix3x3 {
  const AB = mat3Mul(A, B);
  const BA = mat3Mul(B, A);
  const res = mat3Zero();
  for (let i = 0; i < 9; i++) {
    res[i] = cSub(AB[i], BA[i]);
  }
  return res;
}

export function mat3Trace(A: Matrix3x3): Complex {
  return cAdd(cAdd(A[0], A[4]), A[8]);
}

/**
 * 8 GELL-MANN MATRICES λ^1 ... λ^8
 */
export const GELL_MANN_MATRICES: Matrix3x3[] = [
  // λ1 = [[0, 1, 0], [1, 0, 0], [0, 0, 0]]
  [
    [0, 0], [1, 0], [0, 0],
    [1, 0], [0, 0], [0, 0],
    [0, 0], [0, 0], [0, 0]
  ],
  // λ2 = [[0, -i, 0], [i, 0, 0], [0, 0, 0]]
  [
    [0, 0], [0, -1], [0, 0],
    [0, 1], [0, 0], [0, 0],
    [0, 0], [0, 0], [0, 0]
  ],
  // λ3 = [[1, 0, 0], [0, -1, 0], [0, 0, 0]]
  [
    [1, 0], [0, 0], [0, 0],
    [0, 0], [-1, 0], [0, 0],
    [0, 0], [0, 0], [0, 0]
  ],
  // λ4 = [[0, 0, 1], [0, 0, 0], [1, 0, 0]]
  [
    [0, 0], [0, 0], [1, 0],
    [0, 0], [0, 0], [0, 0],
    [1, 0], [0, 0], [0, 0]
  ],
  // λ5 = [[0, 0, -i], [0, 0, 0], [i, 0, 0]]
  [
    [0, 0], [0, 0], [0, -1],
    [0, 0], [0, 0], [0, 0],
    [0, 1], [0, 0], [0, 0]
  ],
  // λ6 = [[0, 0, 0], [0, 0, 1], [0, 1, 0]]
  [
    [0, 0], [0, 0], [0, 0],
    [0, 0], [0, 0], [1, 0],
    [0, 0], [1, 0], [0, 0]
  ],
  // λ7 = [[0, 0, 0], [0, 0, -i], [0, i, 0]]
  [
    [0, 0], [0, 0], [0, 0],
    [0, 0], [0, 0], [0, -1],
    [0, 0], [0, 1], [0, 0]
  ],
  // λ8 = (1/√3) * [[1, 0, 0], [0, 1, 0], [0, 0, -2]]
  [
    [1 / Math.sqrt(3), 0], [0, 0], [0, 0],
    [0, 0], [1 / Math.sqrt(3), 0], [0, 0],
    [0, 0], [0, 0], [-2 / Math.sqrt(3), 0]
  ]
];

/**
 * SU(3) GENERATORS: T^a = λ^a / 2 (a = 1...8)
 */
export const SU3_GENERATORS: Matrix3x3[] = GELL_MANN_MATRICES.map(lam =>
  lam.map(z => cScale(z, 0.5))
);

/**
 * Completely Antisymmetric SU(3) Structure Constants f^abc
 * [T^a, T^b] = i f^abc T^c
 * Stored as a lookup array [a-1][b-1][c-1]
 */
function buildStructureConstants(): number[][][] {
  const f: number[][][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => new Array(8).fill(0))
  );

  const nonZero: Array<[number, number, number, number]> = [
    [1, 2, 3, 1],
    [1, 4, 7, 0.5],
    [1, 6, 5, 0.5],
    [2, 4, 6, 0.5],
    [2, 5, 7, 0.5],
    [3, 4, 5, 0.5],
    [3, 7, 6, 0.5],
    [4, 5, 8, Math.sqrt(3) / 2],
    [6, 7, 8, Math.sqrt(3) / 2]
  ];

  for (const [a, b, c, val] of nonZero) {
    const perm = [
      [a, b, c, 1],
      [b, c, a, 1],
      [c, a, b, 1],
      [b, a, c, -1],
      [a, c, b, -1],
      [c, b, a, -1]
    ];
    for (const [pA, pB, pC, sgn] of perm) {
      f[pA - 1][pB - 1][pC - 1] = sgn * val;
    }
  }
  return f;
}

export const SU3_FAB: number[][][] = buildStructureConstants();

/**
 * Symmetric Tensor d^abc
 * {T^a, T^b} = (1/3)δ^ab I + d^abc T^c
 */
function buildSymmetricTensor(): number[][][] {
  const d: number[][][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => new Array(8).fill(0))
  );

  const nonZero: Array<[number, number, number, number]> = [
    [1, 1, 8, 1 / Math.sqrt(3)],
    [2, 2, 8, 1 / Math.sqrt(3)],
    [3, 3, 8, 1 / Math.sqrt(3)],
    [8, 8, 8, -1 / Math.sqrt(3)],
    [4, 4, 8, -0.5 / Math.sqrt(3)],
    [5, 5, 8, -0.5 / Math.sqrt(3)],
    [6, 6, 8, -0.5 / Math.sqrt(3)],
    [7, 7, 8, -0.5 / Math.sqrt(3)],
    [1, 4, 6, 0.5],
    [1, 5, 7, 0.5],
    [2, 4, 7, -0.5],
    [2, 5, 6, 0.5],
    [3, 4, 4, 0.5],
    [3, 5, 5, 0.5],
    [3, 6, 6, -0.5],
    [3, 7, 7, -0.5]
  ];

  for (const [a, b, c, val] of nonZero) {
    const permutations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a]
    ];
    for (const [pA, pB, pC] of permutations) {
      d[pA - 1][pB - 1][pC - 1] = val;
    }
  }
  return d;
}

export const SU3_DAB: number[][][] = buildSymmetricTensor();

/**
 * CASIMIR OPERATORS & INVARIANTS:
 * C_F = (N^2 - 1) / (2N) = 4/3  (Quark Fundamental Triplet 3)
 * C_A = N = 3                    (Gluon Adjoint Octet 8)
 * T_F = 1/2                      (Dynkin Index)
 */
export const SU3_CASIMIR_CF = 4 / 3;
export const SU3_CASIMIR_CA = 3;
export const SU3_DYNKIN_TF = 0.5;

/**
 * Quantum Color State in C^3 (Quark / Antiquark Triplet)
 * |ψ> = c_R |R> + c_G |G> + c_B |B>
 */
export interface QuantumColorTriplet {
  cR: Complex;
  cG: Complex;
  cB: Complex;
}

/**
 * Normalize a triplet color state <ψ|ψ> = 1
 */
export function normalizeTriplet(q: QuantumColorTriplet): QuantumColorTriplet {
  const norm2 = cAbs2(q.cR) + cAbs2(q.cG) + cAbs2(q.cB);
  if (norm2 <= 1e-12) {
    return { cR: [1, 0], cG: [0, 0], cB: [0, 0] };
  }
  const inv = 1 / Math.sqrt(norm2);
  return {
    cR: cScale(q.cR, inv),
    cG: cScale(q.cG, inv),
    cB: cScale(q.cB, inv)
  };
}

/**
 * Construct pure color eigenstates
 */
export function pureColorTriplet(color: ParticleColor, isAntiparticle = false): QuantumColorTriplet {
  const base = color.replace('anti_', '');
  let state: QuantumColorTriplet;
  if (base === 'red') state = { cR: [1, 0], cG: [0, 0], cB: [0, 0] };
  else if (base === 'green') state = { cR: [0, 0], cG: [1, 0], cB: [0, 0] };
  else if (base === 'blue') state = { cR: [0, 0], cG: [0, 0], cB: [1, 0] };
  else {
    // Coherent symmetric color mix
    const invSqrt3 = 1 / Math.sqrt(3);
    state = { cR: [invSqrt3, 0], cG: [invSqrt3, 0], cB: [invSqrt3, 0] };
  }
  return state;
}

/**
 * Construct random quantum superposition state in SU(3) Hilbert space
 */
export function randomSuperpositionTriplet(dominant: ParticleColor): QuantumColorTriplet {
  const base = pureColorTriplet(dominant);
  const randPhase1 = Math.random() * Math.PI * 2;
  const randPhase2 = Math.random() * Math.PI * 2;
  const pert = 0.22;

  const q: QuantumColorTriplet = {
    cR: cAdd(base.cR, [pert * Math.cos(randPhase1), pert * Math.sin(randPhase1)]),
    cG: cAdd(base.cG, [pert * Math.sin(randPhase1), pert * Math.cos(randPhase2)]),
    cB: cAdd(base.cB, [pert * Math.cos(randPhase2), pert * Math.sin(randPhase2)])
  };
  return normalizeTriplet(q);
}

/**
 * Quantum Color State in C^8 (Gluon Adjoint Octet)
 * |A> = sum_{a=1}^8 A^a |a>
 */
export interface QuantumColorOctet {
  amplitudes: [number, number, number, number, number, number, number, number];
}

export function pureColorOctet(gluonIndex: number): QuantumColorOctet {
  const amps = new Array(8).fill(0) as [number, number, number, number, number, number, number, number];
  const idx = Math.max(1, Math.min(8, gluonIndex)) - 1;
  amps[idx] = 1.0;
  return { amplitudes: amps };
}

export function createFundamentalColorState(color: ParticleColor, isAntiparticle = false) {
  const trip = randomSuperpositionTriplet(color);
  return {
    amplitudes: [trip.cR[0], trip.cR[1], trip.cG[0], trip.cG[1], trip.cB[0], trip.cB[1]] as [number, number, number, number, number, number],
    casimir: SU3_CASIMIR_CF,
    dominantColor: color,
    phase: Math.atan2(trip.cR[1], trip.cR[0])
  };
}

export function createOctetColorState(gluonIndex: number) {
  const oct = pureColorOctet(gluonIndex);
  return {
    amplitudes: [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number],
    octetAmplitudes: oct.amplitudes,
    casimir: SU3_CASIMIR_CA,
    dominantColor: 'none' as ParticleColor,
    phase: 0
  };
}

/**
 * Unitary SU(3) rotation on a triplet state:
 * |ψ'> = exp(i sum_a θ^a T^a) |ψ>
 */
export function rotateTripletColor(
  state: QuantumColorTriplet,
  theta: number[], // 8 real angles
  dt = 1.0
): QuantumColorTriplet {
  // First-order Taylor/Padé expansion: (I + i dt sum_a θ^a T^a) |ψ>
  const v: [Complex, Complex, Complex] = [state.cR, state.cG, state.cB];
  const dv: [Complex, Complex, Complex] = [[0, 0], [0, 0], [0, 0]];

  for (let a = 0; a < 8; a++) {
    const angle = (theta[a] || 0) * dt;
    if (Math.abs(angle) < 1e-6) continue;
    const Ta = SU3_GENERATORS[a];

    for (let r = 0; r < 3; r++) {
      let sum: Complex = [0, 0];
      for (let c = 0; c < 3; c++) {
        sum = cAdd(sum, cMul(Ta[r * 3 + c], v[c]));
      }
      // Multiply by i * angle: (x + iy) * i = (-y + ix)
      const iVal: Complex = [-sum[1] * angle, sum[0] * angle];
      dv[r] = cAdd(dv[r], iVal);
    }
  }

  const res: QuantumColorTriplet = {
    cR: cAdd(state.cR, dv[0]),
    cG: cAdd(state.cG, dv[1]),
    cB: cAdd(state.cB, dv[2])
  };
  return normalizeTriplet(res);
}

/**
 * Color Singlet Projection between Quark and Antiquark:
 * |Singlet> = (1/√3) * (|R R̄> + |G Ḡ> + |B B̄>)
 * Returns singlet fidelity |<Singlet | q q̄>|^2 in [0, 1]
 */
export function computeMesonSingletFidelity(
  q: QuantumColorTriplet,
  antiQ: QuantumColorTriplet
): number {
  // Overlap: (1/√3) * (cR * conj(c_anti_R) + cG * conj(c_anti_G) + cB * conj(c_anti_B))
  const termR = cMul(q.cR, cConj(antiQ.cR));
  const termG = cMul(q.cG, cConj(antiQ.cG));
  const termB = cMul(q.cB, cConj(antiQ.cB));
  const sum = cAdd(cAdd(termR, termG), termB);
  return (cAbs2(sum) / 3.0);
}

/**
 * Color Singlet Projection between 3 Quarks (Baryon Singlet):
 * |Singlet> = (1/√6) * sum_{ijk} ε_ijk |i j k>
 * Returns baryon singlet fidelity in [0, 1]
 */
export function computeBaryonSingletFidelity(
  q1: QuantumColorTriplet,
  q2: QuantumColorTriplet,
  q3: QuantumColorTriplet
): number {
  // Determinant: det [ q1, q2, q3 ]
  const v1 = [q1.cR, q1.cG, q1.cB];
  const v2 = [q2.cR, q2.cG, q2.cB];
  const v3 = [q3.cR, q3.cG, q3.cB];

  // det = v1[0]*(v2[1]*v3[2] - v2[2]*v3[1]) - v1[1]*(v2[0]*v3[2] - v2[2]*v3[0]) + v1[2]*(v2[0]*v3[1] - v2[1]*v3[0])
  const term0 = cMul(v1[0], cSub(cMul(v2[1], v3[2]), cMul(v2[2], v3[1])));
  const term1 = cMul(v1[1], cSub(cMul(v2[0], v3[2]), cMul(v2[2], v3[0])));
  const term2 = cMul(v1[2], cSub(cMul(v2[0], v3[1]), cMul(v2[1], v3[0])));

  const det = cAdd(cSub(term0, term1), term2);
  return (cAbs2(det) / 6.0);
}

/**
 * Color Factor for Quark-Quark Scattering in representation R:
 * Decomposes 3 x 3 = 3̄ (Antitriplet, attractive, factor = -2/3) + 6 (Sextet, repulsive, factor = +1/3)
 */
export function computeQuarkQuarkColorFactor(fidelity3bar: number): number {
  // C = (-2/3) * fidelity3bar + (1/3) * (1 - fidelity3bar)
  return -0.6667 * fidelity3bar + 0.3333 * (1 - fidelity3bar);
}

/**
 * Color Factor for Quark-Antiquark Scattering in representation R:
 * Decomposes 3 x 3̄ = 1 (Singlet, attractive, factor = -4/3) + 8 (Octet, repulsive, factor = +1/6)
 */
export function computeQuarkAntiquarkColorFactor(fidelitySinglet: number): number {
  // C = (-4/3) * fidelity1 + (1/6) * (1 - fidelity1)
  return -SU3_CASIMIR_CF * fidelitySinglet + (1 / 6) * (1 - fidelitySinglet);
}

/**
 * Three-Gluon Vertex V_3^abc(p1, p2, p3):
 * Proportional to f^abc
 */
export function threeGluonCoupling(a: number, b: number, c: number): number {
  const iA = Math.max(1, Math.min(8, a)) - 1;
  const iB = Math.max(1, Math.min(8, b)) - 1;
  const iC = Math.max(1, Math.min(8, c)) - 1;
  return SU3_FAB[iA][iB][iC];
}

/**
 * Four-Gluon Vertex V_4^abcd:
 * Involves sums sum_e f^abe f^cde
 */
export function fourGluonCoupling(a: number, b: number, c: number, d: number): number {
  const iA = Math.max(1, Math.min(8, a)) - 1;
  const iB = Math.max(1, Math.min(8, b)) - 1;
  const iC = Math.max(1, Math.min(8, c)) - 1;
  const iD = Math.max(1, Math.min(8, d)) - 1;

  let sum = 0;
  for (let e = 0; e < 8; e++) {
    sum +=
      SU3_FAB[iA][iB][e] * SU3_FAB[iC][iD][e] +
      SU3_FAB[iA][iC][e] * SU3_FAB[iB][iD][e] +
      SU3_FAB[iA][iD][e] * SU3_FAB[iB][iC][e];
  }
  return sum;
}
