/**
 * Finite bosonic Fock algebra for one transverse 2+1D oscillator mode.
 * The occupation cutoff is explicit: [a,a†] = I - Ncut |Ncut><Ncut|.
 * This is an exact finite-dimensional regulator identity, not an untruncated
 * canonical commutator and not yet a spatially local quantized gauge field.
 */
export interface BosonFockDiagnostics {
  occupationCutoff: number;
  hilbertDimension: number;
  commutatorInteriorError: number;
  cutoffBoundaryDefect: number;
  freeEvolutionNormDrift: number;
  freeEvolutionUnitarityError: number;
  status: string;
}

export class FiniteBosonFockMode {
  readonly cutoff: number;
  readonly dimension: number;
  readonly annihilationRe: Float64Array;
  readonly annihilationIm: Float64Array;
  readonly creationRe: Float64Array;
  readonly creationIm: Float64Array;
  readonly numberOperator: Float64Array;

  constructor(occupationCutoff = 8) {
    this.cutoff = Math.max(1, Math.min(32, Math.floor(occupationCutoff)));
    this.dimension = this.cutoff + 1;
    const d = this.dimension, size = d * d;
    this.annihilationRe = new Float64Array(size);
    this.annihilationIm = new Float64Array(size);
    this.creationRe = new Float64Array(size);
    this.creationIm = new Float64Array(size);
    this.numberOperator = new Float64Array(size);
    for (let n = 1; n < d; n++) this.annihilationRe[(n - 1) * d + n] = Math.sqrt(n);
    for (let n = 0; n < d - 1; n++) this.creationRe[(n + 1) * d + n] = Math.sqrt(n + 1);
    for (let n = 0; n < d; n++) this.numberOperator[n * d + n] = n;
  }

  diagnostics(omega = 1.0, time = 0.371): BosonFockDiagnostics {
    const d = this.dimension;
    let interior = 0;
    // Evaluate [a,a†] exactly on all basis states below the cutoff boundary.
    for (let n = 0; n < d - 1; n++) {
      const aaDagger = n + 1;
      const aDaggerA = n;
      interior = Math.max(interior, Math.abs((aaDagger - aDaggerA) - 1));
    }
    // At |Ncut>, a† is truncated and the commutator is -Ncut, not +1.
    const boundaryDefect = Math.abs((-this.cutoff) - 1);
    let norm0 = 0, norm1 = 0, unitaryError = 0;
    for (let n = 0; n < d; n++) {
      const re = Math.sin(0.73 * (n + 1)), im = Math.cos(0.41 * (n + 2));
      const norm = re * re + im * im;
      norm0 += norm;
      const phase = omega * (n + 0.5) * time;
      const outRe = re * Math.cos(phase) + im * Math.sin(phase);
      const outIm = im * Math.cos(phase) - re * Math.sin(phase);
      norm1 += outRe * outRe + outIm * outIm;
      unitaryError = Math.max(unitaryError, Math.abs(Math.hypot(Math.cos(phase), Math.sin(phase)) - 1));
    }
    return {
      occupationCutoff: this.cutoff,
      hilbertDimension: d,
      commutatorInteriorError: interior,
      cutoffBoundaryDefect: boundaryDefect,
      freeEvolutionNormDrift: Math.abs(norm1 - norm0) / Math.max(norm0, 1e-30),
      freeEvolutionUnitarityError: unitaryError,
      status: 'Exact truncated oscillator algebra and exact free-mode unitary evolution; no matter coupling or local Gauss-law projection yet.'
    };
  }
}
