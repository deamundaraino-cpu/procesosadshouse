import { NextRequest, NextResponse } from "next/server";
import { ejecutarMotorAlertas } from "@/lib/alcanza/alert-engine";

// Invocado por Vercel Cron diariamente a las 8am (América/Mexico_City)
// También puede llamarse manualmente con ?secret=CRON_SECRET
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const cronHeader = request.headers.get("authorization");

  const autorizado =
    (secret && secret === process.env.CRON_SECRET) ||
    cronHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!autorizado && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await ejecutarMotorAlertas();
    console.log("[Cron alertas]", resultado);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("[Cron alertas] Error:", err);
    return NextResponse.json({ error: "Error en motor de alertas" }, { status: 500 });
  }
}
