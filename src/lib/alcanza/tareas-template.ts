import type { Rol, TipoAprobador } from "@/generated/prisma";

export interface TareaTemplateData {
  faseCodigo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  diaInicio: number;
  duracionDias: number;
  esParalela: boolean;
  requiereAprobacion: boolean;
  tipoAprobador?: TipoAprobador;
  puntoIA: boolean;
  nivelAutomatizacionIA: number;
  responsableRoles: Rol[];
  subtareas: string[];
  entregablesTemplate: { nombre: string; tipo: string }[];
  bloqueadoresPor: string[]; // códigos de tareas prereq
}

export const TAREAS_TEMPLATE: TareaTemplateData[] = [
  // ─── FASE A1: ANÁLISIS (Días 1-7) ─────────────────────────────────────────

  {
    faseCodigo: "A1",
    codigo: "A1.1",
    nombre: "Prospección y Calificación",
    descripcion:
      "Evaluación inicial del cliente potencial, revisión de fit y calificación antes del ingreso formal",
    diaInicio: 0,
    duracionDias: 1,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 40,
    responsableRoles: ["DIRECTOR", "ACCOUNT_MANAGER"],
    subtareas: [
      "Revisar perfil del prospecto (web, redes, sector)",
      "Evaluar presupuesto y objetivos preliminares",
      "Calificar fit con servicios de AdsHouse",
      "Definir Account Manager asignado",
      "Registrar cliente en sistema",
    ],
    entregablesTemplate: [
      { nombre: "Ficha de Prospecto", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: [],
  },
  {
    faseCodigo: "A1",
    codigo: "A1.2",
    nombre: "Kick-Off",
    descripcion:
      "Reunión de inicio con el cliente. Presentación del método, expectativas y recopilación inicial de información",
    diaInicio: 1,
    duracionDias: 1,
    esParalela: false,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 60,
    responsableRoles: ["ACCOUNT_MANAGER", "ESPECIALISTA"],
    subtareas: [
      "Preparar agenda de kick-off",
      "Presentar metodología A.L.C.A.N.Z.A. al cliente",
      "Enviar formulario dinámico de brief (22 secciones)",
      "Acompañar al cliente en el llenado del brief",
      "Solicitar documentos de referencia (pitch deck, brief anterior, reportes)",
      "Confirmar accesos técnicos requeridos",
      "Alinear expectativas y KPIs",
    ],
    entregablesTemplate: [
      { nombre: "Brief de Inicio (Formulario 22 secciones)", tipo: "DATOS" },
      { nombre: "PDF Brief Consolidado", tipo: "PDF" },
      { nombre: "Lista de Accesos Requeridos", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["A1.1"],
  },
  {
    faseCodigo: "A1",
    codigo: "A1.3",
    nombre: "Procesamiento de Documentos IA",
    descripcion:
      "Carga y procesamiento con IA de todos los documentos entregados por el cliente",
    diaInicio: 2,
    duracionDias: 2,
    esParalela: true,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 85,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Convertir documentos a formato unificado (PDF)",
      "Extraer texto con OCR si es necesario",
      "Procesar con IA: extraer campos del brief",
      "Marcar confianza por campo (0-100%)",
      "Detectar conflictos entre documentos",
      "Revisar internamente la extracción antes de mostrar al cliente",
      "Marcar campos como verificados",
    ],
    entregablesTemplate: [
      { nombre: "Extracción IA de Documentos", tipo: "DATOS" },
      {
        nombre: "Reporte de Confianza y Conflictos",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["A1.2"],
  },
  {
    faseCodigo: "A1",
    codigo: "A1.4",
    nombre: "Investigación de Mercado",
    descripcion:
      "Análisis de competencia, tendencias del sector y oportunidades de mercado",
    diaInicio: 2,
    duracionDias: 3,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 70,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Identificar competidores directos e indirectos",
      "Analizar propuestas de valor de la competencia",
      "Identificar tendencias del sector",
      "Evaluar oportunidades no exploradas",
      "Documentar hallazgos en reporte",
    ],
    entregablesTemplate: [
      { nombre: "Reporte de Investigación de Mercado", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["A1.2"],
  },
  {
    faseCodigo: "A1",
    codigo: "A1.5",
    nombre: "Auditoría Técnica",
    descripcion:
      "Revisión técnica de cuentas publicitarias, píxeles, tracking y configuraciones existentes",
    diaInicio: 2,
    duracionDias: 3,
    esParalela: true,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 50,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Revisar estructura de cuentas Google Ads / Meta / TikTok",
      "Verificar configuración de píxeles y eventos de conversión",
      "Auditar landing pages y velocidad de carga",
      "Revisar historial de campañas y performance anterior",
      "Evaluar configuración de CRM y flujos de automatización",
      "Documentar hallazgos y brechas técnicas",
    ],
    entregablesTemplate: [
      { nombre: "Reporte de Auditoría Técnica", tipo: "DOCUMENTO" },
      { nombre: "Lista de Correcciones Técnicas", tipo: "DATOS" },
    ],
    bloqueadoresPor: ["A1.2"],
  },
  {
    faseCodigo: "A1",
    codigo: "A1.6",
    nombre: "Buyer Personas",
    descripcion:
      "Construcción de 3 avatares de cliente ideal con demografía, psicografía y buyer journey",
    diaInicio: 2,
    duracionDias: 3,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 75,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Analizar datos del brief para perfiles de cliente",
      "Cruzar con datos de investigación de mercado",
      "Construir Avatar 1 (cliente ideal principal)",
      "Construir Avatar 2 (cliente secundario)",
      "Construir Avatar 3 (cliente aspiracional)",
      "Validar con Account Manager y cliente",
    ],
    entregablesTemplate: [
      { nombre: "Buyer Persona 1", tipo: "DATOS" },
      { nombre: "Buyer Persona 2", tipo: "DATOS" },
      { nombre: "Buyer Persona 3", tipo: "DATOS" },
      { nombre: "Documento Buyer Personas (PDF)", tipo: "PDF" },
    ],
    bloqueadoresPor: ["A1.2"],
  },

  // ─── FASE L: LANZAMIENTO (Días 8-14) ──────────────────────────────────────

  {
    faseCodigo: "L",
    codigo: "L.1",
    nombre: "Diseño de Estrategia",
    descripcion:
      "Definición de la estrategia de campañas, objetivos, KPIs, presupuesto y mix de canales",
    diaInicio: 8,
    duracionDias: 2,
    esParalela: false,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 55,
    responsableRoles: ["DIRECTOR", "ACCOUNT_MANAGER"],
    subtareas: [
      "Consolidar hallazgos de Análisis (brief + investigación + auditoría + personas)",
      "Definir objetivos SMART por canal",
      "Establecer KPIs y metas numéricas",
      "Diseñar mix de canales y distribución de presupuesto",
      "Definir funnels de conversión por persona",
      "Presentar estrategia al cliente para aprobación",
    ],
    entregablesTemplate: [
      {
        nombre: "Documento de Estrategia de Campañas",
        tipo: "DOCUMENTO",
      },
      { nombre: "KPIs y Metas por Canal", tipo: "DATOS" },
    ],
    bloqueadoresPor: ["A1.4", "A1.5", "A1.6"],
  },
  {
    faseCodigo: "L",
    codigo: "L.2",
    nombre: "Estructura de Campañas",
    descripcion:
      "Diseño de arquitectura de campañas: grupos de anuncios, segmentaciones, palabras clave",
    diaInicio: 10,
    duracionDias: 2,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 60,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Diseñar estructura de campañas Google Ads (Search, Display, YouTube)",
      "Estructurar campañas Meta (Awareness, Consideración, Conversión)",
      "Definir segmentaciones por buyer persona",
      "Planificar keywords y audiencias",
      "Documentar naming convention",
    ],
    entregablesTemplate: [
      {
        nombre: "Arquitectura de Campañas (Excel/Google Sheets)",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["L.1"],
  },
  {
    faseCodigo: "L",
    codigo: "L.3",
    nombre: "Configuración Técnica",
    descripcion:
      "Implementación técnica: píxeles, conversiones, UTMs, integraciones CRM",
    diaInicio: 10,
    duracionDias: 3,
    esParalela: true,
    requiereAprobacion: false,
    puntoIA: false,
    nivelAutomatizacionIA: 0,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Instalar/verificar Meta Pixel y CAPI",
      "Configurar Google Tag Manager",
      "Implementar conversiones GA4 y Google Ads",
      "Crear UTMs estandarizados",
      "Integrar con CRM del cliente",
      "Verificar disparo de eventos en Test Mode",
    ],
    entregablesTemplate: [
      { nombre: "Reporte de Configuración Técnica", tipo: "DOCUMENTO" },
      { nombre: "Accesos Técnicos Configurados", tipo: "ACCESOS" },
    ],
    bloqueadoresPor: ["L.1"],
  },
  {
    faseCodigo: "L",
    codigo: "L.4",
    nombre: "Activación de Campañas",
    descripcion:
      "Publicación y activación de campañas en todas las plataformas acordadas",
    diaInicio: 13,
    duracionDias: 2,
    esParalela: false,
    requiereAprobacion: true,
    tipoAprobador: "DIRECTOR",
    puntoIA: false,
    nivelAutomatizacionIA: 0,
    responsableRoles: ["ESPECIALISTA", "ACCOUNT_MANAGER"],
    subtareas: [
      "Subir creativos a plataformas",
      "Configurar presupuestos y pujas",
      "Revisar campañas con Director antes de activar",
      "Activar campañas fase por fase",
      "Capturar screenshots del estado inicial",
      "Notificar al cliente del inicio",
    ],
    entregablesTemplate: [
      {
        nombre: "Confirmación de Activación de Campañas",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["L.2", "L.3", "C.1"],
  },

  // ─── FASE C: CREATIVOS (Días 8-18) ────────────────────────────────────────

  {
    faseCodigo: "C",
    codigo: "C.1",
    nombre: "Guiones y Copy",
    descripcion:
      "Redacción de copys para anuncios, guiones de video y textos de landing pages",
    diaInicio: 8,
    duracionDias: 4,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 80,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Definir ángulos de comunicación por buyer persona",
      "Redactar headlines, primary texts y CTAs para Meta",
      "Redactar títulos, descripciones y extensiones para Google Ads",
      "Escribir guiones para videos cortos (15-30 seg)",
      "Crear variaciones A/B de copy principal",
      "Enviar al cliente para revisión y aprobación",
    ],
    entregablesTemplate: [
      { nombre: "Banco de Copies (Google Ads)", tipo: "DOCUMENTO" },
      { nombre: "Banco de Copies (Meta)", tipo: "DOCUMENTO" },
      { nombre: "Guiones de Video", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["A1.6", "L.1"],
  },
  {
    faseCodigo: "C",
    codigo: "C.2",
    nombre: "Diseño de Creativos",
    descripcion:
      "Producción de piezas gráficas, videos y creativos para todas las plataformas y formatos",
    diaInicio: 12,
    duracionDias: 4,
    esParalela: false,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 30,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Diseñar piezas para formatos requeridos (1:1, 9:16, 16:9, Stories)",
      "Producir videos o editar material del cliente",
      "Crear variaciones por buyer persona",
      "Asegurar cumplimiento de brand guidelines",
      "Exportar en resoluciones y formatos por plataforma",
      "Enviar al cliente para aprobación final",
    ],
    entregablesTemplate: [
      {
        nombre: "Pack de Creativos (imágenes)",
        tipo: "CREATIVOS",
      },
      { nombre: "Pack de Creativos (videos)", tipo: "CREATIVOS" },
    ],
    bloqueadoresPor: ["C.1"],
  },

  // ─── FASE A2: AJUSTE (Días 15-25) ─────────────────────────────────────────

  {
    faseCodigo: "A2",
    codigo: "A2.1",
    nombre: "Monitoreo Primeros Días",
    descripcion:
      "Seguimiento diario de campañas durante los primeros 7 días post-lanzamiento",
    diaInicio: 15,
    duracionDias: 7,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 65,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Revisar métricas diariamente (CPM, CTR, CPC, ROAS)",
      "Detectar anuncios con bajo rendimiento",
      "Identificar segmentos y audiencias con mejor respuesta",
      "Documentar observaciones en log de optimización",
      "Alertar al Director si hay anomalías críticas",
    ],
    entregablesTemplate: [
      { nombre: "Log de Monitoreo Diario", tipo: "DATOS" },
    ],
    bloqueadoresPor: ["L.4"],
  },
  {
    faseCodigo: "A2",
    codigo: "A2.2",
    nombre: "Optimizaciones Técnicas",
    descripcion:
      "Ajustes técnicos basados en datos: pujas, presupuestos, segmentaciones y creativos",
    diaInicio: 19,
    duracionDias: 5,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 50,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Pausar anuncios con bajo rendimiento",
      "Escalar presupuesto en lo que funciona",
      "Ajustar segmentaciones y audiencias",
      "Crear nuevas variaciones de copy/creativo si es necesario",
      "Optimizar landing pages (si aplica)",
      "Actualizar estructura de campañas según aprendizajes",
    ],
    entregablesTemplate: [
      {
        nombre: "Reporte de Optimizaciones Aplicadas",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["A2.1"],
  },
  {
    faseCodigo: "A2",
    codigo: "A2.3",
    nombre: "Reporte Semana 1-2",
    descripcion:
      "Primer reporte de performance para el cliente con métricas y análisis",
    diaInicio: 22,
    duracionDias: 1,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 90,
    responsableRoles: ["ACCOUNT_MANAGER"],
    subtareas: [
      "Compilar métricas de plataformas",
      "Generar reporte HTML automático",
      "Redactar análisis ejecutivo",
      "Enviar al cliente",
      "Agendar reunión de revisión",
    ],
    entregablesTemplate: [
      { nombre: "Reporte Semana 1-2 (HTML)", tipo: "REPORTE" },
      { nombre: "Reporte Semana 1-2 (Texto)", tipo: "REPORTE" },
    ],
    bloqueadoresPor: ["A2.1"],
  },

  // ─── FASE N: NUTRIR (Días 22-32) ──────────────────────────────────────────

  {
    faseCodigo: "N",
    codigo: "N.1",
    nombre: "Audiencias y Retargeting",
    descripcion:
      "Construcción de audiencias personalizadas y configuración de estrategia de retargeting",
    diaInicio: 22,
    duracionDias: 4,
    esParalela: true,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 45,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Crear audiencias basadas en visitas web (píxel)",
      "Construir audiencias de clientes existentes (CRM)",
      "Crear Lookalike Audiences por buyer persona",
      "Configurar secuencias de retargeting",
      "Lanzar campañas de remarketing",
    ],
    entregablesTemplate: [
      {
        nombre: "Configuración de Audiencias y Retargeting",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["A2.2"],
  },
  {
    faseCodigo: "N",
    codigo: "N.2",
    nombre: "Email Flows y Automatizaciones",
    descripcion:
      "Configuración de secuencias de email marketing y automatizaciones de nurturing",
    diaInicio: 22,
    duracionDias: 5,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 70,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Mapear flujos de email según buyer journey",
      "Redactar secuencias de bienvenida, nurturing y conversión",
      "Configurar automations en la herramienta del cliente",
      "Conectar con formularios y landing pages",
      "Hacer QA de los flujos",
    ],
    entregablesTemplate: [
      { nombre: "Flujos de Email Marketing", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["A2.2"],
  },
  {
    faseCodigo: "N",
    codigo: "N.3",
    nombre: "Contenido Orgánico",
    descripcion:
      "Planificación y apoyo en contenido orgánico para redes sociales",
    diaInicio: 25,
    duracionDias: 5,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 65,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Crear calendario editorial del mes",
      "Proponer temas y ángulos por red social",
      "Apoyar en producción de contenido (copy + brief visual)",
      "Revisar y aprobar con cliente",
    ],
    entregablesTemplate: [
      { nombre: "Calendario Editorial", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["A2.2"],
  },

  // ─── FASE Z: ZONAS DE MEJORA (Días 30-38) ─────────────────────────────────

  {
    faseCodigo: "Z",
    codigo: "Z.1",
    nombre: "Análisis de Performance",
    descripcion:
      "Análisis profundo de resultados del período completo, identificación de ganadores y pérdidas",
    diaInicio: 30,
    duracionDias: 3,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 80,
    responsableRoles: ["ESPECIALISTA", "ACCOUNT_MANAGER"],
    subtareas: [
      "Extraer métricas completas por canal y campaña",
      "Identificar anuncios y audiencias top performers",
      "Calcular ROAS, CAC y LTV preliminar",
      "Detectar patrones de comportamiento del usuario",
      "Identificar gaps vs KPIs establecidos",
      "Documentar aprendizajes clave",
    ],
    entregablesTemplate: [
      {
        nombre: "Análisis de Performance Mes 1",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["A2.3", "N.1"],
  },
  {
    faseCodigo: "Z",
    codigo: "Z.2",
    nombre: "Identificación de Oportunidades",
    descripcion:
      "Detección de nuevas oportunidades de mejora, canales no explorados y quick wins",
    diaInicio: 33,
    duracionDias: 2,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 70,
    responsableRoles: ["DIRECTOR", "ACCOUNT_MANAGER"],
    subtareas: [
      "Revisar canales no activados",
      "Evaluar nuevos formatos publicitarios",
      "Identificar segmentos de audiencia no explorados",
      "Detectar oportunidades de mejora en copy/creative",
      "Priorizar por impacto y esfuerzo",
    ],
    entregablesTemplate: [
      {
        nombre: "Mapa de Oportunidades",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["Z.1"],
  },
  {
    faseCodigo: "Z",
    codigo: "Z.3",
    nombre: "Reporte de Performance Mes 1",
    descripcion: "Reporte ejecutivo completo del primer mes de operación",
    diaInicio: 35,
    duracionDias: 2,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: true,
    nivelAutomatizacionIA: 90,
    responsableRoles: ["ACCOUNT_MANAGER"],
    subtareas: [
      "Generar reporte HTML automático completo",
      "Redactar resumen ejecutivo con IA",
      "Incluir gráficos y visualizaciones",
      "Generar versión texto para WhatsApp",
      "Enviar al cliente antes de reunión de revisión",
      "Agendar reunión de cierre del período",
    ],
    entregablesTemplate: [
      { nombre: "Reporte Mes 1 (HTML)", tipo: "REPORTE" },
      { nombre: "Reporte Mes 1 (Texto)", tipo: "REPORTE" },
    ],
    bloqueadoresPor: ["Z.1"],
  },

  // ─── FASE A3: ACCIONES DE ESCALADO (Días 38-45) ───────────────────────────

  {
    faseCodigo: "A3",
    codigo: "A3.1",
    nombre: "Estrategia de Escala",
    descripcion:
      "Diseño de estrategia para escalar lo que funcionó y eliminar lo que no",
    diaInicio: 38,
    duracionDias: 3,
    esParalela: false,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 60,
    responsableRoles: ["DIRECTOR", "ACCOUNT_MANAGER"],
    subtareas: [
      "Identificar campañas y creativos para escalar",
      "Proponer incremento de presupuesto por canal",
      "Diseñar nuevas verticales o segmentos",
      "Definir pruebas A/B para el siguiente período",
      "Presentar plan de escala al cliente",
    ],
    entregablesTemplate: [
      { nombre: "Plan de Escala Mes 2", tipo: "DOCUMENTO" },
    ],
    bloqueadoresPor: ["Z.2"],
  },
  {
    faseCodigo: "A3",
    codigo: "A3.2",
    nombre: "Nuevos Creativos para Escala",
    descripcion:
      "Producción de nuevos creativos basados en aprendizajes del primer mes",
    diaInicio: 40,
    duracionDias: 3,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 75,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Identificar ángulos creativos ganadores",
      "Crear variaciones de los top performers",
      "Producir nuevos formatos según aprendizajes",
      "Aprobar con cliente antes de activar",
    ],
    entregablesTemplate: [
      {
        nombre: "Pack de Creativos Escala",
        tipo: "CREATIVOS",
      },
    ],
    bloqueadoresPor: ["A3.1", "Z.1"],
  },
  {
    faseCodigo: "A3",
    codigo: "A3.3",
    nombre: "Implementación de Escala",
    descripcion:
      "Activación de las estrategias de escalado aprobadas en todas las plataformas",
    diaInicio: 43,
    duracionDias: 1,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: false,
    nivelAutomatizacionIA: 0,
    responsableRoles: ["ESPECIALISTA"],
    subtareas: [
      "Escalar presupuestos en campañas ganadoras",
      "Activar nuevas campañas diseñadas",
      "Subir nuevos creativos aprobados",
      "Documentar cambios para trazabilidad",
    ],
    entregablesTemplate: [
      {
        nombre: "Registro de Cambios de Escala",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["A3.1", "A3.2"],
  },
  {
    faseCodigo: "A3",
    codigo: "A3.4",
    nombre: "Propuesta de Continuidad",
    descripcion:
      "Presentación de propuesta para el siguiente período de trabajo (mes 2+)",
    diaInicio: 43,
    duracionDias: 2,
    esParalela: true,
    requiereAprobacion: true,
    tipoAprobador: "CLIENTE",
    puntoIA: true,
    nivelAutomatizacionIA: 50,
    responsableRoles: ["DIRECTOR", "ACCOUNT_MANAGER"],
    subtareas: [
      "Redactar propuesta basada en resultados del mes 1",
      "Incluir proyecciones y objetivos mes 2",
      "Presentar al cliente en reunión de cierre",
      "Procesar respuesta y renovación",
    ],
    entregablesTemplate: [
      {
        nombre: "Propuesta de Continuidad Mes 2",
        tipo: "DOCUMENTO",
      },
    ],
    bloqueadoresPor: ["Z.3"],
  },
  {
    faseCodigo: "A3",
    codigo: "A3.5",
    nombre: "Cierre del Período de Onboarding",
    descripcion:
      "Cierre formal del proceso de 45 días: documentación, entrega y transición",
    diaInicio: 44,
    duracionDias: 1,
    esParalela: false,
    requiereAprobacion: false,
    puntoIA: false,
    nivelAutomatizacionIA: 0,
    responsableRoles: ["ACCOUNT_MANAGER", "DIRECTOR"],
    subtareas: [
      "Verificar que todos los entregables están entregados",
      "Confirmar que todas las aprobaciones fueron obtenidas",
      "Generar reporte de cierre del onboarding",
      "Transferir a modo operación continua",
      "Actualizar estado del cliente en sistema",
    ],
    entregablesTemplate: [
      {
        nombre: "Reporte de Cierre de Onboarding",
        tipo: "REPORTE",
      },
    ],
    bloqueadoresPor: ["A3.3", "A3.4"],
  },
];

// Mapa para lookup rápido por código
export const TAREAS_MAP = new Map(
  TAREAS_TEMPLATE.map((t) => [t.codigo, t])
);
