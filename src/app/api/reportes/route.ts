import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generarReporteTexto, generarReporteHTML } from "@/lib/ia/reports";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");

  const reportes = await prisma.reporte.findMany({
    where: clienteId ? { clienteId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(reportes);
}

const generarSchema = z.object({
  clienteId: z.string(),
  formato: z.enum(["HTML", "TEXTO"]),
  tipo: z.string().default("SEMANAL"),
  periodo: z.string().optional(),
  semana: z.number().default(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = generarSchema.parse(body);

    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
      include: { accountManager: { select: { nombre: true } } },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const tareas = await prisma.tarea.findMany({
      where: { clienteId: data.clienteId },
      include: { fase: true },
    });

    const alertasActivas = await prisma.alerta.findMany({
      where: { clienteId: data.clienteId, estado: "ACTIVA" },
    });

    const periodo =
      data.periodo ?? `Semana ${data.semana} (${new Date().toLocaleDateString("es-MX")})`;

    const datosReporte = {
      cliente,
      tareas: tareas as any,
      alertasActivas,
      semana: data.semana,
      periodo,
    };

    let contenido = "";
    if (data.formato === "HTML") {
      contenido = await generarReporteHTML(datosReporte);
    } else {
      contenido = await generarReporteTexto(datosReporte);
    }

    const reporte = await prisma.reporte.create({
      data: {
        clienteId: data.clienteId,
        tipo: data.tipo,
        formato: data.formato,
        titulo: `Reporte ${data.tipo} — ${cliente.empresa} — ${periodo}`,
        contenido,
        periodo,
      },
    });

    return NextResponse.json(reporte, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[POST /api/reportes]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
