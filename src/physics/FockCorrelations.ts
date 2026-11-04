/** Exact expectations in an occupation-number basis with Jordan–Wigner ordering.
 * normal[i][j] = <c_i† c_j>, pair[i][j] = <c_i c_j>.
 * The state is normalized by its measured norm; no Gaussian/Wick assumption is made.
 */
export type ComplexValue = { re: number; im: number };
export function fockCorrelations(re: ArrayLike<number>, im: ArrayLike<number>, modes: number) {
  const dim = 2 ** modes;
  if (!Number.isInteger(modes) || modes < 1 || modes > 20 || re.length !== dim || im.length !== dim) throw new Error('Invalid Fock state dimensions');
  let norm = 0;
  for (let k = 0; k < dim; k++) norm += re[k] ** 2 + im[k] ** 2;
  if (!(norm > 0) || !Number.isFinite(norm)) throw new Error('Fock state must have finite nonzero norm');
  const matrix = () => Array.from({length:modes}, () => Array.from({length:modes}, () => ({re:0, im:0})));
  const normal = matrix(), pair = matrix();
  const parity = (mask:number) => { let sign=1; while(mask){mask &= mask-1; sign=-sign;} return sign; };
  // Apply operators right-to-left to each ket and contract with the bra.
  const accumulate = (out:ComplexValue, source:number, target:number, sign:number) => {
    out.re += sign*(re[target]*re[source]+im[target]*im[source])/norm;
    out.im += sign*(re[target]*im[source]-im[target]*re[source])/norm;
  };
  for(let mask=0; mask<dim; mask++) {
    if (re[mask] === 0 && im[mask] === 0) continue;
    for(let j=0;j<modes;j++) {
      const bj=1<<j; if(!(mask&bj)) continue;
      const after=mask^bj, sj=parity(mask&(bj-1));
      for(let i=0;i<modes;i++) {
        const bi=1<<i, sign=sj*parity(after&(bi-1));
        if(!(after&bi)) accumulate(normal[i][j],mask,after|bi,sign);
        if(after&bi) accumulate(pair[i][j],mask,after^bi,sign);
      }
    }
  }
  return {norm, normal, pair};
}
