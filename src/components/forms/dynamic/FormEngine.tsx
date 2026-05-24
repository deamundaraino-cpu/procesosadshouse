"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoCampo =
  | "texto"
  | "email"
  | "telefono"
  | "numero"
  | "select"
  | "multi_select"
  | "textarea"
  | "url"
  | "archivo";

export interface CampoForm {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  placeholder?: string;
  opciones?: string[]; // para select / multi_select
  prefill?: string; // valor pre-llenado (desde IA)
  confianzaPrefill?: number; // 0-1
  ayuda?: string;
  condicion?: {
    campo: string;
    valor: string;
  };
}

export interface SeccionForm {
  codigo: string;
  titulo: string;
  descripcion?: string;
  campos: CampoForm[];
}

export interface FormEngineProps {
  secciones: SeccionForm[];
  clienteId: string;
  onComplete?: (datos: Record<string, unknown>) => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FormEngine({ secciones, clienteId, onComplete }: FormEngineProps) {
  const [seccionActual, setSeccionActual] = useState(0);

  // Inicializar con todos los prefill ya guardados (DB o IA) para no perderlos al navegar
  const [datosTotales, setDatosTotales] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const sec of secciones) {
      for (const campo of sec.campos) {
        if (campo.prefill) init[campo.clave] = campo.prefill;
      }
    }
    return init;
  });
  const [guardando, setGuardando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const seccion = secciones[seccionActual];
  const esUltima = seccionActual === secciones.length - 1;
  const progreso = Math.round(((seccionActual + 1) / secciones.length) * 100);

  // Construir schema zod dinámico para la sección actual
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  for (const campo of seccion.campos) {
    if (campo.tipo === "archivo") continue;
    let validator: z.ZodTypeAny = z.string();
    if (campo.tipo === "email") validator = z.string().email("Email inválido");
    if (campo.tipo === "numero") validator = z.string().regex(/^\d*\.?\d*$/, "Solo números");
    if (campo.tipo === "url") validator = z.string().url("URL inválida").or(z.string().max(0));
    if (campo.tipo === "multi_select") validator = z.array(z.string()).or(z.string());
    if (!campo.requerido) {
      validator = validator.optional().or(z.literal(""));
    }
    schemaFields[campo.clave] = validator;
  }

  const schema = z.object(schemaFields);

  // Valores iniciales — multi_select parte como array
  const defaultValues: Record<string, unknown> = {};
  for (const campo of seccion.campos) {
    const saved = datosTotales[campo.clave];
    const prefill = campo.prefill ?? "";
    if (campo.tipo === "multi_select") {
      if (Array.isArray(saved)) defaultValues[campo.clave] = saved;
      else if (typeof saved === "string" && saved) defaultValues[campo.clave] = [saved];
      else if (Array.isArray(prefill)) defaultValues[campo.clave] = prefill;
      else defaultValues[campo.clave] = [];
    } else {
      defaultValues[campo.clave] = (saved as string) ?? prefill;
    }
  }

  const { register, handleSubmit, formState: { errors }, watch, reset, control } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Reiniciar el form con los valores de la nueva sección al navegar
  useEffect(() => {
    reset(defaultValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionActual]);

  const valoresActuales = watch();

  const siguiente = useCallback(
    async (datos: Record<string, unknown>) => {
      setGuardando(true);
      const nuevosDatos = { ...datosTotales, ...datos };
      setDatosTotales(nuevosDatos);

      // Autosave al API
      try {
        const campos = seccion.campos
          .filter((c) => c.tipo !== "archivo")
          .map((c) => ({
            clave: c.clave,
            etiqueta: c.etiqueta,
            valor: datos[c.clave] ?? null,
            confianza: 1,
            origen: "CLIENTE" as const,
            timestamp: new Date().toISOString(),
          }));

        await fetch("/api/brief", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId,
            seccionCodigo: seccion.codigo,
            campos,
          }),
        });
      } catch {
        // Continuar aunque falle el autosave
      }

      if (esUltima) {
        setCompletado(true);
        onComplete?.(nuevosDatos);
      } else {
        setSeccionActual((s) => s + 1);
      }
      setGuardando(false);
    },
    [datosTotales, seccion, clienteId, esUltima, onComplete]
  );

  if (completado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            ¡Brief completado!
          </h2>
          <p className="text-slate-600">
            Hemos recibido toda tu información. Nuestro equipo la revisará y comenzará con el análisis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Sección {seccionActual + 1} de {secciones.length}</span>
            <span>{progreso}% completado</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Tarjeta de pregunta */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">{seccion.titulo}</h2>
          {seccion.descripcion && (
            <p className="text-slate-500 text-sm mb-6">{seccion.descripcion}</p>
          )}

          <form onSubmit={handleSubmit(siguiente)} className="space-y-5">
            {seccion.campos.map((campo) => {
              // Verificar condición
              if (campo.condicion) {
                const valorActual = valoresActuales[campo.condicion.campo];
                if (valorActual !== campo.condicion.valor) return null;
              }

              const error = errors[campo.clave];

              return (
                <div key={campo.clave}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {campo.etiqueta}
                    {campo.requerido && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {/* Badge de pre-fill IA */}
                  {campo.prefill && campo.confianzaPrefill && (
                    <div className="mb-2 text-xs flex items-center gap-1.5">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        IA sugiere · {Math.round((campo.confianzaPrefill ?? 0) * 100)}% confianza
                      </span>
                      <span className="text-slate-400">Verifica y edita si es necesario</span>
                    </div>
                  )}

                  {campo.tipo === "textarea" ? (
                    <textarea
                      {...register(campo.clave)}
                      placeholder={campo.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  ) : campo.tipo === "select" ? (
                    <select
                      {...register(campo.clave)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">Selecciona una opción</option>
                      {campo.opciones?.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  ) : campo.tipo === "multi_select" ? (
                    <Controller
                      name={campo.clave}
                      control={control}
                      render={({ field }) => {
                        const seleccionados: string[] = Array.isArray(field.value)
                          ? field.value
                          : typeof field.value === "string" && field.value
                          ? [field.value]
                          : [];
                        const toggle = (op: string) => {
                          const nuevo = seleccionados.includes(op)
                            ? seleccionados.filter((v) => v !== op)
                            : [...seleccionados, op];
                          field.onChange(nuevo);
                        };
                        return (
                          <div className="flex flex-wrap gap-2">
                            {campo.opciones?.map((op) => (
                              <button
                                key={op}
                                type="button"
                                onClick={() => toggle(op)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                  seleccionados.includes(op)
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400"
                                }`}
                              >
                                {op}
                              </button>
                            ))}
                          </div>
                        );
                      }}
                    />
                  ) : campo.tipo === "archivo" ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                      <div className="text-3xl mb-2">📎</div>
                      <p className="text-sm text-slate-600 font-medium">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF, DOCX, imágenes</p>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg"
                      />
                    </div>
                  ) : (
                    <input
                      {...register(campo.clave)}
                      type={
                        campo.tipo === "email"
                          ? "email"
                          : campo.tipo === "telefono"
                          ? "tel"
                          : campo.tipo === "numero"
                          ? "number"
                          : campo.tipo === "url"
                          ? "url"
                          : "text"
                      }
                      placeholder={campo.placeholder}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        campo.prefill ? "bg-indigo-50 border-indigo-200" : "border-slate-300"
                      }`}
                    />
                  )}

                  {campo.ayuda && !error && (
                    <p className="text-xs text-slate-400 mt-1.5">{campo.ayuda}</p>
                  )}
                  {error && (
                    <p className="text-xs text-red-500 mt-1.5">
                      {(error as any).message}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 pt-2">
              {seccionActual > 0 && (
                <button
                  type="button"
                  onClick={() => setSeccionActual((s) => s - 1)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : esUltima
                  ? "Finalizar Brief"
                  : "Continuar →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
