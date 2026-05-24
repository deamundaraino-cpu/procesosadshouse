import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const validarSchema = z.object({
  camposCorregidos: z
    .array(
      z.object({
        campo: z.string(),
        valorCorregido: z.string().nullable(),
        confianzaCorregida: z.number().min(0).max(1),
        notaEquipo: z.string().optional(),
      })
    )
    .optional(),
  validadoPor: z.string(),
});

/**
 * POST /api/documentos/[documentoId]/validar
 * El equipo de AdsHouse revisa la extracción IA antes de exponer al cliente.
 * Puede corregir valores, ajustar confianzas y marcar como validado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentoId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = validarSchema.parse(body);

    const documento = await prisma.documentoCargado.findUnique({
      where: { id: params.documentoId },
    });

    if (!documento) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    let extraccionActualizada = documento.extraccionIA as any;

    // Aplicar correcciones del equipo si las hay
    if (data.camposCorregidos?.length && extraccionActualizada?.campos) {
      for (const correccion of data.camposCorregidos) {
        const idx = extraccionActualizada.campos.findIndex(
          (c: any) => c.campo === correccion.campo
        );
        if (idx >= 0) {
          extraccionActualizada.campos[idx] = {
            ...extraccionActualizada.campos[idx],
            valor: correccion.valorCorregido,
            confianza: correccion.confianzaCorregida,
            corregidoPorEquipo: true,
            notaEquipo: correccion.notaEquipo ?? null,
            conflicto: false, // Al corregir, se resuelve el conflicto
          };
        }
      }
    }

    // Marcar como validado
    const documentoActualizado = await prisma.documentoCargado.update({
      where: { id: params.documentoId },
      data: {
        extraccionIA: extraccionActualizada,
        validadoAt: new Date(),
        validadoPor: data.validadoPor,
        tieneConflictos: extraccionActualizada?.campos?.some(
          (c: any) => c.conflicto && !c.corregidoPorEquipo
        ) ?? false,
      },
    });

    // Resolver alertas de conflicto asociadas a este documento
    await prisma.alerta.updateMany({
      where: {
        referenciaId: params.documentoId,
        tipo: "CONFLICTO_IA",
        estado: "ACTIVA",
      },
      data: { estado: "RESUELTA", resueltaAt: new Date() },
    });

    return NextResponse.json(documentoActualizado);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[POST /api/documentos/validar]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
