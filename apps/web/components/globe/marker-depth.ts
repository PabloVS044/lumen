/**
 * Prueba de profundidad de los marcadores pegados al tileset (M4). Owner: Frontend 3D.
 * Con CLAMP_TO_3D_TILE el marcador queda sobre la superficie del tileset, pero con la prueba de
 * profundidad activa el relieve real lo tapa de cerca (a 60 km y a 3 km desaparece el punto) y corta la
 * segunda línea de las etiquetas a 600 km. Se desactiva solo en rangos acotados:
 * - puntos: a menos de 100 km de la cámara; más lejos siguen ocultos tras el limbo;
 * - punto del sitio seleccionado: siempre visible (es el foco; a 600 km también lo tapaba el relieve);
 * - etiquetas: siempre (solo se muestran cerca de la cámara o si el sitio está seleccionado).
 */
export const POINT_DEPTH_TEST_OFF_M = 100_000;
export const LABEL_DEPTH_TEST_OFF_M = Number.POSITIVE_INFINITY;
export const SELECTED_POINT_DEPTH_TEST_OFF_M = Number.POSITIVE_INFINITY;
