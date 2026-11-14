// Copia los assets estáticos de Cesium a public/cesium (sección 12.2). Owner: Frontend 3D.
import { cp, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let cesiumRoot;
try {
  cesiumRoot = path.dirname(require.resolve("cesium/package.json"));
} catch {
  console.log("[cesium] paquete no instalado, se omite la copia de assets");
  process.exit(0);
}
const src = path.join(cesiumRoot, "Build", "Cesium");
const dest = path.join(process.cwd(), "public", "cesium");
await access(src);
for (const dir of ["Workers", "ThirdParty", "Assets", "Widgets"]) {
  await cp(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
console.log(`[cesium] assets copiados a ${dest}`);
