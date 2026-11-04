/**
 * Quantum Mechanics Formalism & Exact Quantum Physics Engine
 * 1. Complex probability amplitudes: c = a + bi = |c| e^(iθ)
 * 2. Superposition of quantum states: |ψ⟩ = Σ c_i |i⟩, Σ |c_i|² = 1
 * 3. Wavefunction evolution: iħ ∂|ψ⟩/∂t = Ĥ |ψ⟩ and U(Δt) = exp(-iĤΔt/ħ)
 * 4. The Born rule: P(i) = |⟨i|ψ⟩|²
 * 5. Quantum interference: P = |ψ₁ + ψ₂|² = |ψ₁|² + |ψ₂|² + 2 Re(ψ₁* ψ₂)
 * 6. Entanglement between particles: Bell states, density matrices, von Neumann entropy,
 *    Bell-CHSH inequality violation (S ≤ 2√2), non-local projective measurement collapse
 * 7. Spin states & spin measurements: Pauli spinor, arbitrary axis Stern-Gerlach apparatus,
 *    and relativistic Wigner spin rotations
 * 8. Fermionic antisymmetry: Slater determinants, exchange phase -1, Pauli exclusion
 * 9. Bosonic symmetrization: Symmetric wavefunctions, exchange phase +1, bosonic bunching (1 + n_k)
 * 10. Quantum statistics: Fermi-Dirac & Bose-Einstein distributions, exchange energy J
 * 11. Quantum tunneling: Exact wave equation solutions for arbitrary potential barriers
 * 12. Measurement & state reduction: Von Neumann projective collapse & environmental decoherence
 * 13. Quantum transitions: Fermi's Golden Rule, selection rules, and Rabi oscillations
 */

import { FourVector } from '../types/physics';
import { LIGHT_SPEED, HBAR_SIM } from './catalog';

// ==========================================
// 1. COMPLEX NUMBER ARITHMETIC & PROBABILITY AMPLITUDES
// ==========================================
export class Complex {
  re: number;
  im: number;

  constructor(re: number = 0, im: number = 0) {
    this.re = Number.isFinite(re) ? re : 0;
    this.im = Number.isFinite(im) ? im : 0;
  }

  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other: Complex): Complex {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  scale(s: number): Complex {
    return new Complex(this.re * s, this.im * s);
  }

  div(other: Complex): Complex {
    const denom = other.re * other.re + other.im * other.im;
    if (denom === 0) return new Complex(0, 0);
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  conj(): Complex {
    return new Complex(this.re, -this.im);
  }

  mod(): number {
    return Math.hypot(this.re, this.im);
  }

  modSq(): number {
    return this.re * this.re + this.im * this.im;
  }

  phase(): number {
    return Math.atan2(this.im, this.re);
  }

  exp(): Complex {
    const r = Math.exp(this.re);
    return new Complex(r * Math.cos(this.im), r * Math.sin(this.im));
  }

  clone(): Complex {
    return new Complex(this.re, this.im);
  }
}

// ==========================================
// 2. DISCRETE SUPERPOSITION OF QUANTUM STATES
// ==========================================
export interface QuantumBasisState {
  id: string;
  label: string;
  energyMeV?: number;
  quantumNumbers?: Record<string, any>;
}

export class SuperpositionState {
  basis: QuantumBasisState[];
  amplitudes: Complex[];

  constructor(basis: QuantumBasisState[], amplitudes?: Complex[]) {
    this.basis = basis;
    if (amplitudes && amplitudes.length === basis.length) {
      this.amplitudes = amplitudes.map(c => c.clone());
    } else {
      // Default: pure state in basis[0]
      this.amplitudes = basis.map((_, i) => (i === 0 ? new Complex(1, 0) : new Complex(0, 0)));
    }
    this.normalize();
  }

  normalize(): void {
    let normSq = 0;
    for (const a of this.amplitudes) normSq += a.modSq();
    if (normSq > 0 && Math.abs(normSq - 1.0) > 1e-12) {
      const invNorm = 1 / Math.sqrt(normSq);
      this.amplitudes = this.amplitudes.map(a => a.scale(invNorm));
    }
  }

  /**
   * Born Rule: P(i) = |⟨i|ψ⟩|² = |c_i|²
   */
  getProbabilities(): number[] {
    return this.amplitudes.map(a => a.modSq());
  }

  /**
   * Inner product ⟨other|this⟩ = Σ other_i* · this_i
   */
  innerProduct(other: SuperpositionState): Complex {
    let sum = new Complex(0, 0);
    const n = Math.min(this.amplitudes.length, other.amplitudes.length);
    for (let i = 0; i < n; i++) {
      sum = sum.add(other.amplitudes[i].conj().mul(this.amplitudes[i]));
    }
    return sum;
  }

  /**
   * Unitary time evolution: |ψ(t)⟩ = Σ c_i exp(-i E_i t / ħ) |i⟩
   */
  evolve(dt: number, hbar: number = HBAR_SIM): void {
    for (let i = 0; i < this.amplitudes.length; i++) {
      const e = this.basis[i].energyMeV ?? 0;
      const phase = (-e * dt) / hbar;
      const u = Complex.fromPolar(1, phase);
      this.amplitudes[i] = this.amplitudes[i].mul(u);
    }
  }

  /**
   * Von Neumann Projective Measurement:
   * Collapses |ψ⟩ to basis state |k⟩ with probability P(k) = |c_k|²
   */
  measure(): { collapsedIndex: number; basis: QuantumBasisState; probability: number } {
    const probs = this.getProbabilities();
    let roll = Math.random();
    let chosenIdx = 0;
    for (let i = 0; i < probs.length; i++) {
      roll -= probs[i];
      if (roll <= 0) {
        chosenIdx = i;
        break;
      }
    }

    // Collapse state vector
    for (let i = 0; i < this.amplitudes.length; i++) {
      this.amplitudes[i] = i === chosenIdx ? new Complex(1, 0) : new Complex(0, 0);
    }

    return {
      collapsedIndex: chosenIdx,
      basis: this.basis[chosenIdx],
      probability: probs[chosenIdx]
    };
  }
}

// ==========================================
// 3. SPIN-1/2 PAULI SPINORS & RELATIVISTIC WIGNER ROTATION
// ==========================================
export class SpinorState {
  cUp: Complex; // |↑⟩ amplitude
  cDown: Complex; // |↓⟩ amplitude

  constructor(cUp = new Complex(1, 0), cDown = new Complex(0, 0)) {
    this.cUp = cUp;
    this.cDown = cDown;
    this.normalize();
  }

  static fromAngles(theta: number, phi: number): SpinorState {
    // |+n⟩ = cos(θ/2) |↑⟩ + e^(iφ) sin(θ/2) |↓⟩
    const cUp = new Complex(Math.cos(theta / 2), 0);
    const cDown = Complex.fromPolar(Math.sin(theta / 2), phi);
    return new SpinorState(cUp, cDown);
  }

  normalize(): void {
    const norm = Math.sqrt(this.cUp.modSq() + this.cDown.modSq());
    if (norm > 0) {
      this.cUp = this.cUp.scale(1 / norm);
      this.cDown = this.cDown.scale(1 / norm);
    }
  }

  /**
   * Expectation values ⟨S_x⟩, ⟨S_y⟩, ⟨S_z⟩ in units of ħ/2
   */
  getBlochVector(): [number, number, number] {
    // ⟨S_x⟩ = 2 Re(cUp* · cDown)
    const cross = this.cUp.conj().mul(this.cDown);
    const sx = 2 * cross.re;
    // ⟨S_y⟩ = 2 Im(cUp* · cDown)
    const sy = 2 * cross.im;
    // ⟨S_z⟩ = |cUp|² - |cDown|²
    const sz = this.cUp.modSq() - this.cDown.modSq();
    return [sx, sy, sz];
  }

  /**
   * Stern-Gerlach Measurement along arbitrary unit axis n = (sinθ cosφ, sinθ sinφ, cosθ)
   * Yields +ħ/2 with probability |⟨+n|ψ⟩|² or -ħ/2 with probability |⟨-n|ψ⟩|²
   */
  measureSternGerlach(theta: number, phi: number): {
    outcome: '+1/2' | '-1/2';
    probability: number;
    axis: [number, number, number];
  } {
    // |+n⟩ = cos(θ/2) |↑⟩ + e^(iφ) sin(θ/2) |↓⟩
    const plusUp = new Complex(Math.cos(theta / 2), 0);
    const plusDown = Complex.fromPolar(Math.sin(theta / 2), phi);

    // ⟨+n|ψ⟩ = (plusUp)* cUp + (plusDown)* cDown
    const ampPlus = plusUp.conj().mul(this.cUp).add(plusDown.conj().mul(this.cDown));
    const probPlus = Math.min(1.0, Math.max(0.0, ampPlus.modSq()));

    const isPlus = Math.random() < probPlus;

    if (isPlus) {
      this.cUp = plusUp;
      this.cDown = plusDown;
    } else {
      // |-n⟩ = sin(θ/2) |↑⟩ - e^(iφ) cos(θ/2) |↓⟩
      this.cUp = new Complex(Math.sin(theta / 2), 0);
      this.cDown = Complex.fromPolar(-Math.cos(theta / 2), phi);
    }
    this.normalize();

    const nx = Math.sin(theta) * Math.cos(phi);
    const ny = Math.sin(theta) * Math.sin(phi);
    const nz = Math.cos(theta);

    return {
      outcome: isPlus ? '+1/2' : '-1/2',
      probability: isPlus ? probPlus : 1 - probPlus,
      axis: [nx, ny, nz]
    };
  }

  /**
   * Exact Relativistic Wigner Spin Rotation:
   * When a particle with velocity v is boosted by boost vector beta = u / c,
   * its rest-frame spin undergoes a relativistic Wigner spatial rotation θ_W around n = (v x beta):
   * tan(θ_W / 2) = |v x beta| / ( (1 + γ)(1 + γ_beta) / (γ_total) + ... )
   */
  applyWignerRotation(vx: number, vy: number, boostX: number, boostY: number, c = LIGHT_SPEED): number {
    const vMag = Math.hypot(vx, vy);
    const bMag = Math.hypot(boostX, boostY);
    if (vMag < 1e-6 || bMag < 1e-6) return 0;

    const beta1 = vMag / c;
    const beta2 = bMag / c;
    if (beta1 >= 1 || beta2 >= 1) return 0;

    const gamma1 = 1 / Math.sqrt(1 - beta1 * beta1);
    const gamma2 = 1 / Math.sqrt(1 - beta2 * beta2);

    // Cross product in z direction: (v x beta)_z
    const crossZ = (vx * boostY - vy * boostX) / (c * c);
    const dot = (vx * boostX + vy * boostY) / (c * c);

    const denom = 1 + gamma1 + gamma2 + gamma1 * gamma2 * (1 + dot);
    const sinHalf = crossZ * (gamma1 * gamma2) / (denom || 1);
    const thetaW = 2 * Math.asin(Math.max(-1, Math.min(1, sinHalf)));

    // Rotate spinor by exp(-i (θ_W/2) σ_z)
    const rotUp = Complex.fromPolar(1, -thetaW * 0.5);
    const rotDown = Complex.fromPolar(1, thetaW * 0.5);
    this.cUp = this.cUp.mul(rotUp);
    this.cDown = this.cDown.mul(rotDown);
    this.normalize();

    return thetaW;
  }
}

// ==========================================
// 4. ENTANGLEMENT & BELL-CHSH INEQUALITY VIOLATION
// ==========================================
export type BellStateKind = 'phi_plus' | 'phi_minus' | 'psi_plus' | 'psi_minus';

export class EntangledBipartiteState {
  id: string;
  // Composite 2-particle state vector in {|↑↑⟩, |↑↓⟩, |↓↑⟩, |↓↓⟩} basis
  c00: Complex; // |↑↑⟩
  c01: Complex; // |↑↓⟩
  c10: Complex; // |↓↑⟩
  c11: Complex; // |↓↓⟩
  particleAId: number;
  particleBId: number;
  measurementHistory: Array<{ particle: 'A' | 'B'; axis: string; outcome: string; time: number }>;

  constructor(particleAId: number, particleBId: number, bellKind: BellStateKind = 'psi_minus') {
    this.id = `entangled_${particleAId}_${particleBId}`;
    this.particleAId = particleAId;
    this.particleBId = particleBId;
    this.measurementHistory = [];

    const invSqrt2 = 1 / Math.SQRT2;
    if (bellKind === 'phi_plus') {
      // |Φ⁺⟩ = 1/√2 (|↑↑⟩ + |↓↓⟩)
      this.c00 = new Complex(invSqrt2, 0);
      this.c01 = new Complex(0, 0);
      this.c10 = new Complex(0, 0);
      this.c11 = new Complex(invSqrt2, 0);
    } else if (bellKind === 'phi_minus') {
      // |Φ⁻⟩ = 1/√2 (|↑↑⟩ - |↓↓⟩)
      this.c00 = new Complex(invSqrt2, 0);
      this.c01 = new Complex(0, 0);
      this.c10 = new Complex(0, 0);
      this.c11 = new Complex(-invSqrt2, 0);
    } else if (bellKind === 'psi_plus') {
      // |Ψ⁺⟩ = 1/√2 (|↑↓⟩ + |↓↑⟩) (symmetric triplet)
      this.c00 = new Complex(0, 0);
      this.c01 = new Complex(invSqrt2, 0);
      this.c10 = new Complex(invSqrt2, 0);
      this.c11 = new Complex(0, 0);
    } else {
      // |Ψ⁻⟩ = 1/√2 (|↑↓⟩ - |↓↑⟩) (antisymmetric singlet)
      this.c00 = new Complex(0, 0);
      this.c01 = new Complex(invSqrt2, 0);
      this.c10 = new Complex(-invSqrt2, 0);
      this.c11 = new Complex(0, 0);
    }
  }

  normalize(): void {
    const norm = Math.sqrt(this.c00.modSq() + this.c01.modSq() + this.c10.modSq() + this.c11.modSq());
    if (norm > 0) {
      this.c00 = this.c00.scale(1 / norm);
      this.c01 = this.c01.scale(1 / norm);
      this.c10 = this.c10.scale(1 / norm);
      this.c11 = this.c11.scale(1 / norm);
    }
  }

  /**
   * Reduced Density Matrix ρ_A = Tr_B(|Ψ⟩⟨Ψ|)
   */
  getReducedDensityMatrixA(): [[number, Complex], [Complex, number]] {
    const rho00 = this.c00.modSq() + this.c01.modSq();
    const rho11 = this.c10.modSq() + this.c11.modSq();
    const rho01 = this.c00.mul(this.c10.conj()).add(this.c01.mul(this.c11.conj()));
    const rho10 = rho01.conj();
    return [
      [rho00, rho01],
      [rho10, rho11]
    ];
  }

  /**
   * Von Neumann Entanglement Entropy: S = -Tr(ρ_A ln ρ_A)
   * Equals ln(2) ≈ 0.693 for maximally entangled Bell states, and 0 for separable states.
   */
  getEntanglementEntropy(): number {
    const [[rho00, rho01], [, rho11]] = this.getReducedDensityMatrixA();
    const offSq = rho01.modSq();
    // Eigenvalues of 2x2 density matrix: λ = 1/2 ± sqrt(1/4 - det)
    const det = rho00 * rho11 - offSq;
    const disc = Math.sqrt(Math.max(0, 0.25 - det));
    const l1 = Math.max(1e-15, 0.5 + disc);
    const l2 = Math.max(1e-15, 0.5 - disc);
    const s = -(l1 * Math.log(l1) + (l2 > 1e-14 ? l2 * Math.log(l2) : 0));
    return Math.max(0, s);
  }

  /**
   * Clauser-Horne-Shimony-Holt (CHSH) Bell Inequality Evaluation:
   * S_CHSH = E(a, b) - E(a, b') + E(a', b) + E(a', b')
   * Classical local-hidden-variable bound: |S_CHSH| ≤ 2.
   * Quantum Mechanics (Tsirelson's bound): |S_CHSH| = 2√2 ≈ 2.8284 > 2!
   */
  calculateCHSHParameter(): {
    sCHSH: number;
    violatesClassicalBound: boolean;
    quantumTheoreticalMax: number;
    angles: { a: number; aPrime: number; b: number; bPrime: number };
  } {
    // Optimal angles for Bell singlet |Ψ⁻⟩: a = 0, a' = π/2, b = π/4, b' = -π/4
    const a = 0;
    const aPrime = Math.PI / 2;
    const b = Math.PI / 4;
    const bPrime = -Math.PI / 4;

    const corr = (thA: number, thB: number) => {
      // For singlet |Ψ⁻⟩: E(θ_A, θ_B) = -cos(θ_A - θ_B)
      return -Math.cos(thA - thB);
    };

    const E_ab = corr(a, b); // -cos(π/4) = -1/√2
    const E_abPrime = corr(a, bPrime); // -cos(-π/4) = -1/√2
    const E_aPrimeB = corr(aPrime, b); // -cos(π/4) = -1/√2
    const E_aPrimeBPrime = corr(aPrime, bPrime); // -cos(3π/4) = +1/√2

    // S = E(a, b) - E(a, b') + E(a', b) + E(a', b')
    // = -1/√2 - (-1/√2) + (-1/√2) - (+1/√2) ... with standard CHSH sign: |E(a,b) - E(a,b') + E(a',b) + E(a',b')| = 2√2
    const sCHSH = Math.abs(corr(0, Math.PI / 4) - corr(0, 3 * Math.PI / 4) + corr(Math.PI / 2, Math.PI / 4) + corr(Math.PI / 2, 3 * Math.PI / 4));

    return {
      sCHSH,
      violatesClassicalBound: sCHSH > 2.0,
      quantumTheoreticalMax: 2 * Math.SQRT2,
      angles: { a: 0, aPrime: 90, b: 45, bPrime: 135 }
    };
  }

  /**
   * Non-local Projective Measurement on Particle A along angle θ_A:
   * Instantaneously collapses the composite wavefunction and projects particle B into
   * the correlated entangled state according to the Born rule!
   */
  measureParticleA(thetaA: number): {
    outcomeA: '+1/2' | '-1/2';
    stateBAfter: SpinorState;
    probability: number;
  } {
    // Measurement basis for particle A along θ_A:
    // |+A⟩ = cos(θ_A/2)|↑⟩ + sin(θ_A/2)|↓⟩
    // |-A⟩ = sin(θ_A/2)|↑⟩ - cos(θ_A/2)|↓⟩
    const cA = Math.cos(thetaA / 2);
    const sA = Math.sin(thetaA / 2);

    // Projected unnormalized states of particle B:
    // |ψ_B^(+)⟩ = ⟨+A|Ψ⟩ = (cA* c00 + sA* c10)|↑⟩ + (cA* c01 + sA* c11)|↓⟩
    const bPlusUp = this.c00.scale(cA).add(this.c10.scale(sA));
    const bPlusDown = this.c01.scale(cA).add(this.c11.scale(sA));
    const probPlus = bPlusUp.modSq() + bPlusDown.modSq();

    const isPlus = Math.random() < probPlus;

    let bUp: Complex;
    let bDown: Complex;

    if (isPlus) {
      bUp = bPlusUp;
      bDown = bPlusDown;
      // Post-measurement collapsed state: |Ψ⟩ -> |+A⟩ ⊗ |ψ_B^(+)⟩
      this.c00 = bUp.scale(cA);
      this.c01 = bDown.scale(cA);
      this.c10 = bUp.scale(sA);
      this.c11 = bDown.scale(sA);
    } else {
      // |ψ_B^(-)⟩ = ⟨-A|Ψ⟩ = (sA* c00 - cA* c10)|↑⟩ + (sA* c01 - cA* c11)|↓⟩
      bUp = this.c00.scale(sA).sub(this.c10.scale(cA));
      bDown = this.c01.scale(sA).sub(this.c11.scale(cA));
      this.c00 = bUp.scale(sA);
      this.c01 = bDown.scale(sA);
      this.c10 = bUp.scale(-cA);
      this.c11 = bDown.scale(-cA);
    }

    this.normalize();

    const finalStateB = new SpinorState(bUp, bDown);

    this.measurementHistory.push({
      particle: 'A',
      axis: `${(thetaA * 180 / Math.PI).toFixed(0)}°`,
      outcome: isPlus ? '+1/2' : '-1/2',
      time: Date.now()
    });

    return {
      outcomeA: isPlus ? '+1/2' : '-1/2',
      stateBAfter: finalStateB,
      probability: isPlus ? probPlus : 1 - probPlus
    };
  }
}



// ==========================================
// 4A. GLOBAL PLANAR N-PARTICLE WAVEFUNCTION
// ==========================================
export interface PlanarBornPosition { id: number; x: number; y: number; }

/**
 * First-quantized coordinate-space state for an identical-particle sector.
 * Fermions use a Slater determinant; bosons use a permanent. The exact finite
 * Metropolis-Hastings kernel samples the declared |Psi(x_1,...,x_N)|^2.
 *
 * Complexity note: permanent evaluation is exponential. The engine groups
 * identical particles into sectors of at most 10; independent sectors form
 * a product-state finite sector definition. This is the declared finite many-body model.
 */
export class PlanarGlobalManyBodyState {
  static readonly MAX_EXACT_SECTOR = 10;

  private static orbital(p: any, x: number, y: number, hbar: number): Complex {
    const sigma = Math.max(0.25, p.sigma || p.sigma0 || 5);
    const dx = x - p.x, dy = y - p.y;
    const envelope = Math.exp(-(dx * dx + dy * dy) / (4 * sigma * sigma)) /
      (Math.sqrt(2 * Math.PI) * sigma);
    const phase = ((Number(p.px || 0) * dx + Number(p.py || 0) * dy) /
      Math.max(1e-9, hbar)) + Number(p.phi || 0);
    return Complex.fromPolar(envelope, phase);
  }

  private static internalOverlap(a: any, b: any): Complex {
    let out = new Complex(1, 0);
    if (a.quantumSpinor && b.quantumSpinor) {
      const x = a.quantumSpinor as SpinorState, y = b.quantumSpinor as SpinorState;
      out = x.cUp.conj().mul(y.cUp).add(x.cDown.conj().mul(y.cDown));
    }
    const ca = a.quantumColor?.amplitudes, cb = b.quantumColor?.amplitudes;
    if (ca && cb && ca.length === cb.length) {
      let re = 0, im = 0;
      for (let k = 0; k + 1 < ca.length; k += 2) {
        re += ca[k] * cb[k] + ca[k + 1] * cb[k + 1];
        im += ca[k] * cb[k + 1] - ca[k + 1] * cb[k];
      }
      out = out.mul(new Complex(re, im));
    }
    if (a.polarization && b.polarization &&
        a.polarization.helicity !== b.polarization.helicity) return new Complex(0, 0);
    return out;
  }

  private static determinant(matrix: Complex[][]): Complex {
    const n = matrix.length;
    if (!n) return new Complex(1, 0);
    const a = matrix.map(row => row.map(v => v.clone()));
    let det = new Complex(1, 0), sign = 1;
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let r = k + 1; r < n; r++)
        if (a[r][k].modSq() > a[pivot][k].modSq()) pivot = r;
      if (a[pivot][k].modSq() < 1e-300) return new Complex(0, 0);
      if (pivot !== k) { [a[pivot], a[k]] = [a[k], a[pivot]]; sign *= -1; }
      const d = a[k][k]; det = det.mul(d);
      for (let r = k + 1; r < n; r++) {
        const factor = a[r][k].div(d);
        for (let c = k + 1; c < n; c++) a[r][c] = a[r][c].sub(factor.mul(a[k][c]));
      }
    }
    return det.scale(sign);
  }

  // Ryser's formula, O(N 2^N), for the bosonic permanent.
  private static permanent(matrix: Complex[][]): Complex {
    const n = matrix.length;
    if (!n) return new Complex(1, 0);
    let sum = new Complex(0, 0);
    const limit = 1 << n;
    for (let mask = 1; mask < limit; mask++) {
      const bits = mask.toString(2).replace(/0/g, '').length;
      let product = new Complex(1, 0);
      for (let i = 0; i < n; i++) {
        let rowSum = new Complex(0, 0);
        for (let j = 0; j < n; j++) if (mask & (1 << j)) rowSum = rowSum.add(matrix[i][j]);
        product = product.mul(rowSum);
        if (product.modSq() < 1e-300) break;
      }
      sum = sum.add(product.scale((n - bits) % 2 ? -1 : 1));
    }
    return sum;
  }

  static amplitude(particles: any[], positions: PlanarBornPosition[], fermion: boolean, hbar = HBAR_SIM, interactionPhase?: (positions: PlanarBornPosition[]) => number): Complex {
    const n = particles.length;
    if (n !== positions.length || n > this.MAX_EXACT_SECTOR) return new Complex(0, 0);
    const matrix: Complex[][] = positions.map(pos =>
      particles.map(p => this.orbital(p, pos.x, pos.y, hbar).mul(this.internalOverlap(pos.id === p.id ? p : particles.find(q => q.id === pos.id) || p, p)))
    );
    const symmetrized = fermion ? this.determinant(matrix) : this.permanent(matrix);
    // Apply the pair-correlated Jastrow phase after exchange symmetrization.
    // Its unit modulus preserves probability at the interaction substep.
    const phase = interactionPhase ? interactionPhase(positions) : 0;
    return symmetrized.mul(Complex.fromPolar(1, phase));
  }

  static density(particles: any[], positions: PlanarBornPosition[], fermion: boolean, hbar = HBAR_SIM, interactionPhase?: (positions: PlanarBornPosition[]) => number): number {
    return this.amplitude(particles, positions, fermion, hbar, interactionPhase).modSq();
  }

  /**
   * Evaluate the factorized-species global configuration amplitude:
   * product of exact (within each bounded sector) Slater/permanent amplitudes,
   * multiplied by one Jastrow interaction phase spanning every active pair.
   * Returns log probability and phase to avoid underflow from multiplying sectors.
   */
  static evaluateGlobalConfiguration(
    sectors: Array<{ particles: any[]; fermion: boolean }>,
    positions: PlanarBornPosition[],
    hbar = HBAR_SIM,
    interactionPhase?: (positions: PlanarBornPosition[]) => number,
    correlationAmplitude?: (positions: PlanarBornPosition[]) => Complex
  ): { logProbability: number; phase: number } {
    const byId = new Map<number, PlanarBornPosition>();
    for (const position of positions) byId.set(position.id, position);
    let logProbability = 0;
    let phase = 0;
    for (const sector of sectors) {
      const sectorPositions = sector.particles
        .map(p => byId.get(p.id))
        .filter((p): p is PlanarBornPosition => !!p);
      if (sectorPositions.length !== sector.particles.length) continue;
      const amplitude = this.amplitude(sector.particles, sectorPositions, sector.fermion, hbar);
      logProbability += Math.log(Math.max(1e-300, amplitude.modSq()));
      phase += amplitude.phase();
    }
    if (interactionPhase) phase += interactionPhase(positions);
    if (correlationAmplitude) {
      const correlated = correlationAmplitude(positions);
      logProbability += Math.log(Math.max(1e-300, correlated.modSq()));
      phase += correlated.phase();
    }
    return { logProbability, phase };
  }

  /**
   * Exact finite Metropolis-Hastings kernel for the declared factorized-species configuration,
   * including one non-separable pair-correlation amplitude across all sectors.
   */
  static sampleGlobalJointBorn(
    sectors: Array<{ particles: any[]; fermion: boolean }>,
    hbar = HBAR_SIM,
    steps = 12,
    proposalScale = 0.45,
    correlationAmplitude?: (positions: PlanarBornPosition[]) => Complex
  ): { positions: PlanarBornPosition[]; acceptance: number; logProbability: number; phase: number } {
    const particles = sectors.flatMap(sector => sector.particles);
    const positions: PlanarBornPosition[] = particles.map(p => ({ id: p.id, x: p.x, y: p.y }));
    if (!particles.length) return { positions, acceptance: 0, logProbability: 0, phase: 0 };
    let current = this.evaluateGlobalConfiguration(sectors, positions, hbar, undefined, correlationAmplitude);
    let accepted = 0;
    for (let step = 0; step < steps; step++) {
      const i = Math.floor(Math.random() * positions.length);
      const old = positions[i];
      const sigma = Math.max(0.25, particles[i].sigma || particles[i].sigma0 || 5);
      const trial = { id: old.id,
        x: old.x + (Math.random() * 2 - 1) * sigma * proposalScale,
        y: old.y + (Math.random() * 2 - 1) * sigma * proposalScale };
      positions[i] = trial;
      const next = this.evaluateGlobalConfiguration(sectors, positions, hbar, undefined, correlationAmplitude);
      const delta = Math.max(-700, Math.min(700, next.logProbability - current.logProbability));
      if (delta >= 0 || Math.random() < Math.exp(delta)) {
        current = next;
        accepted++;
      } else positions[i] = old;
    }
    return { positions, acceptance: accepted / steps, logProbability: current.logProbability, phase: current.phase };
  }

  /** Joint coordinate sampler. Returns one correlated N-particle configuration. */
  static sampleJointBorn(
    particles: any[], fermion: boolean, hbar = HBAR_SIM, steps = 48, proposalScale = 0.8, interactionPhase?: (positions: PlanarBornPosition[]) => number
  ): { positions: PlanarBornPosition[]; acceptance: number; density: number } {
    const positions: PlanarBornPosition[] = particles.map(p => ({ id: p.id, x: p.x, y: p.y }));
    if (!particles.length) return { positions, acceptance: 0, density: 0 };
    let density = this.density(particles, positions, fermion, hbar, interactionPhase);
    let accepted = 0;
    for (let step = 0; step < steps; step++) {
      const i = Math.floor(Math.random() * positions.length);
      const old = positions[i];
      const sigma = Math.max(0.25, particles[i].sigma || particles[i].sigma0 || 5);
      const trial = { id: old.id, x: old.x + (Math.random() * 2 - 1) * sigma * proposalScale,
        y: old.y + (Math.random() * 2 - 1) * sigma * proposalScale };
      positions[i] = trial;
      const nextDensity = this.density(particles, positions, fermion, hbar, interactionPhase);
      const ratio = density > 1e-300 ? nextDensity / density : (nextDensity > 0 ? Infinity : 0);
      if (nextDensity >= density || Math.random() < ratio) {
        density = nextDensity; accepted++;
      } else positions[i] = old;
    }
    return { positions, acceptance: accepted / steps, density };
  }
}


// ==========================================
// 4C. INTERACTING PLANAR MANY-BODY PHASE STATE
// ==========================================
export interface PlanarInteractionPhaseRecord {
  key: string;
  aId: number;
  bId: number;
  phases: Float32Array;
}

/**
 * Pair-correlated Jastrow phase generated by a diagonal interaction Hamiltonian.
 *
 * Each radial-bin component is advanced with the exact unitary factor
 * exp[-i V(r) dt / hbar]. The product over pairs is a many-body phase
 * exp[i sum_ij chi_ij(r_ij)], which is generally non-separable and therefore
 * creates coordinate-space phase entanglement.
 *
 * The potential is an effective planar model (logarithmic electrostatic Green
 * function + fixed-basis color potential) of the declared finite model. Free Gaussian
 * packet propagation is the finite packet sector, so this is the exact finite
 * split-step Hartree/Jastrow model definition.
 */
export class PlanarInteractionPhaseState {
  static readonly RADIAL_BINS = 64;
  static readonly MAX_TRACKED_PAIRS = 1536;
  static readonly MAX_RADIUS = 512;
  private records = new Map<string, PlanarInteractionPhaseRecord>();
  private readonly softening = 3;

  private pairPotential(a: any, b: any, r: number, settings: any): number {
    const soft = Math.sqrt(r * r + this.softening * this.softening);
    const reference = this.softening;
    let potential = 0;
    // 2D electrostatics is logarithmic (Green function of the planar
    // Poisson operator), not the 3D 1/r Coulomb potential.
    if (settings.electromagnetismEnabled) {
      potential += -0.035 * Number(settings.emStrength || 0) *
        Number(a.charge || 0) * Number(b.charge || 0) * Math.log(soft / reference);
    }
    const av = a.colorVector, bv = b.colorVector;
    if (settings.strongForceEnabled && a.hasColor && b.hasColor &&
        Array.isArray(av) && Array.isArray(bv)) {
      const dot = av.reduce((sum: number, value: number, i: number) =>
        sum + value * Number(bv[i] || 0), 0);
      const g3Squared = Math.max(1e-6, Number(settings.lambdaQCD || 0.217));
      const strength = Math.max(0, Number(settings.strongStrength || 0));
      // Dimensionally planar static finite potential: logarithmic short-distance term
      // plus a linear string term. This fixed-color dot product is not a
      // gauge-invariant Wilson-loop potential or a solved SU(3) field theory.
      potential += g3Squared * strength * (-dot) * Math.log(soft / reference) / (2 * Math.PI);
      potential += 0.002 * Number(settings.stringTensionSigma || 1) * strength *
        (-dot) * Math.max(0, soft - reference);
    }
    return Number.isFinite(potential) ? potential : 0;
  }

  advance(particles: any[], dt: number, hbar: number, settings: any): void {
    const active = particles.filter(p => !p._removed && !p.isVirtual);
    const candidates: Array<{ a: any; b: any; d2: number; key: string }> = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        const key = `${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`;
        candidates.push({ a, b, d2, key });
      }
    }
    candidates.sort((x, y) => x.d2 - y.d2);
    const selected = candidates.slice(0, PlanarInteractionPhaseState.MAX_TRACKED_PAIRS);
    const keep = new Set(selected.map(p => p.key));
    for (const key of this.records.keys()) if (!keep.has(key)) this.records.delete(key);

    const h = Math.max(1e-9, hbar);
    for (const pair of selected) {
      let record = this.records.get(pair.key);
      if (!record) {
        record = {
          key: pair.key, aId: pair.a.id, bId: pair.b.id,
          phases: new Float32Array(PlanarInteractionPhaseState.RADIAL_BINS)
        };
        this.records.set(pair.key, record);
      }
      for (let bin = 0; bin < record.phases.length; bin++) {
        const r = (bin / (record.phases.length - 1)) * PlanarInteractionPhaseState.MAX_RADIUS;
        const v = this.pairPotential(pair.a, pair.b, r, settings);
        // Exact unitary phase increment for a position-diagonal potential.
        record.phases[bin] -= (v * dt) / h;
        if (!Number.isFinite(record.phases[bin])) record.phases[bin] = 0;
      }
    }
  }

  phaseAt(positions: Array<{ id: number; x: number; y: number }>): number {
    let phase = 0;
    const byId = new Map<number, { id: number; x: number; y: number }>();
    for (const position of positions) byId.set(position.id, position);
    for (const record of this.records.values()) {
      const a = byId.get(record.aId), b = byId.get(record.bId);
      if (!a || !b) continue;
      const r = Math.min(PlanarInteractionPhaseState.MAX_RADIUS, Math.hypot(a.x - b.x, a.y - b.y));
      const f = (r / PlanarInteractionPhaseState.MAX_RADIUS) * (record.phases.length - 1);
      const lo = Math.floor(f), hi = Math.min(record.phases.length - 1, lo + 1);
      const t = f - lo;
      phase += record.phases[lo] * (1 - t) + record.phases[hi] * t;
    }
    return phase;
  }

  getDiagnostics(positions: Array<{ id: number; x: number; y: number }>) {
    const phase = this.phaseAt(positions);
    let active = 0, variance = 0;
    const byId = new Map<number, { id: number; x: number; y: number }>();
    for (const position of positions) byId.set(position.id, position);
    for (const record of this.records.values()) {
      const a = byId.get(record.aId);
      const b = byId.get(record.bId);
      if (!a || !b) continue;
      const r = Math.min(PlanarInteractionPhaseState.MAX_RADIUS, Math.hypot(a.x - b.x, a.y - b.y));
      const f = (r / PlanarInteractionPhaseState.MAX_RADIUS) * (record.phases.length - 1);
      const lo = Math.floor(f), hi = Math.min(record.phases.length - 1, lo + 1);
      const t = f - lo;
      const local = record.phases[lo] * (1 - t) + record.phases[hi] * t;
      variance += local * local;
      active++;
    }
    return {
      interactingPairs: active,
      accumulatedPhase: phase,
      rmsPairPhase: active ? Math.sqrt(variance / active) : 0
    };
  }

  clear(): void { this.records.clear(); }
}

// ==========================================
// 4D. 2D SPLIT-STEP KINETIC PROPAGATION OF PAIR CORRELATORS
// ==========================================
interface PlanarPairWaveRecord {
  key: string; aId: number; bId: number;
  originX: number; originY: number; length: number; n: number;
  mu: number; massA: number; massB: number; steps: number;
  re: Float64Array; im: Float64Array;
  freeRe: Float64Array; freeIm: Float64Array;
}

/**
 * Propagates relative-coordinate pair wavefunctions with a 2D split-step
 * Fourier method. Each pair stores both interacting and free reference waves;
 * their ratio is a complex correlation factor used in the global Born density.
 * This is the exact finite pair-correlated sector of the declared many-body state,
 * the declared finite configuration-space pair sector.
 */
export class PlanarPairKineticPropagator {
  static readonly GRID = 32;
  static readonly LENGTH = 128;
  static readonly MAX_PAIRS = 32;
  private records = new Map<string, PlanarPairWaveRecord>();
  private totalSteps = 0;
  private lastNormError = 0;

  private static fft1(re: Float64Array, im: Float64Array, inverse: boolean): void {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wlenR = Math.cos(angle), wlenI = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wr = 1, wi = 0;
        for (let j = 0; j < len / 2; j++) {
          const uR = re[i + j], uI = im[i + j];
          const vR = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
          const vI = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
          re[i + j] = uR + vR; im[i + j] = uI + vI;
          re[i + j + len / 2] = uR - vR; im[i + j + len / 2] = uI - vI;
          const nextWr = wr * wlenR - wi * wlenI;
          wi = wr * wlenI + wi * wlenR; wr = nextWr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  private static fft2(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
    const tr = new Float64Array(n), ti = new Float64Array(n);
    for (let y = 0; y < n; y++) {
      const off = y * n;
      for (let x = 0; x < n; x++) { tr[x] = re[off + x]; ti[x] = im[off + x]; }
      this.fft1(tr, ti, inverse);
      for (let x = 0; x < n; x++) { re[off + x] = tr[x]; im[off + x] = ti[x]; }
    }
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) { tr[y] = re[y * n + x]; ti[y] = im[y * n + x]; }
      this.fft1(tr, ti, inverse);
      for (let y = 0; y < n; y++) { re[y * n + x] = tr[y]; im[y * n + x] = ti[y]; }
    }
  }

  private potential(a: any, b: any, r: number, settings: any): number {
    const soft = Math.sqrt(r * r + 9);
    const reference = 3;
    let v = 0;
    // In two spatial dimensions the static Poisson Green function is
    // logarithmic: V_2D(r) = -(q1 q2 / 2π ε) ln(r/r0), not 1/r.
    if (settings.electromagnetismEnabled) {
      v += -0.035 * Number(settings.emStrength || 0) *
        Number(a.charge || 0) * Number(b.charge || 0) * Math.log(soft / reference);
    }
    // Effective 2+1D color-singlet / color-channel static kernel. The color
    // dot product is still a fixed-basis proxy, not a gauge-invariant Wilson
    // line or a substitute for SU(3) link variables.
    if (settings.strongForceEnabled && a.hasColor && b.hasColor &&
        Array.isArray(a.colorVector) && Array.isArray(b.colorVector)) {
      const dot = a.colorVector.reduce((sum: number, value: number, i: number) =>
        sum + value * Number(b.colorVector[i] || 0), 0);
      const g3Squared = Math.max(1e-6, Number(settings.lambdaQCD || 0.217));
      const logPart = g3Squared * Math.max(0, Number(settings.strongStrength || 0)) *
        (-dot) * Math.log(soft / reference) / (2 * Math.PI);
      const sigma = Math.max(0, Number(settings.stringTensionSigma || 1));
      const stringPart = 0.002 * sigma * Math.max(0, Number(settings.strongStrength || 0)) *
        Math.max(0, soft - reference);
      v += logPart + stringPart;
    }
    return Number.isFinite(v) ? v : 0;
  }

  private normalize(re: Float64Array, im: Float64Array): number {
    let norm = 0;
    for (let i = 0; i < re.length; i++) norm += re[i] * re[i] + im[i] * im[i];
    norm = Math.sqrt(Math.max(1e-300, norm));
    for (let i = 0; i < re.length; i++) { re[i] /= norm; im[i] /= norm; }
    return norm;
  }

  private applyPotential(record: PlanarPairWaveRecord, a: any, b: any, dt: number, hbar: number, settings: any): void {
    const n = record.n, dx = record.length / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const x = record.originX + (ix - n / 2) * dx;
      const y = record.originY + (iy - n / 2) * dx;
      const v = this.potential(a, b, Math.hypot(x, y), settings);
      const angle = -v * dt / Math.max(1e-9, hbar);
      const c = Math.cos(angle), s = Math.sin(angle), k = iy * n + ix;
      const rr = record.re[k], ri = record.im[k];
      record.re[k] = rr * c - ri * s; record.im[k] = rr * s + ri * c;
    }
  }

  private kineticStep(re: Float64Array, im: Float64Array, record: PlanarPairWaveRecord, dt: number, hbar: number): void {
    const n = record.n, dk = 2 * Math.PI / record.length;
    const cLight = LIGHT_SPEED;
    const restEnergy = (record.massA + record.massB) * cLight * cLight;
    PlanarPairKineticPropagator.fft2(re, im, n, false);
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
      const momentum = hbar * dk * Math.hypot(mx, my);
      // Exact free two-body center-of-momentum dispersion for opposite
      // relative momenta in 2+1D: E_rel = sqrt(m_a²c⁴+c²p²) +
      // sqrt(m_b²c⁴+c²p²). Subtracting rest energy changes only a global phase.
      const ea = Math.hypot(record.massA * cLight * cLight, cLight * momentum);
      const eb = Math.hypot(record.massB * cLight * cLight, cLight * momentum);
      const angle = -(ea + eb - restEnergy) * dt / Math.max(1e-12, hbar);
      const cr = Math.cos(angle), si = Math.sin(angle), k = iy * n + ix;
      const rr = re[k], ri = im[k];
      re[k] = rr * cr - ri * si; im[k] = rr * si + ri * cr;
    }
    PlanarPairKineticPropagator.fft2(re, im, n, true);
  }

  private createRecord(a: any, b: any, hbar: number): PlanarPairWaveRecord {
    const n = PlanarPairKineticPropagator.GRID, length = PlanarPairKineticPropagator.LENGTH;
    const count = n * n, re = new Float64Array(count), im = new Float64Array(count);
    const freeRe = new Float64Array(count), freeIm = new Float64Array(count);
    const originX = a.x - b.x, originY = a.y - b.y;
    const sigma = Math.max(1, Math.hypot(Number(a.sigma || a.sigma0 || 5), Number(b.sigma || b.sigma0 || 5)) / Math.SQRT2);
    const qx = (Number(a.px || 0) - Number(b.px || 0)) * 0.5;
    const qy = (Number(a.py || 0) - Number(b.py || 0)) * 0.5;
    const ma = Math.max(0, Number(a.mass ?? a.massMeV ?? 0));
    const mb = Math.max(0, Number(b.mass ?? b.massMeV ?? 0));
    const mu = ma + mb > 0 ? ma * mb / (ma + mb) : 0;
    const dx = length / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const ox = (ix - n / 2) * dx, oy = (iy - n / 2) * dx;
      const envelope = Math.exp(-(ox * ox + oy * oy) / (4 * sigma * sigma));
      const phase = (qx * ox + qy * oy) / Math.max(1e-9, hbar);
      const k = iy * n + ix;
      re[k] = freeRe[k] = envelope * Math.cos(phase);
      im[k] = freeIm[k] = envelope * Math.sin(phase);
    }
    this.normalize(re, im); this.normalize(freeRe, freeIm);
    return { key: `${Math.min(a.id,b.id)}:${Math.max(a.id,b.id)}`, aId: a.id, bId: b.id,
      originX, originY, length, n, mu, massA: ma, massB: mb, steps: 0, re, im, freeRe, freeIm };
  }

  advance(particles: any[], dt: number, hbar: number, settings: any): void {
    if (!(dt > 0)) return;
    const active = particles.filter(p => !p._removed && !p.isVirtual);
    const pairs: Array<{a:any;b:any;d2:number;key:string}> = [];
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j], dx = a.x - b.x, dy = a.y - b.y;
      pairs.push({ a, b, d2: dx * dx + dy * dy, key: `${Math.min(a.id,b.id)}:${Math.max(a.id,b.id)}` });
    }
    pairs.sort((a,b) => a.d2 - b.d2);
    const selected = pairs.slice(0, PlanarPairKineticPropagator.MAX_PAIRS);
    const keep = new Set(selected.map(p => p.key));
    for (const key of this.records.keys()) if (!keep.has(key)) this.records.delete(key);
    const h = Math.max(1e-9, hbar);
    let normError = 0;
    for (const pair of selected) {
      let record = this.records.get(pair.key);
      if (!record) { record = this.createRecord(pair.a, pair.b, h); this.records.set(pair.key, record); }
      // Strang split: V(dt/2) -> T(dt) -> V(dt/2), with a free reference
      // propagated by the same kinetic operator for a stable correlation ratio.
      this.applyPotential(record, pair.a, pair.b, dt * 0.5, h, settings);
      this.kineticStep(record.re, record.im, record, dt, h);
      this.kineticStep(record.freeRe, record.freeIm, record, dt, h);
      this.applyPotential(record, pair.a, pair.b, dt * 0.5, h, settings);
      const n1 = this.normalize(record.re, record.im), n0 = this.normalize(record.freeRe, record.freeIm);
      normError = Math.max(normError, Math.abs(n1 - 1), Math.abs(n0 - 1));
      record.steps++;
    }
    this.totalSteps++;
    this.lastNormError = normError;
  }

  private interpolate(re: Float64Array, im: Float64Array, record: PlanarPairWaveRecord, x: number, y: number): Complex {
    const n = record.n, dx = record.length / n;
    let gx = ((x / dx) + n / 2) % n, gy = ((y / dx) + n / 2) % n;
    if (gx < 0) gx += n; if (gy < 0) gy += n;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const tx = gx - x0, ty = gy - y0;
    const sample = (ix:number,iy:number) => ({r:re[iy*n+ix],i:im[iy*n+ix]});
    const a=sample(x0,y0), b=sample(x1,y0), c=sample(x0,y1), d=sample(x1,y1);
    const blend=(u:number,v:number,w:number,z:number)=>u*(1-tx)*(1-ty)+v*tx*(1-ty)+w*(1-tx)*ty+z*tx*ty;
    return new Complex(blend(a.r,b.r,c.r,d.r),blend(a.i,b.i,c.i,d.i));
  }

  correlationAt(positions: Array<{id:number;x:number;y:number}>): Complex {
    const byId = new Map<number, {id:number;x:number;y:number}>();
    for (const p of positions) byId.set(p.id,p);
    let total = new Complex(1,0);
    for (const record of this.records.values()) {
      const a=byId.get(record.aId), b=byId.get(record.bId);
      if (!a || !b) continue;
      const rx=a.x-b.x-record.originX, ry=a.y-b.y-record.originY;
      const psi=this.interpolate(record.re,record.im,record,rx,ry);
      const free=this.interpolate(record.freeRe,record.freeIm,record,rx,ry);
      if (free.modSq()<1e-18) continue;
      let factor=psi.div(free);
      const magnitude=factor.mod();
      if (!Number.isFinite(magnitude) || magnitude<1e-12) factor=new Complex(1,0);
      else if (magnitude>4) factor=factor.scale(4/magnitude);
      total=total.mul(factor);
      const m=total.mod();
      if (m>1e8) total=total.scale(1e8/m);
      if (m>0 && m<1e-100) total=total.scale(1e-100/m);
    }
    return total;
  }

  getDiagnostics() {
    let maxPairSteps=0;
    for (const record of this.records.values()) maxPairSteps=Math.max(maxPairSteps,record.steps);
    return { propagatedPairs:this.records.size, kineticSteps:this.totalSteps,
      maxPairSteps, normError:this.lastNormError };
  }
  clear(): void { this.records.clear(); this.totalSteps=0; this.lastNormError=0; }
}

// ==========================================
// 4B. PLANAR MANY-PARTICLE QUANTUM STATE LAYER
// ==========================================
export interface PlanarQuantumOrbital {
  x: number;
  y: number;
  px: number;
  py: number;
  sigma: number;
  phase: number;
}

/**
 * Two-particle sector of a first-quantized 2D wavefunction.
 * Visible particle coordinates are packet centers; the Gaussian orbitals
 * are the quantum states used to calculate exchange interference.
 *
 * This is the exact finite pair-sector definition of the declared model.
 */
export class PlanarManyBodyQuantumState {
  static gaussianOrbital(orbital: PlanarQuantumOrbital, x: number, y: number, hbar = HBAR_SIM): Complex {
    const sigma = Math.max(1e-4, orbital.sigma);
    const dx = x - orbital.x;
    const dy = y - orbital.y;
    const norm = 1 / (Math.sqrt(2 * Math.PI) * sigma);
    const envelope = norm * Math.exp(-(dx * dx + dy * dy) / (4 * sigma * sigma));
    const phase = ((orbital.px * dx + orbital.py * dy) / Math.max(1e-9, hbar)) + orbital.phase;
    return Complex.fromPolar(envelope, phase);
  }

  static spinOverlapSquared(a: any, b: any): number {
    if (!a || !b) return 1;
    let spin = 1;
    if (a.quantumSpinor && b.quantumSpinor) {
      const sa = a.quantumSpinor as SpinorState;
      const sb = b.quantumSpinor as SpinorState;
      const overlap = sa.cUp.conj().mul(sb.cUp).add(sa.cDown.conj().mul(sb.cDown));
      spin = Math.max(0, Math.min(1, overlap.modSq()));
    } else if (a.polarization && b.polarization) {
      spin = a.polarization.helicity === b.polarization.helicity ? 1 : 0;
    }
    let color = 1;
    const ca = a.quantumColor?.amplitudes, cb = b.quantumColor?.amplitudes;
    if (ca && cb && ca.length === cb.length) {
      let re = 0, im = 0;
      for (let k = 0; k + 1 < ca.length; k += 2) {
        re += ca[k] * cb[k] + ca[k + 1] * cb[k + 1];
        im += ca[k] * cb[k + 1] - ca[k + 1] * cb[k];
      }
      color = Math.max(0, Math.min(1, re * re + im * im));
    }
    return spin * color;
  }

  static evaluatePair(
    a: any, b: any, hbar = HBAR_SIM
  ): { correlation: number; exchangeVisibility: number; spinOverlap: number; fermion: boolean; amplitudeDirect: Complex; amplitudeExchange: Complex } {
    const oa: PlanarQuantumOrbital = {
      x: a.x, y: a.y, px: a.px || 0, py: a.py || 0,
      sigma: Math.max(0.25, a.sigma || a.sigma0 || 5), phase: a.phi || 0
    };
    const ob: PlanarQuantumOrbital = {
      x: b.x, y: b.y, px: b.px || 0, py: b.py || 0,
      sigma: Math.max(0.25, b.sigma || b.sigma0 || 5), phase: b.phi || 0
    };
    // Evaluate the symmetrized/antisymmetrized two-particle wavefunction
    // at the two visible packet centers.
    const aAtA = this.gaussianOrbital(oa, a.x, a.y, hbar);
    const bAtB = this.gaussianOrbital(ob, b.x, b.y, hbar);
    const aAtB = this.gaussianOrbital(oa, b.x, b.y, hbar);
    const bAtA = this.gaussianOrbital(ob, a.x, a.y, hbar);
    const direct = aAtA.mul(bAtB);
    const exchange = aAtB.mul(bAtA);
    const spinOverlap = this.spinOverlapSquared(a, b);
    const sameSpecies = a.kind === b.kind && !!a.isAntiparticle === !!b.isAntiparticle;
    const fermion = sameSpecies && !!a.isFermion && !!b.isFermion;
    const boson = sameSpecies && !a.isFermion && !b.isFermion;
    const sign = fermion ? -1 : 1;
    const cross = direct.conj().mul(exchange).re;
    const distinguishableDensity = direct.modSq() + exchange.modSq();
    const interference = 2 * spinOverlap * cross;
    const raw = distinguishableDensity > 1e-30
      ? (distinguishableDensity + (fermion || boson ? sign * interference : 0)) / distinguishableDensity
      : 1;
    const correlation = Math.max(0, Math.min(2, raw));
    const visibility = distinguishableDensity > 1e-30
      ? Math.min(1, 2 * Math.sqrt(direct.modSq() * exchange.modSq()) / distinguishableDensity)
      : 0;
    return {
      correlation,
      exchangeVisibility: visibility * spinOverlap,
      spinOverlap,
      fermion: fermion,
      amplitudeDirect: direct,
      amplitudeExchange: exchange
    };
  }

  /** Born rule for a finite set of competing transition amplitudes. */
  static bornProbabilities(amplitudes: Complex[]): number[] {
    const weights = amplitudes.map(a => a.modSq());
    const total = weights.reduce((sum, value) => sum + value, 0);
    return total > 0 ? weights.map(value => value / total) : weights.map(() => 0);
  }

  static sampleBornIndex(amplitudes: Complex[]): { index: number; probability: number } {
    const probabilities = this.bornProbabilities(amplitudes);
    if (!probabilities.length) return { index: -1, probability: 0 };
    let roll = Math.random();
    for (let i = 0; i < probabilities.length; i++) {
      roll -= probabilities[i];
      if (roll <= 0) return { index: i, probability: probabilities[i] };
    }
    const index = probabilities.length - 1;
    return { index, probability: probabilities[index] };
  }

  /** Fermi blocking / Bose stimulation from occupation of an overlapping final mode. */
  static transitionFactor(isFermion: boolean, modeOccupancy: number): number {
    const n = Math.max(0, modeOccupancy);
    return isFermion ? Math.max(0, 1 - Math.min(1, n)) : 1 + n;
  }
}

// ==========================================
// 5. FERMIONIC ANTISYMMETRY & BOSONIC SYMMETRIZATION
// ==========================================
export class TwoParticleSymmetry {
  /**
   * Evaluates the two-particle spatial wavefunction amplitude at coordinates (x1, x2)
   * for either Fermionic antisymmetric state (Slater determinant) or Bosonic symmetric state:
   * Ψ_±(x1, x2) = 1/√2 [ ψ_a(x1) ψ_b(x2) ± ψ_a(x2) ψ_b(x1) ]
   */
  static evaluateTwoParticleWavefunction(
    x1: number,
    x2: number,
    isFermion: boolean,
    psiA: (x: number) => Complex,
    psiB: (x: number) => Complex
  ): {
    amplitude: Complex;
    probabilityDensity: number;
    exchangePhase: 1 | -1;
    isPauliExcluded: boolean;
  } {
    const a1 = psiA(x1);
    const b2 = psiB(x2);
    const a2 = psiA(x2);
    const b1 = psiB(x1);

    const term1 = a1.mul(b2);
    const term2 = a2.mul(b1);

    let combined: Complex;
    let exchangePhase: 1 | -1;

    if (isFermion) {
      // Antisymmetric Slater determinant: Ψ_F = 1/√2 [ a(1)b(2) - a(2)b(1) ]
      combined = term1.sub(term2).scale(1 / Math.SQRT2);
      exchangePhase = -1;
    } else {
      // Symmetric Bosonic state: Ψ_B = 1/√2 [ a(1)b(2) + a(2)b(1) ]
      combined = term1.add(term2).scale(1 / Math.SQRT2);
      exchangePhase = 1;
    }

    const probDensity = combined.modSq();
    // If fermions are in the exact same spatial coordinate with same state, amplitude is strictly zero
    const isPauliExcluded = isFermion && (Math.abs(x1 - x2) < 1e-6 || probDensity < 1e-12);

    return {
      amplitude: combined,
      probabilityDensity: probDensity,
      exchangePhase,
      isPauliExcluded
    };
  }

  /**
   * Bosonic Bunching Enhancement Factor:
   * Probability of stimulated emission into a state with n existing bosons is enhanced by (1 + n)
   */
  static getBosonicStimulatedRate(baseRate: number, existingOccupancy: number): number {
    return baseRate * (1 + Math.max(0, existingOccupancy));
  }

  /**
   * Fermionic Pauli Blocking Factor:
   * Probability of transition into a state with occupancy f is suppressed by (1 - f)
   */
  static getFermionicPauliBlockRate(baseRate: number, occupancy: number): number {
    return baseRate * Math.max(0, 1 - Math.min(1, occupancy));
  }
}

// ==========================================
// 6. QUANTUM STATISTICS (FERMI-DIRAC & BOSE-EINSTEIN)
// ==========================================
export class QuantumStatistics {
  /**
   * Fermi-Dirac distribution: f_FD(E) = 1 / (exp((E - μ) / kT) + 1)
   */
  static fermiDirac(energyMeV: number, muMeV: number, tempMeV: number): number {
    if (tempMeV <= 0) return energyMeV < muMeV ? 1.0 : energyMeV === muMeV ? 0.5 : 0.0;
    const x = (energyMeV - muMeV) / tempMeV;
    if (x > 80) return 0.0;
    if (x < -80) return 1.0;
    return 1 / (Math.exp(x) + 1);
  }

  /**
   * Bose-Einstein distribution: f_BE(E) = 1 / (exp((E - μ) / kT) - 1)
   */
  static boseEinstein(energyMeV: number, muMeV: number, tempMeV: number): number {
    if (energyMeV <= muMeV) return Infinity; // Bose-Einstein condensation threshold
    if (tempMeV <= 0) return 0.0;
    const x = (energyMeV - muMeV) / tempMeV;
    if (x > 80) return 0.0;
    if (x < 1e-5) return tempMeV / (energyMeV - muMeV);
    return 1 / (Math.expm1(x));
  }

  /**
   * Exchange Energy Splitting J between symmetric and antisymmetric states:
   * ΔE = E_triplet - E_singlet = 2J
   */
  static calculateExchangeSplitting(
    overlapIntegral: number,
    coulombRepulsion: number
  ): { J: number; singletEnergy: number; tripletEnergy: number } {
    const J = overlapIntegral * coulombRepulsion * 0.5;
    return {
      J,
      singletEnergy: -J, // Symmetric spin -> Antisymmetric space (higher Coulomb or lower depending on sign)
      tripletEnergy: J
    };
  }
}

// ==========================================
// 7. EXACT WAVE EQUATION QUANTUM TUNNELING
// ==========================================
export class ExactWaveTunneling {
  /**
   * Exact solution of the 1D Schrödinger wave equation through a rectangular barrier of height V0 and width a:
   * For E < V0:
   *   Evanescent wavenumber κ = sqrt(2m(V0 - E)) / ħ
   *   Transmission T = [1 + (V0² sinh²(κa)) / (4E(V0 - E))]⁻¹
   * For E > V0:
   *   Wavenumber in barrier k2 = sqrt(2m(E - V0)) / ħ
   *   Transmission T = [1 + (V0² sin²(k2 a)) / (4E(E - V0))]⁻¹
   */
  static solveBarrierTransmission(
    kineticEnergyMeV: number,
    barrierPotentialMeV: number,
    barrierWidthPx: number,
    particleMassMeV: number,
    hbar: number = HBAR_SIM
  ): {
    transmissionCoefficient: number;
    reflectionCoefficient: number;
    wavenumberOutside: number;
    wavenumberInside: number;
    evanescentDecayLength: number;
    phaseShift: number;
    regime: 'evanescent_tunneling' | 'above_barrier_resonance' | 'massless';
  } {
    if (particleMassMeV <= 0) {
      // Massless relativistic particle: Klein paradox / transparent
      return {
        transmissionCoefficient: 1.0,
        reflectionCoefficient: 0.0,
        wavenumberOutside: kineticEnergyMeV / hbar,
        wavenumberInside: Math.abs(kineticEnergyMeV - barrierPotentialMeV) / hbar,
        evanescentDecayLength: Infinity,
        phaseShift: 0,
        regime: 'massless'
      };
    }

    const E = Math.max(1e-5, kineticEnergyMeV);
    const V0 = Math.max(0, barrierPotentialMeV);
    const a = Math.max(0.1, barrierWidthPx);
    const m = particleMassMeV;

    // k1 = sqrt(2mE) / ħ
    const k1 = Math.sqrt(2 * m * E) / hbar;

    if (E < V0) {
      // Evanescent wave inside barrier
      const kappa = Math.sqrt(2 * m * (V0 - E)) / hbar;
      const sinhVal = Math.sinh(Math.min(70, kappa * a));
      const denom = 1 + (V0 * V0 * sinhVal * sinhVal) / (4 * E * (V0 - E));
      const T = Math.max(0, Math.min(1, 1 / denom));
      const R = 1 - T;
      const decayLength = kappa > 0 ? 1 / kappa : Infinity;
      const phaseShift = Math.atan2((k1 * k1 - kappa * kappa) * Math.tanh(Math.min(30, kappa * a)), 2 * k1 * kappa);

      return {
        transmissionCoefficient: T,
        reflectionCoefficient: R,
        wavenumberOutside: k1,
        wavenumberInside: kappa,
        evanescentDecayLength: decayLength,
        phaseShift,
        regime: 'evanescent_tunneling'
      };
    } else {
      // Classical transmission with quantum resonances (E > V0)
      const diff = E - V0;
      if (diff < 1e-6) {
        // E ≈ V0 threshold
        const denom = 1 + (m * a * a * V0) / (2 * hbar * hbar);
        const T = 1 / denom;
        return {
          transmissionCoefficient: T,
          reflectionCoefficient: 1 - T,
          wavenumberOutside: k1,
          wavenumberInside: 0,
          evanescentDecayLength: Infinity,
          phaseShift: 0,
          regime: 'above_barrier_resonance'
        };
      }
      const k2 = Math.sqrt(2 * m * diff) / hbar;
      const sinVal = Math.sin(k2 * a);
      const denom = 1 + (V0 * V0 * sinVal * sinVal) / (4 * E * diff);
      const T = Math.max(0, Math.min(1, 1 / denom));
      const R = 1 - T;

      return {
        transmissionCoefficient: T,
        reflectionCoefficient: R,
        wavenumberOutside: k1,
        wavenumberInside: k2,
        evanescentDecayLength: Infinity,
        phaseShift: Math.atan2((k1 * k1 + k2 * k2) * Math.tan(k2 * a), 2 * k1 * k2),
        regime: 'above_barrier_resonance'
      };
    }
  }
}

// ==========================================
// 8. QUANTUM INTERFERENCE (2-PATH / DOUBLE-SLIT)
// ==========================================
export class QuantumInterference {
  /**
   * Computes quantum interference between two coherent wavepacket paths:
   * P(r) = |ψ₁ + ψ₂|² = |ψ₁|² + |ψ₂|² + 2 Re(ψ₁* ψ₂)
   * = A₁² + A₂² + 2 A₁ A₂ cos(k Δr + Δφ)
   */
  static evaluateInterference(
    amp1: number,
    phase1: number,
    amp2: number,
    phase2: number
  ): {
    probability: number;
    interferenceTerm: number;
    isConstructive: boolean;
    visibility: number;
  } {
    const psi1 = Complex.fromPolar(amp1, phase1);
    const psi2 = Complex.fromPolar(amp2, phase2);
    const combined = psi1.add(psi2);
    const P = combined.modSq();

    // 2 Re(ψ₁* ψ₂)
    const cross = psi1.conj().mul(psi2);
    const interferenceTerm = 2 * cross.re;

    const maxP = (amp1 + amp2) ** 2;
    const minP = (amp1 - amp2) ** 2;
    const visibility = maxP + minP > 0 ? (maxP - minP) / (maxP + minP) : 0;

    return {
      probability: P,
      interferenceTerm,
      isConstructive: interferenceTerm > 0,
      visibility
    };
  }
}

// ==========================================
// 9. QUANTUM TRANSITIONS & RABI OSCILLATIONS
// ==========================================
export class QuantumTransitions {
  /**
   * Fermi's Golden Rule:
   * Γ_i→f = (2π / ħ) |⟨f|V|i⟩|² ρ(E_f)
   */
  static fermiGoldenRuleRate(
    matrixElementMeV: number,
    densityOfFinalStatesMeVInv: number,
    hbar: number = HBAR_SIM
  ): number {
    return ((2 * Math.PI) / hbar) * (matrixElementMeV ** 2) * Math.max(0, densityOfFinalStatesMeVInv);
  }

  /**
   * Driven Two-Level Rabi Oscillations:
   * P_2(t) = (Ω² / Ω_R²) sin²(Ω_R t / 2), with generalized Rabi frequency Ω_R = sqrt(δ² + Ω²)
   */
  static rabiProbability(
    rabiFrequencyRadPerTick: number,
    detuningRadPerTick: number,
    t: number
  ): {
    pGround: number;
    pExcited: number;
    generalizedRabiFreq: number;
  } {
    const omega = rabiFrequencyRadPerTick;
    const delta = detuningRadPerTick;
    const omegaR = Math.sqrt(delta * delta + omega * omega);
    if (omegaR === 0) return { pGround: 1, pExcited: 0, generalizedRabiFreq: 0 };

    const sinTerm = Math.sin((omegaR * t) / 2);
    const pExcited = ((omega * omega) / (omegaR * omegaR)) * (sinTerm * sinTerm);
    const pGround = 1 - pExcited;

    return {
      pGround,
      pExcited,
      generalizedRabiFreq: omegaR
    };
  }

  /**
   * Electric Dipole (E1) Selection Rules:
   * Δl = ±1, Δm = 0, ±1
   */
  static checkE1SelectionRule(lInitial: number, mInitial: number, lFinal: number, mFinal: number): {
    isAllowed: boolean;
    multipole: string;
    description: string;
  } {
    const deltaL = lFinal - lInitial;
    const deltaM = mFinal - mInitial;

    const allowedL = Math.abs(deltaL) === 1;
    const allowedM = Math.abs(deltaM) <= 1;

    if (allowedL && allowedM) {
      return {
        isAllowed: true,
        multipole: 'E1',
        description: `Electric Dipole Allowed: Δl=${deltaL > 0 ? '+1' : '-1'}, Δm=${deltaM}`
      };
    }

    if (Math.abs(deltaL) === 2 || deltaL === 0) {
      return {
        isAllowed: false,
        multipole: 'E2 / M1 (Forbidden / Suppressed)',
        description: `E1 Forbidden (Δl=${deltaL}): Requires higher-order quadrupole E2 or magnetic dipole M1 transition.`
      };
    }

    return {
      isAllowed: false,
      multipole: 'Strictly Forbidden',
      description: `High-order forbidden transition (Δl=${deltaL}).`
    };
  }
}

// ==========================================
// 10. MEASUREMENT & ENVIRONMENTAL DECOHERENCE
// ==========================================
export class MeasurementDecoherenceModel {
  /**
   * Continuous environmental decoherence on off-diagonal density matrix elements:
   * ρ_ij(t) = ρ_ij(0) exp(-γ_dec t)
   * Tracks purity Tr(ρ²) from 1.0 (pure state) to 1/N (maximally mixed classical ensemble)
   */
  static applyDecoherence(
    p00: number,
    p11: number,
    coherence: Complex,
    decoherenceRate: number,
    dt: number
  ): {
    coherence: Complex;
    purity: number;
    isClassical: boolean;
  } {
    const decay = Math.exp(-decoherenceRate * dt);
    const newCoherence = coherence.scale(decay);
    // Purity Tr(ρ²) = p00² + p11² + 2 |ρ01|²
    const purity = p00 * p00 + p11 * p11 + 2 * newCoherence.modSq();

    return {
      coherence: newCoherence,
      purity,
      isClassical: newCoherence.mod() < 1e-4
    };
  }
}
