import type { CampoExtraido } from "./extract";

export interface ConflictoDetectado {
  campo: string;
  valoresEncontrados: { valor: string; docFuente: string; confianza: number }[];
  descripcion: string;
}

export interface ResultadoUnificacion {
  camposUnificados: CampoExtraido[];
  conflictos: ConflictoDetectado[];
  camposCompletos: number;
  camposFaltantes: string[];
  confianzaPromedio: number;
}

/**
 * Unifica la extracción de múltiples documentos para un mismo cliente.
 * - Detecta conflictos cuando dos documentos tienen valores diferentes para el mismo campo.
 * - Para campos sin conflicto, usa el valor con mayor confianza.
 * - Nunca inventa: si ningún documento tiene el dato, valor queda null.
 */
export function unificarExtraccionesMultidocumento(
  extracciones: { docNombre: string; campos: CampoExtraido[] }[]
): ResultadoUnificacion {
  const campoPorNombre = new Map<string, CampoExtraido[]>();

  // Agrupar todos los valores por campo
  for (const ext of extracciones) {
    for (const campo of ext.campos) {
      if (!campoPorNombre.has(campo.campo)) {
        campoPorNombre.set(campo.campo, []);
      }
      campoPorNombre.get(campo.campo)!.push(campo);
    }
  }

  const camposUnificados: CampoExtraido[] = [];
  const conflictos: ConflictoDetectado[] = [];
  const camposFaltantes: string[] = [];

  for (const [campo, valores] of campoPorNombre) {
    // Filtrar solo los que tienen valor real
    const conValor = valores.filter(
      (v) => v.valor !== null && v.valor.trim() !== ""
    );

    if (conValor.length === 0) {
      // Ningún documento tenía este dato
      camposFaltantes.push(campo);
      camposUnificados.push({
        campo,
        valor: null,
        confianza: 0,
        citaTextual: null,
        docFuente: "NO_ENCONTRADO",
      });
      continue;
    }

    if (conValor.length === 1) {
      // Solo un documento tenía el dato, sin conflicto
      camposUnificados.push({ ...conValor[0] });
      continue;
    }

    // Múltiples documentos tienen el dato — verificar si hay conflicto
    const valoresNormalizados = conValor.map((v) =>
      (v.valor ?? "").toLowerCase().trim()
    );
    const valoresUnicos = new Set(valoresNormalizados);

    if (valoresUnicos.size === 1) {
      // Todos dicen lo mismo — sin conflicto, usar el de mayor confianza
      const mejor = conValor.sort((a, b) => b.confianza - a.confianza)[0];
      camposUnificados.push({ ...mejor, conflicto: false });
    } else {
      // Conflicto: documentos contradictorios
      const conflicto: ConflictoDetectado = {
        campo,
        valoresEncontrados: conValor.map((v) => ({
          valor: v.valor ?? "",
          docFuente: v.docFuente,
          confianza: v.confianza,
        })),
        descripcion: `El campo "${campo}" tiene valores distintos en ${conValor.length} documentos.`,
      };
      conflictos.push(conflicto);

      // Usar el de mayor confianza pero marcar conflicto
      const mejor = conValor.sort((a, b) => b.confianza - a.confianza)[0];
      camposUnificados.push({
        ...mejor,
        conflicto: true,
        conflictoDescripcion: conflicto.descripcion,
      });
    }
  }

  const conValorReal = camposUnificados.filter((c) => c.valor !== null);
  const confianzaPromedio =
    conValorReal.length > 0
      ? conValorReal.reduce((sum, c) => sum + c.confianza, 0) / conValorReal.length
      : 0;

  return {
    camposUnificados,
    conflictos,
    camposCompletos: conValorReal.length,
    camposFaltantes,
    confianzaPromedio: Math.round(confianzaPromedio * 100) / 100,
  };
}

/**
 * Evalúa si la confianza de un campo es aceptable para pre-llenar el formulario.
 * < 0.5 → no pre-llenar, mostrar vacío con alerta
 * 0.5 - 0.75 → pre-llenar pero resaltar para revisión
 * > 0.75 → pre-llenar con confianza
 */
export function evaluarConfianza(confianza: number): "ALTA" | "MEDIA" | "BAJA" {
  if (confianza >= 0.75) return "ALTA";
  if (confianza >= 0.5) return "MEDIA";
  return "BAJA";
}
