/**
 * Contenido de los tours de /learn (M11, HU-11 AC2). Owner: Producto/Diseño.
 * Las escenas son esquemas con relieve inventado (horizon-scene-model.ts). Las cifras de sitios reales
 * salen del motor y están documentadas en docs/validation.md ("Integración con el horizonte real LOLA"):
 * Connecting ridge en 2027, observador a 2 m, paso de 1 h. La "cresta" es el punto más alto del DEM
 * de 5 m en 2 km a la redonda, encontrado por el motor; no es un sitio oficial.
 */
import type { HorizonSceneProps } from "./horizon-scene";
import { CRATER_LIFT_DEG, LUNAR_DAY_D, RIDGE_LIFT_DEG } from "./horizon-scene-model";

export interface TourStep {
  title: string;
  body: string;
  scene: Omit<HorizonSceneProps, "className"> & { label: string };
  link?: { href: string; label: string };
}

export interface TourData {
  id: string;
  title: string;
  summary: string;
  steps: TourStep[];
}

/** Cresta de Connecting ridge según el motor (docs/validation.md). */
const CREST = "lat=-89.4403&lon=-137.134";
const crestTab = (tab: "timeline" | "whatif") => `/site?${CREST}&tab=${tab}&mode=explore`;

/** 30 s de animación por día lunar. */
const LUNAR_DAY_IN_30_S = 30 / LUNAR_DAY_D;

export const TOURS: TourData[] = [
  {
    id: "peaks",
    title: "Peaks of near-constant sunlight",
    summary:
      "Why a ridge can stay lit for most of the month while a nearby crater floor stays dark.",
    steps: [
      {
        title: "The Sun skims the horizon",
        body: "At the south pole the Sun circles the whole horizon once every 29.5 days and never climbs more than about 1.5°. Any hill in the way can hide it.",
        scene: {
          label: "The Sun circles just above the horizon and slips behind the ridges now and then.",
        },
      },
      {
        title: "Stand on a ridge",
        body: "From a ridge or a crater rim, the land around sits lower in the sky. The Sun clears it for most of the month, which is why these spots are called peaks of near-constant light.",
        scene: {
          lift: RIDGE_LIFT_DEG,
          focus: "sun",
          label:
            "Seen from a ridge, the surrounding terrain sits low and the Sun stays in view almost all the time.",
        },
      },
      {
        title: "Or sit in a crater",
        body: "On the floor of a deep crater, the walls stand higher than the Sun ever climbs. These permanently shadowed regions are cold enough to keep water ice, but they get no solar power.",
        scene: {
          lift: CRATER_LIFT_DEG,
          focus: "sun",
          label: "From a crater floor, the walls hide the Sun all the time.",
        },
      },
      {
        title: "300 m makes the difference",
        body: "LUMEN's engine on real LOLA terrain at Connecting ridge, through 2027: a point on a 9° slope sees the Sun 53 % of the time. The crest 300 m away sees it 85 %.",
        scene: {
          lift: RIDGE_LIFT_DEG,
          label: "Seen from a ridge, the Sun stays in view most of the time.",
        },
        link: { href: crestTab("timeline"), label: "Open the crest in LUMEN" },
      },
    ],
  },
  {
    id: "earth",
    title: "Why Earth rises and sets",
    summary: "How a small wobble decides when a lander can talk straight to Earth.",
    steps: [
      {
        title: "Earth hangs almost still",
        body: "The Moon keeps the same face toward Earth, so from the Moon, Earth barely moves across the sky. Near the south pole it sits low over the northern horizon. On the far side it never rises at all.",
        scene: {
          focus: "earth",
          label: "Earth sits low over the northern horizon and barely moves.",
        },
      },
      {
        title: "It sways in a small loop",
        body: "The Moon's orbit is slightly oval and tilted, so Earth sways about 8° east and west and about 7° up and down. This sway is called libration. One swing up and down takes about 27 days.",
        scene: {
          focus: "earth",
          earthTrack: true,
          label: "Earth traces a small loop near north as the Moon librates.",
        },
      },
      {
        title: "When Earth dips, the link drops",
        body: "When the sway takes Earth below the ridges to the north, a lander loses its direct link until Earth climbs back. At the Connecting ridge crest, LUMEN finds Earth in view 51 % of the time through 2027.",
        scene: {
          focus: "earth",
          earthTrack: true,
          label: "Earth dips behind the northern ridges and comes back as it follows its loop.",
        },
        link: { href: crestTab("timeline"), label: "See when Earth is in view" },
      },
    ],
  },
  {
    id: "lunar-day",
    title: "A lunar day in 30 seconds",
    summary: "From one sunrise to the next takes 29.5 Earth days.",
    steps: [
      {
        title: "One day lasts a month",
        body: "The Moon turns once every 29.5 Earth days, so a lunar day, from one sunrise to the next, lasts about a month. At the pole the Sun does not rise and set as it does at home: it circles the horizon.",
        scene: {
          startDay: 0,
          autoPlay: false,
          dayCounter: true,
          secondsPerDay: LUNAR_DAY_IN_30_S,
          label: "The polar horizon at the start of a lunar day, with a day counter at zero.",
        },
      },
      {
        title: "Watch it",
        body: "Press play: 30 seconds stand for 29.5 days. Follow the Sun around the horizon and watch it slip behind the ridges, while Earth bobs near north.",
        scene: {
          startDay: 0,
          dayCounter: true,
          secondsPerDay: LUNAR_DAY_IN_30_S,
          label:
            "A whole lunar day in 30 seconds: the Sun circles the horizon once and Earth bobs near north.",
        },
      },
      {
        title: "Light and contact drift apart",
        body: "Earth's sway repeats every 27.2 days, not 29.5, so sunlight and contact line up differently each month. That is why a launch delay of a few days can change both.",
        scene: {
          startDay: 0,
          dayCounter: true,
          secondsPerDay: LUNAR_DAY_IN_30_S,
          label:
            "The Sun and Earth follow cycles of different length, so their timing shifts from month to month.",
        },
        link: { href: crestTab("whatif"), label: "Try a launch delay" },
      },
    ],
  },
];
