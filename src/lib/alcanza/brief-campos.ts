import type { CampoForm } from "@/components/forms/dynamic/FormEngine";

// Definición de los campos del brief por sección.
// Fuente única: la usan tanto el brief interno (equipo) como el público (cliente).
export const CAMPOS_POR_SECCION: Record<string, CampoForm[]> = {
  EMPRESA: [
    { clave: "nombre_empresa", etiqueta: "Nombre de la empresa", tipo: "texto", requerido: true },
    { clave: "website", etiqueta: "Sitio web", tipo: "url", placeholder: "https://tuempresa.com" },
    { clave: "sector_industria", etiqueta: "Sector / Industria", tipo: "texto", requerido: true },
    { clave: "pais_operacion", etiqueta: "País de operación", tipo: "texto" },
    { clave: "ciudad_operacion", etiqueta: "Ciudad principal", tipo: "texto" },
    { clave: "redes_sociales", etiqueta: "Redes sociales", tipo: "textarea", placeholder: "Instagram: @cuenta\nFacebook: /pagina" },
  ],
  PRODUCTO: [
    { clave: "producto_servicio_principal", etiqueta: "¿Qué vendes? Describe tu producto o servicio principal", tipo: "textarea", requerido: true },
    { clave: "propuesta_de_valor", etiqueta: "¿Cuál es tu propuesta de valor única?", tipo: "textarea", requerido: true, ayuda: "¿Qué te hace diferente de la competencia?" },
    { clave: "ticket_promedio_venta", etiqueta: "Precio o ticket promedio de venta", tipo: "texto", placeholder: "$500 USD / $10,000 MXN" },
    { clave: "ciclo_de_venta", etiqueta: "¿Cuánto tiempo tarda una venta?", tipo: "select", opciones: ["Inmediata", "1-3 días", "1-2 semanas", "1 mes+"] },
  ],
  MERCADO_OBJETIVO: [
    { clave: "mercado_objetivo", etiqueta: "¿A quién le vendes? Describe tu cliente ideal", tipo: "textarea", requerido: true },
    { clave: "rango_edad_cliente", etiqueta: "Rango de edad del cliente ideal", tipo: "texto", placeholder: "25-45 años" },
    { clave: "genero_cliente", etiqueta: "Género predominante", tipo: "select", opciones: ["Masculino", "Femenino", "Ambos"] },
    { clave: "ubicacion_cliente", etiqueta: "Ubicación geográfica del cliente", tipo: "texto" },
    { clave: "ingreso_promedio_cliente", etiqueta: "Nivel de ingreso del cliente", tipo: "select", opciones: ["Bajo (<$15k USD/año)", "Medio ($15k-$60k)", "Medio-alto ($60k-$120k)", "Alto ($120k+)"] },
  ],
  COMPETENCIA: [
    { clave: "competidores_principales", etiqueta: "¿Quiénes son tus principales competidores?", tipo: "textarea", requerido: true },
    { clave: "diferenciadores_vs_competencia", etiqueta: "¿Qué te diferencia de ellos?", tipo: "textarea" },
  ],
  OBJETIVOS: [
    { clave: "objetivos_marketing", etiqueta: "¿Cuáles son tus objetivos con la publicidad?", tipo: "textarea", requerido: true, ayuda: "Ej: Generar 50 leads al mes, vender 100 productos, aumentar reconocimiento de marca" },
    { clave: "kpis_deseados", etiqueta: "¿Qué métricas son más importantes para ti?", tipo: "multi_select", opciones: ["ROAS", "CPA", "CPL", "CTR", "ROAS", "Conversiones", "Alcance", "Engagement", "Ventas directas"] },
  ],
  PRESUPUESTO: [
    { clave: "presupuesto_mensual_publicidad", etiqueta: "Presupuesto mensual en publicidad (USD o MXN)", tipo: "texto", requerido: true, placeholder: "$1,000 USD" },
  ],
  CANALES: [
    { clave: "plataformas_publicitarias_actuales", etiqueta: "¿En qué plataformas publicitarias estás actualmente?", tipo: "multi_select", opciones: ["Google Ads", "Meta Ads", "TikTok Ads", "YouTube", "LinkedIn", "Twitter/X", "Ninguna"] },
    { clave: "canales_actuales", etiqueta: "Otros canales de marketing que usas", tipo: "textarea", placeholder: "Email marketing, WhatsApp, orgánico, etc." },
  ],
  HISTORIAL_CAMPANAS: [
    { clave: "historial_inversión_publicitaria", etiqueta: "¿Cuánto has invertido en publicidad en los últimos 6 meses?", tipo: "texto" },
    { clave: "resultados_previos_campanas", etiqueta: "¿Cuáles han sido tus mejores y peores resultados en publicidad?", tipo: "textarea" },
  ],
  METRICAS_ACTUALES: [
    { clave: "metricas_actuales", etiqueta: "¿Cuáles son tus métricas actuales? (si las tienes)", tipo: "textarea", placeholder: "CTR actual: 2%, CPC: $0.50, ROAS: 2.5x..." },
  ],
  ACCESOS_TECNICOS: [
    { clave: "herramientas_crm", etiqueta: "¿Qué CRM o herramientas de automatización usas?", tipo: "texto", placeholder: "HubSpot, Klaviyo, Salesforce, etc." },
  ],
  LANDING_PAGES: [
    { clave: "landing_pages", etiqueta: "URLs de landing pages o páginas de destino actuales", tipo: "textarea", placeholder: "https://tuempresa.com/oferta-especial" },
  ],
  CRM: [
    { clave: "crm_integraciones", etiqueta: "Describe tus automatizaciones actuales de marketing", tipo: "textarea" },
  ],
  BRAND_VOICE: [
    { clave: "tono_de_marca", etiqueta: "¿Cómo es el tono de comunicación de tu marca?", tipo: "multi_select", opciones: ["Profesional", "Amigable", "Inspiracional", "Urgente", "Educativo", "Divertido", "Premium", "Cercano"] },
    { clave: "colores_marca", etiqueta: "Colores principales de la marca", tipo: "texto", placeholder: "Azul #003087, Naranja #FF6B35" },
  ],
  RESTRICCIONES: [
    { clave: "restricciones_publicidad", etiqueta: "¿Hay palabras, imágenes o mensajes que NO se deben usar?", tipo: "textarea" },
  ],
  CASOS_EXITO: [
    { clave: "casos_exito_cliente", etiqueta: "Comparte un caso de éxito o testimonio de cliente", tipo: "textarea" },
  ],
  PUNTOS_DOLOR: [
    { clave: "puntos_dolor_cliente_ideal", etiqueta: "¿Cuál es el mayor problema que tu producto/servicio resuelve?", tipo: "textarea", requerido: true },
  ],
  PROCESO_VENTA: [
    { clave: "proceso_de_compra", etiqueta: "Describe el proceso de compra/contratación", tipo: "textarea", ayuda: "¿Cómo pasa alguien de ser desconocido a cliente?" },
  ],
  TICKET_PROMEDIO: [
    { clave: "ltv_cliente", etiqueta: "¿Cuánto vale un cliente durante toda su vida contigo? (LTV)", tipo: "texto", placeholder: "$3,000 USD de promedio" },
  ],
  ESTACIONALIDAD: [
    { clave: "temporada_alta", etiqueta: "¿Cuándo es tu temporada alta?", tipo: "texto", placeholder: "Noviembre-Enero" },
    { clave: "temporada_baja", etiqueta: "¿Cuándo es tu temporada baja?", tipo: "texto" },
  ],
  REFERENCIAS: [
    { clave: "referencias_creativas", etiqueta: "Comparte referencias de anuncios o marcas que te gustan", tipo: "textarea", placeholder: "URLs o descripciones de anuncios de referencia" },
  ],
  NOTAS_ADICIONALES: [
    { clave: "notas_adicionales", etiqueta: "¿Hay algo más que debamos saber?", tipo: "textarea" },
    {
      clave: "archivos_cliente",
      etiqueta: "Sube documentos adicionales (pitch deck, reportes, branding, etc.)",
      tipo: "archivo",
      ayuda: "PDF, Word, imágenes. Máximo 10 archivos.",
    },
  ],
};
