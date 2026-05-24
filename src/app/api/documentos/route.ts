import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { extraerInformacionDocumento } from "@/lib/ia/extract";
import { unificarExtraccionesMultidocumento } from "@/lib/ia/confidence";
import { sincronizarExtraccionConBrief } from "@/lib/ia/sync-brief";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const documentos = await prisma.documentoCargado.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documentos);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const formData = await request.formData();
  const archivo = formData.get("archivo") as File | null;
  if (!archivo) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  try {
    // Leer bytes del archivo
    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extraer texto según tipo
    let textoExtraido = "";
    const mime = archivo.type;

    if (mime === "application/pdf" || archivo.name.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParse(buffer);
      textoExtraido = parsed.text;
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      archivo.name.endsWith(".docx")
    ) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      textoExtraido = result.value;
    } else if (mime === "text/plain" || archivo.name.endsWith(".txt")) {
      textoExtraido = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: `Formato no soportado: ${mime}. Use PDF, DOCX o TXT.` },
        { status: 400 }
      );
    }

    // Subir a Supabase Storage (opcional — si falla, el doc igual se guarda en DB)
    const supabase = await createSupabaseServer();
    const nombreStorage = `${clienteId}/${Date.now()}-${archivo.name}`;
    let storageUrl = "";
    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from("documentos")
        .upload(nombreStorage, buffer, { contentType: mime });
      if (!storageError && storageData) storageUrl = storageData.path;
    } catch {
      // Storage es opcional — el texto ya está en DB
    }

    // Guardar registro en DB
    const documento = await prisma.documentoCargado.create({
      data: {
        clienteId,
        nombre: archivo.name,
        nombreOriginal: archivo.name,
        mimeType: mime,
        tamanoBytes: buffer.length,
        storageUrl,
        textoProcesado: textoExtraido,
      },
    });

    // Procesar con IA en background (retornamos el doc, el procesamiento continúa)
    procesarConIA(documento.id, clienteId, textoExtraido, archivo.name).catch(
      console.error
    );

    return NextResponse.json(documento, { status: 201 });
  } catch (err) {
    console.error("[POST /api/documentos]", err);
    return NextResponse.json({ error: "Error procesando documento" }, { status: 500 });
  }
}

async function procesarConIA(
  documentoId: string,
  clienteId: string,
  texto: string,
  nombreDoc: string
) {
  try {
    // Extraer con IA
    const resultado = await extraerInformacionDocumento(texto, nombreDoc);

    // Actualizar documento con extracción
    await prisma.documentoCargado.update({
      where: { id: documentoId },
      data: {
        extraccionIA: resultado as any,
        procesadoAt: new Date(),
        tieneConflictos: resultado.campos.some((c) => c.conflicto),
      },
    });

    // Unificar con extracciones de otros documentos del cliente
    const todosDocumentos = await prisma.documentoCargado.findMany({
      where: { clienteId, procesadoAt: { not: null } },
      select: { nombre: true, extraccionIA: true },
    });

    const extracciones = todosDocumentos
      .filter((d) => d.extraccionIA)
      .map((d) => ({
        docNombre: d.nombre,
        campos: (d.extraccionIA as any).campos ?? [],
      }));

    const unificado = unificarExtraccionesMultidocumento(extracciones);

    // Crear alertas si hay conflictos o campos faltantes críticos
    if (unificado.conflictos.length > 0) {
      await prisma.alerta.create({
        data: {
          clienteId,
          tipo: "CONFLICTO_IA",
          severidad: "IMPORTANTE",
          titulo: `${unificado.conflictos.length} conflicto(s) detectados en documentos`,
          descripcion: `Los siguientes campos tienen valores contradictorios entre documentos: ${unificado.conflictos.map((c) => c.campo).join(", ")}`,
          referenciaId: documentoId,
          referenciaTipo: "DOCUMENTO",
        },
      });
    }

    // Sincronizar extracción con el Brief automáticamente
    const sync = await sincronizarExtraccionConBrief(clienteId);

    // Crear alerta IA generó extracción + estado del brief
    const confianzaPromedio = Math.round(
      resultado.campos.filter((c) => c.valor).reduce((s, c) => s + c.confianza, 0) /
      Math.max(resultado.totalCamposEncontrados, 1) * 100
    );
    await prisma.alerta.create({
      data: {
        clienteId,
        tipo: "IA_GENERO",
        severidad: "COMPLEMENTARIO",
        titulo: `IA procesó "${nombreDoc}" — ${sync.camposActualizados.length} campos actualizados en el Brief`,
        descripcion: `${resultado.totalCamposEncontrados} campos encontrados (${confianzaPromedio}% confianza promedio). ${sync.camposPendientes.length} campos aún pendientes en el Brief.`,
        referenciaId: documentoId,
        referenciaTipo: "DOCUMENTO",
      },
    });

    // Si hay campos pendientes, crear alerta de tarea
    if (sync.camposPendientes.length > 0) {
      await prisma.alerta.create({
        data: {
          clienteId,
          tipo: "CAMPOS_PENDIENTES",
          severidad: "IMPORTANTE",
          titulo: `${sync.camposPendientes.length} campos del Brief pendientes de completar`,
          descripcion: sync.camposPendientes
            .slice(0, 10)
            .map((c) => `• ${c.etiqueta} (${c.seccion})`)
            .join("\n") + (sync.camposPendientes.length > 10 ? `\n...y ${sync.camposPendientes.length - 10} más` : ""),
          referenciaId: clienteId,
          referenciaTipo: "CLIENTE",
        },
      });
    }
  } catch (err) {
    console.error(`[procesarConIA] doc ${documentoId}:`, err);
  }
}
