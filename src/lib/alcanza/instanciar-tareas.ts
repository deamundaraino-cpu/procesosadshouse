import { prisma } from "@/lib/db";
import { TAREAS_TEMPLATE } from "./tareas-template";
import type { TipoAprobador, Rol } from "@/generated/prisma";
import { addDays } from "date-fns";

/**
 * Instancia todas las tareas template para un cliente nuevo.
 * Calcula fechas reales a partir de fechaIngreso.
 * Luego asigna dependencias entre instancias según los códigos de prereq.
 */
export async function instanciarTareasCliente(
  clienteId: string,
  fechaIngreso: Date
): Promise<void> {
  // Obtener las fases para mapear código → id
  const fases = await prisma.fase.findMany();
  const fasesMap = new Map(fases.map((f) => [f.codigo, f.id]));

  // Crear tareas sin dependencias primero
  const tareasCreadas = new Map<string, string>(); // codigo → id

  for (const template of TAREAS_TEMPLATE) {
    const faseId = fasesMap.get(template.faseCodigo);
    if (!faseId) continue;

    const fechaInicio = addDays(fechaIngreso, template.diaInicio);
    const fechaVencimiento = addDays(
      fechaIngreso,
      template.diaInicio + template.duracionDias
    );

    const tarea = await prisma.tarea.create({
      data: {
        clienteId,
        faseId,
        templateCodigo: template.codigo,
        nombre: template.nombre,
        descripcion: template.descripcion,
        diaInicio: template.diaInicio,
        diaFin: template.diaInicio + template.duracionDias,
        fechaInicio,
        fechaVencimiento,
        esParalela: template.esParalela,
        requiereAprobacion: template.requiereAprobacion,
        tipoAprobador: template.tipoAprobador as TipoAprobador | undefined,
        puntoIA: template.puntoIA,
        nivelAutomatizacionIA: template.nivelAutomatizacionIA,
      },
    });

    tareasCreadas.set(template.codigo, tarea.id);
  }

  // Ahora asignar dependencias
  for (const template of TAREAS_TEMPLATE) {
    if (!template.bloqueadoresPor.length) continue;

    const tareaId = tareasCreadas.get(template.codigo);
    if (!tareaId) continue;

    for (const prereqCodigo of template.bloqueadoresPor) {
      const prereqId = tareasCreadas.get(prereqCodigo);
      if (!prereqId) continue;

      await prisma.tareaDependencia.create({
        data: { tareaId, prereqId },
      });
    }
  }

  // Crear entregables iniciales desde los templates
  for (const template of TAREAS_TEMPLATE) {
    if (!template.entregablesTemplate?.length) continue;
    const tareaId = tareasCreadas.get(template.codigo);
    if (!tareaId) continue;

    for (const e of template.entregablesTemplate) {
      await prisma.entregable.create({
        data: {
          clienteId,
          tareaId,
          nombre: e.nombre,
          tipo: e.tipo as any,
          requiereAprobacion: template.requiereAprobacion,
          aprobadoPor: template.tipoAprobador as TipoAprobador | undefined,
        },
      });
    }
  }

  // Crear secciones del Brief (22 secciones)
  await crearSeccionesBrief(clienteId);
}

const SECCIONES_BRIEF = [
  { codigo: "EMPRESA", nombre: "Información de la Empresa", orden: 1 },
  { codigo: "PRODUCTO", nombre: "Producto o Servicio", orden: 2 },
  { codigo: "PROPUESTA_VALOR", nombre: "Propuesta de Valor", orden: 3 },
  { codigo: "MERCADO_OBJETIVO", nombre: "Mercado Objetivo", orden: 4 },
  { codigo: "COMPETENCIA", nombre: "Competencia", orden: 5 },
  { codigo: "OBJETIVOS", nombre: "Objetivos de Marketing", orden: 6 },
  { codigo: "PRESUPUESTO", nombre: "Presupuesto", orden: 7 },
  { codigo: "CANALES", nombre: "Canales Actuales", orden: 8 },
  { codigo: "HISTORIAL_CAMPANAS", nombre: "Historial de Campañas", orden: 9 },
  { codigo: "METRICAS_ACTUALES", nombre: "Métricas Actuales", orden: 10 },
  { codigo: "ACCESOS_TECNICOS", nombre: "Accesos Técnicos", orden: 11 },
  { codigo: "LANDING_PAGES", nombre: "Landing Pages y Web", orden: 12 },
  { codigo: "CRM", nombre: "CRM y Automatizaciones", orden: 13 },
  { codigo: "BRAND_VOICE", nombre: "Brand Voice y Tono", orden: 14 },
  { codigo: "RESTRICCIONES", nombre: "Restricciones y Prohibiciones", orden: 15 },
  { codigo: "CASOS_EXITO", nombre: "Casos de Éxito", orden: 16 },
  { codigo: "PUNTOS_DOLOR", nombre: "Puntos de Dolor del Cliente", orden: 17 },
  { codigo: "PROCESO_VENTA", nombre: "Proceso de Venta", orden: 18 },
  { codigo: "TICKET_PROMEDIO", nombre: "Ticket Promedio y LTV", orden: 19 },
  { codigo: "ESTACIONALIDAD", nombre: "Estacionalidad", orden: 20 },
  { codigo: "REFERENCIAS", nombre: "Referencias y Ejemplos", orden: 21 },
  { codigo: "NOTAS_ADICIONALES", nombre: "Notas Adicionales", orden: 22 },
];

async function crearSeccionesBrief(clienteId: string): Promise<void> {
  for (const sec of SECCIONES_BRIEF) {
    await prisma.briefSeccion.upsert({
      where: { clienteId_seccionCodigo: { clienteId, seccionCodigo: sec.codigo } },
      update: {},
      create: {
        clienteId,
        seccionCodigo: sec.codigo,
        seccionNombre: sec.nombre,
        orden: sec.orden,
        campos: [],
      },
    });
  }
}
