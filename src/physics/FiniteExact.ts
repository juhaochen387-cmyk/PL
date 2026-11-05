/**
 * Exact finite 2+1D model primitives.
 *
 * Contract:
 * - The app is a finite, discrete 2+1D model. These routines are exact
 *   definitions/solvers for that finite model, not continuum Standard Model
 *   amplitudes.
 * - Finite grids, finite mode windows, and discrete time maps are model
 *   parameters, not hidden continuum limits.
 * - Floating-point roundoff is the only implementation-level numerical error.
 */

export const FINITE_EXACT_CONTRACT =
  'Exact finite 2+1D model: all retained features are defined on finite grids, finite mode windows, and explicit discrete maps. This is not the continuum 3+1D Standard Model.';

type C = { re: number; im: number };
type CMat = C[][];
const c = (re = 0, im = 0): C => ({ re, im });
const add = (a: C, b: C): C => c(a.re + b.re, a.im + b.im);
const sub = (a: C, b: C): C => c(a.re - b.re, a.im - b.im);
const mul = (a: C, b: C): C => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scale = (a: C, x: number): C => c(a.re * x, a.im * x);
const abs2 = (a: C): number => a.re * a.re + a.im * a.im;
const matZero = (n: number): CMat => Array.from({ length: n }, () => Array.from({ length: n }, () => c()));
const matId = (n: number): CMat => { const a = matZero(n); for (let i = 0; i < n; i++) a[i][i].re = 1; return a; };

function matMul(A: CMat, B: CMat): CMat {
  const n = A.length, out = matZero(n);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) out[i][j] = add(out[i][j], mul(A[i][k], B[k][j]));
  return out;
}

function matInv(M: CMat): CMat {
  const n = M.length;
  const A = M.map(r => r.map(z => c(z.re, z.im)));
  const I = matId(n);
  for (let col = 0; col < n; col++) {
    let pivot = col, best = abs2(A[col][col]);
    for (let r = col + 1; r < n; r++) { const v = abs2(A[r][col]); if (v > best) { best = v; pivot = r; } }
    if (best < 1e-300) throw new Error('Exact finite link map: singular Cayley denominator');
    if (pivot !== col) { const t = A[col]; A[col] = A[pivot]; A[pivot] = t; const u = I[col]; I[col] = I[pivot]; I[pivot] = u; }
    const p = A[col][col], invP = c(p.re / abs2(p), -p.im / abs2(p));
    for (let j = 0; j < n; j++) { A[col][j] = mul(A[col][j], invP); I[col][j] = mul(I[col][j], invP); }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col];
      for (let j = 0; j < n; j++) { A[r][j] = sub(A[r][j], mul(f, A[col][j])); I[r][j] = sub(I[r][j], mul(f, I[col][j])); }
    }
  }
  return I;
}

function det(M: CMat): C {
  const n = M.length;
  const A = M.map(r => r.map(z => c(z.re, z.im)));
  let d = c(1, 0);
  for (let col = 0; col < n; col++) {
    let pivot = col, best = abs2(A[col][col]);
    for (let r = col + 1; r < n; r++) { const v = abs2(A[r][col]); if (v > best) { best = v; pivot = r; } }
    if (best < 1e-300) return c(0, 0);
    if (pivot !== col) { const t = A[col]; A[col] = A[pivot]; A[pivot] = t; d = scale(d, -1); }
    d = mul(d, A[col][col]);
    const p = A[col][col], invP = c(p.re / abs2(p), -p.im / abs2(p));
    for (let r = col + 1; r < n; r++) {
      const f = mul(A[r][col], invP);
      for (let j = col; j < n; j++) A[r][j] = sub(A[r][j], mul(f, A[col][j]));
    }
  }
  return d;
}

/**
 * Exact finite unitary link map for the declared lattice model.
 * U = det(C)^(-1/n) C, C = (I + iH/2)(I - iH/2)^(-1), H Hermitian traceless.
 * This is a rational unitary map, not a truncated Taylor exponential.
 */
export function matUnitaryLink(coeff: number[], generators: CMat[], factor: number): CMat {
  const n = generators[0].length;
  const H = matZero(n);
  for (let a = 0; a < coeff.length; a++) {
    const s = coeff[a] * factor;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) H[i][j] = add(H[i][j], scale(generators[a][i][j], s));
  }
  const A = matId(n), B = matId(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ih = c(-H[i][j].im * 0.5, H[i][j].re * 0.5);
    A[i][j] = sub(A[i][j], ih);
    B[i][j] = add(B[i][j], ih);
  }
  const U = matMul(B, matInv(A));
  const d = det(U);
  const phase = Math.atan2(d.im, d.re);
  const corr = c(Math.cos(-phase / n), Math.sin(-phase / n));
  return U.map(r => r.map(z => mul(z, corr)));
}

const trigCache = new Map<string, { cos: Float64Array; sin: Float64Array }>();
function trigTable(n: number, kind: 'periodic' | 'dirichlet' | 'neumann'): { cos: Float64Array; sin: Float64Array } {
  const key = `${kind}:${n}`;
  const hit = trigCache.get(key);
  if (hit) return hit;
  const cos = new Float64Array(n * n), sin = new Float64Array(n * n);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) {
    const angle = kind === 'periodic' ? (2 * Math.PI * k * i / n) : kind === 'dirichlet' ? (Math.PI * (k + 1) * (i + 1) / (n + 1)) : (Math.PI * k * (i + 0.5) / n);
    cos[k * n + i] = Math.cos(angle);
    sin[k * n + i] = Math.sin(angle);
  }
  const table = { cos, sin };
  trigCache.set(key, table);
  return table;
}

/** Exact finite periodic Poisson solve on a square n x n lattice. */
export function exactFinitePoissonPeriodic(src: Float64Array, n: number, spacing = 1): Float64Array {
  return exactFinitePoissonPeriodicRect(src, n, n, spacing);
}

/** Exact finite periodic Poisson solve on a cols x rows lattice. */
export function exactFinitePoissonPeriodicRect(src: Float64Array, cols: number, rows: number, spacing = 1): Float64Array {
  const sites = cols * rows;
  if (src.length !== sites) throw new Error('Exact finite Poisson: source length mismatch');
  let mean = 0;
  for (let i = 0; i < sites; i++) mean += src[i];
  mean /= sites;
  const tx = trigTable(cols, 'periodic'), ty = trigTable(rows, 'periodic');
  const f1r = new Float64Array(sites), f1i = new Float64Array(sites);
  for (let y = 0; y < rows; y++) for (let kx = 0; kx < cols; kx++) {
    let sr = 0, si = 0;
    for (let x = 0; x < cols; x++) {
      const v = src[y * cols + x] - mean;
      const cr = tx.cos[kx * cols + x], ci = -tx.sin[kx * cols + x];
      sr += v * cr; si += v * ci;
    }
    f1r[y * cols + kx] = sr; f1i[y * cols + kx] = si;
  }
  const fr = new Float64Array(sites), fi = new Float64Array(sites);
  for (let ky = 0; ky < rows; ky++) for (let kx = 0; kx < cols; kx++) {
    let sr = 0, si = 0;
    for (let y = 0; y < rows; y++) {
      const ar = f1r[y * cols + kx], ai = f1i[y * cols + kx];
      const cr = ty.cos[ky * rows + y], ci = -ty.sin[ky * rows + y];
      sr += ar * cr - ai * ci; si += ar * ci + ai * cr;
    }
    const lam = (4 - 2 * Math.cos(2 * Math.PI * kx / cols) - 2 * Math.cos(2 * Math.PI * ky / rows)) / (spacing * spacing);
    const k = ky * cols + kx;
    if (lam > 1e-14) { fr[k] = sr / lam; fi[k] = si / lam; } else { fr[k] = 0; fi[k] = 0; }
  }
  const g1r = new Float64Array(sites), g1i = new Float64Array(sites);
  for (let kx = 0; kx < cols; kx++) for (let y = 0; y < rows; y++) {
    let sr = 0, si = 0;
    for (let ky = 0; ky < rows; ky++) {
      const ar = fr[ky * cols + kx], ai = fi[ky * cols + kx];
      const cr = ty.cos[ky * rows + y], ci = ty.sin[ky * rows + y];
      sr += ar * cr - ai * ci; si += ar * ci + ai * cr;
    }
    g1r[y * cols + kx] = sr; g1i[y * cols + kx] = si;
  }
  const out = new Float64Array(sites);
  const norm = sites;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let sr = 0;
    for (let kx = 0; kx < cols; kx++) {
      const ar = g1r[y * cols + kx], ai = g1i[y * cols + kx];
      const cr = tx.cos[kx * cols + x], ci = tx.sin[kx * cols + x];
      sr += ar * cr - ai * ci;
    }
    out[y * cols + x] = sr / norm;
  }
  return out;
}

/** Cell-centered zero-normal-flux (Neumann) solve of -lap(phi)=src-mean(src).
 * DCT-II eigenvectors diagonalize the graph Laplacian; the constant mode is
 * removed because a closed domain cannot support nonzero net charge. */
export function exactFinitePoissonNeumannRect(src:Float64Array,cols:number,rows:number,spacing=1):Float64Array {
  const sites=cols*rows;
  if(src.length!==sites || cols<1 || rows<1 || !(spacing>0)) throw new Error('Neumann Poisson: invalid dimensions');
  const tx=trigTable(cols,'neumann'),ty=trigTable(rows,'neumann');
  const tmp=new Float64Array(sites),spectral=new Float64Array(sites),inverse=new Float64Array(sites),out=new Float64Array(sites);
  for(let y=0;y<rows;y++) for(let kx=0;kx<cols;kx++) {
    let sum=0;for(let x=0;x<cols;x++)sum+=src[y*cols+x]*tx.cos[kx*cols+x];
    tmp[y*cols+kx]=sum*(kx===0?1/cols:2/cols);
  }
  for(let ky=0;ky<rows;ky++) for(let kx=0;kx<cols;kx++) {
    let sum=0;for(let y=0;y<rows;y++)sum+=tmp[y*cols+kx]*ty.cos[ky*rows+y];
    const lambda=(4-2*Math.cos(Math.PI*kx/cols)-2*Math.cos(Math.PI*ky/rows))/(spacing*spacing);
    spectral[ky*cols+kx]=lambda>1e-14?sum*(ky===0?1/rows:2/rows)/lambda:0;
  }
  for(let y=0;y<rows;y++)for(let kx=0;kx<cols;kx++) {
    let sum=0;for(let ky=0;ky<rows;ky++)sum+=spectral[ky*cols+kx]*ty.cos[ky*rows+y];inverse[y*cols+kx]=sum;
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++) {
    let sum=0;for(let kx=0;kx<cols;kx++)sum+=inverse[y*cols+kx]*tx.cos[kx*cols+x];out[y*cols+x]=sum;
  }
  return out;
}

/** Exact finite Dirichlet Poisson solve on a cols x rows lattice. */
export function exactFinitePoissonDirichletRect(src: Float64Array, cols: number, rows: number, spacing = 1): Float64Array {
  const sites = cols * rows;
  if (src.length !== sites) throw new Error('Exact finite Poisson: source length mismatch');
  const tx = trigTable(cols, 'dirichlet'), ty = trigTable(rows, 'dirichlet');
  const f1r = new Float64Array(sites);
  for (let y = 0; y < rows; y++) for (let kx = 0; kx < cols; kx++) {
    let s = 0;
    for (let x = 0; x < cols; x++) s += src[y * cols + x] * tx.sin[kx * cols + x];
    f1r[y * cols + kx] = s;
  }
  const fr = new Float64Array(sites);
  for (let ky = 0; ky < rows; ky++) for (let kx = 0; kx < cols; kx++) {
    let s = 0;
    for (let y = 0; y < rows; y++) s += f1r[y * cols + kx] * ty.sin[ky * rows + y];
    const lam = (4 - 2 * Math.cos(Math.PI * (kx + 1) / (cols + 1)) - 2 * Math.cos(Math.PI * (ky + 1) / (rows + 1))) / (spacing * spacing);
    fr[ky * cols + kx] = s / lam;
  }
  const g1r = new Float64Array(sites);
  for (let kx = 0; kx < cols; kx++) for (let y = 0; y < rows; y++) {
    let s = 0;
    for (let ky = 0; ky < rows; ky++) s += fr[ky * cols + kx] * ty.sin[ky * rows + y];
    g1r[y * cols + kx] = s;
  }
  const out = new Float64Array(sites);
  const norm = 4 / ((cols + 1) * (rows + 1));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let s = 0;
    for (let kx = 0; kx < cols; kx++) s += g1r[y * cols + kx] * tx.sin[kx * cols + x];
    out[y * cols + x] = s * norm;
  }
  return out;
}
