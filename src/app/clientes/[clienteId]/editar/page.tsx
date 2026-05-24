"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const SECTORES = [
  "E-commerce", "Salud y Bienestar", "Educación", "Finanzas",
  "Inmobiliario", "Restaurantes / Alimentos", "Turismo",
  "Tecnología / SaaS", "Moda", "Consultoría", "Retail",
  "Servicios Profesionales", "Entretenimiento", "Otro",
];

const ESTADOS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "PAUSADO", label: "Pausado" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export default function EditarClientePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    pais: "",
    sector: "",
    estado: "ACTIVO",
    notas: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`/api/clientes/${clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          nombre: data.nombre ?? "",
          empresa: data.empresa ?? "",
          email: data.email ?? "",
          telefono: data.telefono ?? "",
          pais: data.pais ?? "",
          sector: data.sector ?? "",
          estado: data.estado ?? "ACTIVO",
          notas: data.notas ?? "",
        });
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudo cargar el cliente");
        setLoading(false);
      });
  }, [clienteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const res = await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push(`/clientes/${clienteId}/timeline`), 1200);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-lg font-bold text-slate-900 mb-1">Editar datos del cliente</h1>
        <p className="text-sm text-slate-500 mb-6">
          Los cambios se aplican de inmediato en todo el sistema.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del contacto *
              </label>
              <input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="María García"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Empresa *
              </label>
              <input
                value={form.empresa}
                onChange={(e) => set("empresa", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mi Empresa S.A."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                País
              </label>
              <input
                value={form.pais}
                onChange={(e) => set("pais", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="México"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sector
              </label>
              <select
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {SECTORES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estado del cliente
            </label>
            <div className="flex gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => set("estado", e.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.estado === e.value
                      ? e.value === "ACTIVO"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : e.value === "PAUSADO"
                        ? "bg-amber-500 text-white border-amber-500"
                        : e.value === "COMPLETADO"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notas internas
            </label>
            <textarea
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Contexto del cliente, cómo llegó, expectativas especiales..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200">
              Cambios guardados. Redirigiendo...
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href={`/clientes/${clienteId}/timeline`}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
