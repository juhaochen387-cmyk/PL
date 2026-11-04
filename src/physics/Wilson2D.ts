/** Free two-band Wilson Hamiltonian, not a non-Abelian anomaly calculation.
 * H(k) = sin(kx a)/a σx + sin(ky a)/a σy + M(k) σz.
 * Its occupied-band Chern number in this orientation is
 * -1/2 Σ_corner orientation(corner) sign M(corner), provided the gap is open.
 */
export function wilsonFreeAudit(mass: number, spacing: number, r: number) {
  if (![mass, spacing, r].every(Number.isFinite) || spacing <= 0 || r <= 0)
    throw new RangeError('mass must be finite; spacing and Wilson r must be positive');
  const points = [
    {name:'Γ', nx:0, ny:0, orientation:1}, {name:'X', nx:1, ny:0, orientation:-1},
    {name:'Y', nx:0, ny:1, orientation:-1}, {name:'M', nx:1, ny:1, orientation:1},
  ].map(p => ({...p, mass:mass + 2*r*(p.nx+p.ny)/spacing}));
  // Zero mass at any corner closes the band gap; the topological invariant is undefined.
  const gapless = points.some(p => Math.abs(p.mass) < 1e-12/spacing);
  const occupiedChern = gapless ? null : (-0.5 * points.reduce((s,p)=>s+p.orientation*Math.sign(p.mass),0) || 0);
  return {points, gapless, occupiedChern};
}
export function wilsonEnergy(kx:number, ky:number, mass:number, spacing:number, r:number):number {
  wilsonFreeAudit(mass,spacing,r); // validate
  if (!Number.isFinite(kx) || !Number.isFinite(ky)) throw new RangeError('momentum must be finite');
  const x=kx*spacing, y=ky*spacing;
  const m=mass+r/spacing*(2-Math.cos(x)-Math.cos(y));
  return Math.hypot(Math.sin(x)/spacing,Math.sin(y)/spacing,m);
}
