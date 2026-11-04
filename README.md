# 2+1D Particle Life laboratory

Open `standalone.html` directly in a modern browser. JavaScript and CSS are bundled into the file; it does not need a CDN, server, or API key. The source from the supplied archive is also included for development.

To rebuild it: `npm ci && npm run build:standalone`. Run `npm test` and `npm run lint` to check the Fock-correlation calculations and TypeScript.

## Matter-source scope

The lattice matter source inspector displays the actual spatially resolved U(1) hypercharge, eight SU(3) and three SU(2) charge/current source arrays, plus electric charge density. Those sources remain Gaussian-deposited, occupation-weighted particle proxies, including semiclassical particles outside the six-orbital Fock window. They are **not** the complete quantum matter currents. The inspector also displays anomalous particle–antiparticle bilinears calculated from the full retained Fock state; `getFockCorrelations()` exposes all normal and anomalous bilinears with fermionic signs and measured-state normalization.

The model does not define the local particle and antiparticle spinor mode functions, gauge-covariant current operators, or a regulated vacuum subtraction needed to convert all those bilinears into local Dirac currents and vacuum polarization. They are therefore not added to the gauge sources. The lattice fields are classical variables: they source the Fock evolution and receive occupation-weighted matter sources (mean-field feedback), but there is no joint quantum matter–gauge state or fully quantum back-reaction. The separate finite photon test sectors are not coupled to the live simulation. Numerical Gauss residuals do not establish quantum physical-state projection or conservation.
