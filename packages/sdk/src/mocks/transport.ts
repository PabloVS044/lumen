/**
 * Transporte Connect en memoria que implementa los servicios con datos sintéticos.
 * Los servicios no registrados aquí responden `Unimplemented`, igual que el motor real.
 */
import { create } from "@bufbuild/protobuf";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, createRouterTransport, type Transport } from "@connectrpc/connect";

import { AnalysisService } from "../gen/lumen/v1/analysis_pb";
import { ErrorDetailSchema } from "../gen/lumen/v1/common_pb";
import { EphemerisService } from "../gen/lumen/v1/ephemeris_pb";
import { CheckResponse_Status, HealthService } from "../gen/lumen/v1/health_pb";
import { HorizonService } from "../gen/lumen/v1/horizon_pb";
import { PowerService } from "../gen/lumen/v1/power_pb";
import { WhatIfService } from "../gen/lumen/v1/whatif_pb";
import { Region, SiteService } from "../gen/lumen/v1/sites_pb";
import { TerrainService } from "../gen/lumen/v1/terrain_pb";

import {
  MOCK_VERSION,
  mockAnalysis,
  mockCatalog,
  mockEvents,
  mockHorizon,
  mockSeries,
  mockSimulate,
  mockWhatIf,
} from "./data";

export function createMockTransport(): Transport {
  return createRouterTransport(({ service }) => {
    service(HealthService, {
      check: () => ({ status: CheckResponse_Status.OK, version: MOCK_VERSION }),
    });

    service(SiteService, {
      listSites: (req) => ({
        sites: mockCatalog.filter(
          (s) =>
            (req.region === Region.UNSPECIFIED || s.region === req.region) &&
            (!req.query || s.name.toLowerCase().includes(req.query.toLowerCase())),
        ),
      }),
      getSite: (req) => {
        const site = mockCatalog.find((s) => s.id === req.id);
        if (!site) {
          throw new ConnectError(`Site '${req.id}' not in catalog.`, Code.NotFound, undefined, [
            {
              desc: ErrorDetailSchema,
              value: create(ErrorDetailSchema, { code: "SITE_NOT_FOUND" }),
            },
          ]);
        }
        return { site };
      },
    });

    service(TerrainService, {
      getCoverage: () => ({
        coverage: { layers: ["MOCK"], nearResM: 5, warnings: ["Synthetic data (SDK mock)"] },
      }),
      getTerrainPoint: () => ({ heightM: 1500, slopeDeg: 4 }),
    });

    service(HorizonService, {
      computeHorizon: (req) => ({
        outcome: { case: "mask", value: mockHorizon(req.site!, req.options?.azStepDeg || 1) },
      }),
    });

    service(EphemerisService, {
      getState: (req) => {
        const t = timestampDate(req.time!).getTime() / 3_600_000;
        const a = (2 * Math.PI * t) / (29.53 * 24);
        return {
          time: req.time,
          sunDir: { x: Math.cos(a), y: Math.sin(a), z: 0.02 },
          earthDir: { x: 1, y: 0, z: 0 },
        };
      },
      getSeries: (req) => mockSeries(req),
      listEvents: (req) => ({ events: mockEvents(req) }),
    });

    service(PowerService, {
      simulate: (req) => mockSimulate(req),
    });

    service(WhatIfService, {
      evaluate: (req) => mockWhatIf(req),
    });

    service(AnalysisService, {
      analyze: (req) => ({ outcome: { case: "result", value: mockAnalysis(req) } }),
      compare: (req) => {
        const results = req.scenarios.map((s) =>
          mockAnalysis({ ...s, $typeName: "lumen.v1.AnalyzeRequest", thresholds: req.thresholds }),
        );
        const best = (key: "illuminationPct" | "operablePct" | "earthVisiblePct") =>
          results.reduce(
            (bi, r, i) => ((r.metrics?.[key] ?? 0) > (results[bi]?.metrics?.[key] ?? 0) ? i : bi),
            0,
          );
        return {
          results,
          bestByMetric: {
            illumination_pct: best("illuminationPct"),
            operable_pct: best("operablePct"),
            earth_visible_pct: best("earthVisiblePct"),
          },
        };
      },
    });
  });
}
