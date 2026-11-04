/**
 * Exact finite 2+1D relativistic one-packet propagators.
 *
 * Fermions: positive-energy sector of a parity-doubled 2+1D Dirac Hamiltonian
 *   H_D = c (sigma_x p_x + sigma_y p_y) + s m c^2 sigma_z.
 * Spin-0 particles: positive-frequency Klein-Gordon sector
 *   omega(k) = sqrt(m^2 c^4 + c^2 hbar^2 |k|^2) / hbar.
 *
 * The discrete split-step map below is the exact finite time-step definition
 * of the declared packet sector. Packet-local magnetic fields are exactly
 * uniform by model definition. Inter-particle correlations and pair creation
 * are handled by the separate retained finite many-body/Fock/event sectors.
 */
export interface RelativisticPacketResult {
  vx: number;
  vy: number;
  px: number;
  py: number;
  energy: number;
  dx: number;
  dy: number;
  sigma: number;
  norm: number;
  normDrift: number;
  mode: '2+1D Dirac' | 'positive-frequency Klein-Gordon';
}

type PacketState = {
  id: number;
  kind: string;
  mass: number;
  block: number;
  n: number;
  length: number;
  // The carrier momentum is factored out of the sampled envelope. This avoids
  // aliasing a large physical momentum onto the coarse 32x32 FFT grid.
  carrierPx: number;
  carrierPy: number;
  re: Float64Array[];
  im: Float64Array[];
  steps: number;
  lastNorm: number;
};

export class RelativisticPacketEngine {
  static readonly GRID = 32;
  private packets = new Map<number, PacketState>();
  private totalSteps = 0;
  private maxNormDrift = 0;

  private static fft1(re: Float64Array, im: Float64Array, inverse: boolean): void {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wr0 = Math.cos(angle), wi0 = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wr = 1, wi = 0;
        for (let j = 0; j < len / 2; j++) {
          const ur = re[i + j], ui = im[i + j];
          const vr = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
          const vi = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
          re[i + j] = ur + vr; im[i + j] = ui + vi;
          re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
          const nr = wr * wr0 - wi * wi0;
          wi = wr * wi0 + wi * wr0; wr = nr;
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

  private static norm(re: Float64Array[], im: Float64Array[]): number {
    let sum = 0;
    for (let c = 0; c < re.length; c++)
      for (let i = 0; i < re[c].length; i++) sum += re[c][i] * re[c][i] + im[c][i] * im[c][i];
    return sum;
  }

  private static normalize(re: Float64Array[], im: Float64Array[]): number {
    const norm = Math.sqrt(Math.max(1e-300, this.norm(re, im)));
    for (let c = 0; c < re.length; c++) for (let i = 0; i < re[c].length; i++) {
      re[c][i] /= norm; im[c][i] /= norm;
    }
    return norm;
  }

  private create(p: any, hbar: number, c: number): PacketState {
    const n = RelativisticPacketEngine.GRID;
    const sigma = Math.max(0.75, Number(p.sigma0 || p.sigma || 5));
    // A local co-moving box resolves the packet even when the canvas is large.
    const length = Math.max(20, 14 * sigma);
    const count = n * n;
    const fermion = !!p.isFermion;
    const block = Number(p.spinZ ?? 0) < 0 ? 1 : 0;
    const re = Array.from({ length: fermion ? 4 : 1 }, () => new Float64Array(count));
    const im = Array.from({ length: fermion ? 4 : 1 }, () => new Float64Array(count));
    const px0 = Number(p.px || 0), py0 = Number(p.py || 0);
    const phase0 = Number(p.phi || 0);
    const dx = length / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const x = (ix - n / 2) * dx, y = (iy - n / 2) * dx;
      const env = Math.exp(-(x * x + y * y) / (4 * sigma * sigma));
      // Store only the slowly varying envelope phase. The physical carrier
      // momentum is applied analytically in the spectral Dirac/KG operator.
      const ph = phase0;
      const k = iy * n + ix;
      if (fermion) {
        const component = block * 2 + (block === 0 ? 0 : 1);
        re[component][k] = env * Math.cos(ph);
        im[component][k] = env * Math.sin(ph);
      } else {
        re[0][k] = env * Math.cos(ph);
        im[0][k] = env * Math.sin(ph);
      }
    }

    for (let cidx = 0; cidx < re.length; cidx++)
      RelativisticPacketEngine.fft2(re[cidx], im[cidx], n, false);

    const mass = Math.max(0, Number(p.mass || 0));
    if (fermion) {
      const up = block * 2, down = up + 1;
      const repSign = block === 0 ? 1 : -1;
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
        const momX = px0 + hbar * (2 * Math.PI * mx / length);
        const momY = py0 + hbar * (2 * Math.PI * my / length);
        const hx = c * momX, hy = c * momY, hz = repSign * mass * c * c;
        const energy = Math.hypot(hx, hy, hz);
        if (energy < 1e-14) continue;
        const k = iy * n + ix;
        const ur = re[up][k], ui = im[up][k], dr = re[down][k], di = im[down][k];
        const a = 0.5 * (1 + hz / energy), d = 0.5 * (1 - hz / energy);
        // P_+(k) = [I + H(k)/E(k)]/2. This removes negative-energy
        // contamination from the initialized packet.
        re[up][k] = a * ur + (hx * dr + hy * di) / (2 * energy);
        im[up][k] = a * ui + (hx * di - hy * dr) / (2 * energy);
        re[down][k] = d * dr + (hx * ur - hy * ui) / (2 * energy);
        im[down][k] = d * di + (hx * ui + hy * ur) / (2 * energy);
      }
    }
    for (let cidx = 0; cidx < re.length; cidx++)
      RelativisticPacketEngine.fft2(re[cidx], im[cidx], n, true);
    RelativisticPacketEngine.normalize(re, im);
    // Positive-energy projection can shift the coordinate centroid through
    // the momentum-dependent spinor basis (a Berry-connection contribution).
    // Fix the packet's local origin once so the visible particle initially
    // sits at the actual Born-density center, not the unprojected Gaussian.
    let xMean = 0, yMean = 0, total = 0;
    const gridStep = length / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const k = iy * n + ix;
      let rho = 0;
      for (let cidx = 0; cidx < re.length; cidx++) rho += re[cidx][k] ** 2 + im[cidx][k] ** 2;
      xMean += rho * (ix - n / 2) * gridStep;
      yMean += rho * (iy - n / 2) * gridStep;
      total += rho;
    }
    xMean /= Math.max(1e-300, total); yMean /= Math.max(1e-300, total);
    for (let cidx = 0; cidx < re.length; cidx++)
      RelativisticPacketEngine.fft2(re[cidx], im[cidx], n, false);
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
      const px = hbar * (2 * Math.PI * mx / length), py = hbar * (2 * Math.PI * my / length);
      const angle = (px * xMean + py * yMean) / Math.max(1e-12, hbar);
      const cr = Math.cos(angle), si = Math.sin(angle), k = iy * n + ix;
      for (let cidx = 0; cidx < re.length; cidx++) {
        const ar = re[cidx][k], ai = im[cidx][k];
        re[cidx][k] = ar * cr - ai * si; im[cidx][k] = ar * si + ai * cr;
      }
    }
    for (let cidx = 0; cidx < re.length; cidx++)
      RelativisticPacketEngine.fft2(re[cidx], im[cidx], n, true);
    return { id: p.id, kind: p.kind, mass, block, n, length, carrierPx: px0, carrierPy: py0, re, im, steps: 0, lastNorm: 1 };
  }

  private applyBackgroundGaugeStep(state: PacketState, p: any, dt: number, hbar: number, c: number,
    potentialAt: ((rx: number, ry: number) => number) | undefined, magneticBz = 0): void {
    if (dt === 0 || (!potentialAt && (!magneticBz || !p.charge || state.re.length !== 4))) return;
    const n = state.n, dx = state.length / n, half = dt * 0.5 / Math.max(1e-12, hbar);
    const q = Number(p.charge || 0);
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const rx = (ix - n / 2) * dx, ry = (iy - n / 2) * dx;
      const angle = -Number(potentialAt ? potentialAt(rx, ry) : 0) * half;
      const scalarCr = Math.cos(angle), scalarCi = Math.sin(angle), k = iy * n + ix;
      if (state.re.length === 4 && q !== 0 && magneticBz !== 0) {
        // Local symmetric gauge for a field that is exactly uniform
        // across this packet by finite model definition: A=(-Bz*y/2, Bz*x/2).  Minimal coupling is
        // H=c alpha.(p-qA)+beta mc^2.  Split exp(-i H_A dt/2) exactly as a
        // 2x2 Pauli-matrix exponential; this is a packet-local EM-field step,
        // not a globally evolved gauge potential.
        const hx = c * q * magneticBz * ry * 0.5;
        const hy = -c * q * magneticBz * rx * 0.5;
        const omega = Math.hypot(hx, hy);
        const theta = omega * half;
        const matrixCr = Math.cos(theta);
        const matrixFactor = omega > 1e-14 ? Math.sin(theta) / omega : half;
        for (const up of [0, 2]) {
          const down = up + 1;
          const ur = state.re[up][k], ui = state.im[up][k];
          const dr = state.re[down][k], di = state.im[down][k];
          const hUr = hx * dr + hy * di;
          const hUi = hx * di - hy * dr;
          const hDr = hx * ur - hy * ui;
          const hDi = hx * ui + hy * ur;
          let nur = matrixCr * ur + matrixFactor * hUi;
          let nui = matrixCr * ui - matrixFactor * hUr;
          let ndr = matrixCr * dr + matrixFactor * hDi;
          let ndi = matrixCr * di - matrixFactor * hDr;
          const tur = nur * scalarCr - nui * scalarCi;
          const tui = nur * scalarCi + nui * scalarCr;
          const tdr = ndr * scalarCr - ndi * scalarCi;
          const tdi = ndr * scalarCi + ndi * scalarCr;
          state.re[up][k] = tur; state.im[up][k] = tui;
          state.re[down][k] = tdr; state.im[down][k] = tdi;
        }
      } else {
        for (let cidx = 0; cidx < state.re.length; cidx++) {
          const ar = state.re[cidx][k], ai = state.im[cidx][k];
          state.re[cidx][k] = ar * scalarCr - ai * scalarCi;
          state.im[cidx][k] = ar * scalarCi + ai * scalarCr;
        }
      }
    }
  }

  advance(p: any, dt: number, hbar: number, c: number,
    potentialAt?: (rx: number, ry: number) => number, magneticBz = 0,
    vectorPotential?: { ax: number; ay: number }): RelativisticPacketResult | null {
    if (!p || p.isVirtual || p.isRadiation || !(dt > 0) || !Number.isFinite(dt)) return null;
    // Dirac applies to spin-1/2 fields; the positive-frequency KG packet is
    // used for the physical spin-0 Higgs excitation. Spin-1 gauge bosons are
    // handled by gauge/vector-field layers, not misidentified as scalars.
    const isDirac = !!p.isFermion && Math.abs(Number(p.spin || 0) - 0.5) < 1e-8;
    const isKG = !isDirac && (p.kind === 'higgs' || Number(p.spin || 0) === 0);
    if (!isDirac && !isKG) return null;

    const mass = Math.max(0, Number(p.mass || 0));
    let state = this.packets.get(p.id);
    const block = Number(p.spinZ ?? 0) < 0 ? 1 : 0;
    if (!state || state.kind !== p.kind || Math.abs(state.mass - mass) > Math.max(1e-9, mass * 1e-8) || state.block !== block) {
      state = this.create(p, hbar, c);
      this.packets.set(p.id, state);
    }

    const beforeNorm = RelativisticPacketEngine.norm(state.re, state.im);
    // Exact finite split-step map for H = H_D/KG + V:
    // exp(-iVdt/2hbar) exp(-iH0dt/hbar) exp(-iVdt/2hbar).
    // This product is the declared finite time-step; each factor is unitary.
    this.applyBackgroundGaugeStep(state, p, dt, hbar, c, potentialAt, magneticBz);
    for (let cidx = 0; cidx < state.re.length; cidx++)
      RelativisticPacketEngine.fft2(state.re[cidx], state.im[cidx], state.n, false);

    const n = state.n, length = state.length;
    const restEnergy = mass * c * c;
    const delta = dt / Math.max(1e-12, hbar);
    if (isDirac) {
      const up = state.block * 2, down = up + 1;
      const repSign = state.block === 0 ? 1 : -1;
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
        const pxCanonical = hbar * (2 * Math.PI * mx / length), pyCanonical = hbar * (2 * Math.PI * my / length);
        const px = state.carrierPx + pxCanonical - Number(vectorPotential?.ax || 0), py = state.carrierPy + pyCanonical - Number(vectorPotential?.ay || 0);
        const hx = c * px, hy = c * py, hz = repSign * restEnergy, k = iy * n + ix;
        const energy = Math.hypot(hx, hy, hz);
        if (energy < 1e-14) continue;
        const ur = state.re[up][k], ui = state.im[up][k];
        const dr = state.re[down][k], di = state.im[down][k];
        const theta = energy * delta;
        const cs = Math.cos(theta), f = Math.sin(theta) / energy;
        const hUr = hz * ur + hx * dr + hy * di;
        const hUi = hz * ui + hx * di - hy * dr;
        const hDr = hx * ur - hy * ui - hz * dr;
        const hDi = hx * ui + hy * ur - hz * di;
        let nur = cs * ur + f * hUi, nui = cs * ui - f * hUr;
        let ndr = cs * dr + f * hDi, ndi = cs * di - f * hDr;
        // Remove the common rest-energy phase to reduce phase roundoff.
        // The omitted global phase is retained in particle.packetActionPhase.
        const restPhase = restEnergy * delta;
        const gr = Math.cos(restPhase), gi = Math.sin(restPhase);
        const tur = nur * gr - nui * gi, tui = nur * gi + nui * gr;
        const tdr = ndr * gr - ndi * gi, tdi = ndr * gi + ndi * gr;
        state.re[up][k] = tur; state.im[up][k] = tui;
        state.re[down][k] = tdr; state.im[down][k] = tdi;
      }
    } else {
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
        const pxCanonical = hbar * (2 * Math.PI * mx / length), pyCanonical = hbar * (2 * Math.PI * my / length);
        const px = state.carrierPx + pxCanonical - Number(vectorPotential?.ax || 0), py = state.carrierPy + pyCanonical - Number(vectorPotential?.ay || 0);
        const energy = Math.hypot(restEnergy, c * px, c * py), k = iy * n + ix;
        const wr = state.re[0][k], wi = state.im[0][k];
        if (energy > 1e-14) {
          const angle = -(energy - restEnergy) * delta;
          const cs = Math.cos(angle), sn = Math.sin(angle);
          state.re[0][k] = wr * cs - wi * sn;
          state.im[0][k] = wr * sn + wi * cs;
        }
      }
    }

    for (let cidx = 0; cidx < state.re.length; cidx++)
      RelativisticPacketEngine.fft2(state.re[cidx], state.im[cidx], n, true);
    this.applyBackgroundGaugeStep(state, p, dt, hbar, c, potentialAt, magneticBz);

    // Position is not a Newtonian point trajectory: it is the center of the
    // evolved Born density. Recenter the local packet after measuring that
    // displacement so the co-moving FFT box does not count drift twice.
    let rawNorm = 0, meanX = 0, meanY = 0, variance = 0, potentialEnergy = 0;
    const dxGrid = length / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const k = iy * n + ix;
      let rho = 0;
      for (let cidx = 0; cidx < state.re.length; cidx++)
        rho += state.re[cidx][k] ** 2 + state.im[cidx][k] ** 2;
      const x = (ix - n / 2) * dxGrid, y = (iy - n / 2) * dxGrid;
      rawNorm += rho; meanX += rho * x; meanY += rho * y;
      if (potentialAt) potentialEnergy += rho * Number(potentialAt(x, y) || 0);
    }
    const safeNorm = Math.max(1e-300, rawNorm);
    meanX /= safeNorm; meanY /= safeNorm; potentialEnergy /= safeNorm;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const k = iy * n + ix;
      let rho = 0;
      for (let cidx = 0; cidx < state.re.length; cidx++)
        rho += state.re[cidx][k] ** 2 + state.im[cidx][k] ** 2;
      const x = (ix - n / 2) * dxGrid - meanX;
      const y = (iy - n / 2) * dxGrid - meanY;
      variance += rho * (x * x + y * y);
    }
    const sigma = Math.sqrt(Math.max(0, variance / (2 * safeNorm)));

    // Re-enter momentum space to evaluate the final packet's momentum,
    // energy and conserved current (after BOTH potential half-steps).
    for (let cidx = 0; cidx < state.re.length; cidx++)
      RelativisticPacketEngine.fft2(state.re[cidx], state.im[cidx], n, false);
    let norm = 0, meanPx = 0, meanPy = 0, meanEnergyKinetic = 0;
    let currentX = 0, currentY = 0;
    if (isDirac) {
      const up = state.block * 2, down = up + 1;
      const repSign = state.block === 0 ? 1 : -1;
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
        const pxCanonical = hbar * (2 * Math.PI * mx / length), pyCanonical = hbar * (2 * Math.PI * my / length);
        const px = state.carrierPx + pxCanonical - Number(vectorPotential?.ax || 0), py = state.carrierPy + pyCanonical - Number(vectorPotential?.ay || 0);
        const hx = c * px, hy = c * py, hz = repSign * restEnergy, k = iy * n + ix;
        const ur = state.re[up][k], ui = state.im[up][k];
        const dr = state.re[down][k], di = state.im[down][k];
        const weight = ur * ur + ui * ui + dr * dr + di * di;
        const hUr = hz * ur + hx * dr + hy * di;
        const hUi = hz * ui + hx * di - hy * dr;
        const hDr = hx * ur - hy * ui - hz * dr;
        const hDi = hx * ui + hy * ur - hz * di;
        norm += weight; meanPx += weight * px; meanPy += weight * py;
        meanEnergyKinetic += ur * hUr + ui * hUi + dr * hDr + di * hDi;
        currentX += 2 * c * (ur * dr + ui * di);
        currentY += 2 * c * (ur * di - ui * dr);
      }
    } else {
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
        const pxCanonical = hbar * (2 * Math.PI * mx / length), pyCanonical = hbar * (2 * Math.PI * my / length);
        const px = state.carrierPx + pxCanonical - Number(vectorPotential?.ax || 0), py = state.carrierPy + pyCanonical - Number(vectorPotential?.ay || 0);
        const energy = Math.hypot(restEnergy, c * px, c * py), k = iy * n + ix;
        const wr = state.re[0][k], wi = state.im[0][k], weight = wr * wr + wi * wi;
        norm += weight; meanPx += weight * px; meanPy += weight * py;
        meanEnergyKinetic += weight * energy;
        if (energy > 1e-14) {
          currentX += weight * c * c * px / energy;
          currentY += weight * c * c * py / energy;
        }
      }
    }
    norm = Math.max(1e-300, norm);
    const vx = currentX / norm, vy = currentY / norm;
    const rawSpeed = Math.hypot(vx, vy);
    let safeVx = vx, safeVy = vy;
    if (!Number.isFinite(rawSpeed)) { safeVx = Number(p.vx || 0); safeVy = Number(p.vy || 0); }
    else if (rawSpeed > c * (1 - 1e-10)) {
      safeVx *= c * (1 - 1e-10) / rawSpeed;
      safeVy *= c * (1 - 1e-10) / rawSpeed;
    }

    // Translate psi(x) -> psi(x + <x>) in the local frame, i.e. multiply
    // Fourier modes by exp(+i k.<x>), so the packet is centered at zero.
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const mx = ix <= n / 2 ? ix : ix - n, my = iy <= n / 2 ? iy : iy - n;
      const pxCanonical = hbar * (2 * Math.PI * mx / length), pyCanonical = hbar * (2 * Math.PI * my / length);
        const px = pxCanonical - Number(vectorPotential?.ax || 0), py = pyCanonical - Number(vectorPotential?.ay || 0);
      const angle = (px * meanX + py * meanY) / Math.max(1e-12, hbar);
      const cr = Math.cos(angle), si = Math.sin(angle), k = iy * n + ix;
      for (let cidx = 0; cidx < state.re.length; cidx++) {
        const ar = state.re[cidx][k], ai = state.im[cidx][k];
        state.re[cidx][k] = ar * cr - ai * si;
        state.im[cidx][k] = ar * si + ai * cr;
      }
    }
    for (let cidx = 0; cidx < state.re.length; cidx++)
      RelativisticPacketEngine.fft2(state.re[cidx], state.im[cidx], n, true);

    const normDrift = Math.abs(rawNorm - beforeNorm) / Math.max(1e-14, beforeNorm);
    if (Math.abs(rawNorm - 1) > 1e-12) RelativisticPacketEngine.normalize(state.re, state.im);
    this.maxNormDrift = Math.max(this.maxNormDrift, normDrift);
    state.lastNorm = rawNorm; state.steps++; this.totalSteps++;
    return {
      vx: safeVx, vy: safeVy, px: meanPx / norm, py: meanPy / norm,
      energy: meanEnergyKinetic / norm + potentialEnergy, dx: meanX, dy: meanY,
      sigma: Math.max(0.25, sigma), norm: rawNorm, normDrift,
      mode: isDirac ? '2+1D Dirac' : 'positive-frequency Klein-Gordon'
    };
  }

  remove(id: number): void { this.packets.delete(id); }
  clear(): void { this.packets.clear(); this.totalSteps = 0; this.maxNormDrift = 0; }
  getDiagnostics() {
    return { packetCount: this.packets.size, steps: this.totalSteps,
      maxNormDrift: this.maxNormDrift,
      diracPackets: [...this.packets.values()].filter(p => p.re.length === 4).length,
      kleinGordonPackets: [...this.packets.values()].filter(p => p.re.length === 1).length };
  }
}
