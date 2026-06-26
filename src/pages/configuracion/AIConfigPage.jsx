// src/pages/configuracion/AIConfigPage.jsx
//
// Panel de configuración de proveedor de IA por institución (tenant).
// Acceso: solo roles director / admin.
//
// Rutas del backend que consume:
//   GET  /ia/config          → carga config guardada
//   POST /ia/config          → guarda config
//   POST /ia/config/test     → prueba conexión
//   GET  /ia/config/usage    → estadísticas de uso

import { useState, useEffect, useCallback } from "react";
import { PROVIDERS, PROVIDER_MAP } from "./providers";
import ProviderCard from "./components/ProviderCard";
import UsageStatsBar from "./components/UsageStatsBar";
import { getAIConfig, saveAIConfig, testAIConnection, getUsageLog } from "../../services/aiConfigService";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  provider:        "anthropic",
  model_name:      "claude-sonnet-4-6",
  api_key:         "",
  base_url:        "",
  temperature:     0.3,
  max_tokens:      2000,
  timeout_seconds: 30,
};

// ─── Componente principal ──────────────────────────────────────────────────────

export default function AIConfigPage() {
  // Estado del formulario
  const [config,        setConfig]        = useState(DEFAULT_CONFIG);
  const [activeId,      setActiveId]      = useState("anthropic");
  const [showKey,       setShowKey]       = useState(false);
  const [hasKey,        setHasKey]        = useState(false);   // key ya guardada en backend
  const [isDirty,       setIsDirty]       = useState(false);

  // Estado de UI
  const [loadingInit,   setLoadingInit]   = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [testing,       setTesting]       = useState(false);
  const [toast,         setToast]         = useState(null);    // { type: 'ok'|'err', msg }

  // Estadísticas
  const [stats,         setStats]         = useState(null);
  const [loadingStats,  setLoadingStats]  = useState(false);

  const activeProvider = PROVIDER_MAP[activeId];

  // ─── Carga inicial ───────────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setLoadingInit(true);
    try {
      const saved = await getAIConfig();
      if (saved?.provider) {
        setActiveId(saved.provider);
        setConfig({
          ...DEFAULT_CONFIG,
          ...saved,
          api_key: "",              // nunca viene del backend
        });
        setHasKey(saved.has_key ?? false);
      }
    } catch {
      showToast("err", "No se pudo cargar la configuración guardada.");
    } finally {
      setLoadingInit(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getUsageLog(7);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, [loadConfig, loadStats]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // ─── Cambio de proveedor ─────────────────────────────────────────────────────

  const handleSelectProvider = (providerId) => {
    if (providerId === activeId) return;
    const p = PROVIDER_MAP[providerId];
    setActiveId(providerId);
    setConfig((prev) => ({
      ...prev,
      provider:   providerId,
      model_name: p.modelos[0].id,
      api_key:    "",
      base_url:   providerId === "ollama" ? "http://localhost:11434" : "",
    }));
    setHasKey(false);
    setShowKey(false);
    setIsDirty(true);
  };

  // ─── Guardar ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!activeProvider.local && !config.api_key && !hasKey) {
      showToast("err", "Ingresa una API key antes de guardar.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...config };
      if (!payload.api_key) delete payload.api_key;   // no sobreescribir key guardada
      await saveAIConfig(payload);
      setHasKey(true);
      setIsDirty(false);
      showToast("ok", `Configuración guardada. Usando ${config.model_name}.`);
      loadStats();
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Probar conexión ─────────────────────────────────────────────────────────

  const handleTest = async () => {
    if (!hasKey && !activeProvider.local) {
      showToast("err", "Guarda la configuración primero para probar la conexión.");
      return;
    }
    setTesting(true);
    try {
      const result = await testAIConnection();
      showToast("ok", `✓ Conexión exitosa con ${result.modelo} — ${result.latencia_ms} ms`);
    } catch (e) {
      showToast("err", `✗ ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const InputLabel = ({ children, htmlFor }) => (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-gray-500 mb-1.5 tracking-wide"
    >
      {children}
    </label>
  );

  const inputClass =
    "w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 " +
    "placeholder:text-gray-300 transition";

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <svg className="animate-spin w-5 h-5 mr-2 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
        </svg>
        Cargando configuración...
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Proveedor de IA para evaluación formativa
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Elige el modelo de lenguaje que asistirá la evaluación por competencias CNEB.
              La configuración aplica solo a esta institución.
            </p>
          </div>
          {isDirty && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full mt-1">
              Cambios sin guardar
            </span>
          )}
        </div>
      </div>

      {/* ── Estadísticas de uso ────────────────────────────────────────────── */}
      {(stats || loadingStats) && (
        <div className="mb-5">
          <UsageStatsBar stats={stats} loading={loadingStats} />
        </div>
      )}

      {/* ── Layout principal ────────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Sidebar: selección de proveedor ──────────────────────────────── */}
        <aside className="w-52 flex-shrink-0 space-y-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-2">
            Nube
          </p>
          {PROVIDERS.filter((p) => !p.local).map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isActive={activeId === p.id}
              onClick={() => handleSelectProvider(p.id)}
            />
          ))}
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mt-4 mb-2 pt-2 border-t border-gray-100">
            Local / Privado
          </p>
          {PROVIDERS.filter((p) => p.local).map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isActive={activeId === p.id}
              onClick={() => handleSelectProvider(p.id)}
            />
          ))}
        </aside>

        {/* ── Panel de configuración ────────────────────────────────────────── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

          {/* Cabecera del panel */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                          ${activeProvider.colorBg} ${activeProvider.colorText}`}
            >
              {activeProvider.iniciales}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  {activeProvider.nombre}
                </h2>
                <span className="text-xs text-gray-400">{activeProvider.empresa}</span>
                {activeProvider.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${activeProvider.badgeColor}`}>
                    {activeProvider.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{activeProvider.descripcion}</p>
            </div>
            <a
              href={activeProvider.docUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            >
              Documentación
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 10L10 2M5 2h5v5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <div className="space-y-4">

            {/* ── API Key (solo proveedores cloud) ─────────────────────────── */}
            {!activeProvider.local && (
              <div>
                <InputLabel htmlFor="api-key">
                  API Key
                  {hasKey && (
                    <span className="ml-2 text-emerald-500 font-normal">
                      ✓ Clave guardada
                    </span>
                  )}
                </InputLabel>
                <div className="relative">
                  <input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    value={config.api_key}
                    onChange={(e) => updateField("api_key", e.target.value)}
                    placeholder={hasKey ? "••••••• (dejar vacío para mantener la actual)" : activeProvider.keyPlaceholder}
                    className={`${inputClass} pr-10`}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showKey ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/>
                        <circle cx="12" cy="12" r="3"/>
                        <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {activeProvider.keyHelp} · Almacenada cifrada (AES-256), nunca expuesta al frontend.
                </p>
              </div>
            )}

            {/* ── URL base (Ollama / endpoints custom) ─────────────────────── */}
            {activeProvider.local && (
              <div>
                <InputLabel htmlFor="base-url">URL del servidor Ollama</InputLabel>
                <input
                  id="base-url"
                  type="text"
                  value={config.base_url}
                  onChange={(e) => updateField("base_url", e.target.value)}
                  placeholder="http://localhost:11434"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {activeProvider.keyHelp}
                </p>
              </div>
            )}

            {/* ── Modelo ───────────────────────────────────────────────────── */}
            <div>
              <InputLabel htmlFor="model-select">Modelo</InputLabel>
              <select
                id="model-select"
                value={config.model_name}
                onChange={(e) => updateField("model_name", e.target.value)}
                className={inputClass}
              >
                {activeProvider.modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Parámetros avanzados ─────────────────────────────────────── */}
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600 transition flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Parámetros avanzados
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <InputLabel htmlFor="temperature">Temperatura</InputLabel>
                  <input
                    id="temperature"
                    type="number"
                    min="0" max="1" step="0.05"
                    value={config.temperature}
                    onChange={(e) => updateField("temperature", parseFloat(e.target.value))}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    0 = determinístico · 1 = creativo
                  </p>
                </div>
                <div>
                  <InputLabel htmlFor="max-tokens">Tokens máximos</InputLabel>
                  <input
                    id="max-tokens"
                    type="number"
                    min="500" max="8000" step="100"
                    value={config.max_tokens}
                    onChange={(e) => updateField("max_tokens", parseInt(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <InputLabel htmlFor="timeout">Timeout (segundos)</InputLabel>
                  <input
                    id="timeout"
                    type="number"
                    min="5" max="120" step="5"
                    value={config.timeout_seconds}
                    onChange={(e) => updateField("timeout_seconds", parseInt(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </details>

          </div>

          {/* ── Acciones ────────────────────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200
                         text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-40"
            >
              {testing ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="31.4" strokeDashoffset="10"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12.5L3 12l9-9 9 9-2 .5M7 10v9a1 1 0 001 1h3v-5h2v5h3a1 1 0 001-1v-9"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {testing ? "Probando..." : "Probar conexión"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testing}
              className={[
                "ml-auto flex items-center gap-2 text-sm px-5 py-2 rounded-lg font-medium transition",
                "disabled:opacity-40",
                isDirty
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-900 hover:bg-gray-700 text-white",
              ].join(" ")}
            >
              {saving ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="31.4" strokeDashoffset="10"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>

        </div>
      </div>

      {/* ── Nota informativa MEFA-IAH ──────────────────────────────────────── */}
      <div className="mt-5 flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <p className="text-xs text-indigo-600 leading-relaxed">
          El modelo elegido actúa solo como <strong>agente evaluador preliminar</strong> del marco MEFA-IAH.
          Todo resultado queda en estado <code className="bg-indigo-100 px-1 rounded">PENDIENTE</code> hasta
          que el docente lo valide (supervisión humana obligatoria, RVM N° 094-2020-MINEDU).
          Cambiar de proveedor no afecta evaluaciones ya validadas.
        </p>
      </div>

      {/* ── Toast de notificación ──────────────────────────────────────────── */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
            "animate-in slide-in-from-bottom-2 duration-200",
            toast.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700",
          ].join(" ")}
        >
          {toast.type === "ok" ? (
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <circle cx="12" cy="18" r="0.5" fill="currentColor"/>
            </svg>
          )}
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-50 hover:opacity-100 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
