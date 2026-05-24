import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { extraerInformacionDocumento } from "@/lib/ia/extract";
import { unificarExtraccionesMultidocumento } from "@/lib/ia/confidence";
import { sincronizarExtraccionConBrief } from "@/lib/ia/sync-brief";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { documentoId } = await request.json();
  if (!documentoId) return NextResponse.json({ error: "documentoId requerido" }, { status: 400 });

  const doc = await prisma.documentoCargado.findUnique({ where: { id: documentoId } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (!doc.textoProcesado) return NextResponse.json({ error: "Sin texto extraído" }, { status: 400 });

  try {
    const resultado = await extraerInformacionDocumento(doc.textoProcesado, doc.nombre);

    await prisma.documentoCargado.update({
      where: { id: documentoId },
      data: {
        extraccionIA: resultado as any,
        procesadoAt: new Date(),
        tieneConflictos: resultado.campos.some((c) => c.conflicto),
      },
    });

    // Detectar conflictos entre documentos
    const todosDocumentos = await prisma.documentoCargado.findMany({
      where: { clienteId: doc.clienteId, procesadoAt: { not: null } },
      select: { nombre: true, extraccionIA: true },
    });
    const extracciones = todosDocumentos
      .filter((d) => d.extraccionIA)
      .map((d) => ({ docNombre: d.nombre, campos: (d.extraccionIA as any).campos ?? [] }));
    const unificado = unificarExtraccionesMultidocumento(extracciones);

    if (unificado.conflictos.length > 0) {
      await prisma.alerta.create({
        data: {
          clienteId: doc.clienteId,
          tipo: "CONFLICTO_IA",
          severidad: "IMPORTANTE",
          titulo: `${unificado.conflictos.length} conflicto(s) detectados`,
          descripcion: `Campos contradictorios: ${unificado.conflictos.map((c) => c.campo).join(", ")}`,
          referenciaId: documentoId,
          referenciaTipo: "DOCUMENTO",
        },
      });
    }

    // Sincronizar con el Brief automáticamente
    const sync = await sincronizarExtraccionConBrief(doc.clienteId);

    await prisma.alerta.create({
      data: {
        clienteId: doc.clienteId,
        tipo: "IA_GENERO",
        severidad: "COMPLEMENTARIO",
        titulo: `IA procesó "${doc.nombre}" — ${sync.camposActualizados.length} campos actualizados en el Brief`,
        descripcion: `${resultado.totalCamposEncontrados} campos encontrados. ${sync.camposPendientes.length} campos aún pendientes en el Brief.`,
        referenciaId: documentoId,
        referenciaTipo: "DOCUMENTO",
      },
    });

    if (sync.camposPendientes.length > 0) {
      await prisma.alerta.create({
        data: {
          clienteId: doc.clienteId,
          tipo: "CAMPOS_PENDIENTES",
          severidad: "IMPORTANTE",
          titulo: `${sync.camposPendientes.length} campos del Brief pendientes de completar`,
          descripcion: sync.camposPendientes
            .slice(0, 10)
            .map((c) => `• ${c.etiqueta} (${c.seccion})`)
            .join("\n") + (sync.camposPendientes.length > 10 ? `\n...y ${sync.camposPendientes.length - 10} más` : ""),
          referenciaId: doc.clienteId,
          referenciaTipo: "CLIENTE",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      camposExtraidos: resultado.totalCamposEncontrados,
      camposEnBrief: sync.camposActualizados.length,
      pendientes: sync.camposPendientes.length,
    });
  } catch (err: any) {
    console.error("[reprocesar]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
