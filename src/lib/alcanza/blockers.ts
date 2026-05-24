import type { EstadoTarea, Tarea } from "@/generated/prisma";

type TareaConDeps = Tarea & {
  dependencias: { prereq: Tarea }[];
};

/**
 * Calcula el estado correcto de una tarea basado en el estado de sus prereqs.
 * Regla: si cualquier prereq no está COMPLETADA → la tarea queda BLOQUEADA.
 */
export function calcularEstadoTarea(
  tarea: TareaConDeps
): EstadoTarea {
  if (tarea.estado === "COMPLETADA" || tarea.estado === "CANCELADA") {
    return tarea.estado;
  }

  const hayBloqueante = tarea.dependencias.some(
    (d) => d.prereq.estado !== "COMPLETADA"
  );

  if (hayBloqueante) return "BLOQUEADA";
  if (tarea.estado === "BLOQUEADA") return "PENDIENTE";
  return tarea.estado;
}

/**
 * Dado un conjunto de tareas del cliente, recalcula el estado
 * de todas las que podrían verse afectadas por un cambio de estado.
 * Retorna solo las tareas que cambiaron de estado.
 */
export function recalcularCascada(
  tareas: TareaConDeps[]
): { id: string; nuevoEstado: EstadoTarea }[] {
  const cambios: { id: string; nuevoEstado: EstadoTarea }[] = [];

  for (const tarea of tareas) {
    const nuevoEstado = calcularEstadoTarea(tarea);
    if (nuevoEstado !== tarea.estado) {
      cambios.push({ id: tarea.id, nuevoEstado });
    }
  }

  return cambios;
}

/**
 * Determina qué tareas están bloqueando a una tarea específica.
 */
export function obtenerBloqueantes(tarea: TareaConDeps): Tarea[] {
  return tarea.dependencias
    .filter((d) => d.prereq.estado !== "COMPLETADA")
    .map((d) => d.prereq);
}

/**
 * Calcula el % de avance global del cliente sumando ponderado por tarea.
 */
export function calcularAvanceGlobal(tareas: Tarea[]): number {
  if (!tareas.length) return 0;
  const suma = tareas.reduce((acc, t) => acc + t.porcentajeCompletado, 0);
  return Math.round(suma / tareas.length);
}

/**
 * Calcula el % de avance por fase.
 */
export function calcularAvancePorFase(
  tareas: Tarea[]
): Record<string, number> {
  const porFase: Record<string, { suma: number; count: number }> = {};

  for (const t of tareas) {
    if (!porFase[t.faseId]) porFase[t.faseId] = { suma: 0, count: 0 };
    porFase[t.faseId].suma += t.porcentajeCompletado;
    porFase[t.faseId].count += 1;
  }

  return Object.fromEntries(
    Object.entries(porFase).map(([faseId, { suma, count }]) => [
      faseId,
      Math.round(suma / count),
    ])
  );
}
