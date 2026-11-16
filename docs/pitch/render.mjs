// Genera docs/pitch/lumen-demo.pdf desde deck.html con Chromium o Edge (playwright-core).
// Uso: CHROME_PATH="<ruta al navegador>" node docs/pitch/render.mjs
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const dir = fileURLToPath(new URL(".", import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(`${dir}deck.html`).href, { waitUntil: "load" });
await page.pdf({
  path: `${dir}lumen-demo.pdf`,
  width: "1280px",
  height: "720px",
  printBackground: true,
});
await browser.close();
console.log("docs/pitch/lumen-demo.pdf");
