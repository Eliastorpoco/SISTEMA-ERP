import { useEffect, useState } from "react";

export default function ConfigureBlockModal({ block, onClose, onSave }) {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    visible: true,
    obligatorio: false,
    scormVersion: "SCORM 1.2",
    launchFile: "index.html",
    minScore: 70,
    maxAttempts: 3,
    tracking: true,
    packageName: "",
    packageSize: "",
    packageReady: false,
  });

  useEffect(() => {
    if (block) {
      setForm({
        titulo: block.titulo || `${block.tipo} agregado a la unidad`,
        descripcion: block.descripcion || "",
        visible: block.visible !== false,
        obligatorio: Boolean(block.obligatorio),
        scormVersion: block.scormVersion || "SCORM 1.2",
        launchFile: block.launchFile || "index.html",
        minScore: block.minScore || 70,
        maxAttempts: block.maxAttempts || 3,
        tracking: block.tracking !== false,
        packageName: block.packageName || "",
        packageSize: block.packageSize || "",
        packageReady: Boolean(block.packageReady),
      });
    }
  }, [block]);

  if (!block) return null;

  const isScorm = block.tipo === "SCORM";

  const handleChange = (field, value) => {
    setForm((actual) => ({
      ...actual,
      [field]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

    handleChange("packageName", file.name);
    handleChange("packageSize", `${sizeMb} MB`);
    handleChange("packageReady", true);
  };

  const handleSave = () => {
    onSave({
      ...block,
      ...form,
      configurado: true,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 24px 60px rgba(15,23,42,.25)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg,#eef2ff,#f8fafc)",
          }}
        >
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 900 }}>
            Configurar bloque {block.tipo}
          </h3>

          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
            Define cómo se mostrará este bloque dentro de la unidad de aprendizaje.
          </p>
        </div>

        <div style={{ padding: "20px", display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 900, color: "#334155" }}>
              Título del bloque
            </span>

            <input
              value={form.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "11px 12px",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 900, color: "#334155" }}>
              Descripción
            </span>

            <textarea
              value={form.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              rows={4}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "11px 12px",
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
              }}
            />
          </label>

          {isScorm && (
            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: "16px",
                background: "#eff6ff",
                padding: "14px",
                display: "grid",
                gap: "12px",
              }}
            >
              <div>
                <h4 style={{ margin: 0, color: "#1e3a8a", fontSize: "14px", fontWeight: 900 }}>
                  Configuración SCORM
                </h4>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Parámetros iniciales del paquete SCORM para seguimiento LMS.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#334155" }}>
                    Versión SCORM
                  </span>

                  <select
                    value={form.scormVersion}
                    onChange={(e) => handleChange("scormVersion", e.target.value)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option>SCORM 1.2</option>
                    <option>SCORM 2004</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#334155" }}>
                    Archivo de inicio
                  </span>

                  <input
                    value={form.launchFile}
                    onChange={(e) => handleChange("launchFile", e.target.value)}
                    placeholder="index.html"
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "13px",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#334155" }}>
                    Puntaje mínimo
                  </span>

                  <input
                    type="number"
                    value={form.minScore}
                    onChange={(e) => handleChange("minScore", Number(e.target.value))}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "13px",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#334155" }}>
                    Intentos permitidos
                  </span>

                  <input
                    type="number"
                    value={form.maxAttempts}
                    onChange={(e) => handleChange("maxAttempts", Number(e.target.value))}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "13px",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  border: "1px dashed #93c5fd",
                  borderRadius: "14px",
                  padding: "12px",
                  background: "#ffffff",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#334155" }}>
                    Paquete SCORM (.zip)
                  </span>

                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      padding: "10px",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  />
                </label>

                {form.packageName && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "12px",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    Archivo seleccionado: {form.packageName} ({form.packageSize})
                  </div>
                )}
              </div>

              <label
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "14px",
                  padding: "12px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  cursor: "pointer",
                  background: "#ffffff",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.tracking}
                  onChange={(e) => handleChange("tracking", e.target.checked)}
                />
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#334155" }}>
                  Activar seguimiento de avance, puntaje y finalización
                </span>
              </label>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <label
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "12px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => handleChange("visible", e.target.checked)}
              />
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#334155" }}>
                Visible para estudiantes
              </span>
            </label>

            <label
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "12px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.obligatorio}
                onChange={(e) => handleChange("obligatorio", e.target.checked)}
              />
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#334155" }}>
                Actividad obligatoria
              </span>
            </label>
          </div>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              background: "#ffffff",
              color: "#334155",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              border: "none",
              borderRadius: "12px",
              background: "#4f46e5",
              color: "#ffffff",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}
