/**
 * Standard Model Particle Life — Quantum Relativity Simulation
 * Featuring all 6 Quarks (3 Colors & 3 Anticolors), 6 Leptons,
 * all 8 SU(3) Gluon Octet States, W+ and W- separately, Photon, Z0, Higgs,
 * with explicit conserved quantum numbers and relativistic kinematics.
 * (Gravity is NOT part of the Standard Model; Graviton is excluded).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExactPhysicsEngine } from './physics/ExactPhysicsEngine';
import {
  STANDARD_MODEL_PARTICLES,
  SU3_GLUON_OCTET,
  PRIMARY_COLORS,
  COLOR_CHARGE_STYLES
} from './physics/catalog';
import { PRESETS } from './physics/presets';
import { ParticleInstance, ParticleKind, ParticleColor, EngineSettings } from './types/physics';
import { Icons } from './components/Icons';
import { QuantumPanel } from './components/QuantumPanel';

export default function App() {
  const engineRef = useRef<ExactPhysicsEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ExactPhysicsEngine(1200, 800);
  }
  const engine = engineRef.current;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [activePresetId, setActivePresetId] = useState('standard_particle_life');
  const [selectedParticle, setSelectedParticle] = useState<ParticleInstance | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Resizable Panels
  const [leftWidth, setLeftWidth] = useState(330);
  const [rightWidth, setRightWidth] = useState(330);
  const [bottomHeight, setBottomHeight] = useState(290);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);

  // Active Brush
  const [activeBrush, setActiveBrush] = useState<{
    kind: ParticleKind;
    isAntiparticle: boolean;
    // Canonical RGB basis color only. Antiparticle identity is independent;
    // the physical antitriplet charge is derived at particle creation.
    color: ParticleColor;
    spin: number;
    gluonIndex?: number;
  }>({
    kind: 'up',
    isAntiparticle: false,
    color: 'red',
    spin: 0.5,
    gluonIndex: 1
  });

  // Force Settings
  const [forceSettings, setForceSettings] = useState<EngineSettings>(engine.settings);
  const updateForceSetting = useCallback(
    (key: keyof EngineSettings, value: any) => {
      (engine.settings as any)[key] = value;
      setForceSettings({ ...engine.settings });
    },
    [engine]
  );

  // Visual Overlays
  const [visualSettings, setVisualSettings] = useState({
    showColorFluxTubes: false,
    showRadiationTrails: false,
    showMacroparticleHulls: false,
    showSpinVectors: false,
    showVelocityVectors: false,
    showLabels: false,
    showGlow: false,
    showFieldGrid: false,
    showMagneticHeatmap: false,
    showElectricVectors: false,
    showPoyntingVectors: false,
    showPhotonPolarization: false,
    showVirtualPhotons: false,
    showSteinerFluxTubes: false,
    showSU3Superpositions: false,
    showHiggsCondensate: false,
    showGaugeHiggsLattice: false
  });

  // Telemetry Stats
  const [stats, setStats] = useState({
    fps: 60,
    particleCount: 0,
    macroCount: 0,
    radiation: engine.getRadiationSnapshot()
  });
  const [particleCounts, setParticleCounts] = useState<Record<string, number>>({});

  // Canvas sizing: keep simulation coordinates in CSS pixels while using a
  // capped device-pixel ratio for crisp rendering without unbounded GPU memory.
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const rect = parent.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (Math.abs(engine.width - width) > 0.5 || Math.abs(engine.height - height) > 0.5) {
      engine.setDimensions(width, height);
    }
  }, [engine]);

  useEffect(() => {
    handleResize();
    const parent = canvasRef.current?.parentElement;
    let observer: ResizeObserver | null = null;
    if (parent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(parent);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Load Preset
  const loadPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      const preset = PRESETS.find(p => p.id === presetId);
      if (!preset) return;
      engine.clearAll();
      setSelectedParticle(null);

      const merged = { ...engine.settings, ...preset.forceSettings };
      engine.settings = merged;
      setForceSettings({ ...merged });

      const cx = engine.width / 2;
      const cy = engine.height / 2;
      if (preset.setup) {
        preset.setup(engine);
        setForceSettings({ ...engine.settings });
      }

      for (const group of preset.initialParticles) {
        const spread = Math.min(engine.width, engine.height) * (group.spread !== undefined ? group.spread : 0.35);
        for (let i = 0; i < group.count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * spread;
          const launchAngle = Math.random() * Math.PI * 2;
          const hasLaunchSpeed = group.speed !== undefined;
          engine.addParticle({
            kind: group.kind,
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: hasLaunchSpeed ? Math.cos(launchAngle) * group.speed! : (Math.random() - 0.5) * 2.2,
            vy: hasLaunchSpeed ? Math.sin(launchAngle) * group.speed! : (Math.random() - 0.5) * 2.2,
            isAntiparticle: group.isAntiparticle,
            color: group.color,
            pinned: group.pinned
          });
        }
      }
    },
    [engine]
  );

  useEffect(() => {
    loadPreset('standard_particle_life');
    setIsPaused(true);
  }, [loadPreset]);

  // Spawner for pre-assembled composite macroparticles
  const spawnComposite = (type: 'proton' | 'neutron' | 'pion' | 'hydrogen') => {
    const cx = engine.width / 2 + (Math.random() - 0.5) * 120;
    const cy = engine.height / 2 + (Math.random() - 0.5) * 120;
    if (type === 'proton') {
      // Use the engine's nucleon constructor so its uud constituents are
      // registered as one confined color-singlet hadron.
      engine.spawnNucleon('proton', cx, cy);
    } else if (type === 'neutron') {
      engine.spawnNucleon('neutron', cx, cy);
    } else if (type === 'pion') {
      engine.addParticle({ kind: 'up', x: cx - 6, y: cy, color: 'red' });
      engine.addParticle({ kind: 'down', x: cx + 6, y: cy, isAntiparticle: true, color: 'anti_red' });
      engine.logEvent('macroparticle_formed', cx, cy, '✨ Spawned Pion Meson π⁺ (u + d̄, Red + Anti-Red singlet)!', '#c084fc');
    } else if (type === 'hydrogen') {
      engine.spawnNucleon('proton', cx, cy);
      engine.addParticle({ kind: 'electron', x: cx + 28, y: cy, vx: 0, vy: 3.2 });
      engine.logEvent('macroparticle_formed', cx, cy, '✨ Spawned Hydrogen Atom (¹H = Proton + Orbiting Electron)!', '#34d399');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(p => !p);
      } else if (e.key === 'r' || e.key === 'R') {
        loadPreset(activePresetId);
      } else if (e.key === 'c' || e.key === 'C') {
        engine.clearAll();
        setSelectedParticle(null);
      } else if (e.key === 'h' || e.key === 'H') {
        setIsHelpOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, activePresetId, loadPreset]);

  // Main Render Loop
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsCheck = performance.now();
    let lastRenderTime = 0;
    let physicsAccumulator = 0;

    const renderLoop = (time: number) => {
      const dt = Math.min(2.0, Math.max(0, (time - lastTime) / 16.666));
      lastTime = time;
      frameCount++;

      if (time - lastFpsCheck >= 500) {
        const radiation = engine.getRadiationSnapshot();
        setStats({
          fps: Math.round((frameCount * 1000) / (time - lastFpsCheck)),
          particleCount: engine.particles.length,
          macroCount: engine.macroparticles.length,
          radiation
        });
        if (selectedParticle && !engine.particles.some(p => p.id === selectedParticle.id)) {
          setSelectedParticle(null);
        }
        const counts: Record<string, number> = {};
        for (const p of engine.particles) {
          counts[p.kind] = (counts[p.kind] || 0) + 1;
        }
        setParticleCounts(counts);
        frameCount = 0;
        lastFpsCheck = time;
      }

      // Do not spend CPU evolving the field while the browser tab is hidden.
      // The capped dt prevents a large integration jump when it becomes visible.
      if (!isPaused && !document.hidden) {
        // Fixed 60 Hz physics clock: on 120/144 Hz displays this avoids
        // doing extra solver work for sub-frame updates; on 30 Hz displays
        // it performs two deterministic steps. Each engine step retains its
        // internal four-way integration substepping.
        physicsAccumulator += dt;
        let physicsSteps = 0;
        while (physicsAccumulator >= 1 && physicsSteps < 2) {
          engine.update(1.0);
          physicsAccumulator -= 1;
          physicsSteps++;
        }
      } else {
        physicsAccumulator = 0;
      }

      // Keep physics updates at the browser cadence, but cap expensive canvas
      // painting to 60 Hz on high-refresh displays.
      if (time - lastRenderTime >= 1000 / 60) {
        lastRenderTime = time;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = engine.width;
          const h = engine.height;

          // Space Black Canvas Background
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, w, h);

          // 0. Higgs Field Vacuum Condensate & Fluctuations <Phi>
          if (visualSettings.showHiggsCondensate && engine.settings.higgsFieldEnabled && engine.higgs) {
            engine.higgs.renderHiggsFieldCondensate(ctx, w, h, dt);
          }

          // 0b. New strictly planar SU(3)×SU(2)×U(1)_Y gauge-lattice overlay.
          if (visualSettings.showGaugeHiggsLattice && engine.planarGaugeQFT && engine.settings.spatialDimensions === 2) {
            engine.planarGaugeQFT.render(ctx);
          }

          // 1. Time-Dependent Maxwell Magnetic Field (Bz) Heatmap
          if (visualSettings.showMagneticHeatmap && engine.emField) {
            engine.emField.renderMagneticHeatmap(ctx);
          }

          // 2. Electric Field Vectors (Ex, Ey)
          if (visualSettings.showElectricVectors && engine.emField) {
            engine.emField.renderElectricVectors(ctx);
          }

          // 3. Poynting Vector Radiation Flux (S = E x B)
          if (visualSettings.showPoyntingVectors && engine.emField) {
            engine.emField.renderPoyntingVectors(ctx);
          }

          // Field Grid
          if (visualSettings.showFieldGrid) {
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = 0; x < w; x += 48) {
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
            }
            for (let y = 0; y < h; y += 48) {
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
            }
            ctx.stroke();
          }

          // QCD Color Flux Tubes
          if (visualSettings.showColorFluxTubes && engine.settings.strongForceEnabled) {
            const particles = engine.particles;
            for (let i = 0; i < particles.length; i++) {
              const p1 = particles[i];
              if (p1.color === 'none' || p1._removed) continue;
              for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                if (p2.color === 'none' || p2._removed) continue;
                const d = engine.relativePosition(p1, p2);
                const dist = Math.hypot(d.dx, d.dy);

                if (dist < 80 && dist > 4 && engine.isConfiningQuarkPair(p1, p2)) {
                  const s1 = COLOR_CHARGE_STYLES[p1.color] || COLOR_CHARGE_STYLES.none;
                  const s2 = COLOR_CHARGE_STYLES[p2.color] || COLOR_CHARGE_STYLES.none;
                  const grad = ctx.createLinearGradient(p1.x, p1.y, p1.x + d.dx, p1.y + d.dy);
                  grad.addColorStop(0, s1.fill);
                  grad.addColorStop(1, s2.fill);
                  ctx.strokeStyle = grad;
                  ctx.lineWidth = Math.max(1, (1 - dist / 80) * 3.5);
                  ctx.globalAlpha = 0.65 * (1 - dist / 80);
                  ctx.beginPath();
                  ctx.moveTo(p1.x, p1.y);
                  ctx.lineTo(p1.x + d.dx, p1.y + d.dy);
                  ctx.stroke();
                  ctx.globalAlpha = 1.0;
                }
              }
            }
          }

          // Steiner Minimal Tree Fermat Y-Junction Flux Tubes (3-Quark Baryons)
          if (visualSettings.showSteinerFluxTubes && engine.settings.strongForceEnabled) {
            for (const macro of engine.macroparticles) {
              if ((macro.type === 'proton' || macro.type === 'neutron') && macro.steinerJunction) {
                const j = macro.steinerJunction;
                const constituents = macro.constituentIds
                  .map(id => engine.particles.find(p => p.id === id))
                  .filter(Boolean) as ParticleInstance[];

                if (constituents.length === 3) {
                  ctx.save();
                  // Central Fermat-Torricelli junction point glow
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                  ctx.shadowColor = '#38bdf8';
                  ctx.shadowBlur = 10;
                  ctx.beginPath();
                  ctx.arc(j.x, j.y, 3, 0, Math.PI * 2);
                  ctx.fill();

                  // 3 Y-junction flux tube arms meeting at 120 degrees
                  for (const c of constituents) {
                    const style = COLOR_CHARGE_STYLES[c.color] || COLOR_CHARGE_STYLES.none;
                    const grad = ctx.createLinearGradient(c.x, c.y, j.x, j.y);
                    grad.addColorStop(0, style.fill);
                    grad.addColorStop(0.8, 'rgba(255,255,255,0.7)');
                    grad.addColorStop(1, '#ffffff');

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y);
                    ctx.lineTo(j.x, j.y);
                    ctx.stroke();
                  }
                  ctx.restore();
                }
              }
            }
          }

          // Radiation Trails
          if (visualSettings.showRadiationTrails) {
            for (const p of engine.particles) {
              if (!p.isRadiation || p._removed) continue;
              const speed = Math.hypot(p.vx, p.vy) || 1;
              const ux = p.vx / speed;
              const uy = p.vy / speed;
              const tailLength = Math.min(46, 15 + p.energy * 20);
              const isGluon = p.kind === 'gluon';
              const headColor = isGluon ? '#fb923c' : '#fde68a';
              const tailX = p.x - ux * tailLength;
              const tailY = p.y - uy * tailLength;
              const gradient = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
              gradient.addColorStop(0, 'rgba(0,0,0,0)');
              gradient.addColorStop(1, headColor);

              ctx.save();
              ctx.strokeStyle = gradient;
              ctx.lineWidth = Math.min(3, 1.2 + p.energy * 0.7);
              ctx.lineCap = 'round';
              ctx.beginPath();
              const cycles = isGluon ? 5 : 3;
              for (let i = 0; i <= 32; i++) {
                const t = i / 32;
                const along = -tailLength * (1 - t);
                const wave = Math.sin(t * Math.PI * 2 * cycles) * (isGluon ? 3.6 : 2.2) * (0.35 + 0.65 * t);
                const x = p.x + ux * along - uy * wave;
                const y = p.y + uy * along + ux * wave;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
              ctx.restore();
            }
          }

          engine.renderWavepackets(ctx);
          engine.renderQuantumOverlay(ctx);

          // Macroparticle Color-Neutral Hulls
          if (visualSettings.showMacroparticleHulls) {
            for (const macro of engine.macroparticles) {
              const isProton = macro.type === 'proton';
              const isNeutron = macro.type === 'neutron';
              ctx.fillStyle = isProton
                ? 'rgba(56, 189, 248, 0.12)'
                : isNeutron
                ? 'rgba(148, 163, 184, 0.12)'
                : 'rgba(167, 139, 250, 0.12)';
              ctx.strokeStyle = isProton ? '#38bdf8' : isNeutron ? '#94a3b8' : '#a78bfa';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.arc(macro.centerX, macro.centerY, macro.radius + 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Render Particle Bodies
          for (const p of engine.particles) {
            if (p._removed) continue;
            const cfg = STANDARD_MODEL_PARTICLES[p.kind];
            ctx.save();

            // Radiation Head
            if (p.isRadiation) {
              const isGluon = p.kind === 'gluon';
              const headRadius = Math.min(5, 2.4 + p.energy * 1.2);

              if (visualSettings.showGlow) {
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, headRadius * 3.5);
                glow.addColorStop(0, isGluon ? 'rgba(251,146,60,0.65)' : 'rgba(253,230,138,0.7)');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, headRadius * 3.5, 0, Math.PI * 2);
                ctx.fill();
              }

              if (selectedParticle && selectedParticle.id === p.id) {
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, headRadius + 4, 0, Math.PI * 2);
                ctx.stroke();
              }

              ctx.fillStyle = isGluon ? '#fb923c' : '#fef08a';
              ctx.beginPath();
              ctx.arc(p.x, p.y, headRadius, 0, Math.PI * 2);
              ctx.fill();

              // QED Photon Polarization & Helicity Indicator
              if (!isGluon && p.polarization && visualSettings.showPhotonPolarization) {
                const pol = p.polarization;
                const isRHC = pol.helicity > 0;
                // Transverse electric polarization vector line
                ctx.strokeStyle = isRHC ? 'rgba(56, 189, 248, 0.85)' : 'rgba(244, 63, 94, 0.85)';
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(p.x - pol.ex * 8, p.y - pol.ey * 8);
                ctx.lineTo(p.x + pol.ex * 8, p.y + pol.ey * 8);
                ctx.stroke();

                // Helicity circular indicator ring
                ctx.strokeStyle = isRHC ? 'rgba(56, 189, 248, 0.65)' : 'rgba(244, 63, 94, 0.65)';
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.arc(p.x, p.y, headRadius + 3.5, 0, Math.PI * 1.5, !isRHC);
                ctx.stroke();

                // Small helicity text label
                ctx.fillStyle = isRHC ? '#38bdf8' : '#fb7185';
                ctx.font = '7.5px monospace';
                ctx.fillText(isRHC ? 'λ=+1' : 'λ=−1', p.x + 5, p.y - 5);
              }

              ctx.restore();
              continue;
            }

            // Recoil Flash Ring
            if (p.radiationFlash > 0) {
              ctx.save();
              ctx.globalAlpha = p.radiationFlash * 0.7;
              ctx.strokeStyle = p.lastRadiationKind === 'gluon' ? '#fb923c' : '#fde68a';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius + 4 + (1 - p.radiationFlash) * 12, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // Glow Halo
            if (visualSettings.showGlow) {
              const g = ctx.createRadialGradient(p.x, p.y, p.radius * 0.4, p.x, p.y, p.radius * 2.8);
              g.addColorStop(0, cfg.glowColor);
              g.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
              ctx.fill();
            }

            // SU(3) Continuous Quantum Color Superposition Halo
            if (visualSettings.showSU3Superpositions && p.family === 'quark' && p.quantumColor) {
              const amp = p.quantumColor.amplitudes;
              const probR = Math.min(1, Math.max(0, amp[0] ** 2 + amp[1] ** 2));
              const probG = Math.min(1, Math.max(0, amp[2] ** 2 + amp[3] ** 2));
              const probB = Math.min(1, Math.max(0, amp[4] ** 2 + amp[5] ** 2));
              const rCol = Math.round(probR * 255);
              const gCol = Math.round(probG * 255);
              const bCol = Math.round(probB * 255);

              ctx.save();
              const su3Halo = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, p.radius + 6.5);
              su3Halo.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, 0.55)`);
              su3Halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = su3Halo;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius + 6.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            // Neutrino 3-Flavor PMNS Quantum Superposition Aura & MSW Resonance
            if (p.kind.includes('neutrino') && p.neutrinoState) {
              const [pe, pmu, ptau] = p.neutrinoState.flavorProbabilities;
              const rCol = Math.round(34 * pe + 167 * pmu + 251 * ptau);
              const gCol = Math.round(211 * pe + 139 * pmu + 191 * ptau);
              const bCol = Math.round(238 * pe + 250 * pmu + 36 * ptau);

              ctx.save();
              const nuHalo = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, p.radius + (p.neutrinoState.inMatterResonance ? 9 : 5));
              nuHalo.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${p.neutrinoState.inMatterResonance ? 0.8 : 0.45})`);
              nuHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = nuHalo;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius + (p.neutrinoState.inMatterResonance ? 9 : 5), 0, Math.PI * 2);
              ctx.fill();

              // MSW resonance pulse ring
              if (p.neutrinoState.inMatterResonance) {
                ctx.strokeStyle = '#d946ef';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius + 7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }
              ctx.restore();
            }

            // Selected Halo
            if (selectedParticle && selectedParticle.id === p.id) {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Particle Main Body
            ctx.fillStyle = cfg.baseColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Color Charge Outer Ring (3 Colors & 3 Anticolors for Quarks / Gluons)
            if (cfg.hasColor) {
              if (p.kind === 'gluon') {
                if (p.gluonColor) {
                  ctx.lineWidth = 2.5;
                  ctx.strokeStyle = (COLOR_CHARGE_STYLES[p.gluonColor.color] || COLOR_CHARGE_STYLES.none).fill;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.radius + 1.2, -Math.PI / 2, Math.PI / 2);
                  ctx.stroke();
                  ctx.strokeStyle = (COLOR_CHARGE_STYLES[`anti_${p.gluonColor.antiColor}`] || COLOR_CHARGE_STYLES.none).fill;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.radius + 1.2, Math.PI / 2, (3 * Math.PI) / 2);
                  ctx.stroke();
                } else if (p.diagonalGluon) {
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.radius + 1.2, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
              } else if (p.color !== 'none') {
                const style = COLOR_CHARGE_STYLES[p.color] || COLOR_CHARGE_STYLES.none;
                ctx.strokeStyle = style.border;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius + 1.2, 0, Math.PI * 2);
                ctx.stroke();
              }
            }

            // Spin Vector Dot
            if (visualSettings.showSpinVectors && cfg.isFermion) {
              const sx = p.x + Math.cos(p.spinAngle) * (p.radius + 4);
              const sy = p.y + Math.sin(p.spinAngle) * (p.radius + 4);
              ctx.fillStyle = p.spinZ > 0 ? '#38bdf8' : '#f43f5e';
              ctx.beginPath();
              ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }

            // Velocity Vector Arrow
            if (visualSettings.showVelocityVectors) {
              ctx.strokeStyle = 'rgba(255,255,255,0.4)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + p.vx * 6, p.y + p.vy * 6);
              ctx.stroke();
            }

            // Text Label
            if (visualSettings.showLabels) {
              ctx.font = '9px monospace';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText(p.symbol, p.x, p.y - p.radius - 4);
            }

            ctx.restore();
          }
        }
      }
      }

      frameId = requestAnimationFrame(renderLoop);
    };

    frameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frameId);
  }, [engine, isPaused, visualSettings, selectedParticle]);

  // Explicit SU(3) basis selector. The chosen color/anticolor basis is
  // preserved independently when the matter/antimatter toggle changes.
  // For physical SM states, quarks occupy 3 and antiquarks 3-bar; the UI
  // exposes both bases explicitly so the user can inspect either sector.
  const physicalBrushColor = (kind: ParticleKind, _isAnti: boolean, basis: ParticleColor): ParticleColor => {
    if (!STANDARD_MODEL_PARTICLES[kind]?.hasColor || kind === 'gluon') return 'none';
    return (basis || 'red') as ParticleColor;
  };

  // Canvas Mouse Click / Spawn Handler
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = engine.pickRenderedParticle(x, y);
    if (clicked) {
      setSelectedParticle(clicked);
    } else {
      setSelectedParticle(null);
      const spawnColor = physicalBrushColor(activeBrush.kind, activeBrush.isAntiparticle, activeBrush.color);

      engine.addParticle({
        kind: activeBrush.kind,
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        isAntiparticle: activeBrush.isAntiparticle,
        color: spawnColor,
        spin: activeBrush.spin,
        gluonIndex: activeBrush.gluonIndex
      });
    }
  };

  const forceBreakdown = selectedParticle ? engine.getForceBreakdown(selectedParticle.id) : null;
  const parentMacro = selectedParticle
    ? engine.macroparticles.find(m => m.constituentIds.includes(selectedParticle.id))
    : null;

  // Particle Categorization for Standard Model Table
  const quarksGen1 = ['up', 'down'] as ParticleKind[];
  const quarksGen2 = ['charm', 'strange'] as ParticleKind[];
  const quarksGen3 = ['top', 'bottom'] as ParticleKind[];
  const leptonsGen1 = ['electron_neutrino', 'electron'] as ParticleKind[];
  const leptonsGen2 = ['muon_neutrino', 'muon'] as ParticleKind[];
  const leptonsGen3 = ['tau_neutrino', 'tau'] as ParticleKind[];
  const electroweakBosons = ['photon', 'z_boson', 'w_plus', 'w_minus'] as ParticleKind[];
  const scalarBosons = ['higgs'] as ParticleKind[];

  const renderTableCard = (kind: ParticleKind) => {
    const cfg = STANDARD_MODEL_PARTICLES[kind];
    const isSel = activeBrush.kind === kind;
    const count = particleCounts[kind] || 0;
    let massText = '0';
    if (cfg.massMeV > 0) {
      if (cfg.massMeV < 0.001) massText = '< 0.1 eV';
      else if (cfg.massMeV < 1000) massText = `${cfg.massMeV.toFixed(1)} MeV`;
      else massText = `${(cfg.massMeV / 1000).toFixed(1)} GeV`;
    }

    return (
      <div
        key={kind}
        onClick={() => {
          setActiveBrush(prev => ({
            ...prev,
            kind,
            isAntiparticle: STANDARD_MODEL_PARTICLES[kind]?.isFermion ? prev.isAntiparticle : false
          }));
        }}
        className={`group relative p-1.5 rounded-lg border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
          isSel
            ? 'border-sky-400 bg-sky-950/40 shadow-lg shadow-sky-500/20 ring-1 ring-sky-400'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
          <span className="truncate">{massText}</span>
          <div className="flex items-center gap-1 font-bold">
            <span className={cfg.charge > 0 ? 'text-sky-400' : cfg.charge < 0 ? 'text-rose-400' : 'text-slate-400'}>
              {cfg.charge > 0 ? (cfg.charge === 2 / 3 ? '+⅔' : `+${cfg.charge}`) : cfg.charge < 0 ? (cfg.charge === -1 / 3 ? '-⅓' : `${cfg.charge}`) : '0'}
            </span>
            <span className="text-amber-400/80">{cfg.spin === 0.5 ? '½' : cfg.spin}</span>
          </div>
        </div>

        <div className="my-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cfg.baseColor }} />
            <span className="font-mono font-bold text-sm text-slate-100 group-hover:text-sky-300">{cfg.symbol}</span>
          </div>
          {count > 0 && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
              {count}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-slate-800/60">
          <span className="text-[10px] font-medium text-slate-300 truncate">{cfg.name}</span>
          <button
            title={`Spawn ${cfg.name}`}
            onClick={e => {
              e.stopPropagation();
              const cx = engine.width / 2 + (Math.random() - 0.5) * 80;
              const cy = engine.height / 2 + (Math.random() - 0.5) * 80;
              engine.addParticle({
                kind,
                x: cx,
                y: cy,
                isAntiparticle: !!STANDARD_MODEL_PARTICLES[kind]?.isFermion && activeBrush.isAntiparticle,
                color: physicalBrushColor(kind, !!STANDARD_MODEL_PARTICLES[kind]?.isFermion && activeBrush.isAntiparticle, activeBrush.color)
              });
            }}
            className="p-0.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
          >
            <Icons.Plus />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 text-slate-200 z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950">
            <Icons.Atom />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2">
              Standard Model Particle Life
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                SU(3)×SU(2)×U(1)
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Strict 2+1D Dirac Clifford Algebra · Wilson Lattice Regulator · Parity Anomaly &amp; Chern–Simons Audit · Fermionic Modes
            </p>
          </div>
        </div>

        {/* Preset Selector & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all shadow-sm ${
              isPaused ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
            title="Spacebar to Play/Pause"
          >
            {isPaused ? <Icons.Play /> : <Icons.Pause />}
            <span className="hidden md:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={() => engine.update(1.0)}
            disabled={!isPaused}
            className={`p-1.5 rounded-md border border-slate-700 transition-colors ${
              isPaused ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-600 cursor-not-allowed'
            }`}
            title="Advance 1 Step"
          >
            <Icons.Step />
          </button>

          <button
            onClick={() => loadPreset(activePresetId)}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Reset Current Preset (R)"
          >
            <Icons.Reset />
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
            <select
              value={activePresetId}
              onChange={e => loadPreset(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {PRESETS.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-md px-2 py-1">
            <span className="text-[10px] text-sky-400 font-mono">2+1D DIRAC/KG</span>
          </div>

          {/* Quick Macro Spawners */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-md p-0.5 text-[11px] font-mono">
            <span className="px-1.5 text-slate-500 font-sans">Spawn:</span>
            <button
              onClick={() => spawnComposite('proton')}
              className="px-1.5 py-0.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800"
              title="Spawn color-neutral Proton (uud with RGB singlet)"
            >
              p⁺ (uud)
            </button>
            <button
              onClick={() => spawnComposite('neutron')}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              title="Spawn color-neutral Neutron (udd with RGB singlet)"
            >
              n⁰ (udd)
            </button>
            <button
              onClick={() => spawnComposite('pion')}
              className="px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800"
              title="Spawn Pion meson (u + d̄)"
            >
              π⁺ (u-d̄)
            </button>
            <button
              onClick={() => spawnComposite('hydrogen')}
              className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800"
              title="Spawn Hydrogen Atom (Proton + Orbiting Electron)"
            >
              ¹H Atom
            </button>
          </div>

          <button
            onClick={() => {
              const newMode = forceSettings.boundaryMode === 'torus' ? 'bounce' : 'torus';
              updateForceSetting('boundaryMode', newMode);
            }}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300"
            title="Toggle Periodic Torus vs Bounding Walls"
          >
            <span>Bound:</span>
            <span className="text-sky-400 uppercase">{forceSettings.boundaryMode}</span>
          </button>

          <button
            onClick={() => {
              engine.clearAll();
              setSelectedParticle(null);
            }}
            className="p-1.5 rounded-md hover:bg-rose-950/60 hover:border-rose-800 border border-transparent text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear All Particles (C)"
          >
            <Icons.Trash />
          </button>

          <div className="font-mono text-xs hidden sm:flex items-center gap-3 text-slate-400 pl-2 border-l border-slate-800">
            <div>
              <span className="text-slate-500">N:</span>{' '}
              <strong className="text-slate-200">{stats.particleCount}</strong>
            </div>
            <div>
              <span className="text-slate-500">Macro:</span>{' '}
              <strong className="text-sky-400">{stats.macroCount}</strong>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">{stats.fps}</span>{' '}
              <span className="text-slate-500 text-[10px]">FPS</span>
            </div>
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Physics Guide (H)"
          >
            <Icons.Help />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Telemetry HUD */}
        {leftOpen && (
          <div
            style={{ width: `${leftWidth}px` }}
            className="h-full overflow-y-auto bg-slate-900/90 border-r border-slate-800 text-slate-200 p-3.5 space-y-3.5 text-xs font-sans shrink-0 select-none"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-100">
                {selectedParticle ? 'Particle Telemetry' : 'Quantum State HUD'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                Live Field
              </span>
            </div>

            <QuantumPanel
              engine={engine}
              settings={forceSettings}
              onSetting={updateForceSetting}
              selected={selectedParticle}
              onPreset={loadPreset}
            />

            {/* Selected Particle Quantum Numbers Inspector */}
            {selectedParticle ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block"
                      style={{ backgroundColor: STANDARD_MODEL_PARTICLES[selectedParticle.kind]?.baseColor }}
                    />
                    <h3 className="font-bold text-sm text-slate-100">
                      {selectedParticle.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedParticle(null)}
                    className="text-slate-400 hover:text-slate-100 font-mono text-xs px-2 py-0.5 rounded hover:bg-slate-800"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-2xl font-bold text-sky-400">
                      {selectedParticle.symbol}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {selectedParticle.family}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {selectedParticle.generation > 0 ? `Gen ${selectedParticle.generation}` : 'Gauge / Scalar Boson'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    {STANDARD_MODEL_PARTICLES[selectedParticle.kind]?.description}
                  </p>
                </div>

                {/* Explicit Conserved Quantum Numbers */}
                <div className="p-2.5 rounded-lg border border-sky-900/40 bg-sky-950/20 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-sky-800/40 pb-1 flex justify-between">
                    <span>Conserved Quantum Numbers</span>
                    <span>Exact Audit</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">REST MASS (m₀)</span>
                      <span className="font-bold text-slate-200">
                        {selectedParticle.massMeV === 0
                          ? '0 (Massless)'
                          : selectedParticle.massMeV > 1000
                          ? `${(selectedParticle.massMeV / 1000).toFixed(2)} GeV`
                          : `${selectedParticle.massMeV.toFixed(2)} MeV`}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">ELECTRIC CHARGE (Q)</span>
                      <span className="font-bold text-slate-200">
                        {selectedParticle.charge > 0
                          ? `+${selectedParticle.charge.toFixed(2)} e`
                          : `${selectedParticle.charge.toFixed(2)} e`}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">SPIN & PROJECTION</span>
                      <span className="font-bold text-amber-400">
                        s = {selectedParticle.spin}, s_z = {selectedParticle.spinZ > 0 ? `+${selectedParticle.spinZ}` : selectedParticle.spinZ} ħ
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">COLOR REPRESENTATION</span>
                      <span className="font-bold text-orange-300 uppercase">
                        {selectedParticle.colorRepresentation}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">BARYON NUMBER (B)</span>
                      <span className="font-bold text-purple-300">
                        {selectedParticle.baryonNumber === 1 / 3
                          ? '+⅓'
                          : selectedParticle.baryonNumber === -1 / 3
                          ? '-⅓'
                          : selectedParticle.baryonNumber}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">LEPTON NUMBER (L)</span>
                      <span className="font-bold text-emerald-300">
                        {selectedParticle.leptonNumber > 0 ? `+${selectedParticle.leptonNumber}` : selectedParticle.leptonNumber}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">WEAK ISOSPIN (I₃)</span>
                      <span className="font-bold text-pink-300">
                        {selectedParticle.isospin3 > 0 ? `+${selectedParticle.isospin3}` : selectedParticle.isospin3}
                      </span>
                    </div>

                    <div className="p-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">HYPERCHARGE (Y)</span>
                      <span className="font-bold text-yellow-300">
                        {selectedParticle.hypercharge === 1 / 3
                          ? '+⅓'
                          : selectedParticle.hypercharge === -1 / 3
                          ? '-⅓'
                          : selectedParticle.hypercharge > 0
                          ? `+${selectedParticle.hypercharge}`
                          : selectedParticle.hypercharge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Particle Actions */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                  <button
                    onClick={() => {
                      selectedParticle.spinZ = -selectedParticle.spinZ;
                    }}
                    className="flex items-center justify-center gap-1.5 p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <Icons.RotateCw />
                    <span>Flip Spin Sz</span>
                  </button>
                  <button
                    onClick={() => {
                      selectedParticle.pinned = !selectedParticle.pinned;
                    }}
                    className="flex items-center justify-center gap-1.5 p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    {selectedParticle.pinned ? <Icons.Unlock /> : <Icons.Lock />}
                    <span>{selectedParticle.pinned ? 'Unpin' : 'Pin Pos'}</span>
                  </button>
                  <button
                    onClick={() => {
                      engine.removeParticle(selectedParticle.id);
                      setSelectedParticle(null);
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 transition-colors"
                  >
                    <Icons.Trash />
                    <span>Annihilate Particle</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Bound Macroparticles list */}
                <div className="p-2.5 rounded-lg border border-sky-500/20 bg-sky-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300 text-xs">Bound Macroparticles</span>
                    <span className="text-base font-bold font-mono text-sky-400">
                      {engine.macroparticles.length}
                    </span>
                  </div>
                  {engine.macroparticles.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      No bound hadrons yet. Combine 3 quarks (Red, Green, Blue) to form a Proton (uud) or Neutron (udd)!
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {engine.macroparticles.map(m => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]"
                        >
                          <span className="font-bold text-slate-200">{m.symbol} - {m.name}</span>
                          <span className="text-sky-400">Q = {m.netCharge >= 0 ? '+' : ''}{m.netCharge}e</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Log Feed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold text-xs">
                    <span>Interaction & Decay Feed</span>
                    <span className="text-[10px] text-slate-500 font-mono">Real-time</span>
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1 font-mono text-[10px]">
                    {engine.interactionEvents.length === 0 ? (
                      <div className="text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded">
                        Awaiting particle interactions, color-neutral binds, or weak decays...
                      </div>
                    ) : (
                      engine.interactionEvents.slice(0, 10).map(ev => (
                        <div
                          key={ev.id}
                          className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 text-slate-300 leading-snug"
                        >
                          <div className="text-[9px] text-slate-500 flex justify-between mb-0.5">
                            <span className="uppercase font-bold" style={{ color: ev.color }}>
                              [{ev.type.replace('_', ' ')}]
                            </span>
                            <span>{new Date(ev.timestamp).toLocaleTimeString().slice(3)}</span>
                          </div>
                          <div>{ev.description}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center Simulation Canvas & Overlay Toolbar */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Top Floating Brush Toolbar */}
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-lg p-2 shadow-xl backdrop-blur-md text-xs font-sans">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <Icons.Brush />
              <span className="text-slate-400 font-mono text-[11px]">Brush:</span>
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: STANDARD_MODEL_PARTICLES[activeBrush.kind]?.baseColor }}
                />
                <span className="text-slate-100">
                  {activeBrush.isAntiparticle
                    ? `${STANDARD_MODEL_PARTICLES[activeBrush.kind]?.symbol}̄`
                    : STANDARD_MODEL_PARTICLES[activeBrush.kind]?.symbol}
                </span>
                <span className="text-slate-400 text-[10.5px]">
                  ({activeBrush.isAntiparticle ? `Anti-${STANDARD_MODEL_PARTICLES[activeBrush.kind]?.name}` : STANDARD_MODEL_PARTICLES[activeBrush.kind]?.name})
                </span>
              </div>
            </div>

            {/* Explicit color and anticolor basis states; independent of matter/antimatter toggle. */}
            {STANDARD_MODEL_PARTICLES[activeBrush.kind]?.hasColor && activeBrush.kind !== 'gluon' && (
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                <span className="text-slate-400 text-[10px] font-mono">SU(3):</span>
                {([...PRIMARY_COLORS, ...PRIMARY_COLORS.map(c => `anti_${c}`)] as ParticleColor[]).map(c => {
                  const base = String(c).replace(/^anti_/, '');
                  const style = COLOR_CHARGE_STYLES[base];
                  const anti = String(c).startsWith('anti_');
                  const isSelected = activeBrush.color === c;
                  return (
                    <button key={c} onClick={() => setActiveBrush(prev => ({ ...prev, color: c }))}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isSelected ? 'ring-2 ring-white scale-110' : 'opacity-65 hover:opacity-100'}`}
                      style={{ backgroundColor: style.fill }} title={anti ? `Anticolor ${base}` : `Color ${base}`}>
                      <span className="text-[9px] font-bold text-slate-950 uppercase font-mono">{anti ? `${base[0].toUpperCase()}̄` : base[0].toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* SU(3) Octet Gluon Selector (All 8 Gluon States) */}
            {activeBrush.kind === 'gluon' && (
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                <span className="text-slate-400 text-[10px] font-mono">SU(3) State:</span>
                <select
                  value={activeBrush.gluonIndex || 1}
                  onChange={e => setActiveBrush(prev => ({ ...prev, gluonIndex: Number(e.target.value) }))}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-1.5 py-0.5 text-[10.5px] font-mono cursor-pointer"
                >
                  {SU3_GLUON_OCTET.map(g => (
                    <option key={g.index} value={g.index}>
                      {g.symbol}: {g.formula}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Particle/antiparticle is a fermion-state choice; self-conjugate bosons
                and the distinct W+ / W- species are selected directly. */}
            {STANDARD_MODEL_PARTICLES[activeBrush.kind]?.isFermion && <button
              onClick={() => {
                setActiveBrush(prev => ({
                  ...prev,
                  isAntiparticle: !prev.isAntiparticle
                }));
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                activeBrush.isAntiparticle
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Matter vs Antimatter"
            >
              {activeBrush.isAntiparticle ? 'Antiparticle' : 'Particle'}
            </button>}

            {/* Spin Selector for Fermions */}
            {STANDARD_MODEL_PARTICLES[activeBrush.kind]?.isFermion && (
              <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[10.5px]">
                <span className="text-slate-500">Spin:</span>
                <button
                  onClick={() => setActiveBrush(prev => ({ ...prev, spin: 0.5 }))}
                  className={`px-1 rounded ${activeBrush.spin > 0 ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  ↑ +½
                </button>
                <button
                  onClick={() => setActiveBrush(prev => ({ ...prev, spin: -0.5 }))}
                  className={`px-1 rounded ${activeBrush.spin < 0 ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  ↓ -½
                </button>
              </div>
            )}
          </div>

          {/* Toggle HUD Buttons */}
          <button
            onClick={() => setLeftOpen(o => !o)}
            className="absolute bottom-3 left-4 z-10 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800 backdrop-blur-sm"
          >
            {leftOpen ? '◀ Hide Telemetry' : '▶ Telemetry HUD'}
          </button>

          <button
            onClick={() => setRightOpen(o => !o)}
            className="absolute bottom-3 right-4 z-10 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800 backdrop-blur-sm"
          >
            {rightOpen ? 'Hide Forces ▶' : '◀ Forces Panel'}
          </button>

          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className="w-full h-full block cursor-crosshair"
          />
        </div>

        {/* Right Forces & Physics Settings Panel */}
        {rightOpen && (
          <div
            style={{ width: `${rightWidth}px` }}
            className="h-full overflow-y-auto bg-slate-900/95 border-l border-slate-800 text-slate-200 p-4 space-y-4 text-xs font-sans shrink-0 select-none"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Icons.Sliders />
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
                Force & Quantum Laws
              </h2>
            </div>

            {/* Radiation Settings */}
            <div className="p-3 rounded-lg border border-yellow-500/35 bg-gradient-to-br from-amber-950/25 to-orange-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Sparkles />
                  <span className="font-bold text-yellow-200">Energy Radiation</span>
                </div>
                <button
                  onClick={() => updateForceSetting('radiationEnabled', !forceSettings.radiationEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.radiationEnabled ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.radiationEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Accelerated charges emit bremsstrahlung photons (γ); accelerated quarks emit 8 Gell-Mann gluons (g).
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
                <button
                  onClick={() => updateForceSetting('bremsstrahlungEnabled', !forceSettings.bremsstrahlungEnabled)}
                  disabled={!forceSettings.radiationEnabled}
                  className={`px-2 py-1 rounded border transition-colors ${
                    forceSettings.bremsstrahlungEnabled
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  γ Photons {forceSettings.bremsstrahlungEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => updateForceSetting('gluonRadiationEnabled', !forceSettings.gluonRadiationEnabled)}
                  disabled={!forceSettings.radiationEnabled}
                  className={`px-2 py-1 rounded border transition-colors ${
                    forceSettings.gluonRadiationEnabled
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  g Gluons {forceSettings.gluonRadiationEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Electromagnetism */}
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Zap />
                  <span className="font-bold text-amber-300">Electromagnetism</span>
                </div>
                <button
                  onClick={() => updateForceSetting('electromagnetismEnabled', !forceSettings.electromagnetismEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.electromagnetismEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.electromagnetismEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Mediated by massless Photons (γ). Coulomb potential attracts opposite electric charges and repels like charges.
              </p>
              {forceSettings.electromagnetismEnabled && (
                <div className="space-y-1 font-mono text-[10.5px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Coupling α_EM</span>
                    <span className="text-amber-300">{forceSettings.emStrength.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={forceSettings.emStrength}
                    onChange={e => updateForceSetting('emStrength', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Strong Force & QCD Confinement */}
            <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Magnet />
                  <span className="font-bold text-orange-300">Strong Force & Color</span>
                </div>
                <button
                  onClick={() => updateForceSetting('strongForceEnabled', !forceSettings.strongForceEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.strongForceEnabled ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.strongForceEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                SU(3) Color Octet (8 Gluon States). Confines quarks into color-neutral hadrons with linear string potential U(L) = σL.
              </p>
              {forceSettings.strongForceEnabled && (
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex justify-between text-slate-400">
                    <span>String Tension (σ)</span>
                    <span className="text-orange-300">{forceSettings.confinementTension.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={forceSettings.confinementTension}
                    onChange={e => updateForceSetting('confinementTension', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-400"
                  />
                </div>
              )}
            </div>

            {/* Weak Force & Transitions */}
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Flame />
                  <span className="font-bold text-rose-300">Weak Force & Decays</span>
                </div>
                <button
                  onClick={() => updateForceSetting('weakForceEnabled', !forceSettings.weakForceEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.weakForceEnabled ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.weakForceEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Mediated by W⁺, W⁻, and Z⁰ bosons. Changes flavor via CKM quark matrix and PMNS lepton matrix.
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                <span>Particle Decays:</span>
                <button
                  onClick={() => updateForceSetting('singleParticleDecaysEnabled', !forceSettings.singleParticleDecaysEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.singleParticleDecaysEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.singleParticleDecaysEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Spin & Pauli Exclusion */}
            <div className="p-3 rounded-lg border border-violet-500/30 bg-violet-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.RotateCw />
                  <span className="font-bold text-violet-300">Spin & Pauli Exclusion</span>
                </div>
                <button
                  onClick={() => updateForceSetting('pauliExclusionEnabled', !forceSettings.pauliExclusionEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.pauliExclusionEnabled ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.pauliExclusionEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Pauli exclusion is a state-symmetry rule, not a classical repulsive force. The engine no longer adds an artificial pairwise pressure; exact final-state blocking remains a model limitation.
              </p>
            </div>

            {/* Gravitation (Explicitly Noted as Non-Standard Model) */}
            <div className="p-3 rounded-lg border border-pink-500/30 bg-pink-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Scale />
                  <span className="font-bold text-pink-300">Gravity & Spacetime</span>
                </div>
                <button
                  onClick={() => updateForceSetting('gravityEnabled', !forceSettings.gravityEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    forceSettings.gravityEnabled ? 'bg-pink-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forceSettings.gravityEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                <strong className="text-amber-300">Non-Standard Model:</strong> Classical General Relativity / Newtonian curvature background. (Gravity is not part of the Standard Model; no graviton is simulated).
              </p>
            </div>

            {/* Visual Overlays Checkboxes */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2">
                <Icons.Eye />
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Quantum Overlays
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showColorFluxTubes}
                    onChange={e => setVisualSettings(s => ({ ...s, showColorFluxTubes: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Color Tubes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showMacroparticleHulls}
                    onChange={e => setVisualSettings(s => ({ ...s, showMacroparticleHulls: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Hadron Hulls</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showSpinVectors}
                    onChange={e => setVisualSettings(s => ({ ...s, showSpinVectors: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Spin Vectors</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showRadiationTrails}
                    onChange={e => setVisualSettings(s => ({ ...s, showRadiationTrails: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Radiation Trails</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showVelocityVectors}
                    onChange={e => setVisualSettings(s => ({ ...s, showVelocityVectors: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Velocity</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={visualSettings.showLabels}
                    onChange={e => setVisualSettings(s => ({ ...s, showLabels: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Labels</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 hover:text-cyan-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showMagneticHeatmap}
                    onChange={e => setVisualSettings(s => ({ ...s, showMagneticHeatmap: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Magnetic (Bz)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sky-300 hover:text-sky-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showElectricVectors}
                    onChange={e => setVisualSettings(s => ({ ...s, showElectricVectors: e.target.checked }))}
                    className="rounded border-slate-700 text-sky-500"
                  />
                  <span>Electric (E)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showPoyntingVectors}
                    onChange={e => setVisualSettings(s => ({ ...s, showPoyntingVectors: e.target.checked }))}
                    className="rounded border-slate-700 text-amber-500"
                  />
                  <span>Poynting (S)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-yellow-300 hover:text-yellow-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showPhotonPolarization}
                    onChange={e => setVisualSettings(s => ({ ...s, showPhotonPolarization: e.target.checked }))}
                    className="rounded border-slate-700 text-yellow-500"
                  />
                  <span>Photon Helicity</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-400 hover:text-amber-300">
                  <input
                    type="checkbox"
                    checked={visualSettings.showVirtualPhotons}
                    onChange={e => setVisualSettings(s => ({ ...s, showVirtualPhotons: e.target.checked }))}
                    className="rounded border-slate-700 text-amber-500"
                  />
                  <span>Virtual Photons</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 hover:text-cyan-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showSteinerFluxTubes}
                    onChange={e => setVisualSettings(s => ({ ...s, showSteinerFluxTubes: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Steiner 120° Y-Junctions</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300 hover:text-emerald-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showSU3Superpositions}
                    onChange={e => setVisualSettings(s => ({ ...s, showSU3Superpositions: e.target.checked }))}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span>SU(3) Superpositions</span>
                </label>
                <label className="col-span-2 flex items-center gap-1.5 cursor-pointer text-cyan-300 hover:text-cyan-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showGaugeHiggsLattice}
                    onChange={e => setVisualSettings(s => ({ ...s, showGaugeHiggsLattice: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Gauge + Higgs Lattice Overlay (render only)</span>
                </label>
                <label className="col-span-2 flex items-center gap-1.5 cursor-pointer text-pink-300 hover:text-pink-200">
                  <input
                    type="checkbox"
                    checked={visualSettings.showHiggsCondensate}
                    onChange={e => setVisualSettings(s => ({ ...s, showHiggsCondensate: e.target.checked }))}
                    className="rounded border-slate-700 text-pink-500"
                  />
                  <span>Higgs Field Condensate & Vacuum Waves (&lt;Φ&gt;)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Standard Model Particle Table Menu */}
      <div
        style={{ height: isBottomCollapsed ? '42px' : `${bottomHeight}px` }}
        className="w-full bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex flex-col shrink-0 transition-[height] duration-75 relative select-none"
      >
        <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <Icons.Sparkles />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Standard Model Elementary Particles · 3 generations + force carriers
            </h3>
            <span className="text-[10px] text-amber-400 font-mono hidden md:inline">
              ★ Gravity is NOT part of the Standard Model; Graviton is excluded.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[10px] text-slate-400 font-mono hidden sm:flex items-center gap-3">
              <span>[Mass]</span>
              <span className="text-sky-400">[Charge Q]</span>
              <span className="text-amber-400">[Spin s]</span>
              <span>Click card to set brush · (+) to spawn</span>
            </div>
            <button
              onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition-colors"
            >
              {isBottomCollapsed ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
              <span>{isBottomCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          </div>
        </div>

        {!isBottomCollapsed && (
          <div className="flex-1 overflow-y-auto px-4 py-2.5">
            <div className="max-w-[1500px] min-w-[980px] mx-auto">
              <div className="grid grid-cols-[88px_repeat(3,minmax(145px,1fr))_minmax(220px,1.45fr)] gap-2 items-stretch">
                <div className="flex flex-col justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 py-2">
                  <span className="h-7" />
                  <span className="text-purple-300">Up-type</span>
                  <span className="text-purple-300">Down-type</span>
                  <span className="text-emerald-300">Charged lepton</span>
                  <span className="text-emerald-300">Neutrino</span>
                </div>
                {[0,1,2].map(generation => {
                  const quarks = [quarksGen1, quarksGen2, quarksGen3][generation];
                  const leptons = [leptonsGen1, leptonsGen2, leptonsGen3][generation];
                  const roman = ['I','II','III'][generation];
                  return (
                    <div key={generation} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 space-y-1.5">
                      <div className="h-7 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-slate-100 border-b border-slate-700">Generation {roman}</div>
                      <div className="grid grid-rows-4 gap-1.5">
                        {renderTableCard(quarks[0])}
                        {renderTableCard(quarks[1])}
                        {renderTableCard(leptons[1])}
                        {renderTableCard(leptons[0])}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-amber-500/20 bg-slate-950/40 p-2 space-y-1.5">
                  <div className="h-7 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-amber-300 border-b border-slate-700">Force carriers & Higgs</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {renderTableCard('gluon')}
                    {renderTableCard('photon')}
                    {renderTableCard('z_boson')}
                    {renderTableCard('w_plus')}
                    {renderTableCard('w_minus')}
                    {renderTableCard('higgs')}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">Gluon card opens all 8 SU(3) octet states. The Higgs is a scalar boson. Gravity is not part of the Standard Model.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help & Physics Guide Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-200 text-xs font-sans space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                  <Icons.Atom />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Standard Model Particle Physics Guide
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    6 Quark flavours, 6 lepton flavours, gluon octet, γ, W±, Z⁰, Higgs & quantum numbers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg border border-sky-500/30 bg-sky-950/20 space-y-2">
              <h3 className="font-bold text-sky-300 text-sm flex items-center gap-2">
                <Icons.CheckCircle />
                <span>Standard Model Particle Catalog · Exact Finite 2+1D Model</span>
              </h3>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                The Standard Model describes 17 fundamental particles based on the gauge group SU(3)×SU(2)×U(1):
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                <li>
                  <strong>6 Quarks:</strong> Up, Down, Charm, Strange, Top, Bottom. Quarks come in 3 color states (Red, Green, Blue) and antiquarks in 3 anticolor states (Cyan, Magenta, Yellow).
                </li>
                <li>
                  <strong>6 Leptons:</strong> Electron, Muon, Tau, and their three corresponding neutrinos (ν_e, ν_μ, ν_τ).
                </li>
                <li>
                  <strong>8 Gluon States (g₁–g₈):</strong> Form the SU(3) color octet representing all eight Gell-Mann matrices.
                </li>
                <li>
                  <strong>Electroweak Vector Bosons:</strong> Massless Photon (γ), neutral Z⁰ boson, and charged W⁺ and W⁻ bosons (represented separately).
                </li>
                <li>
                  <strong>Higgs Boson (H⁰):</strong> Scalar excitation giving mass to elementary fermions and W/Z bosons.
                </li>
                <li>
                  <strong className="text-amber-300">Gravity is NOT part of the Standard Model:</strong> The graviton is NOT counted or included as a Standard Model particle. Background spacetime curvature operates as an external classical interaction.
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-2">
              <h3 className="font-bold text-amber-300 text-sm">What the 2+1D solver actually evolves</h3>
              <p className="text-slate-300 leading-relaxed text-[11px]">Spin-½ matter packets use the declared parity-paired 2+1D Dirac Hamiltonian, and the spin-0 Higgs packet uses the declared positive-frequency Klein–Gordon Hamiltonian. Their displayed centers are moments of the evolved packet density. The finite Maxwell field is coupled locally to charged Dirac packets. Identical-particle exchange and pair correlations are handled by the exact finite exchange/Jastrow sector.</p>
              <p className="text-amber-200 leading-relaxed text-[11px]">The app evolves an exact finite 2+1D model: finite SU(3), SU(2)ₗ, and U(1)ᵧ gauge variables, finite electric fields, plaquette diagnostics, U(1) zero-mean periodic projection (non-Abelian continuum-form residual estimates are diagnostics only; no true link-covariant Gauss solver), a finite Maxwell sector, exact finite weak/QCD event kernels, and a finite Fock/packet many-body sector. It is not the continuum 3+1D Standard Model.</p>
            </div>

            <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-950/20 space-y-2">
              <h3 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                <Icons.Magnet />
                <span>Explicit Conserved Quantum Numbers</span>
              </h3>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Every particle explicitly tracks: Rest Mass (MeV/GeV), Electric Charge (Q), Spin (s) & Spin Projection (s_z), Color Representation (triplet, antitriplet, octet, singlet), Baryon Number (B), Lepton Number (L), Weak Isospin (I₃), and Hypercharge (Y = 2(Q - I₃)).
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono text-xs transition-colors"
              >
                Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
