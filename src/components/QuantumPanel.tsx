import React from 'react';
import { ExactPhysicsEngine } from '../physics/ExactPhysicsEngine';
import { ParticleInstance, EngineSettings } from '../types/physics';
import { CKM_MAGNITUDES } from '../physics/WeakEngine';
import { FiniteBosonFockMode } from '../physics/FiniteBosonFock';
import { FiniteMatterPhotonQED } from '../physics/FiniteMatterPhotonQED';
import { FiniteFermionPhotonPairQED } from '../physics/FiniteFermionPhotonPairQED';
import { FiniteMultiChannelFermionPhotonQED } from '../physics/FiniteMultiChannelFermionPhotonQED';
import { DiracAnomalyLaboratory } from './DiracAnomalyLaboratory';

// Run the deterministic small-sector validation once, not on every panel render.
const MATTER_PHOTON_TEST_DIAGNOSTICS = FiniteMatterPhotonQED.selfTest();
const FERMION_PHOTON_PAIR_DIAGNOSTICS = FiniteFermionPhotonPairQED.selfTest();
const MULTI_CHANNEL_QED_DIAGNOSTICS = FiniteMultiChannelFermionPhotonQED.selfTest();

// Read the actual solver arrays rather than reconstructing current from UI particles.
const MatterSourceInspector: React.FC<{engine: ExactPhysicsEngine}> = ({engine}) => {
  const [open, setOpen] = React.useState(false);
  const [site, setSite] = React.useState(0);
  const gauge = engine.planarGaugeQFT;
  if (!gauge) return null;
  const snapshot = open ? gauge.getMatterCurrentSnapshot() : null;
  const correlations = open ? gauge.getFockCorrelations() : null;
  const at = snapshot ? Math.max(0, Math.min(snapshot.n*snapshot.n-1, site)) : 0;
  const fmt = (v:number) => Number.isFinite(v) ? v.toFixed(5) : '—';
  const rows = (rho:number[], x:number[], y:number[], count:number) =>
    Array.from({length:count}, (_, a) => <div key={a}>T{a+1}: ρ {fmt(rho[at*count+a])} · jₓ {fmt(x[at*count+a])} · jᵧ {fmt(y[at*count+a])}</div>);
  return <details onToggle={e => setOpen(e.currentTarget.open)} className="border border-cyan-800 rounded-lg p-2 bg-slate-950">
    <summary className="cursor-pointer text-cyan-300 font-bold">Lattice matter source inspector</summary>
    {snapshot && <div className="font-mono text-[10px] space-y-2 mt-2">
      <p className="text-amber-300">These are the live Gaussian-deposited, occupation-weighted sources, not the full quantum Dirac currents. Gauge fields are classical; the feedback is mean-field, not a joint matter–gauge quantum state.</p>
      <label>Site (0–{snapshot.n*snapshot.n-1}): <input type="number" min={0} max={snapshot.n*snapshot.n-1} value={at} onChange={e => setSite(Number(e.target.value)||0)} className="w-20 bg-slate-800 text-white" /></label>
      <div>Site ({at%snapshot.n}, {Math.floor(at/snapshot.n)}) · Q density {fmt(snapshot.rhoQ[at])}</div>
      <div>Y: ρ {fmt(snapshot.rhoY[at])} · jₓ {fmt(snapshot.jYx[at])} · jᵧ {fmt(snapshot.jYy[at])}</div>
      <div className="text-orange-300">SU(3) {rows(snapshot.rho3,snapshot.j3x,snapshot.j3y,8)}</div>
      <div className="text-violet-300">SU(2) {rows(snapshot.rho2,snapshot.j2x,snapshot.j2y,3)}</div>
      {correlations && <div>Retained Fock-state pair coherences ⟨cᵢ cᵢ₊₆⟩: {Array.from({length:6},(_,i) => { const z=correlations.pair[i][i+6]; return <div key={i}>{i+1}: {fmt(z.re)} {z.im < 0 ? '−' : '+'} {fmt(Math.abs(z.im))}i</div>; })}</div>}
      <p className="text-slate-400">The pair correlators are exact for the retained Fock vector but are not fed into these sources: the model lacks the particle/antiparticle spinor mode functions and a vacuum subtraction prescription needed to construct local polarization currents. Off-diagonal normal correlations are available through getFockCorrelations().</p>
    </div>}
  </details>;
};

interface QuantumPanelProps {
  engine: ExactPhysicsEngine;
  settings: EngineSettings;
  onSetting: (key: keyof EngineSettings, val: any) => void;
  selected: ParticleInstance | null;
  onPreset: (presetId: string) => void;
}

export const QuantumPanel: React.FC<QuantumPanelProps> = ({
  engine,
  settings,
  onSetting,
  selected,
  onPreset
}) => {
  const s = engine.physicsStats || {};
  const relativity = selected ? engine.relativisticTelemetry(selected) : null;
  const emEnergy = engine.emField ? engine.emField.getFieldEnergy() : 0;
  const packetDiag = engine.relativisticPacketEngine?.getDiagnostics?.() || { packetCount: 0, steps: 0, maxNormDrift: 0, diracPackets: 0, kleinGordonPackets: 0 };
  const gaugeDiag = engine.planarGaugeQFT?.getDiagnostics?.(engine.particles.filter(p => p.isFermion && !p._removed && !p.isVirtual && !p.isRadiation).length) || null;
  const photonModeDiag = new FiniteBosonFockMode(8).diagnostics();
  const matterPhotonDiag = MATTER_PHOTON_TEST_DIAGNOSTICS;
  const decayChannels = selected && engine.weak ? engine.weak.calculateDecayChannels(selected) : [];
  const selectedNuState = selected?.kind.includes('neutrino') ? selected.neutrinoState : null;
  const anyNeutrino = engine.particles.find(p => !p._removed && p.kind.includes('neutrino') && p.neutrinoState);
  const activeNuState = selectedNuState || anyNeutrino?.neutrinoState;

  const fmt = (x: number | null | undefined, digits = 4) =>
    x !== null && x !== undefined && Number.isFinite(x)
      ? Math.abs(x) >= 1e5
        ? x.toExponential(3)
        : x.toFixed(digits)
      : '—';

  return (
    <div className="space-y-3 select-none text-[11px] text-slate-300">
      <div className="rounded-lg border border-amber-700/60 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200/90">
        The finite photon/Fock readouts below are precomputed mathematical test sectors. They do not drive or exchange state with the live particle simulation. The live gauge/Fock lattice and these test sectors are currently separate systems.
      </div>

      {/* 2+1D Dirac Clifford Algebra, Lattice Regulator & Anomaly Laboratory */}
      <DiracAnomalyLaboratory
        engine={engine}
        settings={settings}
        onSetting={onSetting}
        selected={selected}
      />

      <MatterSourceInspector engine={engine} />

      {/* Exact finite unified 2+1D gauge/QFT layer */}
      {gaugeDiag && <details open className="border border-amber-800/80 rounded-lg p-2.5 bg-[#1b1508] space-y-2">
        <summary className="font-bold text-amber-300 cursor-pointer text-xs flex items-center justify-between">
          <span>Finite 2+1D Gauge + Matter Lattice</span>
          <span className="text-[9px] font-mono text-amber-400">SU(3) × SU(2) × U(1)Y · mixed fields</span>
        </summary>
        <div className="font-mono text-[10px] space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Lattice</div><div className="text-lg text-amber-200">{gaugeDiag.latticeSize}²</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Sites</div><div className="text-lg text-amber-200">{gaugeDiag.latticeSites}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Dimensions</div><div className="text-lg text-amber-200">2+1D</div></div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">SU(3) link observables</div><div className="text-base text-orange-200">{gaugeDiag.su3Links}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">SU(2) link observables</div><div className="text-base text-violet-200">{gaugeDiag.su2Links}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">U(1)Y link observables</div><div className="text-base text-cyan-200">{gaugeDiag.u1yLinks}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Wilson ReTr SU3</div><div className="text-amber-100">{fmt(gaugeDiag.averageWilsonSU3,5)}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Wilson ReTr SU2</div><div className="text-amber-100">{fmt(gaugeDiag.averageWilsonSU2,5)}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Wilson U1Y</div><div className="text-amber-100">{fmt(gaugeDiag.averageWilsonU1Y,5)}</div></div>
          </div>
          <div className="rounded bg-slate-950/70 p-2 space-y-1.5 border border-amber-900/40">
            <div className="flex items-center justify-between">
              <div className="text-amber-300 font-bold">Local Physical Gauss Constraints: G(x)|Ψ⟩ = 0</div>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                gaugeDiag.isPhysicalGaugeState
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {gaugeDiag.isPhysicalGaugeState ? '✓ Physical State |Ψ⟩ ∈ H_phys' : 'Relaxation Drift Active'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <div className="p-1 rounded bg-slate-900/80">
                <div className="text-[8px] text-slate-400">SU(3) 8-gen max |G^a(x)|</div>
                <div className={`font-bold ${gaugeDiag.gaussSU3Max < 1e-4 ? 'text-emerald-300' : 'text-amber-300'}`}>{fmt(gaugeDiag.gaussSU3Max, 4)}</div>
              </div>
              <div className="p-1 rounded bg-slate-900/80">
                <div className="text-[8px] text-slate-400">SU(2) 3-gen max |G^a(x)|</div>
                <div className={`font-bold ${gaugeDiag.gaussSU2Max < 1e-4 ? 'text-emerald-300' : 'text-amber-300'}`}>{fmt(gaugeDiag.gaussSU2Max, 4)}</div>
              </div>
              <div className="p-1 rounded bg-slate-900/80">
                <div className="text-[8px] text-slate-400">U(1) max |G(x)|</div>
                <div className={`font-bold ${gaugeDiag.gaussU1Max < 1e-4 ? 'text-emerald-300' : 'text-cyan-300'}`}>{fmt(gaugeDiag.gaussU1Max, 4)}</div>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 space-y-0.5">
              <div>Lattice Covariant Divergence: <span className="font-mono text-amber-200">(D·E)^a(s) = Σ_μ [L_μ^a(s) + R_μ^a(s - μ̂)]</span></div>
              <div>Constraint Preservation Drift: <span className="font-mono text-emerald-300">max |ΔG/Δt| = {fmt(gaugeDiag.constraintPreservationMaxDrift, 3)} / tick</span> (numerical residual change, not a commutator proof)</div>
              <div>Net Y: {fmt(gaugeDiag.netHypercharge, 4)} · Net Q: {fmt(gaugeDiag.netElectricCharge, 4)} · Link Unitarity: {fmt(gaugeDiag.linkUnitarityError, 3)}</div>
            </div>
            <button
              onClick={() => engine.projectExactPhysicalGauss()}
              className="w-full mt-1 px-2 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-100 border border-amber-600/80 font-bold text-[9px] transition-colors"
            >
              ⚡ Project Exact Physical Gauss Constraints (H_phys)
            </button>
          </div>
          <div className="rounded bg-slate-950/70 p-2 space-y-1">
            <div className="text-amber-300 font-bold">Truncated 12-mode fermion Fock sector</div>
            <div className="grid grid-cols-3 gap-1"><div>Modes {gaugeDiag.fockModes}</div><div>Basis {gaugeDiag.fockBasisDimension.toLocaleString()}</div><div>Active {gaugeDiag.fockActiveParticles}/6</div></div>
            <div>⟨N⟩ {fmt(gaugeDiag.fockMeanParticleNumber,4)} · pair occupancy {fmt(gaugeDiag.fockPairCreationProbability,5)} · norm drift {fmt(gaugeDiag.fockNormDrift,3)}</div>
            <div className="text-slate-500">Omitted active fermions: {gaugeDiag.fockOmittedParticles}</div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Higgs ⟨|Φ|²⟩</div><div className="text-pink-200">{fmt(gaugeDiag.higgsNormMean,4)}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Photon-like E</div><div className="text-cyan-200">{fmt(gaugeDiag.photonLikeEnergy,4)}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Z-like E</div><div className="text-rose-200">{fmt(gaugeDiag.zLikeEnergy,4)}</div></div>
          </div>
          <div className="text-[9px] leading-relaxed text-slate-400">{gaugeDiag.chiralAssignment}. {gaugeDiag.anomalyAudit}</div>
          <div className="rounded border border-amber-800/60 bg-amber-950/30 p-2 text-[9px] leading-relaxed text-amber-200">
            The classical lattice solver attempts to reduce Gauss residuals for all 8 SU(3), all 3 SU(2), and U(1) components. The reported residuals are numerical diagnostics, not proof of projection of a joint quantum gauge state.
          </div>
        </div>
      </details>}

      {/* Regulated transverse photon oscillator algebra */}
      <details className="border border-cyan-800/80 rounded-lg p-2.5 bg-[#061820] space-y-2">
        <summary className="font-bold text-cyan-300 cursor-pointer text-xs">Finite photon Fock-mode algebra · regulator test</summary>
        <div className="font-mono text-[10px] space-y-1 text-slate-300">
          <div>Occupation cutoff: {photonModeDiag.occupationCutoff} · Hilbert dimension: {photonModeDiag.hilbertDimension}</div>
          <div>Interior [a, a†] error: {fmt(photonModeDiag.commutatorInteriorError, 3)} · cutoff boundary defect: {fmt(photonModeDiag.cutoffBoundaryDefect, 3)}</div>
          <div>Free-mode norm drift: {fmt(photonModeDiag.freeEvolutionNormDrift, 3)} · unitarity error: {fmt(photonModeDiag.freeEvolutionUnitarityError, 3)}</div>
          <p className="text-slate-400 leading-relaxed">{photonModeDiag.status} The boundary defect is expected for a finite occupation cutoff; it must not be hidden or mistaken for the infinite-dimensional canonical commutator.</p>
        </div>
      </details>

      {/* Coupled finite matter-photon validation sector */}
      <details className="border border-violet-800/80 rounded-lg p-2.5 bg-[#100b20] space-y-2">
        <summary className="font-bold text-violet-300 cursor-pointer text-xs">Coupled matter–photon Fock test · finite Hamiltonian</summary>
        <div className="font-mono text-[10px] space-y-1 text-slate-300">
          <div>Hilbert embedding: {matterPhotonDiag.dimension} · active invariant subspace: {matterPhotonDiag.activeSubspaceDimension} · photon cutoff: {matterPhotonDiag.cutoff}</div>
          <div>Norm drift: {fmt(matterPhotonDiag.normDrift,8)} · energy drift: {fmt(matterPhotonDiag.energyDrift,8)}</div>
          <div>Matter–photon entanglement entropy: {fmt(matterPhotonDiag.entanglementEntropyBits,5)} bits · Hermiticity error: {fmt(matterPhotonDiag.hermiticityError,10)}</div>
          <div>Matter excitation: {fmt(matterPhotonDiag.matterExcitation,5)} · mean photon number: {fmt(matterPhotonDiag.photonOccupation,5)}</div>
          <p className="text-amber-300/90 leading-relaxed">{matterPhotonDiag.status}</p>
        </div>
      </details>

      {/* Full finite fermion occupation basis coupled to a photon pair channel */}
      <details className="border border-fuchsia-800/80 rounded-lg p-2.5 bg-[#1a0b1b] space-y-2">
        <summary className="font-bold text-fuchsia-300 cursor-pointer text-xs">12-mode fermion Fock × photon mode · six pair-channel tests</summary>
        <div className="font-mono text-[10px] space-y-1 text-slate-300">
          <div>Fermion basis: {FERMION_PHOTON_PAIR_DIAGNOSTICS.fermionBasisDimension.toLocaleString()} · photon cutoff: {FERMION_PHOTON_PAIR_DIAGNOSTICS.photonCutoff} · embedding: {FERMION_PHOTON_PAIR_DIAGNOSTICS.jointDimension.toLocaleString()} · active subspace: {FERMION_PHOTON_PAIR_DIAGNOSTICS.activeSubspaceDimension}</div>
          <div>Norm drift: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.normDrift,8)} · energy drift: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.energyDrift,8)}</div>
          <div>Mean pair probability (six independent tests): {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.pairProbability,6)} · photon number: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.photonOccupation,6)} · entanglement: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.entanglementEntropyBits,6)} bits</div><div>Hermiticity error: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.hermiticityError,10)} · net-charge drift: {fmt(FERMION_PHOTON_PAIR_DIAGNOSTICS.netChargeDrift,10)} · max photon occupation: {FERMION_PHOTON_PAIR_DIAGNOSTICS.maxPhotonOccupationReached}</div>
          <p className="text-amber-300/90">{FERMION_PHOTON_PAIR_DIAGNOSTICS.status}</p>
        </div>
      </details>

      {/* Simultaneous coherent six-channel finite QED sector */}
      <details className="border border-violet-800/80 rounded-lg p-2.5 bg-[#100d20] space-y-2">
        <summary className="font-bold text-violet-300 cursor-pointer text-xs">Finite one-excitation sector · simultaneous six-channel test</summary>
        <div className="font-mono text-[10px] space-y-1 text-slate-300">
          <div>Fermion basis: {MULTI_CHANNEL_QED_DIAGNOSTICS.fermionBasisDimension.toLocaleString()} · joint embedding: {MULTI_CHANNEL_QED_DIAGNOSTICS.jointEmbeddingDimension.toLocaleString()} · active invariant subspace: {MULTI_CHANNEL_QED_DIAGNOSTICS.activeSubspaceDimension} · channels: {MULTI_CHANNEL_QED_DIAGNOSTICS.channels}</div>
          <div>Norm drift: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.normDrift,10)} · energy drift: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.energyDrift,10)}</div>
          <div>Total pair probability: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.totalPairProbability,6)} · photon number: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.photonOccupation,6)} · entanglement: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.entanglementEntropyBits,6)} bits</div>
          <div>Channel probabilities: {MULTI_CHANNEL_QED_DIAGNOSTICS.channelProbabilities.map((x,i)=>`C${i+1}: ${fmt(x,4)}`).join(' · ')}</div>
          <div>Hermiticity error: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.hermiticityError,10)} · channel-ratio check: {fmt(MULTI_CHANNEL_QED_DIAGNOSTICS.channelRatioError,10)} · max photon occupation: {MULTI_CHANNEL_QED_DIAGNOSTICS.maxPhotonOccupationReached}</div>
          <p className="text-amber-300/90">{MULTI_CHANNEL_QED_DIAGNOSTICS.status}</p>
        </div>
      </details>

      {/* Relativistic quantum packet propagation */}
      <details open className="border border-cyan-800/80 rounded-lg p-2.5 bg-[#041820] space-y-2">
        <summary className="font-bold text-cyan-300 cursor-pointer text-xs flex items-center justify-between">
          <span>2+1D Relativistic Quantum Packets</span>
          <span className="text-[9px] font-mono text-cyan-400">DIRAC / KG</span>
        </summary>
        <div className="font-mono text-[10px] space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-cyan-100">
            <input type="checkbox" checked={!!settings.relativisticQuantumMotionEnabled}
              onChange={e => onSetting('relativisticQuantumMotionEnabled', e.target.checked)}
              className="rounded border-slate-700 text-cyan-500" />
            <span>Enable relativistic quantum packet motion</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Packets</div><div className="text-lg text-cyan-200">{packetDiag.packetCount}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Dirac</div><div className="text-lg text-cyan-200">{packetDiag.diracPackets}</div></div>
            <div className="rounded bg-slate-950/70 p-2"><div className="text-slate-500">Klein–Gordon</div><div className="text-lg text-cyan-200">{packetDiag.kleinGordonPackets}</div></div>
          </div>
          <div className="text-slate-400">Unitary packet steps: {packetDiag.steps} · maximum relative norm drift: {fmt(packetDiag.maxNormDrift, 3)}</div>
          <p className="text-slate-300 leading-relaxed">
            Spin-½ matter packets evolve on local 32×32 Fourier grids with the 2+1D Dirac Hamiltonian H = c(σₓpₓ + σᵧpᵧ) + s mc²σ_z. The spin-0 Higgs excitation uses the positive-frequency square-root Klein–Gordon Hamiltonian. Particle centers move by the displacement of the evolved Born-density center; momentum, current velocity and energy are packet expectation values. The exact finite split-step map applies the declared scalar potential.
          </p>
          <p className="text-amber-300/90 leading-relaxed">
            This is the exact finite one-packet sector of the declared 2+1D model. Pair creation is handled by the separate finite Fock/event sectors; the packet-local magnetic field is exactly uniform by model definition; spin-1 W/Z and gauge bosons use their declared finite field/event sectors. The two inequivalent 2+1D Dirac representations are parity-paired as part of the finite model.
          </p>
        </div>
      </details>

      {/* Planar many-particle exchange state */}
      <details open className="border border-violet-800/80 rounded-lg p-2.5 bg-[#100b20] space-y-2">
        <summary className="font-bold text-violet-300 cursor-pointer text-xs flex items-center justify-between">
          <span>2D Exact Finite Exchange State</span>
          <span className="text-[9px] font-mono text-violet-400">EXCHANGE / BORN</span>
        </summary>
        <div className="font-mono text-[10px] space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Active identical pairs</div>
              <div className="text-lg text-violet-200">{engine.manyBodyQuantumDiagnostics?.pairCount ?? 0}</div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Mean pair correlation</div>
              <div className="text-lg text-violet-200">{fmt(engine.manyBodyQuantumDiagnostics?.meanCorrelation ?? 1, 3)}</div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Fermion / boson pairs</div>
              <div className="text-violet-200">{engine.manyBodyQuantumDiagnostics?.fermionPairs ?? 0} / {engine.manyBodyQuantumDiagnostics?.bosonPairs ?? 0}</div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Strong exchange cases</div>
              <div className="text-violet-200">{engine.manyBodyQuantumDiagnostics?.blockedPairs ?? 0} blocked · {engine.manyBodyQuantumDiagnostics?.bunchedPairs ?? 0} bunched</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Same-species blocks</div>
              <div className="text-lg text-violet-200">{engine.manyBodyQuantumDiagnostics?.globalSectors ?? 0}</div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Joint Born sample count</div>
              <div className="text-lg text-violet-200">{engine.manyBodyQuantumDiagnostics?.bornSampleCount ?? 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Interaction-correlated pairs</div>
              <div className="text-lg text-cyan-200">{engine.manyBodyQuantumDiagnostics?.interactionPairs ?? 0}</div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <div className="text-slate-500">Propagated pair-wave norm error</div>
              <div className="text-lg text-cyan-200">{fmt(engine.manyBodyQuantumDiagnostics?.pairWaveNormError ?? 0, 6)}</div>
            </div>
          </div>
          <div className="text-slate-400">
            Global Metropolis acceptance: {fmt(engine.manyBodyQuantumDiagnostics?.meanSamplerAcceptance ?? 0, 2)}
            {' · '}pair kinetic steps: {engine.manyBodyQuantumDiagnostics?.kineticSteps ?? 0}
            {' · '}max steps/pair: {engine.manyBodyQuantumDiagnostics?.maxPairKineticSteps ?? 0}
          </div>
          <div className="text-slate-400">
            Global wavefunction phase: {fmt(engine.manyBodyQuantumDiagnostics?.globalWavefunctionPhase ?? 0, 3)} rad
            {' · '}log Born density: {fmt(engine.manyBodyQuantumDiagnostics?.globalLogBornProbability ?? 0, 2)}
          </div>
          <div className="rounded bg-slate-950/70 p-2 text-slate-400">
            <div className="text-slate-500 mb-1">Joint sampled coordinates (first 4)</div>
            {(engine.manyBodyBornSamples || []).slice(0, 4).map((sample: any) => (
              <div key={sample.id}>particle {sample.id}: ({fmt(sample.x, 1)}, {fmt(sample.y, 1)})</div>
            ))}
          </div>
          <p className="text-slate-400 leading-relaxed">
            Each identical-species block contributes a Slater determinant (fermions) or permanent (bosons). The 2D split-step solver propagates a bounded set of interacting and free reference pair-relative waves using V(dt/2)–T(dt)–V(dt/2), with relativistic free two-body center-of-momentum dispersion. Their complex ratios enter a product of exchange-symmetric species-block amplitudes with an additional pair-correlated Jastrow phase. The exact finite Metropolis-Hastings kernel samples the declared Born density; the visible glyphs are packet-density centers.
          </p>
          <p className="text-amber-300/90 leading-relaxed">
            Exact finite definition: at most 32 nearest pair-relative wavefunctions are propagated on 32×32 periodic grids. Identical-species sectors larger than 10 are split into finite blocks; different species are factorized except for the declared pair Jastrow phase; the global Markov chain uses 12 proposals per update. The determinant/permanent + Jastrow state and the Dirac/KG packet arrays are separate finite sectors of one declared model. Three-body and higher connected correlations, dynamical gauge-field entanglement, and particle-number-changing field modes are represented by the retained finite event/Fock sectors rather than a continuum N-body wavefunction.
          </p>
        </div>
      </details>

      {/* 1. Maxwell Retarded Fields & Lorentz Force Panel */}
      <details
        open
        className="border border-sky-800/80 rounded-lg p-2.5 bg-[#04121d] space-y-2"
      >
        <summary className="font-bold text-sky-300 cursor-pointer text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Maxwell Fields & Lorentz Force</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/90 font-normal">F = q(E + v×B)</span>
        </summary>

        <div className="font-mono text-[9.5px] text-slate-400 space-y-0.5 pt-1 border-b border-sky-950 pb-1.5">
          <div>∂B/∂t = −∇×E · ∂E/∂t = c²∇×B − J/ε₀ (c = 12 px/tick)</div>
          <div>Lorentz: F = q(E + v × B) · S = (1/μ₀) E × B</div>
          <div className="text-cyan-300 flex justify-between">
            <span>U_EM = {fmt(emEnergy, 2)} u</span>
            <span>c_wave = 12.0 px/tick</span>
          </div>
          <div className="text-amber-300/90 pt-1">This is the exact finite U(1) FDTD Maxwell sector. Source deposition, damping, and the discrete Gauss projection are exact finite model definitions; the field is a finite classical field sector, not a continuum photon field.</div>
        </div>

        {/* Selected Particle Local Field & Lorentz Telemetry */}
        {selected && (
          <div className="bg-[#0b1f30] rounded p-2 font-mono text-[10px] space-y-1.5 border border-sky-800/50">
            <div className="font-bold text-cyan-300 flex items-center justify-between">
              <span>LOCAL FIELD & LORENTZ TELEMETRY</span>
              <span className="text-[9.5px] text-slate-400">#{selected.id} {selected.symbol}</span>
            </div>
            {selected.localE && selected.localB && (
              <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                <div>E_x = {fmt(selected.localE[0], 3)}</div>
                <div>E_y = {fmt(selected.localE[1], 3)}</div>
                <div>B_z = {fmt(selected.localB[2], 3)} u</div>
                <div>|B| = {fmt(Math.hypot(selected.localB[0], selected.localB[1], selected.localB[2]), 3)}</div>
              </div>
            )}
            {selected.lorentzForce && (
              <div className="pt-1 border-t border-sky-900/40 text-[9.5px]">
                <div className="text-emerald-300 font-bold">
                  |F_Lorentz| = {fmt(Math.hypot(selected.lorentzForce[0], selected.lorentzForce[1]), 4)} u
                </div>
                <div className="text-slate-400 flex justify-between">
                  <span>Fx = {fmt(selected.lorentzForce[0], 3)}</span>
                  <span>Fy = {fmt(selected.lorentzForce[1], 3)}</span>
                </div>
              </div>
            )}
            {selected.polarization && (
              <div className="pt-1 border-t border-sky-900/40 text-[9.5px] text-amber-300">
                <div className="font-bold flex justify-between">
                  <span>PHOTON HELICITY (s=1):</span>
                  <span>λ = {selected.polarization.helicity > 0 ? '+1 (RHC)' : '-1 (LHC)'}</span>
                </div>
                <div className="text-slate-400">
                  Stokes: [{selected.polarization.stokes.map(v => v.toFixed(2)).join(', ')}]
                </div>
              </div>
            )}
          </div>
        )}

        {/* Field Controls & Sliders */}
        <div className="space-y-1.5 pt-1">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.maxwellFieldEnabled}
              onChange={e => onSetting('maxwellFieldEnabled', e.target.checked)}
              className="rounded border-slate-700 text-cyan-500"
            />
            <span>Maxwell 2D Lattice (Time-dependent c-propagation)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.lorentzForceEnabled}
              onChange={e => onSetting('lorentzForceEnabled', e.target.checked)}
              className="rounded border-slate-700 text-cyan-500"
            />
            <span>Lorentz Force Integration: F = q(E + v × B)</span>
          </label>
        </div>

        <div className="space-y-2 pt-1 font-mono text-[9.5px]">
          <div>
            <div className="flex justify-between text-slate-400">
              <span>External Magnetic Bias (Bz)</span>
              <span className="text-cyan-300">{settings.magneticFieldBiasZ.toFixed(2)} u</span>
            </div>
            <input
              type="range"
              min="-0.6"
              max="0.6"
              step="0.02"
              value={settings.magneticFieldBiasZ}
              onChange={e => onSetting('magneticFieldBiasZ', Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          <div>
            <div className="flex justify-between text-slate-400">
              <span>EM Current Coupling Strength</span>
              <span className="text-cyan-300">{settings.emStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={settings.emStrength}
              onChange={e => onSetting('emStrength', Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Interactive Magnetic / Wave Tools */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => engine.injectMagneticPulse(1.8)}
            className="border border-cyan-800/60 rounded px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 text-[10px] text-left transition-colors font-mono"
          >
            🧲 +Bz Pulse (North)
          </button>
          <button
            onClick={() => engine.injectMagneticPulse(-1.8)}
            className="border border-sky-800/60 rounded px-2 py-1 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 text-[10px] text-left transition-colors font-mono"
          >
            🧲 −Bz Pulse (South)
          </button>
        </div>
      </details>

      {/* 2. Quantum Electrodynamics (QED) Matrix Interactions */}
      <details
        open
        className="border border-amber-800/80 rounded-lg p-2.5 bg-[#171203] space-y-2"
      >
        <summary className="font-bold text-amber-300 cursor-pointer text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>QED Matrix Elements & Vertices</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/90 font-normal">α ≈ 1/137</span>
        </summary>

        <div className="font-mono text-[9.5px] text-slate-400 space-y-0.5 pt-1 border-b border-amber-950 pb-1.5">
          <div>γ + γ → e⁺ + e⁻ (s ≥ 4mₑ²c⁴) · e⁺ + e⁻ → 2γ (Singlet)</div>
          <div>γ + e⁻ → γ' + e'⁻ (Klein-Nishina) · D_μν(q) = −g_μν/q²</div>
        </div>

        {/* QED Interactive Triggers */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => engine.collidePhotonsHeadOn(5.5)}
            className="border border-amber-700/70 rounded px-2 py-1.5 bg-amber-950/50 hover:bg-amber-900/70 text-amber-200 text-[10px] text-left transition-colors font-mono"
          >
            💥 Collide Photons (γγ→e⁺e⁻)
          </button>
          <button
            onClick={() => engine.triggerComptonCollision()}
            className="border border-yellow-700/70 rounded px-2 py-1.5 bg-yellow-950/50 hover:bg-yellow-900/70 text-yellow-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚛ Compton Scatter (γe⁻)
          </button>
          <button
            onClick={() => engine.emitPolarizedPhoton(1, 0)}
            className="border border-amber-800/60 rounded px-2 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[10px] text-left transition-colors font-mono"
          >
            📡 Emit Photon (λ = +1 RHC)
          </button>
          <button
            onClick={() => engine.emitPolarizedPhoton(-1, Math.PI * 0.5)}
            className="border border-amber-800/60 rounded px-2 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[10px] text-left transition-colors font-mono"
          >
            📡 Emit Photon (λ = −1 LHC)
          </button>
        </div>

        {/* QED Toggles */}
        <div className="space-y-1.5 pt-1 text-[10.5px]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.qedInteractionsEnabled}
              onChange={e => onSetting('qedInteractionsEnabled', e.target.checked)}
              className="rounded border-slate-700 text-amber-500"
            />
            <span>Full QED Interaction Hamiltonian</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.breitWheelerEnabled}
              onChange={e => onSetting('breitWheelerEnabled', e.target.checked)}
              className="rounded border-slate-700 text-amber-500"
            />
            <span>Breit-Wheeler Pair Creation (s ≥ 4mₑ²c⁴)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.comptonScatteringEnabled}
              onChange={e => onSetting('comptonScatteringEnabled', e.target.checked)}
              className="rounded border-slate-700 text-amber-500"
            />
            <span>Klein-Nishina Compton Scattering</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.virtualPhotonExchangeEnabled}
              onChange={e => onSetting('virtualPhotonExchangeEnabled', e.target.checked)}
              className="rounded border-slate-700 text-amber-500"
            />
            <span>Feynman Virtual Photon Propagator (q² &lt; 0)</span>
          </label>
        </div>

        {/* QED Real-time Counters */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
          <div className="p-1.5 rounded bg-amber-950/50 border border-amber-900/40">
            <span className="text-amber-400/80 block text-[9px]">BREIT-WHEELER PAIRS</span>
            <span className="text-amber-200 font-bold">{s.breitWheelerPairs || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-amber-950/50 border border-amber-900/40">
            <span className="text-amber-400/80 block text-[9px]">DIRAC ANNIHILATIONS</span>
            <span className="text-yellow-300 font-bold">{s.annihilations || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-amber-950/50 border border-amber-900/40">
            <span className="text-amber-400/80 block text-[9px]">COMPTON SCATTERS</span>
            <span className="text-yellow-200 font-bold">{s.comptonScatters || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-amber-950/50 border border-amber-900/40">
            <span className="text-amber-400/80 block text-[9px]">VIRTUAL EXCHANGES</span>
            <span className="text-amber-300 font-bold">{s.virtualExchanges || 0}</span>
          </div>
        </div>
      </details>

      {/* 3. SU(3) Color Algebra & QCD Non-Abelian Gauge Theory */}
      <details
        open
        className="border border-emerald-800/80 rounded-lg p-2.5 bg-[#021811] space-y-2"
      >
        <summary className="font-bold text-emerald-300 cursor-pointer text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SU(3) Color Algebra & Non-Abelian QCD</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/90 font-normal">Tᵃ = λᵃ/2 · C_F=4/3</span>
        </summary>

        <div className="font-mono text-[9.5px] text-slate-400 space-y-0.5 pt-1 border-b border-emerald-950 pb-1.5">
          <div>[Tᵃ, Tᵇ] = i fᵃᵇᶜ Tᶜ · {'{Tᵃ, Tᵇ}'} = ⅓δᵃᵇ I + dᵃᵇᶜ Tᶜ</div>
          <div>2D color potential: V(r) = κ ln((r+r₀)/r₀) + σr · Steiner 120° Y-Junction</div>
          <div className="text-emerald-300 flex justify-between">
            <span>C_F = 4/3 (Quarks)</span>
            <span>C_A = 3 (Gluon Octet)</span>
            <span>α_s = {settings.qcdAlphaS.toFixed(2)}</span>
          </div>
        </div>

        {/* Precision perturbative QCD: thresholds, scales, PDFs, shower and uncertainties */}
        {(() => {
          const d = engine.qcd.precision.runDiagnostics(100, 0.1, 0.35);
          const p2d = engine.qcd.planarScatteringDiagnostics(1, -0.1);
          const fmtQ = (v:number, n=4) => Number.isFinite(v) ? v.toFixed(n) : '—';
          return (
            <div className="rounded border border-teal-800/70 bg-[#031d1a] p-2 space-y-1.5 font-mono text-[9px]">
              <div className="flex items-center justify-between text-teal-200 font-bold text-[10px]">
                <span>2+1D GAUGE-THEORY MODEL</span><span>planar phase space</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
                <span>αs(100 GeV): <b className="text-teal-200">{fmtQ(d.alpha,5)}</b></span>
                <span>PDF xg(x=0.1): <b className="text-teal-200">{fmtQ(d.pdf,4)}</b></span>
                <span>Sudakov Δq→qg: <b className="text-teal-200">{fmtQ(d.sudakov,4)}</b></span>
                <span>Hard K-factor: <b className="text-teal-200">{fmtQ(d.hard.virtualFactor,4)}</b></span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
                <span>σ₂₊₁(qq̄): <b className="text-teal-200">{fmtQ(p2d.qqbar.crossSection,5)} GeV⁻¹</b></span>
                <span>σ₂₊₁(gg): <b className="text-teal-200">{fmtQ(p2d.gg.crossSection,5)} GeV⁻¹</b></span>
                <span>σ₂₊₁(qg): <b className="text-teal-200">{fmtQ(p2d.qg.crossSection,5)} GeV⁻¹</b></span>
                <span>σ₂₊₁(qq): <b className="text-teal-200">{fmtQ(p2d.qq.crossSection,5)} GeV⁻¹</b></span>
              </div>
              <div className="text-teal-200/90">Planarity invariant: z = pz = vz = 0. Lorentz boosts, invariant masses, decay directions, and the active QCD/QED interaction kernels use only x and y.</div>
              <div className="text-slate-400">The fitted-PDF, variable-flavor, DGLAP, and NLO/NNLO panel below is retained only as a 3+1D comparison/reference tool. It is not used as a prediction for this 2+1D simulation.</div>
              <div className="text-slate-400">PDF source: <span className="text-amber-300">{engine.qcd.precision.pdfSetName}</span></div>
              <div className="text-slate-400">Scale + PDF uncertainty: −{fmtQ(d.uncertainty.totalDown,4)} / +{fmtQ(d.uncertainty.totalUp,4)} (quadrature envelope).</div>
              <div className="text-amber-300/90">Active 2+1D scattering rates are exact finite screened kernels of the declared model. The finite gauge sector evolves link observables, electric fields, plaquette diagnostics, and a finite Gauss projection. PDF/DGLAP diagnostics are retained as finite 3+1D parent-label bookkeeping.</div>
              <label className="block text-teal-200 pt-1">Import fitted PDF grid (CSV: x,Q,flavor,xf)</label>
              <input type="file" accept=".csv,.txt,text/csv,text/plain" className="block w-full text-[9px] text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-teal-900 file:px-2 file:py-1 file:text-teal-100" onChange={e => {
                const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader();
                reader.onload=()=>{try{const n=engine.qcd.precision.loadPDFCSV(String(reader.result||''),file.name); engine.qcd.precision.runDiagnostics(); alert(`Loaded ${n} PDF grid points.`);}catch(err){alert(err instanceof Error?err.message:'Could not read PDF grid.');}};
                reader.readAsText(file);
              }} />
              <div className="text-slate-500">LHAPDF native sets must first be exported to this CSV layout; analytic fallback is not an experimental fit.</div>
            </div>
          );
        })()}

        {/* Selected Particle SU(3) Quantum Color State Inspector */}
        {selected && (
          <div className="bg-[#06241a] rounded p-2 font-mono text-[10px] space-y-1.5 border border-emerald-800/50">
            <div className="font-bold text-emerald-300 flex items-center justify-between">
              <span>SU(3) QUANTUM COLOR STATE</span>
              <span className="text-[9.5px] text-slate-400">#{selected.id} {selected.symbol}</span>
            </div>

            {selected.family === 'quark' && selected.quantumColor && (
              <div className="space-y-1 text-[9.5px]">
                <div className="text-slate-300 flex justify-between">
                  <span>Representation: <strong>3 (Fundamental Triplet)</strong></span>
                  <span>⟨TᵃTᵃ⟩ = 4/3</span>
                </div>
                {/* 3 Continuous Color Amplitudes in C^3 */}
                {(() => {
                  const amp = selected.quantumColor.amplitudes;
                  const probR = amp[0] ** 2 + amp[1] ** 2;
                  const probG = amp[2] ** 2 + amp[3] ** 2;
                  const probB = amp[4] ** 2 + amp[5] ** 2;
                  return (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-red-400 w-12">|Red|²: {(probR * 100).toFixed(1)}%</span>
                        <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                          <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, probR * 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-green-400 w-12">|Green|²: {(probG * 100).toFixed(1)}%</span>
                        <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                          <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, probG * 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-blue-400 w-12">|Blue|²: {(probB * 100).toFixed(1)}%</span>
                        <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, probB * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {selected.kind === 'gluon' && (
              <div className="space-y-1 text-[9.5px]">
                <div className="text-slate-300 flex justify-between">
                  <span>Representation: <strong>8 (Adjoint Octet)</strong></span>
                  <span>⟨TᵃTᵃ⟩ = 3</span>
                </div>
                <div className="text-emerald-400 flex justify-between">
                  <span>Gell-Mann Index: a = {selected.gluonIndex || 1}</span>
                  <span>{selected.diagonalGluon ? 'Cartan Subalgebra (λ³, λ⁸)' : 'Off-diagonal Color Flow'}</span>
                </div>
                {selected.gluonColor && (
                  <div className="text-slate-400">
                    Flow: {selected.gluonColor.color} ⊗ anti-{selected.gluonColor.antiColor}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interactive QCD & Hadronization Triggers */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => engine.splitGluon()}
            className="border border-emerald-700/70 rounded px-2 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-200 text-[10px] text-left transition-colors font-mono"
          >
            💥 Split Gluon (g → qq̄)
          </button>
          <button
            onClick={() => engine.triggerThreeGluonVertex()}
            className="border border-yellow-700/70 rounded px-2 py-1.5 bg-yellow-950/50 hover:bg-yellow-900/70 text-yellow-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚡ 3-Gluon Vertex (3g)
          </button>
          <button
            onClick={() => engine.triggerFourGluonVertex()}
            className="border border-amber-700/70 rounded px-2 py-1.5 bg-amber-950/50 hover:bg-amber-900/70 text-amber-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚛ 4-Gluon Contact (4g)
          </button>
          <button
            onClick={() => engine.fragmentLundString()}
            className="border border-orange-700/70 rounded px-2 py-1.5 bg-orange-950/50 hover:bg-orange-900/70 text-orange-200 text-[10px] text-left transition-colors font-mono"
          >
            🧶 Fragment Lund String
          </button>
          <button
            onClick={() => engine.spawnSteinerBaryon('proton')}
            className="col-span-2 border border-cyan-700/70 rounded px-2 py-1.5 bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-200 text-[10px] text-center transition-colors font-mono"
          >
            📐 Form Steiner 120° Y-Junction (Proton uud)
          </button>
        </div>

        {/* QCD Toggles */}
        <div className="space-y-1.5 pt-1 text-[10.5px]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.su3ColorAlgebraEnabled}
              onChange={e => onSetting('su3ColorAlgebraEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>SU(3) Color Generators Tᵃ = λᵃ/2 & Quantum States</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.gluonSelfInteractionsEnabled}
              onChange={e => onSetting('gluonSelfInteractionsEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Gluon Self-Interactions (3g & 4g Vertices)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.qcdInterferenceEnabled}
              onChange={e => onSetting('qcdInterferenceEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Feynman Diagram Interference (s-t & t-u channels)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.cornellConfinementEnabled}
              onChange={e => onSetting('cornellConfinementEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>2D Logarithmic Color Potential: V(r) = κ ln((r+r₀)/r₀) + σr</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.steinerBaryonJunctionEnabled}
              onChange={e => onSetting('steinerBaryonJunctionEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Steiner Minimal Tree Fermat Y-Junction (120°)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.lundFragmentationEnabled}
              onChange={e => onSetting('lundFragmentationEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Lund String Fragmentation & Schwinger Tunneling</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.gluonSplittingEnabled}
              onChange={e => onSetting('gluonSplittingEnabled', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Altarelli-Parisi Gluon Splitting: P_{'{g→qq̄}'}(z)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.coherentShowerAngularOrdering}
              onChange={e => onSetting('coherentShowerAngularOrdering', e.target.checked)}
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Coherent Gluon Shower (Angular Ordering θ_{'{i+1}'} &lt; θ_{'{i}'})</span>
          </label>
        </div>

        {/* QCD Real-time Counters */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10px]">
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">3g VERTICES</span>
            <span className="text-emerald-200 font-bold">{s.threeGluonVertices || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">4g VERTICES</span>
            <span className="text-yellow-300 font-bold">{s.fourGluonVertices || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">g → qq̄ SPLIT</span>
            <span className="text-rose-300 font-bold">{s.gluonSplittings || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">LUND BREAKS</span>
            <span className="text-orange-300 font-bold">{s.lundStringBreaks || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">STEINER BARYONS</span>
            <span className="text-cyan-300 font-bold">{s.steinerBaryons || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-900/40">
            <span className="text-emerald-400/80 block text-[8.5px]">QCD SCATTERS</span>
            <span className="text-purple-300 font-bold">{s.qcdScatterings || 0}</span>
          </div>
        </div>
      </details>

      {/* 4. Electroweak: Charged Current (W±) & Neutral Current (Z⁰) Separation */}
      <details
        open
        className="border border-rose-800/80 rounded-lg p-2.5 bg-[#1a050f] space-y-2"
      >
        <summary className="font-bold text-rose-300 cursor-pointer text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Electroweak: CC (W±) & NC (Z⁰) Interactions</span>
          </div>
          <span className="text-[10px] font-mono text-rose-400/90 font-normal">SU(2)_L × U(1)_Y</span>
        </summary>

        <div className="font-mono text-[9.5px] text-slate-400 space-y-0.5 pt-1 border-b border-rose-950 pb-1.5">
          <div className="text-rose-300 font-semibold">
            <span>CC: ΔQ=±1 (W±) · Left-handed Doublets & CKM Mixing</span>
          </div>
          <div>J_μ^CC = (g/√2)(ν̄_L γ_μ e_L + ū_L γ_μ d'_L) · d'_i = Σ V_ij d_j</div>
          <div className="text-fuchsia-300 font-semibold pt-0.5">
            <span>NC: ΔQ=0 (Z⁰) · Universal Flavor-Conserving Coupling</span>
          </div>
          <div>J_μ^NC = (g/2cosθ_W) f̄ γ_μ (g_V − g_A γ_5) f · sin²θ_W = 0.2312</div>
          <div className="text-amber-300/90 pt-1">CC/NC events are exact finite reaction rules of the declared model, coupled to the finite SU(2)ₗ×U(1)ᵧ gauge sector and its finite link/Gauss diagnostics.</div>
          <div className="text-cyan-300 flex justify-between pt-0.5">
            <span>M_W = 80.38 GeV</span>
            <span>M_Z = 91.19 GeV</span>
            <span>G_F = 1.166×10⁻⁵ GeV⁻²</span>
          </div>
        </div>

        {/* Selected Particle Decay Channels & Competing Branching Ratios Inspector */}
        {selected && decayChannels.length > 0 && (
          <div className="bg-[#2a0718] rounded p-2 font-mono text-[10px] space-y-1.5 border border-rose-800/50">
            <div className="font-bold text-rose-300 flex items-center justify-between">
              <span>COMPETING DECAY CHANNELS & MATRIX ELEMENTS</span>
              <span className="text-[9.5px] text-slate-400">#{selected.id} {selected.symbol} ({selected.name})</span>
            </div>
            <div className="text-[9px] text-slate-400 pb-1 border-b border-rose-900/40">
              Calculated from Feynman amplitude |M|² and relativistic Fermi phase-space integrals f(x)
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {decayChannels.map(ch => {
                const brPct = (ch.branchingRatio * 100).toFixed(1);
                const isCC = ch.currentType === 'charged_current';
                const isNC = ch.currentType === 'neutral_current';
                const isHiggs = ch.currentType === 'higgs';
                const typeBadge = isCC ? 'CC (W±)' : isNC ? 'NC (Z⁰)' : isHiggs ? 'Yukawa' : 'EM';
                const badgeColor = isCC ? 'text-rose-400 border-rose-800 bg-rose-950/60' : isNC ? 'text-fuchsia-400 border-fuchsia-800 bg-fuchsia-950/60' : 'text-amber-400 border-amber-800 bg-amber-950/60';

                return (
                  <div key={ch.id} className="p-1.5 rounded bg-black/40 border border-rose-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-semibold">{ch.name}</span>
                      <span className={`text-[8.5px] px-1 py-0.2 border rounded ${badgeColor}`}>
                        {typeBadge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Γ_i = {ch.partialWidthMeV >= 1 ? `${ch.partialWidthMeV.toFixed(1)} MeV` : `${ch.partialWidthMeV.toExponential(2)} MeV`}</span>
                      <span className="text-rose-300 font-bold">{brPct}% BR</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded h-1 overflow-hidden">
                      <div
                        className={isCC ? 'bg-rose-500 h-full' : isNC ? 'bg-fuchsia-500 h-full' : 'bg-pink-500 h-full'}
                        style={{ width: `${Math.min(100, ch.branchingRatio * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3x3 CKM Quark Mixing Matrix */}
        <div className="p-2 rounded bg-[#220614] border border-rose-900/50 space-y-1.5 font-mono text-[9.5px]">
          <div className="flex items-center justify-between font-bold text-rose-300">
            <span>CKM QUARK MIXING MATRIX |V_ij|</span>
            <span className="text-[8.5px] text-slate-400 font-normal">Quark Weak Transitions</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
            <div className="text-slate-500"></div>
            <div className="text-cyan-400 font-bold">d</div>
            <div className="text-purple-400 font-bold">s</div>
            <div className="text-rose-400 font-bold">b</div>

            <div className="text-cyan-400 font-bold text-left pl-1">u</div>
            <div className="p-1 rounded bg-rose-950/40 text-rose-200 border border-rose-900/40 font-bold">
              {CKM_MAGNITUDES[0][0].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-purple-950/40 text-purple-200 border border-purple-900/40">
              {CKM_MAGNITUDES[0][1].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
              {CKM_MAGNITUDES[0][2].toFixed(3)}
            </div>

            <div className="text-purple-400 font-bold text-left pl-1">c</div>
            <div className="p-1 rounded bg-purple-950/40 text-purple-200 border border-purple-900/40">
              {CKM_MAGNITUDES[1][0].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-rose-950/40 text-rose-200 border border-rose-900/40 font-bold">
              {CKM_MAGNITUDES[1][1].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-rose-950/30 text-rose-300 border border-rose-900/30">
              {CKM_MAGNITUDES[1][2].toFixed(3)}
            </div>

            <div className="text-rose-400 font-bold text-left pl-1">t</div>
            <div className="p-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
              {CKM_MAGNITUDES[2][0].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-rose-950/30 text-rose-300 border border-rose-900/30">
              {CKM_MAGNITUDES[2][1].toFixed(3)}
            </div>
            <div className="p-1 rounded bg-rose-950/40 text-rose-200 border border-rose-900/40 font-bold">
              {CKM_MAGNITUDES[2][2].toFixed(3)}
            </div>
          </div>
        </div>

        {/* PMNS Neutrino Mixing & MSW Matter Resonance Gauges */}
        <div className="p-2 rounded bg-[#200518] border border-fuchsia-900/50 space-y-1.5 font-mono text-[9.5px]">
          <div className="flex items-center justify-between font-bold text-fuchsia-300">
            <span>PMNS FLAVOR SUPERPOSITION & MSW EFFECT</span>
            <span className="text-[8.5px] text-slate-400 font-normal">3-Flavor Quantum State</span>
          </div>

          {activeNuState ? (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>Baseline: <strong>{activeNuState.baselineKm.toFixed(1)} km</strong></span>
                <span>Dominant: <strong className="text-fuchsia-300">{activeNuState.dominantFlavor.replace('_', ' ')}</strong></span>
              </div>

              {/* 3 Continuous Flavor Probabilities */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-cyan-400 w-16">P(ν_e): {(activeNuState.flavorProbabilities[0] * 100).toFixed(1)}%</span>
                  <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                    <div className="bg-cyan-400 h-full" style={{ width: `${Math.min(100, activeNuState.flavorProbabilities[0] * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-purple-400 w-16">P(ν_μ): {(activeNuState.flavorProbabilities[1] * 100).toFixed(1)}%</span>
                  <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                    <div className="bg-purple-400 h-full" style={{ width: `${Math.min(100, activeNuState.flavorProbabilities[1] * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-amber-400 w-16">P(ν_τ): {(activeNuState.flavorProbabilities[2] * 100).toFixed(1)}%</span>
                  <div className="flex-1 bg-slate-900 rounded h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: `${Math.min(100, activeNuState.flavorProbabilities[2] * 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* MSW Resonance Alert Banner */}
              {activeNuState.inMatterResonance && (
                <div className="p-1 rounded bg-fuchsia-950/80 border border-fuchsia-500/80 text-[8.5px] text-fuchsia-200 flex items-center justify-between animate-pulse">
                  <span>🌌 MSW RESONANCE ACTIVE (V_CC ≈ cos 2θ_12)</span>
                  <span className="font-bold">sin²2θ_m → 1.0</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[9px] text-slate-500 italic py-1">
              Select or spawn a neutrino (ν_e, ν_μ, ν_τ) to inspect real-time quantum oscillations
            </div>
          )}

          {/* MSW Matter Density Slider */}
          <div className="pt-1.5 border-t border-fuchsia-950 space-y-1">
            <div className="flex justify-between text-slate-400 text-[9px]">
              <span>MSW Electron Matter Density (N_e)</span>
              <span className="text-fuchsia-300 font-bold">{settings.matterElectronDensity.toFixed(2)} u</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.5"
              step="0.05"
              value={settings.matterElectronDensity}
              onChange={e => onSetting('matterElectronDensity', Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-fuchsia-400"
            />
            <div className="flex justify-between text-[8px] text-slate-500">
              <span>Vacuum (N_e = 0)</span>
              <span className="text-fuchsia-400/90 font-bold">Solar Resonance (~0.54)</span>
              <span>Dense Core (2.5)</span>
            </div>
          </div>
        </div>

        {/* Interactive Electroweak Triggers */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => engine.triggerChargedCurrentBetaDecay()}
            className="border border-rose-700/70 rounded px-2 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚡ CC Beta Decay (W⁻)
          </button>
          <button
            onClick={() => engine.triggerNeutralCurrentNeutrinoScatter()}
            className="border border-fuchsia-700/70 rounded px-2 py-1.5 bg-fuchsia-950/50 hover:bg-fuchsia-900/70 text-fuchsia-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚛ NC Scatter (νe⁻ via Z⁰)
          </button>
          <button
            onClick={() => engine.collideNeutrinoAntineutrino()}
            className="border border-purple-700/70 rounded px-2 py-1.5 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 text-[10px] text-left transition-colors font-mono"
          >
            💥 νν̄ Collider (Z*→ff̄)
          </button>
          <button
            onClick={() => engine.fireGlashowResonance()}
            className="border border-rose-800/70 rounded px-2 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] text-left transition-colors font-mono"
          >
            🌟 Glashow Resonance (W⁻)
          </button>
          <button
            onClick={() => engine.fireSolarMSWNeutrinoBeam()}
            className="col-span-2 border border-cyan-700/70 rounded px-2 py-1.5 bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-200 text-[10px] text-center transition-colors font-mono"
          >
            🌌 Fire Solar MSW Neutrino Beam (ν_e → ν_μ/ν_τ in Matter Gradient)
          </button>
        </div>

        {/* Electroweak Toggles */}
        <div className="space-y-1.5 pt-1 text-[10.5px]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.chargedCurrentEnabled}
              onChange={e => onSetting('chargedCurrentEnabled', e.target.checked)}
              className="rounded border-slate-700 text-rose-500"
            />
            <span>Charged-Current Transitions (W± Mediated & CKM Mixing)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.neutralCurrentEnabled}
              onChange={e => onSetting('neutralCurrentEnabled', e.target.checked)}
              className="rounded border-slate-700 text-fuchsia-500"
            />
            <span>Neutral-Current Scattering (Z⁰ Mediated & g_V/g_A)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.neutrinoAntineutrinoEnabled}
              onChange={e => onSetting('neutrinoAntineutrinoEnabled', e.target.checked)}
              className="rounded border-slate-700 text-purple-500"
            />
            <span>Neutrino-Antineutrino Annihilation (νν̄ → Z* → ff̄)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.pmnsMixingEnabled}
              onChange={e => onSetting('pmnsMixingEnabled', e.target.checked)}
              className="rounded border-slate-700 text-cyan-500"
            />
            <span>PMNS 3-Flavor Neutrino Flavor Mixing & Propagation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.mswMatterOscillationsEnabled}
              onChange={e => onSetting('mswMatterOscillationsEnabled', e.target.checked)}
              className="rounded border-slate-700 text-purple-500"
            />
            <span>Matter-Induced Oscillations (MSW Resonance Effect)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.showWeakVirtualBosons}
              onChange={e => onSetting('showWeakVirtualBosons', e.target.checked)}
              className="rounded border-slate-700 text-rose-500"
            />
            <span>Virtual W± and Z⁰ Boson Propagator Overlays</span>
          </label>
        </div>

        {/* Electroweak Real-time Counters */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10px]">
          <div className="p-1.5 rounded bg-rose-950/50 border border-rose-900/40">
            <span className="text-rose-400/80 block text-[8.5px]">CC (W±) EVENTS</span>
            <span className="text-rose-200 font-bold">{s.chargedCurrentEvents || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-fuchsia-950/50 border border-fuchsia-900/40">
            <span className="text-fuchsia-400/80 block text-[8.5px]">NC (Z⁰) EVENTS</span>
            <span className="text-fuchsia-200 font-bold">{s.neutralCurrentEvents || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-purple-950/50 border border-purple-900/40">
            <span className="text-purple-400/80 block text-[8.5px]">CKM TRANSITIONS</span>
            <span className="text-purple-200 font-bold">{s.ckmTransitions || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-rose-950/50 border border-rose-900/40">
            <span className="text-rose-400/80 block text-[8.5px]">ν SCATTERINGS</span>
            <span className="text-cyan-200 font-bold">{s.neutrinoScatters || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-fuchsia-950/50 border border-fuchsia-900/40">
            <span className="text-fuchsia-400/80 block text-[8.5px]">νν̄ ANNIHILATIONS</span>
            <span className="text-yellow-200 font-bold">{s.neutrinoAnnihilations || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-purple-950/50 border border-purple-900/40">
            <span className="text-purple-400/80 block text-[8.5px]">MSW RESONANCES</span>
            <span className="text-fuchsia-300 font-bold">{s.mswResonances || 0}</span>
          </div>
        </div>
      </details>

      {/* 5. Relativistic 2+1 Kinematics & WKB Tunneling */}
      <details
        className="border border-purple-800/80 rounded-lg p-2.5 bg-[#140b20] space-y-2"
      >
        <summary className="font-bold text-purple-300 cursor-pointer text-xs flex items-center justify-between">
          <span>Relativity & Barrier Tunneling</span>
          <span className="text-[10px] font-mono text-purple-400/80 font-normal">WKB Penetration</span>
        </summary>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => engine.fireProbe()}
            className="border border-purple-700/60 rounded px-2 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-[10px] text-left transition-colors font-mono"
          >
            ⚡ Fire Electron Probe
          </button>
          <button
            onClick={() => engine.addBarrier()}
            className="border border-purple-700/60 rounded px-2 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-[10px] text-left transition-colors font-mono"
          >
            🧱 Add Potential Barrier
          </button>
        </div>

        <div className="space-y-1.5 pt-1 text-[10.5px]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100">
            <input
              type="checkbox"
              checked={settings.tunnelingEnabled}
              onChange={e => onSetting('tunnelingEnabled', e.target.checked)}
              className="rounded border-slate-700 text-purple-500"
            />
            <span>WKB Quantum Tunneling Transmission</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
          <div className="p-1.5 rounded bg-purple-950/50 border border-purple-900/40">
            <span className="text-purple-400/80 block text-[9px]">TUNNEL EVENTS</span>
            <span className="text-purple-200 font-bold">{s.tunnels || 0}</span>
          </div>
          <div className="p-1.5 rounded bg-purple-950/50 border border-purple-900/40">
            <span className="text-purple-400/80 block text-[9px]">REFLECTIONS</span>
            <span className="text-slate-300 font-bold">{s.reflections || 0}</span>
          </div>
        </div>
      </details>
    </div>
  );
};
