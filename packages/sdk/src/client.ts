import { createClient, type Client, type Transport } from "@connectrpc/connect";

import { AnalysisService } from "./gen/lumen/v1/analysis_pb";
import { EphemerisService } from "./gen/lumen/v1/ephemeris_pb";
import { ExportService } from "./gen/lumen/v1/export_pb";
import { HealthService } from "./gen/lumen/v1/health_pb";
import { HorizonService } from "./gen/lumen/v1/horizon_pb";
import { JobService } from "./gen/lumen/v1/jobs_pb";
import { PowerService } from "./gen/lumen/v1/power_pb";
import { SearchService } from "./gen/lumen/v1/search_pb";
import { SiteService } from "./gen/lumen/v1/sites_pb";
import { TerrainService } from "./gen/lumen/v1/terrain_pb";
import { ValidationService } from "./gen/lumen/v1/validation_pb";
import { WhatIfService } from "./gen/lumen/v1/whatif_pb";

export interface LumenClient {
  health: Client<typeof HealthService>;
  sites: Client<typeof SiteService>;
  terrain: Client<typeof TerrainService>;
  horizon: Client<typeof HorizonService>;
  ephemeris: Client<typeof EphemerisService>;
  analysis: Client<typeof AnalysisService>;
  jobs: Client<typeof JobService>;
  power: Client<typeof PowerService>;
  whatIf: Client<typeof WhatIfService>;
  search: Client<typeof SearchService>;
  export: Client<typeof ExportService>;
  validation: Client<typeof ValidationService>;
}

/** Clientes tipados por servicio. Para React usar connect-query con el mismo transporte. */
export function createLumenClient(transport: Transport): LumenClient {
  return {
    health: createClient(HealthService, transport),
    sites: createClient(SiteService, transport),
    terrain: createClient(TerrainService, transport),
    horizon: createClient(HorizonService, transport),
    ephemeris: createClient(EphemerisService, transport),
    analysis: createClient(AnalysisService, transport),
    jobs: createClient(JobService, transport),
    power: createClient(PowerService, transport),
    whatIf: createClient(WhatIfService, transport),
    search: createClient(SearchService, transport),
    export: createClient(ExportService, transport),
    validation: createClient(ValidationService, transport),
  };
}
