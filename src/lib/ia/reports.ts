import { chatCompletion } from "./openrouter";
import type { Cliente, Tarea, Fase, Alerta } from "@/generated/prisma";
import { calcularAvanceGlobal } from "@/lib/alcanza/blockers";

interface DatosReporte {
  cliente: Cliente & { accountManager?: { nombre: string } | null };
  tareas: (Tarea & { fase: Fase })[];
  alertasActivas: Alerta[];
  semana: number;
  periodo: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resumirTareasParaIA(tareas: DatosReporte["tareas"]) {
  const completadas = tareas
    .filter((t) => t.estado === "COMPLETADA")
    .map((t) => `- ${t.nombre} (Fase: ${t.fase?.nombre ?? "?"})`)
    .join("\n");

  const enProgreso = tareas
    .filter((t) => t.estado === "EN_PROGRESO")
    .map((t) => `- ${t.nombre} (${t.porcentajeCompletado}% completado)`)
    .join("\n");

  const proximas = tareas
    .filter((t) => t.estado === "PENDIENTE")
    .slice(0, 5)
    .map((t) => `- ${t.nombre} (Fase: ${t.fase?.nombre ?? "?"})`)
    .join("\n");

  return { completadas, enProgreso, proximas };
}

// ─── Reporte TEXTO (WhatsApp / Email) ────────────────────────────────────────

export async function generarReporteTexto(datos: DatosReporte): Promise<string> {
  const avance = calcularAvanceGlobal(datos.tareas);
  const diaEstimado = datos.semana * 7;
  const { completadas, enProgreso, proximas } = resumirTareasParaIA(datos.tareas);

  const prompt = `Eres el Account Manager de AdsHouse, una agencia de publicidad digital.
Estás escribiendo un mensaje de actualización para el cliente ${datos.cliente.nombre} de ${datos.cliente.empresa}.
El objetivo es que el cliente sepa exactamente qué hemos logrado, en qué estamos trabajando ahora y cuál es el siguiente paso concreto que viene.

DATOS DE AVANCE:
- Semana ${datos.semana} de 6 (aproximadamente día ${diaEstimado} de 45)
- Progreso general: ${avance}%
- Account Manager: ${datos.cliente.accountManager?.nombre ?? "el equipo de AdsHouse"}

TAREAS COMPLETADAS:
${completadas || "Ninguna aún"}

EN PROCESO AHORA:
${enProgreso || "Ninguna en progreso actualmente"}

PRÓXIMAS A INICIAR:
${proximas || "Sin tareas próximas registradas"}

ALERTAS O PENDIENTES DEL CLIENTE: ${datos.alertasActivas.length > 0 ? datos.alertasActivas.map((a) => a.titulo).join(", ") : "Ninguna"}

INSTRUCCIONES DE REDACCIÓN:
- Escribe en español, tono cercano y profesional — como si fueras un Account Manager hablándole a su cliente
- NO menciones nombres técnicos de tareas internas como "instanciar template", "sincronizar brief", etc.
- Traduce los logros a lenguaje de negocio: "completamos el análisis de tu marca", "definimos los ángulos creativos", etc.
- Máximo 12 líneas, ideal para WhatsApp
- Usa emojis con moderación (2-3 máximo)
- Termina siempre con UN próximo paso concreto que el cliente debe esperar o en el que necesita participar
- Si hay alertas de pendientes del cliente, menciona qué necesitas de su parte de forma clara y amable
- Firma como: "— ${datos.cliente.accountManager?.nombre ?? "El equipo de AdsHouse"}"`;

  return chatCompletion([{ role: "user", content: prompt }], { max_tokens: 600 });
}

// ─── Reporte HTML (cliente-facing) ───────────────────────────────────────────

export async function generarReporteHTML(datos: DatosReporte): Promise<string> {
  const avance = calcularAvanceGlobal(datos.tareas);
  const diaEstimado = datos.semana * 7;
  const { completadas, enProgreso, proximas } = resumirTareasParaIA(datos.tareas);

  const prompt = `Eres redactor senior de AdsHouse. Genera el contenido narrativo de un reporte de avance para el cliente.
Empresa cliente: ${datos.cliente.empresa} | Contacto: ${datos.cliente.nombre}
Semana ${datos.semana} de 6 | Día ~${diaEstimado} de 45 | Avance: ${avance}%

TAREAS COMPLETADAS:
${completadas || "Ninguna aún"}

EN PROCESO AHORA:
${enProgreso || "Sin tareas activas"}

PRÓXIMAS A INICIAR:
${proximas || "Sin tareas próximas"}

PENDIENTES / ALERTAS: ${datos.alertasActivas.length > 0 ? datos.alertasActivas.map((a) => a.titulo).join("; ") : "Ninguna"}

Genera EXACTAMENTE este JSON (sin markdown, sin texto extra):
{
  "logros": ["frase corta logro 1", "frase corta logro 2", "frase corta logro 3"],
  "estadoActual": "Un párrafo de 2-3 oraciones explicando en qué fase del proceso estamos y qué estamos construyendo ahora.",
  "proximoPaso": "Una oración concreta sobre qué viene en los próximos 7 días.",
  "accionRequerida": "null o una oración si el cliente necesita hacer algo específico (enviar material, aprobar algo, etc.)"
}

REGLAS:
- Lenguaje de negocio, no técnico. "Analizamos tu competencia" no "ejecutamos tarea COMP_AUDIT"
- Los logros deben sonar como valor entregado, no como checkboxes
- estadoActual debe dar contexto del proceso A.L.C.A.N.Z.A. de forma natural (Análisis → Lanzamiento → Creativos → etc.)
- Si no hay logros reales, di "Estamos en la fase inicial, configurando las bases de tu proceso"`;

  let narrativa: {
    logros: string[];
    estadoActual: string;
    proximoPaso: string;
    accionRequerida: string | null;
  };

  try {
    const raw = await chatCompletion([{ role: "user", content: prompt }], { max_tokens: 700 });
    narrativa = JSON.parse(raw.trim());
  } catch {
    narrativa = {
      logros: ["Proceso de onboarding iniciado", "Configuración de herramientas completada"],
      estadoActual: `Estamos en la semana ${datos.semana} del proceso de 45 días, avanzando en las bases estratégicas de tu campaña.`,
      proximoPaso: "En los próximos días recibirás una actualización con los primeros entregables.",
      accionRequerida: null,
    };
  }

  const faseActual = datos.tareas.find((t) => t.estado === "EN_PROGRESO")?.fase?.nombre
    ?? datos.tareas.find((t) => t.estado === "PENDIENTE")?.fase?.nombre
    ?? "Onboarding";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte — ${datos.cliente.empresa}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
  .container { max-width: 680px; margin: 0 auto; padding: 32px 20px; }
  .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 20px; padding: 36px 32px; margin-bottom: 20px; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .header-logo { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.85; }
  .header-semana { font-size: 13px; opacity: 0.75; }
  .empresa { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .periodo { font-size: 14px; opacity: 0.8; margin-bottom: 28px; }
  .progress-row { display: flex; align-items: center; gap: 16px; }
  .progress-bar-wrap { flex: 1; height: 10px; background: rgba(255,255,255,0.25); border-radius: 99px; }
  .progress-bar-fill { height: 100%; background: white; border-radius: 99px; }
  .progress-pct { font-size: 28px; font-weight: 800; white-space: nowrap; }
  .progress-label { font-size: 12px; opacity: 0.75; margin-top: 6px; }
  .fase-chip { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 99px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-top: 16px; }
  .card { background: white; border-radius: 16px; padding: 28px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 16px; }
  .logro-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .logro-item:last-child { border-bottom: none; }
  .logro-check { width: 22px; height: 22px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .logro-check svg { width: 12px; height: 12px; }
  .logro-text { font-size: 14px; color: #374151; line-height: 1.5; }
  .estado-text { font-size: 15px; color: #374151; line-height: 1.7; }
  .proximo-box { background: #eef2ff; border-left: 4px solid #6366f1; border-radius: 0 12px 12px 0; padding: 16px 20px; }
  .proximo-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; margin-bottom: 6px; }
  .proximo-text { font-size: 14px; color: #3730a3; line-height: 1.6; }
  .accion-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 16px 20px; margin-top: 12px; }
  .accion-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #d97706; margin-bottom: 6px; }
  .accion-text { font-size: 14px; color: #92400e; line-height: 1.6; }
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-num { font-size: 26px; font-weight: 800; color: #6366f1; }
  .stat-lbl { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <div class="header-top">
      <span class="header-logo">ADSHOUSE</span>
      <span class="header-semana">Semana ${datos.semana} · ${datos.periodo}</span>
    </div>
    <div class="empresa">${datos.cliente.empresa}</div>
    <div class="periodo">Reporte de avance — Proceso A.L.C.A.N.Z.A.</div>
    <div class="progress-row">
      <div>
        <div class="progress-pct">${avance}%</div>
        <div class="progress-label">completado</div>
      </div>
      <div style="flex:1">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${avance}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.65;margin-top:5px">
          <span>Inicio</span><span>Día ${Math.min(datos.semana * 7, 45)} de 45</span>
        </div>
      </div>
    </div>
    <div class="fase-chip">📍 Fase actual: ${faseActual}</div>
  </div>

  <div class="stats-row">
    <div class="stat">
      <div class="stat-num">${datos.tareas.filter((t) => t.estado === "COMPLETADA").length}</div>
      <div class="stat-lbl">Completadas</div>
    </div>
    <div class="stat">
      <div class="stat-num">${datos.tareas.filter((t) => t.estado === "EN_PROGRESO").length}</div>
      <div class="stat-lbl">En proceso</div>
    </div>
    <div class="stat">
      <div class="stat-num">${datos.tareas.filter((t) => t.estado === "PENDIENTE").length}</div>
      <div class="stat-lbl">Por iniciar</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">✅ Lo que hemos logrado</div>
    ${
      narrativa.logros.length > 0
        ? narrativa.logros
            .map(
              (l) => `<div class="logro-item">
        <div class="logro-check">
          <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6l3 3 5-5" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="logro-text">${l}</div>
      </div>`
            )
            .join("")
        : `<div class="logro-item"><div class="logro-text" style="color:#94a3b8">Estamos en la fase inicial del proceso.</div></div>`
    }
  </div>

  <div class="card">
    <div class="card-title">🔄 En qué estamos ahora</div>
    <div class="estado-text">${narrativa.estadoActual}</div>
  </div>

  <div class="card">
    <div class="card-title">Siguientes pasos</div>
    <div class="proximo-box">
      <div class="proximo-label">Próximos 7 días</div>
      <div class="proximo-text">${narrativa.proximoPaso}</div>
    </div>
    ${
      narrativa.accionRequerida && narrativa.accionRequerida !== "null"
        ? `<div class="accion-box">
        <div class="accion-label">⚡ Necesitamos de ti</div>
        <div class="accion-text">${narrativa.accionRequerida}</div>
      </div>`
        : ""
    }
  </div>

  <div class="footer">
    <p>Generado por <strong>AdsHouse Platform</strong> — ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</p>
    <p style="margin-top:4px">Account Manager: ${datos.cliente.accountManager?.nombre ?? "Equipo AdsHouse"}</p>
  </div>
</div>
</body>
</html>`;
}
