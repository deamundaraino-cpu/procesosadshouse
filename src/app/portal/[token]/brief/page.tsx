import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CAMPOS_POR_SECCION } from "@/lib/alcanza/brief-campos";
import type { SeccionForm } from "@/components/forms/dynamic/FormEngine";
import BriefPublico from "./BriefPublico";

export const dynamic = "force-dynamic";

export default async function BriefPublicoPage({
  params,
}: {
  params: { token: string };
}) {
  const cliente = await prisma.cliente.findUnique({
    where: { tokenPortal: params.token },
    select: { id: true, nombre: true, empresa: true, estado: true },
  });
  if (!cliente || cliente.estado === "CANCELADO") notFound();

  const secciones = await prisma.briefSeccion.findMany({
    where: { clienteId: cliente.id },
    orderBy: { orden: "asc" },
  });

  // Prellenar con lo ya guardado para que el cliente pueda retomar donde lo dejó
  const seccionesForm: SeccionForm[] = secciones.map((sec) => {
    const guardados: Record<string, any> = {};
    for (const c of (sec.campos as any[]) ?? []) {
      if (c?.clave && c.valor !== null && c.valor !== "") guardados[c.clave] = c;
    }

    return {
      codigo: sec.seccionCodigo,
      titulo: sec.seccionNombre,
      campos: (CAMPOS_POR_SECCION[sec.seccionCodigo] ?? []).map((campo) => ({
        ...campo,
        prefill: guardados[campo.clave]?.valor,
      })),
    };
  });

  const avance = secciones.length
    ? Math.round(secciones.reduce((a, s) => a + s.completado, 0) / secciones.length)
    : 0;

  return (
    <BriefPublico
      token={params.token}
      clienteId={cliente.id}
      clienteNombre={cliente.nombre}
      empresa={cliente.empresa}
      secciones={seccionesForm.filter((s) => s.campos.length > 0)}
      avanceInicial={avance}
    />
  );
}
