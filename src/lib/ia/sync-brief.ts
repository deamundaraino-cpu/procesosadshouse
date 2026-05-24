import { prisma } from "@/lib/db";

// Mapa campo extraído → sección del brief
const CAMPO_A_SECCION: Record<string, string> = {
  nombre_empresa: "EMPRESA",
  website: "EMPRESA",
  sector_industria: "EMPRESA",
  pais_operacion: "EMPRESA",
  ciudad_operacion: "EMPRESA",
  redes_sociales: "EMPRESA",
  producto_servicio_principal: "PRODUCTO",
  propuesta_de_valor: "PRODUCTO",
  ticket_promedio_venta: "PRODUCTO",
  ciclo_de_venta: "PRODUCTO",
  mercado_objetivo: "MERCADO_OBJETIVO",
  rango_edad_cliente: "MERCADO_OBJETIVO",
  genero_cliente: "MERCADO_OBJETIVO",
  ubicacion_cliente: "MERCADO_OBJETIVO",
  ingreso_promedio_cliente: "MERCADO_OBJETIVO",
  competidores_principales: "COMPETENCIA",
  diferenciadores_vs_competencia: "COMPETENCIA",
  objetivos_marketing: "OBJETIVOS",
  kpis_deseados: "OBJETIVOS",
  presupuesto_mensual_publicidad: "PRESUPUESTO",
  plataformas_publicitarias_actuales: "CANALES",
  canales_actuales: "CANALES",
  historial_inversión_publicitaria: "HISTORIAL_CAMPANAS",
  resultados_previos_campanas: "HISTORIAL_CAMPANAS",
  herramientas_crm: "ACCESOS_TECNICOS",
  tono_de_marca: "BRAND_VOICE",
  colores_marca: "BRAND_VOICE",
  restricciones_publicidad: "RESTRICCIONES",
  casos_exito_cliente: "CASOS_EXITO",
  puntos_dolor_cliente_ideal: "PUNTOS_DOLOR",
  proceso_de_compra: "PROCESO_VENTA",
  temporada_alta: "ESTACIONALIDAD",
  temporada_baja: "ESTACIONALIDAD",
  referencias_creativas: "REFERENCIAS",
  notas_adicionales: "NOTAS_ADICIONALES",
};

export interface ResultadoSync {
  camposActualizados: string[];
  camposPendientes: Array<{ clave: string; etiqueta: string; seccion: string }>;
  seccionesActualizadas: number;
}

// Etiquetas legibles para los campos pendientes
const ETIQUETAS: Record<string, string> = {
  nombre_empresa: "Nombre de la empresa",
  website: "Sitio web",
  sector_industria: "Sector / Industria",
  pais_operacion: "País de operación",
  ciudad_operacion: "Ciudad principal",
  redes_sociales: "Redes sociales",
  producto_servicio_principal: "Producto o servicio principal",
  propuesta_de_valor: "Propuesta de valor única",
  ticket_promedio_venta: "Precio / ticket promedio",
  ciclo_de_venta: "Tiempo que tarda una venta",
  mercado_objetivo: "Descripción del cliente ideal",
  rango_edad_cliente: "Rango de edad del cliente",
  genero_cliente: "Género predominante",
  ubicacion_cliente: "Ubicación geográfica del cliente",
  ingreso_promedio_cliente: "Nivel de ingreso del cliente",
  competidores_principales: "Competidores principales",
  diferenciadores_vs_competencia: "Diferenciadores vs competencia",
  objetivos_marketing: "Objetivos con la publicidad",
  kpis_deseados: "KPIs / métricas importantes",
  presupuesto_mensual_publicidad: "Presupuesto mensual en publicidad",
  plataformas_publicitarias_actuales: "Plataformas publicitarias actuales",
  canales_actuales: "Otros canales de marketing",
  historial_inversión_publicitaria: "Historial de inversión publicitaria",
  resultados_previos_campanas: "Resultados previos en campañas",
  herramientas_crm: "CRM / herramientas de automatización",
  tono_de_marca: "Tono de comunicación de marca",
  colores_marca: "Colores principales de marca",
  restricciones_publicidad: "Restricciones en publicidad",
  casos_exito_cliente: "Casos de éxito o testimonios",
  puntos_dolor_cliente_ideal: "Problema principal que resuelves",
  proceso_de_compra: "Proceso de compra / contratación",
  temporada_alta: "Temporada alta",
  temporada_baja: "Temporada baja",
  referencias_creativas: "Referencias creativas",
  notas_adicionales: "Notas adicionales",
};

const NOMBRES_SECCION: Record<string, string> = {
  EMPRESA: "Empresa",
  PRODUCTO: "Producto / Servicio",
  MERCADO_OBJETIVO: "Mercado Objetivo",
  COMPETENCIA: "Competencia",
  OBJETIVOS: "Objetivos",
  PRESUPUESTO: "Presupuesto",
  CANALES: "Canales",
  HISTORIAL_CAMPANAS: "Historial de Campañas",
  ACCESOS_TECNICOS: "Accesos Técnicos",
  BRAND_VOICE: "Voz de Marca",
  RESTRICCIONES: "Restricciones",
  CASOS_EXITO: "Casos de Éxito",
  PUNTOS_DOLOR: "Puntos de Dolor",
  PROCESO_VENTA: "Proceso de Venta",
  ESTACIONALIDAD: "Estacionalidad",
  REFERENCIAS: "Referencias Creativas",
  NOTAS_ADICIONALES: "Notas Adicionales",
};

export async function sincronizarExtraccionConBrief(clienteId: string): Promise<ResultadoSync> {
  // 1. Obtener todos los documentos procesados del cliente
  const documentos = await prisma.documentoCargado.findMany({
    where: { clienteId, procesadoAt: { not: null } },
    select: { extraccionIA: true, nombre: true },
  });

  // 2. Construir mapa: clave → mejor valor (mayor confianza gana)
  const mapaExtraccion: Record<string, { valor: string; confianza: number; docFuente: string }> = {};
  for (const doc of documentos) {
    const campos = (doc.extraccionIA as any)?.campos ?? [];
    for (const campo of campos) {
      if (!campo.valor || campo.valor === "null") continue;
      const existing = mapaExtraccion[campo.campo];
      if (!existing || campo.confianza > existing.confianza) {
        mapaExtraccion[campo.campo] = {
          valor: campo.valor,
          confianza: campo.confianza,
          docFuente: doc.nombre,
        };
      }
    }
  }

  // 3. Obtener secciones del brief
  const secciones = await prisma.briefSeccion.findMany({
    where: { clienteId },
  });

  const camposActualizados: string[] = [];
  let seccionesActualizadas = 0;

  // 4. Agrupar actualizaciones por sección
  const actualizacionesPorSeccion: Record<string, Array<{ clave: string; extraccion: typeof mapaExtraccion[string] }>> = {};

  for (const [clave, extraccion] of Object.entries(mapaExtraccion)) {
    const seccionCodigo = CAMPO_A_SECCION[clave];
    if (!seccionCodigo) continue;
    if (!actualizacionesPorSeccion[seccionCodigo]) actualizacionesPorSeccion[seccionCodigo] = [];
    actualizacionesPorSeccion[seccionCodigo].push({ clave, extraccion });
  }

  // 5. Actualizar cada sección
  for (const seccion of secciones) {
    const actualizaciones = actualizacionesPorSeccion[seccion.seccionCodigo];
    if (!actualizaciones?.length) continue;

    const camposActuales = (seccion.campos as any[]) ?? [];
    let modificado = false;

    const camposNuevos = camposActuales.map((campo: any) => {
      const act = actualizaciones.find((a) => a.clave === campo.clave);
      if (!act) return campo;

      const valorActual = campo.valor;
      const origenActual = campo.origen;

      // No sobreescribir si ya hay valor manual del cliente o equipo
      if (valorActual && valorActual !== "" && origenActual !== "IA") return campo;

      // Actualizar si estaba vacío o el nuevo tiene mayor confianza
      if (!valorActual || valorActual === "" || act.extraccion.confianza > (campo.confianza ?? 0)) {
        modificado = true;
        camposActualizados.push(campo.clave);
        return {
          ...campo,
          valor: act.extraccion.valor,
          confianza: act.extraccion.confianza,
          origen: "IA",
          docFuente: act.extraccion.docFuente,
          timestamp: new Date().toISOString(),
        };
      }
      return campo;
    });

    if (modificado) {
      const completado = Math.round(
        (camposNuevos.filter((c: any) => c.valor && c.valor !== "").length /
          Math.max(camposNuevos.length, 1)) *
          100
      );
      await prisma.briefSeccion.update({
        where: { clienteId_seccionCodigo: { clienteId, seccionCodigo: seccion.seccionCodigo } },
        data: { campos: camposNuevos, completado },
      });
      seccionesActualizadas++;
    }
  }

  // 6. Detectar campos pendientes (sin valor en ningún documento ni brief)
  const camposPendientes: ResultadoSync["camposPendientes"] = [];
  for (const [clave, seccionCodigo] of Object.entries(CAMPO_A_SECCION)) {
    if (mapaExtraccion[clave]) continue; // ya tiene valor de docs
    // Verificar si tiene valor en el brief
    const seccion = secciones.find((s) => s.seccionCodigo === seccionCodigo);
    const camposBrief = (seccion?.campos as any[]) ?? [];
    const campoBrief = camposBrief.find((c: any) => c.clave === clave);
    if (!campoBrief?.valor || campoBrief.valor === "") {
      camposPendientes.push({
        clave,
        etiqueta: ETIQUETAS[clave] ?? clave,
        seccion: NOMBRES_SECCION[seccionCodigo] ?? seccionCodigo,
      });
    }
  }

  return { camposActualizados, camposPendientes, seccionesActualizadas };
}
