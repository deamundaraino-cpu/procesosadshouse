import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const createSchema = z.object({
  seccion: z.string().optional(),
  texto: z.string().min(1),
  estado: z.enum(["PENDIENTE", "OK", "NO_APLICA"]).default("PENDIENTE"),
  observacion: z.string().optional(),
  orden: z.number().default(0),
});

const updateSchema = z.object({
  itemId: z.string(),
  estado: z.enum(["PENDIENTE", "OK", "NO_APLICA"]).optional(),
  observacion: z.string().optional(),
  texto: z.string().optional(),
  seccion: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const items = await prisma.subItemTarea.findMany({
    where: { tareaId: params.tareaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const item = await prisma.subItemTarea.create({
      data: { tareaId: params.tareaId, ...data },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { itemId, ...rest } = updateSchema.parse(body);

    const item = await prisma.subItemTarea.update({
      where: { id: itemId, tareaId: params.tareaId },
      data: rest,
    });

    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });

  await prisma.subItemTarea.delete({ where: { id: itemId, tareaId: params.tareaId } });
  return NextResponse.json({ ok: true });
}
