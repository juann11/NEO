// Deslizar una notificación de la isla: a la derecha la abre, a la izquierda la elimina.
// Eliminar solo la quita de NEO (isla, Inicio y Notificaciones); Windows la sigue teniendo en su centro.

const THRESHOLD = 0.35;
const MAX_DISMISSED = 200;

/** Lo que hace soltar la fila tras arrastrarla `dx` px en una tarjeta de `width` px. */
export function swipeOutcome(dx: number, width: number): "open" | "delete" | null {
  if (width <= 0 || Math.abs(dx) < width * THRESHOLD) return null;
  return dx > 0 ? "open" : "delete";
}

/** Los ids eliminados, el más nuevo primero, sin repetir y solo los últimos 200. */
export function dismissToast(list: number[], id: number): number[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, MAX_DISMISSED);
}

export function isDismissed(list: number[], id: number): boolean {
  return list.includes(id);
}
