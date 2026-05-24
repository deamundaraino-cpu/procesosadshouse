import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { nombre: true, empresa: true, email: true, tokenPortal: true },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalUrl = `${appUrl}/portal/${cliente.tokenPortal}`;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "[RESEND_API_KEY]") {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@adshouseagencia.com",
      to: cliente.email,
      subject: `Tu portal de seguimiento — ${cliente.empresa}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#4f46e5;border-radius:12px;margin-bottom:16px;">
              <span style="color:white;font-weight:bold;font-size:20px;">A</span>
            </div>
            <h1 style="color:#0f172a;font-size:24px;margin:0;">Hola, ${cliente.nombre}</h1>
            <p style="color:#64748b;margin-top:8px;">Tu portal de seguimiento está listo</p>
          </div>
          <p style="color:#334155;line-height:1.6;">
            Desde este portal podrás ver el avance de tu programa de 45 días Método A.L.C.A.N.Z.A.,
            revisar las entregas que requieren tu aprobación y conocer el estado de cada fase.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${portalUrl}"
               style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:16px;">
              Ver mi portal
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;text-align:center;">
            Este enlace es único para ti. No lo compartas.<br/>
            AdsHouse Agencia · <a href="mailto:onboarding@adshouseagencia.com" style="color:#6366f1;">onboarding@adshouseagencia.com</a>
          </p>
        </div>
      `,
    });
  }

  return NextResponse.json({ portalUrl });
}
