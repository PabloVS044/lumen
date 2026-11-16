# Demo de Space Apps (pitch)

Owner: R7. Demo oficial: 7 diapositivas en inglés (la guía permite hasta 7 contando título e intro).

- `deck.html`: fuente del deck. Las cifras salen del motor y de `docs/validation.md`; las imágenes son capturas propias de LUMEN.
- `lumen-demo.pdf`: el PDF que se enlaza en el campo "Link to Project Demo". Para el envío, usar el enlace permanente a un commit concreto (`/blob/<commit>/docs/pitch/lumen-demo.pdf`), así no se rompe aunque se borre la rama.
- `img/`: recortes de capturas de la landing, `/validation` y `/learn`.

Regenerar el PDF tras editar `deck.html` (requiere `playwright-core` y un Chromium o Edge instalado):

```bash
CHROME_PATH="/ruta/a/chrome" node docs/pitch/render.mjs
```
