import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import BriefContent from "./BriefContent";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
  });
  if (!cliente) notFound();

  const secciones = await prisma.briefSeccion.findMany({
    where: { clienteId: params.clienteId },
    orderBy: { orden: "asc" },
  });

  // Obtener documentos validados para prefill
  const documentos = await prisma.documentoCargado.findMany({
    where: { clienteId: params.clienteId, procesadoAt: { not: null } },
    select: { extraccionIA: true, nombre: true },
  });

  // Mapa prefill: clave → { valor, confianza, docFuente }
  const prefillMap: Record<string, { valor: string; confianza: number; docFuente?: string }> = {};
  for (const doc of documentos) {
    const campos = (doc.extraccionIA as any)?.campos ?? [];
    for (const c of campos) {
      if (c.valor && (!prefillMap[c.campo] || c.confianza > prefillMap[c.campo].confianza)) {
        prefillMap[c.campo] = { valor: c.valor, confianza: c.confianza, docFuente: doc.nombre };
      }
    }
  }

  // Calcular campos pendientes (sin valor en brief ni en documentos)
  const CAMPO_A_SECCION: Record<string, string> = {
    nombre_empresa: "Empresa", website: "Empresa", sector_industria: "Empresa",
    pais_operacion: "Empresa", ciudad_operacion: "Empresa", redes_sociales: "Empresa",
    producto_servicio_principal: "Producto / Servicio", propuesta_de_valor: "Producto / Servicio",
    ticket_promedio_venta: "Producto / Servicio", ciclo_de_venta: "Producto / Servicio",
    mercado_objetivo: "Mercado Objetivo", rango_edad_cliente: "Mercado Objetivo",
    genero_cliente: "Mercado Objetivo", ubicacion_cliente: "Mercado Objetivo",
    ingreso_promedio_cliente: "Mercado Objetivo",
    competidores_principales: "Competencia", diferenciadores_vs_competencia: "Competencia",
    objetivos_marketing: "Objetivos", kpis_deseados: "Objetivos",
    presupuesto_mensual_publicidad: "Presupuesto",
    plataformas_publicitarias_actuales: "Canales", canales_actuales: "Canales",
    herramientas_crm: "Accesos Técnicos",
    tono_de_marca: "Voz de Marca", colores_marca: "Voz de Marca",
    puntos_dolor_cliente_ideal: "Puntos de Dolor",
    proceso_de_compra: "Proceso de Venta",
    temporada_alta: "Estacionalidad", temporada_baja: "Estacionalidad",
  };

  const ETIQUETAS: Record<string, string> = {
    nombre_empresa: "Nombre de la empresa", website: "Sitio web",
    sector_industria: "Sector / Industria", pais_operacion: "País de operación",
    ciudad_operacion: "Ciudad principal", redes_sociales: "Redes sociales",
    producto_servicio_principal: "Producto o servicio principal",
    propuesta_de_valor: "Propuesta de valor única",
    ticket_promedio_venta: "Precio / ticket promedio", ciclo_de_venta: "Tiempo que tarda una venta",
    mercado_objetivo: "Descripción del cliente ideal", rango_edad_cliente: "Rango de edad del cliente",
    genero_cliente: "Género predominante", ubicacion_cliente: "Ubicación geográfica",
    ingreso_promedio_cliente: "Nivel de ingreso del cliente",
    competidores_principales: "Competidores principales",
    diferenciadores_vs_competencia: "Diferenciadores vs competencia",
    objetivos_marketing: "Objetivos con la publicidad", kpis_deseados: "KPIs importantes",
    presupuesto_mensual_publicidad: "Presupuesto mensual en publicidad",
    plataformas_publicitarias_actuales: "Plataformas publicitarias",
    canales_actuales: "Otros canales de marketing",
    herramientas_crm: "CRM / herramientas de automatización",
    tono_de_marca: "Tono de comunicación", colores_marca: "Colores de marca",
    puntos_dolor_cliente_ideal: "Problema principal que resuelves",
    proceso_de_compra: "Proceso de compra / contratación",
    temporada_alta: "Temporada alta", temporada_baja: "Temporada baja",
  };

  // Agrupar campos del brief por clave para revisar valores actuales
  const valoresBrief: Record<string, string> = {};
  for (const sec of secciones) {
    const campos = (sec.campos as any[]) ?? [];
    for (const c of campos) {
      if (c.valor && c.valor !== "") valoresBrief[c.clave] = c.valor;
    }
  }

  const pendientes = Object.entries(CAMPO_A_SECCION)
    .filter(([clave]) => !prefillMap[clave] && !valoresBrief[clave])
    .map(([clave, seccion]) => ({ clave, etiqueta: ETIQUETAS[clave] ?? clave, seccion }));

  return (
    <BriefContent
      clienteId={params.clienteId}
      clienteNombre={cliente.nombre}
      empresa={cliente.empresa}
      secciones={secciones as any}
      prefillMap={prefillMap}
      pendientes={pendientes}
      tokenPortal={cliente.tokenPortal}
    />
  );
}
