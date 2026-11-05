/**
 * Exact finite time-dependent Maxwell field lattice (FDTD).
 * The discrete update, source deposition, damping, and Gauss projection below
 * are the declared finite 2+1D model definition. This is a finite classical
 * field sector, not a continuum quantized photon field.
 */

import { ParticleInstance } from '../types/physics';
import { LIGHT_SPEED } from './catalog';
import { exactFinitePoissonPeriodicRect, exactFinitePoissonNeumannRect } from './FiniteExact';

export class ElectromagneticField {
  width: number;
  height: number;
  cellSize: number;
  cols: number;
  rows: number;
  totalCells: number;

  // Staggered / Collocated grid components
  Ex: Float32Array;
  Ey: Float32Array;
  Ez: Float32Array;

  Bx: Float32Array;
  By: Float32Array;
  Bz: Float32Array;

  // Source densities
  rho: Float32Array;
  Jx: Float32Array;
  Jy: Float32Array;
  Jz: Float32Array;

  // Physical constants in simulation units
  c: number;
  epsilon0: number;
  mu0: number;

  constructor(width: number, height: number, cellSize = 32) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize) + 1;
    this.rows = Math.ceil(height / cellSize) + 1;
    this.totalCells = this.cols * this.rows;

    this.Ex = new Float32Array(this.totalCells);
    this.Ey = new Float32Array(this.totalCells);
    this.Ez = new Float32Array(this.totalCells);

    this.Bx = new Float32Array(this.totalCells);
    this.By = new Float32Array(this.totalCells);
    this.Bz = new Float32Array(this.totalCells);

    this.rho = new Float32Array(this.totalCells);
    this.Jx = new Float32Array(this.totalCells);
    this.Jy = new Float32Array(this.totalCells);
    this.Jz = new Float32Array(this.totalCells);

    this.c = LIGHT_SPEED; // 12.0 px / tick
    this.epsilon0 = 1.0;
    this.mu0 = 1.0 / (this.c * this.c * this.epsilon0);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const newCols = Math.ceil(width / this.cellSize) + 1;
    const newRows = Math.ceil(height / this.cellSize) + 1;
    if (newCols !== this.cols || newRows !== this.rows) {
      this.cols = newCols;
      this.rows = newRows;
      this.totalCells = this.cols * this.rows;
      this.Ex = new Float32Array(this.totalCells);
      this.Ey = new Float32Array(this.totalCells);
      this.Ez = new Float32Array(this.totalCells);
      this.Bx = new Float32Array(this.totalCells);
      this.By = new Float32Array(this.totalCells);
      this.Bz = new Float32Array(this.totalCells);
      this.rho = new Float32Array(this.totalCells);
      this.Jx = new Float32Array(this.totalCells);
      this.Jy = new Float32Array(this.totalCells);
      this.Jz = new Float32Array(this.totalCells);
    }
  }

  clear() {
    this.gaussUncompensatedMean = 0;
    this.Ex.fill(0);
    this.Ey.fill(0);
    this.Ez.fill(0);
    this.Bx.fill(0);
    this.By.fill(0);
    this.Bz.fill(0);
    this.rho.fill(0);
    this.Jx.fill(0);
    this.Jy.fill(0);
    this.Jz.fill(0);
  }

  idx(i: number, j: number): number {
    return j * this.cols + i;
  }

  /**
   * Exact finite bilinear particle-in-cell source deposition for the declared lattice model.
   */
  depositSources(particles: ParticleInstance[], emStrength = 1.0) {
    this.rho.fill(0);
    this.Jx.fill(0);
    this.Jy.fill(0);
    this.Jz.fill(0);

    const invCell = 1 / this.cellSize;
    const scale = 2.4 * emStrength;

    for (const p of particles) {
      if (p._removed || p.charge === 0) continue;
      const q = p.charge * scale;
      const x = p.x;
      const y = p.y;
      const vx = p.vx;
      const vy = p.vy;
      const vz = p.vz || 0;

      const gx = x * invCell;
      const gy = y * invCell;
      const i0 = Math.floor(gx);
      const j0 = Math.floor(gy);
      const fx = gx - i0;
      const fy = gy - j0;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const clampI = (i: number) => Math.max(0, Math.min(this.cols - 1, i));
      const clampJ = (j: number) => Math.max(0, Math.min(this.rows - 1, j));

      const i0c = clampI(i0);
      const i1c = clampI(i0 + 1);
      const j0c = clampJ(j0);
      const j1c = clampJ(j0 + 1);

      const idx00 = this.idx(i0c, j0c);
      const idx10 = this.idx(i1c, j0c);
      const idx01 = this.idx(i0c, j1c);
      const idx11 = this.idx(i1c, j1c);

      this.rho[idx00] += q * w00;
      this.rho[idx10] += q * w10;
      this.rho[idx01] += q * w01;
      this.rho[idx11] += q * w11;

      // Current density J = rho * v
      this.Jx[idx00] += q * vx * w00;
      this.Jx[idx10] += q * vx * w10;
      this.Jx[idx01] += q * vx * w01;
      this.Jx[idx11] += q * vx * w11;

      this.Jy[idx00] += q * vy * w00;
      this.Jy[idx10] += q * vy * w10;
      this.Jy[idx01] += q * vy * w01;
      this.Jy[idx11] += q * vy * w11;

      this.Jz[idx00] += q * vz * w00;
      this.Jz[idx10] += q * vz * w10;
      this.Jz[idx01] += q * vz * w01;
      this.Jz[idx11] += q * vz * w11;
    }
  }

  /**
   * Exact finite discrete Maxwell map:
   * dB/dt = -curl(E), dE/dt = c^2 * curl(B) - J/epsilon0,
   * followed by the declared finite damping/boundary map and exact finite
   * discrete Gauss projection. This map is the model definition.
   */
  stepMaxwell(dt: number, boundaryMode: 'torus' | 'bounce', damping = 0.003) {
    const invH = 1 / this.cellSize;
    const c2 = this.c * this.c;
    const cols = this.cols;
    const rows = this.rows;
    const torus = boundaryMode === 'torus';

    const wrapCol = (i: number) => (torus ? ((i % cols) + cols) % cols : Math.max(0, Math.min(cols - 1, i)));
    const wrapRow = (j: number) => (torus ? ((j % rows) + rows) % rows : Math.max(0, Math.min(rows - 1, j)));

    // 1. Advance Magnetic Fields B via Faraday's Law: dB/dt = -curl(E)
    for (let j = 0; j < rows; j++) {
      const jp = wrapRow(j + 1);
      const jm = wrapRow(j - 1);
      for (let i = 0; i < cols; i++) {
        const ip = wrapCol(i + 1);
        const im = wrapCol(i - 1);
        const k = this.idx(i, j);

        // curl(E)_z = dEy/dx - dEx/dy
        const dEy_dx = (this.Ey[this.idx(ip, j)] - this.Ey[this.idx(im, j)]) * 0.5 * invH;
        const dEx_dy = (this.Ex[this.idx(i, jp)] - this.Ex[this.idx(i, jm)]) * 0.5 * invH;
        const curlE_z = dEy_dx - dEx_dy;
        this.Bz[k] -= curlE_z * dt;

        // Transverse modes: curl(E)_x = dEz/dy, curl(E)_y = -dEz/dx
        const dEz_dy = (this.Ez[this.idx(i, jp)] - this.Ez[this.idx(i, jm)]) * 0.5 * invH;
        const dEz_dx = (this.Ez[this.idx(ip, j)] - this.Ez[this.idx(im, j)]) * 0.5 * invH;
        this.Bx[k] -= dEz_dy * dt;
        this.By[k] += dEz_dx * dt;
      }
    }

    // 2. Advance Electric Fields E via Ampere-Maxwell Law: dE/dt = c^2 * curl(B) - J / epsilon0
    const invEps = 1 / this.epsilon0;
    for (let j = 0; j < rows; j++) {
      const jp = wrapRow(j + 1);
      const jm = wrapRow(j - 1);
      for (let i = 0; i < cols; i++) {
        const ip = wrapCol(i + 1);
        const im = wrapCol(i - 1);
        const k = this.idx(i, j);

        // curl(B)_x = dBz/dy
        const dBz_dy = (this.Bz[this.idx(i, jp)] - this.Bz[this.idx(i, jm)]) * 0.5 * invH;
        // curl(B)_y = -dBz/dx
        const dBz_dx = (this.Bz[this.idx(ip, j)] - this.Bz[this.idx(im, j)]) * 0.5 * invH;

        this.Ex[k] += (c2 * dBz_dy - this.Jx[k] * invEps) * dt;
        this.Ey[k] += (-c2 * dBz_dx - this.Jy[k] * invEps) * dt;

        // Transverse out-of-plane mode: curl(B)_z = dBy/dx - dBx/dy
        const dBy_dx = (this.By[this.idx(ip, j)] - this.By[this.idx(im, j)]) * 0.5 * invH;
        const dBx_dy = (this.Bx[this.idx(i, jp)] - this.Bx[this.idx(i, jm)]) * 0.5 * invH;
        this.Ez[k] += (c2 * (dBy_dx - dBx_dy) - this.Jz[k] * invEps) * dt;

        // Boundary damping or natural radiation dispersion
        const decay = 1 - damping * dt;
        this.Ex[k] *= decay;
        this.Ey[k] *= decay;
        this.Ez[k] *= decay;
        this.Bx[k] *= decay;
        this.By[k] *= decay;
        this.Bz[k] *= decay;
      }
    }

    // 3. Absorbing boundary layers if non-periodic
    if (!torus) {
      const margin = 3;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (i < margin || i >= cols - margin || j < margin || j >= rows - margin) {
            const k = this.idx(i, j);
            const edgeDecay = 0.88;
            this.Ex[k] *= edgeDecay;
            this.Ey[k] *= edgeDecay;
            this.Ez[k] *= edgeDecay;
            this.Bx[k] *= edgeDecay;
            this.By[k] *= edgeDecay;
            this.Bz[k] *= edgeDecay;
          }
        }
      }
    }
    this.projectGaussConstraint(boundaryMode);
  }

  /** Mean charge density that the periodic/closed-boundary zero mode cannot
   * represent. The projection solves for rho minus this uniform background. */
  gaussUncompensatedMean = 0;

  /** Project the backward-divergence constraint using its matching forward
   * gradient. In a torus or closed no-normal-flux box, only the zero-mean
   * source can be projected; the unrepresented mean is reported above. */
  projectGaussConstraint(boundaryMode: 'torus' | 'bounce') {
    const h=this.cellSize, cols=this.cols, rows=this.rows, torus=boundaryMode==='torus';
    if(!torus) {
      // Ex/Ey are outgoing edge fluxes. A closed boundary has no outgoing
      // right/top flux and the incoming left/bottom flux is zero.
      for(let j=0;j<rows;j++) this.Ex[this.idx(cols-1,j)]=0;
      for(let i=0;i<cols;i++) this.Ey[this.idx(i,rows-1)]=0;
    }
    const src=new Float64Array(this.totalCells);let chargeSum=0;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++) {
      const k=this.idx(i,j);
      const prevX=i>0?this.Ex[this.idx(i-1,j)]:(torus?this.Ex[this.idx(cols-1,j)]:0);
      const prevY=j>0?this.Ey[this.idx(i,j-1)]:(torus?this.Ey[this.idx(i,rows-1)]:0);
      const div=(this.Ex[k]-prevX+this.Ey[k]-prevY)/h;
      const charge=this.rho[k]/this.epsilon0;chargeSum+=charge;src[k]=charge-div;
    }
    this.gaussUncompensatedMean=chargeSum/this.totalCells;
    const phi=torus?exactFinitePoissonPeriodicRect(src,cols,rows,h):exactFinitePoissonNeumannRect(src,cols,rows,h);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++) {
      const k=this.idx(i,j);
      if(torus||i<cols-1) this.Ex[k]-=(phi[this.idx((i+1)%cols,j)]-phi[k])/h;
      if(torus||j<rows-1) this.Ey[k]-=(phi[this.idx(i,(j+1)%rows)]-phi[k])/h;
    }
  }

  /**
   * Sample local electric and magnetic field vectors at position (x, y)
   * using bilinear interpolation.
   */
  sampleField(x: number, y: number, biasBz = 0): {
    Ex: number;
    Ey: number;
    Ez: number;
    Bx: number;
    By: number;
    Bz: number;
  } {
    const invCell = 1 / this.cellSize;
    const gx = x * invCell;
    const gy = y * invCell;
    const i0 = Math.max(0, Math.min(this.cols - 2, Math.floor(gx)));
    const j0 = Math.max(0, Math.min(this.rows - 2, Math.floor(gy)));
    const fx = Math.max(0, Math.min(1, gx - i0));
    const fy = Math.max(0, Math.min(1, gy - j0));

    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    const idx00 = this.idx(i0, j0);
    const idx10 = this.idx(i0 + 1, j0);
    const idx01 = this.idx(i0, j0 + 1);
    const idx11 = this.idx(i0 + 1, j0 + 1);

    const Ex = this.Ex[idx00] * w00 + this.Ex[idx10] * w10 + this.Ex[idx01] * w01 + this.Ex[idx11] * w11;
    const Ey = this.Ey[idx00] * w00 + this.Ey[idx10] * w10 + this.Ey[idx01] * w01 + this.Ey[idx11] * w11;
    const Ez = this.Ez[idx00] * w00 + this.Ez[idx10] * w10 + this.Ez[idx01] * w01 + this.Ez[idx11] * w11;

    const Bx = this.Bx[idx00] * w00 + this.Bx[idx10] * w10 + this.Bx[idx01] * w01 + this.Bx[idx11] * w11;
    const By = this.By[idx00] * w00 + this.By[idx10] * w10 + this.By[idx01] * w01 + this.By[idx11] * w11;
    const Bz = (this.Bz[idx00] * w00 + this.Bz[idx10] * w10 + this.Bz[idx01] * w01 + this.Bz[idx11] * w11) + biasBz;

    return { Ex, Ey, Ez, Bx, By, Bz };
  }

  /**
   * Computes exact relativistic Lorentz force:
   * F = q * (E + v x B)
   */
  computeLorentzForce(p: ParticleInstance, biasBz = 0): {
    fx: number;
    fy: number;
    fz: number;
    Ex: number;
    Ey: number;
    Ez: number;
    Bx: number;
    By: number;
    Bz: number;
  } {
    if (p.charge === 0) {
      return { fx: 0, fy: 0, fz: 0, Ex: 0, Ey: 0, Ez: 0, Bx: 0, By: 0, Bz: 0 };
    }

    const { Ex, Ey, Ez, Bx, By, Bz } = this.sampleField(p.x, p.y, biasBz);
    const q = p.charge;
    const vx = p.vx;
    const vy = p.vy;
    const vz = p.vz || 0;

    // F = q * (E + v x B)
    // (v x B)_x = vy * Bz - vz * By
    // (v x B)_y = vz * Bx - vx * Bz
    // (v x B)_z = vx * By - vy * Bx
    const fx = q * (Ex + vy * Bz - vz * By);
    const fy = q * (Ey + vz * Bx - vx * Bz);
    const fz = q * (Ez + vx * By - vy * Bx);

    p.localE = [Ex, Ey, Ez];
    p.localB = [Bx, By, Bz];
    p.lorentzForce = [fx, fy, fz];

    return { fx, fy, fz, Ex, Ey, Ez, Bx, By, Bz };
  }

  /**
   * Inject a transverse electromagnetic wavepacket traveling in direction (kx, ky)
   * with polarization vector and helicity.
   */
  injectPhotonWave(x: number, y: number, kx: number, ky: number, energy: number, helicity: 1 | -1 = 1) {
    const kMag = Math.hypot(kx, ky) || 1;
    const ux = kx / kMag;
    const uy = ky / kMag;
    // Transverse unit vector
    const tx = -uy;
    const ty = ux;

    const invCell = 1 / this.cellSize;
    const gx = Math.floor(x * invCell);
    const gy = Math.floor(y * invCell);
    const radius = 3;
    const amp = Math.min(8.0, 1.5 + energy * 1.8);

    for (let dj = -radius; dj <= radius; dj++) {
      for (let di = -radius; di <= radius; di++) {
        const i = gx + di;
        const j = gy + dj;
        if (i < 0 || i >= this.cols || j < 0 || j >= this.rows) continue;
        const dist2 = di * di + dj * dj;
        if (dist2 > radius * radius) continue;
        const weight = Math.exp(-dist2 / 2.0);
        const k = this.idx(i, j);

        // Electric field perpendicular to propagation
        this.Ex[k] += amp * tx * weight;
        this.Ey[k] += amp * ty * weight;
        // Out of plane component for circular helicity
        this.Ez[k] += amp * helicity * 0.7 * weight;

        // Magnetic field B = (k x E) / c
        // (u x t)_z = ux * ty - uy * tx = ux * ux - uy * (-uy) = 1
        this.Bz[k] += (amp / this.c) * weight;
      }
    }
  }

  /**
   * Inject magnetic field perturbation (for cyclotron coils or external pulse)
   */
  injectMagneticPulse(cx: number, cy: number, strength: number, radiusPx = 120) {
    const invCell = 1 / this.cellSize;
    const rCells = radiusPx * invCell;
    const gx = Math.floor(cx * invCell);
    const gy = Math.floor(cy * invCell);

    for (let j = Math.max(0, Math.floor(gy - rCells)); j <= Math.min(this.rows - 1, Math.ceil(gy + rCells)); j++) {
      for (let i = Math.max(0, Math.floor(gx - rCells)); i <= Math.min(this.cols - 1, Math.ceil(gx + rCells)); i++) {
        const dx = (i - gx) * this.cellSize;
        const dy = (j - gy) * this.cellSize;
        const r = Math.hypot(dx, dy);
        if (r <= radiusPx) {
          const w = Math.cos((r / radiusPx) * Math.PI * 0.5) ** 2;
          this.Bz[this.idx(i, j)] += strength * w;
        }
      }
    }
  }

  /**
   * Exact finite total electromagnetic field energy:
   * U = integral (1/2 * eps0 * E^2 + 1/(2*mu0) * B^2) dV
   */
  getFieldEnergy(): number {
    let energy = 0;
    const cellVol = this.cellSize * this.cellSize;
    const halfEps = 0.5 * this.epsilon0;
    const halfMuInv = 0.5 / this.mu0;

    for (let k = 0; k < this.totalCells; k++) {
      const e2 = this.Ex[k] ** 2 + this.Ey[k] ** 2 + this.Ez[k] ** 2;
      const b2 = this.Bx[k] ** 2 + this.By[k] ** 2 + this.Bz[k] ** 2;
      energy += (halfEps * e2 + halfMuInv * b2) * cellVol;
    }
    return energy;
  }

  /**
   * Render Magnetic Field (Bz) color density heatmap:
   * Cyan for negative Bz (into canvas), Amber/Rose for positive Bz (out of canvas).
   */
  renderMagneticHeatmap(ctx: CanvasRenderingContext2D) {
    const step = 2; // Sample every 2 cells for high rendering framerate
    ctx.save();
    for (let j = 0; j < this.rows - 1; j += step) {
      const y = j * this.cellSize;
      for (let i = 0; i < this.cols - 1; i += step) {
        const x = i * this.cellSize;
        const k = this.idx(i, j);
        const bz = this.Bz[k];
        if (Math.abs(bz) < 0.008) continue;

        const norm = Math.min(1.0, Math.abs(bz) * 1.8);
        if (bz > 0) {
          ctx.fillStyle = `rgba(244, 63, 94, ${norm * 0.38})`; // Red/Amber for +Bz
        } else {
          ctx.fillStyle = `rgba(6, 182, 212, ${norm * 0.38})`; // Cyan for -Bz
        }
        ctx.fillRect(x, y, this.cellSize * step, this.cellSize * step);
      }
    }
    ctx.restore();
  }

  /**
   * Render Electric Field E vector lines/arrows
   */
  renderElectricVectors(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 1.0;

    const step = 3;
    const arrowLen = this.cellSize * 1.4;

    for (let j = 1; j < this.rows - 1; j += step) {
      const y = (j + 0.5) * this.cellSize;
      for (let i = 1; i < this.cols - 1; i += step) {
        const x = (i + 0.5) * this.cellSize;
        const k = this.idx(i, j);
        const ex = this.Ex[k];
        const ey = this.Ey[k];
        const mag = Math.hypot(ex, ey);
        if (mag < 0.05) continue;

        const uEx = ex / mag;
        const uEy = ey / mag;
        const len = Math.min(arrowLen, Math.max(3, mag * 6));

        ctx.beginPath();
        ctx.moveTo(x - uEx * len * 0.5, y - uEy * len * 0.5);
        ctx.lineTo(x + uEx * len * 0.5, y + uEy * len * 0.5);
        ctx.stroke();

        // Arrow head
        const tipX = x + uEx * len * 0.5;
        const tipY = y + uEy * len * 0.5;
        const headSize = Math.min(3, len * 0.35);
        ctx.beginPath();
        ctx.arc(tipX, tipY, headSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Render Poynting Vector S = E x B energy flow
   */
  renderPoyntingVectors(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.fillStyle = '#facc15';
    ctx.lineWidth = 1.2;

    const step = 4;
    for (let j = 1; j < this.rows - 1; j += step) {
      const y = (j + 0.5) * this.cellSize;
      for (let i = 1; i < this.cols - 1; i += step) {
        const x = (i + 0.5) * this.cellSize;
        const k = this.idx(i, j);
        const ex = this.Ex[k];
        const ey = this.Ey[k];
        const ez = this.Ez[k];
        const bx = this.Bx[k];
        const by = this.By[k];
        const bz = this.Bz[k];

        // S = E x B
        const sx = ey * bz - ez * by;
        const sy = ez * bx - ex * bz;
        const mag = Math.hypot(sx, sy);
        if (mag < 0.005) continue;

        const ux = sx / mag;
        const uy = sy / mag;
        const len = Math.min(22, Math.max(4, mag * 25));

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + ux * len, y + uy * len);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + ux * len, y + uy * len, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
