import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadText, safeFilename, toCsv } from "./files";

describe("toCsv", () => {
  it("writes a header and rows, quoting only when needed (RFC 4180)", () => {
    const csv = toCsv(
      ["name", "value", "note"],
      [
        ["a", 1.5, "plain"],
        ["b,c", -2, 'says "hi"'],
        ["d", null, "line\nbreak"],
      ],
    );
    expect(csv).toBe(
      'name,value,note\r\na,1.5,plain\r\n"b,c",-2,"says ""hi"""\r\nd,,"line\nbreak"\r\n',
    );
  });

  it("keeps full numeric precision and writes booleans", () => {
    expect(toCsv(["x", "ok"], [[0.1234567891, true]])).toBe("x,ok\r\n0.1234567891,true\r\n");
  });
});

describe("safeFilename", () => {
  it("keeps a readable, portable file name", () => {
    expect(safeFilename("lumen site -89.45,-137.31 2027-01-01/2027-02-01")).toBe(
      "lumen-site--89.45_-137.31-2027-01-01_2027-02-01",
    );
  });
});

describe("downloadText", () => {
  afterEach(() => vi.restoreAllMocks());

  it("saves the content as a file with the given name and type", async () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadText("data.csv", "a,b\r\n", "text/csv");
    const blob = create.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(await blob.text()).toBe("a,b\r\n");
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
