import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const [briefSecciones, documentos] = await Promise.all([
    prisma.briefSeccion.findMany({
      where: { clienteId },
      orderBy: { orden: "asc" },
    }),
    prisma.documentoCargado.findMany({
      where: { clienteId },
      select: {
        id: true,
        nombreOriginal: true,
        textoProcesado: true,
        extraccionIA: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Extraer campos del brief con valor
  const camposBrief = briefSecciones.flatMap((sec) => {
    const campos = Array.isArray(sec.campos) ? sec.campos : [];
    return campos
      .filter((c: any) => c.valor && String(c.valor).trim())
      .map((c: any) => ({
        seccionCodigo: sec.seccionCodigo,
        seccionNombre: sec.seccionNombre,
        clave: c.clave,
        etiqueta: c.etiqueta,
        valor: String(c.valor).trim(),
      }));
  });

  // Documentos con texto procesado o extracción IA
  const docsConTexto = documentos
    .filter((d) => d.textoProcesado || d.extraccionIA)
    .map((d) => ({
      id: d.id,
      nombre: d.nombreOriginal,
      texto: d.textoProcesado ?? null,
      extractos: d.extraccionIA
        ? (Array.isArray(d.extraccionIA)
            ? d.extraccionIA
            : Object.entries(d.extraccionIA as Record<string, any>).map(([k, v]) => ({ campo: k, valor: v }))
          ).filter((e: any) => e.valor && String(e.valor).trim())
        : [],
      createdAt: d.createdAt,
    }));

  return NextResponse.json({ camposBrief, documentos: docsConTexto });
}
