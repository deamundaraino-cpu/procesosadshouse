import { chatCompletion } from "./openrouter";

export interface CampoExtraido {
  campo: string;
  valor: string | null;
  confianza: number; // 0.0 a 1.0
  citaTextual: string | null; // fragmento exacto del documento fuente
  docFuente: string;
  conflicto?: boolean;
  conflictoDescripcion?: string;
}

export interface ResultadoExtraccion {
  campos: CampoExtraido[];
  resumenDocumento: string;
  idiomaDetectado: string;
  totalCamposEncontrados: number;
  totalCamposNoEncontrados: number;
}

const CAMPOS_BRIEF = [
  "nombre_empresa",
  "sector_industria",
  "producto_servicio_principal",
  "propuesta_de_valor",
  "pais_operacion",
  "ciudad_operacion",
  "website",
  "redes_sociales",
  "mercado_objetivo",
  "rango_edad_cliente",
  "genero_cliente",
  "ubicacion_cliente",
  "ingreso_promedio_cliente",
  "objetivos_marketing",
  "kpis_deseados",
  "presupuesto_mensual_publicidad",
  "ticket_promedio_venta",
  "ciclo_de_venta",
  "canales_actuales",
  "herramientas_crm",
  "plataformas_publicitarias_actuales",
  "historial_inversión_publicitaria",
  "resultados_previos_campanas",
  "competidores_principales",
  "diferenciadores_vs_competencia",
  "tono_de_marca",
  "colores_marca",
  "restricciones_publicidad",
  "casos_exito_cliente",
  "puntos_dolor_cliente_ideal",
  "proceso_de_compra",
  "temporada_alta",
  "temporada_baja",
  "referencias_creativas",
  "notas_adicionales",
];

export async function extraerInformacionDocumento(
  textoDocumento: string,
  nombreDocumento: string
): Promise<ResultadoExtraccion> {
  const prompt = `Eres un extractor de información para una agencia de publicidad digital.
Tu tarea es analizar el documento proporcionado y extraer información específica.

REGLAS CRÍTICAS (NO NEGOCIABLES):
1. Extrae ÚNICAMENTE información que aparezca LITERALMENTE en el documento.
2. Si un campo NO está en el documento, su valor DEBE ser null y confianza 0.
3. NUNCA inventes, inferencias ni supongas información.
4. La citaTextual debe ser el fragmento EXACTO del documento donde encontraste el dato.
5. La confianza refleja qué tan claramente aparece el dato (1.0 = mención explícita, 0.5 = implícita pero deducible del texto, nunca inventes).
6. Si hay información contradictoria dentro del mismo documento, pon conflicto: true.

Documento: "${nombreDocumento}"

Campos a extraer:
${CAMPOS_BRIEF.join(", ")}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "campos": [
    {
      "campo": "nombre_campo",
      "valor": "valor encontrado o null",
      "confianza": 0.0-1.0,
      "citaTextual": "fragmento exacto o null",
      "conflicto": false,
      "conflictoDescripcion": null
    }
  ],
  "resumenDocumento": "resumen breve de qué tipo de documento es y qué información principal contiene",
  "idiomaDetectado": "es/en/pt",
  "totalCamposEncontrados": 0,
  "totalCamposNoEncontrados": 0
}

DOCUMENTO A ANALIZAR:
---
${textoDocumento.slice(0, 15000)}
---`;

  const texto = await chatCompletion(
    [{ role: "user", content: prompt }],
    { max_tokens: 8000 }
  );

  // Extraer JSON de la respuesta — con reparación si viene truncado
  const jsonMatch = texto.match(/\{[\s\S]*/);
  if (!jsonMatch) {
    throw new Error("La IA no retornó JSON válido");
  }

  let jsonStr = jsonMatch[0];
  let resultado: ResultadoExtraccion;

  try {
    resultado = JSON.parse(jsonStr);
  } catch {
    // JSON truncado — extraer solo los campos completos del array
    const camposMatch = jsonStr.match(/"campos"\s*:\s*\[([\s\S]*?)(?:\]\s*,|\]$)/);
    const camposStr = camposMatch ? `[${camposMatch[1]}]` : "[]";

    // Limpiar el último elemento si quedó incompleto
    const camposLimpios = camposStr.replace(/,\s*\{[^}]*$/, "").replace(/,$/, "");
    let campos: CampoExtraido[] = [];
    try { campos = JSON.parse(camposLimpios + (camposLimpios.endsWith("]") ? "" : "]")); } catch { campos = []; }

    resultado = {
      campos,
      resumenDocumento: "Extracción parcial (respuesta truncada)",
      idiomaDetectado: "es",
      totalCamposEncontrados: campos.filter((c) => c.valor).length,
      totalCamposNoEncontrados: CAMPOS_BRIEF.length - campos.filter((c) => c.valor).length,
    };
  }

  // Asegurar que todos los campos del brief estén presentes
  const camposEncontrados = new Set(resultado.campos.map((c) => c.campo));
  for (const campo of CAMPOS_BRIEF) {
    if (!camposEncontrados.has(campo)) {
      resultado.campos.push({
        campo,
        valor: null,
        confianza: 0,
        citaTextual: null,
        docFuente: nombreDocumento,
      });
    }
  }

  // Asignar docFuente a todos los campos
  resultado.campos = resultado.campos.map((c) => ({
    ...c,
    docFuente: nombreDocumento,
  }));

  return resultado;
}
