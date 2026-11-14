import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { SiteSchema } from "./gen/lumen/v1/common_pb";
import { validateMessage } from "./validate";

describe("validateMessage", () => {
  it("applies buf.validate rules from the .proto", () => {
    expect(validateMessage(SiteSchema, create(SiteSchema, { lat: -89.4, lon: 222.7 }))).toBeNull();
    expect(validateMessage(SiteSchema, create(SiteSchema, { lat: 200 }))).toHaveProperty("lat");
  });
});
