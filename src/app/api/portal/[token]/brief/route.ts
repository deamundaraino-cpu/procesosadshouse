import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

// El cliente se resuelve SIEMPRE desde el token de la URL.
// Nunca se acepta un clienteId del body: el token es la única autorización.
async function clientePorToken(token: string) {
  return prisma.cliente.findUnique({
    where: { tokenPortal: token },
    select: { id: true, nombre: true, empresa: true, estado: true },
  });
}

const guardarSeccionSchema = z.object({
  seccionCodigo: z.string(),
  campos: z.array(
    z.object({
      clave: z.string(),
      etiqueta: z.string(),
      valor: z.any(),
    })
  ),
});

// ─── Autoguardado de una sección ─────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const cliente = await clientePorToken(params.token);
  if (!cliente) return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  if (cliente.estado === "CANCELADO") {
    return NextResponse.json({ error: "Este formulario ya no está disponible" }, { status: 410 });
  }

  try {
    const data = guardarSeccionSchema.parse(await request.json());

    const campos = data.campos.map((c) => ({
      clave: c.clave,
      etiqueta: c.etiqueta,
      valor: c.valor ?? null,
      confianza: 1,
      origen: "CLIENTE" as const,
      timestamp: new Date().toISOString(),
    }));

    const completado = Math.round(
      (campos.filter((c) => c.valor !== null && c.valor !== "").length /
        Math.max(campos.length, 1)) *
        100
    );

    // updateMany acota por clienteId: el cliente solo puede tocar sus secciones
    const res = await prisma.briefSeccion.updateMany({
      where: { clienteId: cliente.id, seccionCodigo: data.seccionCodigo },
      data: { campos, completado, clienteReviso: true },
    });

    if (res.count === 0) {
      return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, completado });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/portal/[token]/brief]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── El cliente terminó: avisar al equipo ────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const cliente = await clientePorToken(params.token);
  if (!cliente) return NextResponse.json({ error: "Token inválido" }, { status: 403 });

  try {
    const secciones = await prisma.briefSeccion.findMany({
      where: { clienteId: cliente.id },
      select: { seccionNombre: true, completado: true },
    });

    const incompletas = secciones.filter((s) => s.completado < 100);
    const avance = secciones.length
      ? Math.round(secciones.reduce((a, s) => a + s.completado, 0) / secciones.length)
      : 0;

    await prisma.alerta.create({
      data: {
        clienteId: cliente.id,
        tipo: "CAMPOS_PENDIENTES",
        severidad: incompletas.length > 0 ? "IMPORTANTE" : "COMPLEMENTARIO",
        titulo:
          incompletas.length > 0
            ? `${cliente.empresa} envió el brief (${avance}% completo)`
            : `${cliente.empresa} completó el brief al 100%`,
        descripcion:
          incompletas.length > 0
            ? `Secciones sin terminar: ${incompletas.map((s) => s.seccionNombre).join(", ")}`
            : "El cliente rellenó todas las secciones del brief desde el portal.",
        referenciaTipo: "CLIENTE",
        referenciaId: cliente.id,
      },
    });

    return NextResponse.json({ ok: true, avance, incompletas: incompletas.length });
  } catch (err) {
    console.error("[POST /api/portal/[token]/brief]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
