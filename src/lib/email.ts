import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@adshouseagencia.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isResendConfigured() {
  return !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "[RESEND_API_KEY]";
}

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ─── Plantilla base ───────────────────────────────────────────────────────────

function htmlBase(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#4f46e5;border-radius:12px;">
        <span style="color:white;font-weight:800;font-size:22px;">A</span>
      </div>
    </div>
    <div style="background:white;border-radius:16px;padding:40px;border:1px solid #e2e8f0;">
      ${contenido}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      AdsHouse Agencia · <a href="mailto:${FROM}" style="color:#6366f1;">${FROM}</a>
    </p>
  </div>
</body>
</html>`;
}

function boton(texto: string, url: string, color = "#4f46e5"): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:${color};color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">${texto}</a>
  </div>`;
}

// ─── 1. Enviar link del portal al cliente ─────────────────────────────────────

export async function enviarPortalLink(cliente: {
  nombre: string;
  empresa: string;
  email: string;
  tokenPortal: string;
}) {
  if (!isResendConfigured()) return;
  const url = `${APP_URL}/portal/${cliente.tokenPortal}`;

  await getResend().emails.send({
    from: FROM,
    to: cliente.email,
    subject: `Tu portal de seguimiento está listo — ${cliente.empresa}`,
    html: htmlBase(`
      <h1 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Hola, ${cliente.nombre} 👋</h1>
      <p style="color:#64748b;margin:0 0 20px;">Tu portal de seguimiento del programa de onboarding 45 días está listo.</p>
      <p style="color:#334155;line-height:1.7;">Desde aquí podrás ver el avance de cada fase del <strong>Método A.L.C.A.N.Z.A.</strong>, revisar entregables y aprobar los materiales que el equipo prepare para ti.</p>
      ${boton("Ver mi portal", url)}
      <p style="color:#94a3b8;font-size:13px;text-align:center;">Este enlace es único para ti. No lo compartas.</p>
    `),
  });
}

// ─── 2. Notificar aprobación solicitada (al cliente) ──────────────────────────

export async function enviarAprobacionSolicitada(params: {
  clienteNombre: string;
  clienteEmail: string;
  clienteEmpresa: string;
  tokenPortal: string;
  itemNombre: string;
  itemTipo: string;
  deadline?: Date | null;
}) {
  if (!isResendConfigured()) return;
  const url = `${APP_URL}/portal/${params.tokenPortal}`;
  const deadlineStr = params.deadline
    ? `<p style="color:#f59e0b;font-size:13px;margin-top:8px;">⏰ Fecha límite de aprobación: <strong>${params.deadline.toLocaleDateString("es-MX", { dateStyle: "long" })}</strong></p>`
    : "";

  await getResend().emails.send({
    from: FROM,
    to: params.clienteEmail,
    subject: `Tienes un entregable para revisar — ${params.clienteEmpresa}`,
    html: htmlBase(`
      <h1 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Hola, ${params.clienteNombre}</h1>
      <p style="color:#64748b;margin:0 0 20px;">El equipo de AdsHouse ha preparado algo que requiere tu revisión y aprobación.</p>
      <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid #6366f1;">
        <p style="margin:0;font-weight:600;color:#1e293b;">${params.itemNombre}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Tipo: ${params.itemTipo}</p>
        ${deadlineStr}
      </div>
      <p style="color:#334155;line-height:1.7;">Ingresa a tu portal para ver el material y aprobar o solicitar cambios.</p>
      ${boton("Revisar y aprobar", url, "#4f46e5")}
    `),
  });
}

// ─── 3. Notificar resultado de aprobación (al account manager) ────────────────

export async function enviarResultadoAprobacion(params: {
  amEmail: string;
  amNombre: string;
  clienteEmpresa: string;
  itemNombre: string;
  estado: "APROBADO" | "RECHAZADO";
  motivoRechazo?: string | null;
  clienteId: string;
}) {
  if (!isResendConfigured()) return;
  const url = `${APP_URL}/clientes/${params.clienteId}/entregables`;
  const aprobado = params.estado === "APROBADO";

  await getResend().emails.send({
    from: FROM,
    to: params.amEmail,
    subject: `${aprobado ? "✅ Aprobado" : "❌ Rechazado"}: ${params.itemNombre} — ${params.clienteEmpresa}`,
    html: htmlBase(`
      <h1 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Hola, ${params.amNombre}</h1>
      <p style="color:#64748b;margin:0 0 20px;">El cliente <strong>${params.clienteEmpresa}</strong> acaba de ${aprobado ? "aprobar" : "rechazar"} un entregable.</p>
      <div style="background:${aprobado ? "#f0fdf4" : "#fef2f2"};border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid ${aprobado ? "#22c55e" : "#ef4444"};">
        <p style="margin:0;font-weight:600;color:#1e293b;">${params.itemNombre}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${aprobado ? "#16a34a" : "#dc2626"};">${aprobado ? "Aprobado ✓" : "Rechazado ✗"}</p>
        ${!aprobado && params.motivoRechazo ? `<p style="margin:8px 0 0;font-size:13px;color:#7f1d1d;"><strong>Motivo:</strong> ${params.motivoRechazo}</p>` : ""}
      </div>
      ${boton("Ver entregables", url, aprobado ? "#16a34a" : "#dc2626")}
    `),
  });
}

// ─── 4. Notificar alerta al equipo ────────────────────────────────────────────

export async function enviarAlertaEquipo(params: {
  emails: string[];
  clienteEmpresa: string;
  clienteId: string;
  titulo: string;
  descripcion: string;
  severidad: "CRITICO" | "IMPORTANTE" | "COMPLEMENTARIO";
}) {
  if (!isResendConfigured() || params.emails.length === 0) return;
  const url = `${APP_URL}/clientes/${params.clienteId}/tareas`;
  const colores = {
    CRITICO: { bg: "#fef2f2", border: "#ef4444", text: "#dc2626", label: "CRÍTICO" },
    IMPORTANTE: { bg: "#fffbeb", border: "#f59e0b", text: "#d97706", label: "IMPORTANTE" },
    COMPLEMENTARIO: { bg: "#eff6ff", border: "#6366f1", text: "#4f46e5", label: "COMPLEMENTARIO" },
  };
  const c = colores[params.severidad];

  await getResend().emails.send({
    from: FROM,
    to: params.emails,
    subject: `[${c.label}] ${params.titulo} — ${params.clienteEmpresa}`,
    html: htmlBase(`
      <h1 style="color:#0f172a;font-size:20px;margin:0 0 8px;">Alerta en ${params.clienteEmpresa}</h1>
      <div style="background:${c.bg};border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid ${c.border};">
        <p style="margin:0;font-weight:700;color:${c.text};">${c.label}</p>
        <p style="margin:6px 0 0;font-weight:600;color:#1e293b;">${params.titulo}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#475569;">${params.descripcion}</p>
      </div>
      ${boton("Ver cliente", url)}
    `),
  });
}

// ─── 5. Reporte semanal ───────────────────────────────────────────────────────

export async function enviarReporteSemanal(params: {
  emails: string[];
  clienteEmpresa: string;
  clienteId: string;
  semana: number;
  avance: number;
  htmlReporte?: string;
}) {
  if (!isResendConfigured() || params.emails.length === 0) return;
  const url = `${APP_URL}/clientes/${params.clienteId}/reportes`;

  await getResend().emails.send({
    from: FROM,
    to: params.emails,
    subject: `Reporte semana ${params.semana} — ${params.clienteEmpresa} (${params.avance}% avance)`,
    html: params.htmlReporte ?? htmlBase(`
      <h1 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Reporte Semana ${params.semana}</h1>
      <p style="color:#64748b;">Cliente: <strong>${params.clienteEmpresa}</strong></p>
      <div style="text-align:center;margin:28px 0;">
        <span style="font-size:56px;font-weight:800;color:#4f46e5;">${params.avance}%</span>
        <p style="color:#64748b;margin-top:4px;">Avance global del proceso</p>
      </div>
      ${boton("Ver reporte completo", url)}
    `),
  });
}
