import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const secciones = await prisma.briefSeccion.findMany({
    where: { clienteId },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json(secciones);
}

const actualizarSeccionSchema = z.object({
  clienteId: z.string(),
  seccionCodigo: z.string(),
  campos: z.array(
    z.object({
      clave: z.string(),
      etiqueta: z.string(),
      valor: z.any(),
      confianza: z.number().min(0).max(1).default(1),
      origen: z.enum(["IA", "CLIENTE", "EQUIPO", "IMPORTADO"]).default("CLIENTE"),
      verificadoPor: z.string().optional(),
      timestamp: z.string().optional(),
    })
  ),
  completado: z.number().min(0).max(100).optional(),
  clienteReviso: z.boolean().optional(),
  equipoReviso: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = actualizarSeccionSchema.parse(body);

    // Calcular % completado automáticamente si no se pasa
    const completado =
      data.completado ??
      Math.round(
        (data.campos.filter((c) => c.valor !== null && c.valor !== "").length /
          Math.max(data.campos.length, 1)) *
          100
      );

    const seccion = await prisma.briefSeccion.update({
      where: {
        clienteId_seccionCodigo: {
          clienteId: data.clienteId,
          seccionCodigo: data.seccionCodigo,
        },
      },
      data: {
        campos: data.campos.map((c) => ({
          ...c,
          timestamp: c.timestamp ?? new Date().toISOString(),
        })),
        completado,
        ...(data.clienteReviso !== undefined ? { clienteReviso: data.clienteReviso } : {}),
        ...(data.equipoReviso !== undefined ? { equipoReviso: data.equipoReviso } : {}),
      },
    });

    return NextResponse.json(seccion);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
