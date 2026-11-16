# Entrega en Space Apps 2026

Owner: R7. Texto listo para pegar en la página del proyecto de spaceappschallenge.org, campo por campo
y en el orden del formulario ("Project Page Form Field Instructions" de la
[Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)).
Todo en inglés, como exige la guía. Las cifras salen del motor y de `docs/validation.md`.

**Cierre:** domingo 15 de noviembre de 2026 a las 23:59, hora del evento local. Hay que pulsar
**Submit for Judging**; solo cuenta la última versión guardada.

Antes de enviar:

- [ ] Los 6 miembros están en la pestaña Members, inscritos en el mismo evento local.
- [ ] Demo pública, sin login: el PDF de `docs/pitch/` (7 diapositivas).
- [ ] Marcar las dos casillas (requisitos y Terms; trabajo original con todas las referencias listadas).
- [ ] Ninguna imagen, video ni audio de menores de 18 años.

---

## Project Name

LUMEN: Lunar Utility Map for Energy & Networks

## High-Level Project Summary

LUMEN is a web app that tells lunar mission planners when a landing site has sunlight for power and a
direct line of sight to Earth for communication. For any point on the Moon and any range of dates, it
traces the real terrain horizon from NASA LRO LOLA elevation models, computes where the Sun and Earth
are with NAIF SPICE (DE440), and reports how much of each disc is visible, hour by hour. Planners can
compare sites and dates, simulate a battery through the dark spells, see what a launch delay changes,
and search for a better spot nearby.

This matters most at the lunar south pole, where Artemis plans to land. There the Sun never climbs
more than about 1.5°, so a ridge tens of kilometres away decides whether a lander has power, and Earth
bobs around the northern horizon, so contact comes and goes. On real LOLA terrain at Connecting ridge,
LUMEN finds that moving 300 m raises sunlight from 53 % to 85 % of 2027. Every figure is checked:
Sun and Earth positions match JPL Horizons to within 0.0000006°, and sunlight at the seven Connecting
ridge regions published by NASA's PGDA stays above 70 %, as published.

## Link to Project Demo

<!-- Permalink al PDF del deck en GitHub (commit fijo). Ver docs/pitch/README.md. -->

https://github.com/PabloVS044/lumen/blob/COMMIT/docs/pitch/lumen-demo.pdf

## Link to Final Project

https://github.com/PabloVS044/lumen

## Detailed Project Description

**What it does.** LUMEN answers two questions for any lunar coordinate and date range: when is the Sun
above the real horizon, so a lander has power, and when is Earth above it, so the lander can talk
directly to Earth. It shows the answer as a polar horizon chart, a day-by-hour visibility heatmap, key
metrics (percentage of time lit, in contact and both, longest dark spell, longest blackout) and
countdowns to the next sunset or Earthset. A 3D Moon globe lets you pick a site and lights the terrain
with the computed Sun.

**Planning tools.**

- Compare up to four sites or launch dates side by side.
- Simulate a battery and solar array through the dark spells.
- See how a launch delay of days or weeks changes light and contact ("what-if").
- Search for the best spot within a radius.
- Share any scenario as a URL and export results as CSV, JSON or PDF.

An Explore mode with guided tours explains peaks of near-constant sunlight, why Earth rises and sets,
and a lunar day in 30 seconds.

**How it works.**

1. The engine reads LOLA elevation models around the site, finest grid first.
2. For every azimuth it casts rays across the terrain and keeps the highest elevation angle, including
   the drop caused by the Moon's curvature (about 2.9 km at 100 km).
3. It computes the apparent azimuth and elevation of the Sun and Earth with SPICE in the MOON_ME frame.
4. It compares each disc (Sun 0.53°, Earth 1.9°) with the horizon to get the visible fraction, and
   removes the times when Earth eclipses the Sun.
5. It turns the series into metrics and events.

**Why it is trustworthy.** A public Validation page shows the checks:

- Sun and Earth positions agree with JPL Horizons within 5.4 × 10⁻⁷° (400 comparisons, 5 sites).
- Eclipse times agree with NAIF CSPICE within 1 minute.
- Synthetic-terrain tests check the horizon code.
- Sunlight at NASA PGDA's seven Connecting ridge regions (Barker et al. 2021) comes out at 74–85 %,
  above the published 70 % threshold.

**Benefits and goals.** At the south pole, a few hundred metres can double the hours of sunlight, and a
launch slip of a few days can move the blackout windows. LUMEN makes those trade-offs visible in
seconds instead of weeks, for mission planners, educators and the public. Next steps: compare our
sunlight values one by one with published tables, extend the 5 m terrain to more sites, and verify
the coordinates of every catalog site.

**Tools and languages.**

- Engine: Python 3.12 with Starlette, connect-python, Protocol Buffers and protovalidate, NumPy,
  numba, SpiceyPy, rasterio, pyproj, SciPy; PostgreSQL, Redis and arq for jobs.
- Web: TypeScript with Next.js 16 and React 19, Tailwind CSS, CesiumJS and Resium, D3, Apache
  ECharts, TanStack Query, Connect RPC, nuqs, Zustand and Zod.
- Contracts between web and engine are defined once in Protocol Buffers (buf).
- Tests: pytest and hypothesis, Vitest and Testing Library.

## Use of Super Intelligence (SI)

<!-- ⚠️ VERIFICAR con el equipo: cada miembro confirma qué herramientas usó. Este campo no lo ven los jueces. -->

Yes. We used AI coding assistants, including Claude Code (Anthropic), to help write and review code,
tests and documentation. Every change went through a pull request reviewed by a team member, and the
science is checked against independent references (JPL Horizons, NAIF CSPICE, NASA PGDA). We did not
use AI to generate images, video or audio, and LUMEN uses no NASA logos or branding. The project's
About page states this use of AI.

## NASA Data

- **LRO Lunar Orbiter Laser Altimeter (LOLA) elevation models.** From NASA Goddard's PGDA: the 5 m per
  pixel south pole site models (Site01, Connecting ridge) and the 20 m per pixel polar mosaics. From
  the PDS: the global LDEM_128 for sites outside the polar models. They give the terrain horizon of
  every site. https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ · https://imbrium.mit.edu/
- **NAIF SPICE generic kernels** (NASA JPL): the DE440 planetary ephemeris (de440s.bsp), the lunar
  frame kernels (moon_de440_250416.tf, MOON_ME) and the leap-second kernel (naif0012.tls). They give
  the Sun's and Earth's positions. https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- **JPL Horizons API:** independent reference for the Sun and Earth positions on our Validation page.
  https://ssd.jpl.nasa.gov/horizons/
- **NASA PGDA product 78 (Barker et al. 2021):** Site01 regions of interest lit more than 70 % of
  2024–2025, used to validate our sunlight figures. https://pgda.gsfc.nasa.gov/products/78
- **NASA Artemis III candidate landing regions:** the site catalog.
  https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
- **LROC QuickMap and NASA Moon Trek:** references for checking site coordinates and the globe.
  https://quickmap.lroc.asu.edu/ · https://trek.nasa.gov/moon/

## Space Agency Partner Data and Other References

**Space agency partners**

- Canadian Space Agency, Moon exploration (context for the Learn section):
  https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/

**Data and services**

- Cesium Moon terrain on Cesium ion, built from LRO data (3D globe), used under the Cesium ion terms:
  https://cesium.com/platform/cesium-ion/content/cesium-moon/

**Papers**

- Mazarico, E., et al. (2011). Illumination conditions of the lunar polar regions using LOLA
  topography. Icarus, 211(2), 1066–1081. https://doi.org/10.1016/j.icarus.2010.10.030
- Barker, M. K., et al. (2021). Improved LOLA elevation maps for south pole landing sites: Error
  estimates and their impact on illumination conditions. Planetary and Space Science.
  https://doi.org/10.1016/j.pss.2020.105119
- Park, R. S., et al. (2021). The JPL Planetary and Lunar Ephemerides DE440 and DE441. The
  Astronomical Journal, 161(3), 105.

**Open-source software**

All open-source software is used under its own license:

- Next.js, React, Tailwind CSS, CesiumJS, Resium, D3, Apache ECharts, TanStack Query, Connect RPC,
  Buf and protovalidate, nuqs, Zustand, Zod, date-fns, Lucide icons.
- Starlette, Uvicorn, NumPy, SciPy, numba, SpiceyPy (NAIF CSPICE), rasterio (GDAL), pyproj,
  SQLAlchemy, Redis, arq, pytest.

**AI tools**

- Claude Code (Anthropic), coding assistant.

**Our own material**

All images in the project and the demo are our own: screenshots of LUMEN and illustrations drawn in
code.
