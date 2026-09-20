"""Validación estática: nunca importa migraciones ni accede a PostgreSQL."""
import ast
import hashlib
import json
from pathlib import Path
import sys

ROOT_REV = "production_baseline_20260814"
HEAD_REV = "evaluacion_competencia_p1"

def validate(root):
    root = Path(root)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    entries = manifest["migrations"]
    if len(entries) != 14:
        raise ValueError("El manifiesto debe contener 14 migraciones")
    names = [e["file"] for e in entries]
    if len(set(names)) != 14 or any(Path(n).name != n for n in names):
        raise ValueError("Nombres duplicados o rutas no permitidas")
    actual = {p.name for p in (root / "migrations").iterdir()}
    if actual != set(names):
        raise ValueError("Archivos faltantes o adicionales en migrations")
    revisions = {}
    for entry in entries:
        path = root / "migrations" / entry["file"]
        if path.is_symlink() or not path.is_file():
            raise ValueError("Solo se admiten archivos regulares")
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise ValueError("Huella distinta: " + path.name)
        values = {}
        for node in ast.parse(data, filename=path.name).body:
            targets = node.targets if isinstance(node, ast.Assign) else [node.target] if isinstance(node, ast.AnnAssign) else []
            for target in targets:
                if isinstance(target, ast.Name) and target.id in {"revision", "down_revision", "depends_on", "branch_labels"}:
                    values[target.id] = ast.literal_eval(node.value)
        rev = values.get("revision")
        if not isinstance(rev, str) or rev in revisions:
            raise ValueError("Revisión ausente o duplicada")
        if rev != entry["revision"] or values.get("down_revision") != entry["down_revision"]:
            raise ValueError("Metadatos distintos al manifiesto")
        if values.get("depends_on") is not None:
            raise ValueError("Dependencia adicional no admitida")
        revisions[rev] = values.get("down_revision")
    chain, current = [], HEAD_REV
    while current is not None:
        if not isinstance(current, str) or current not in revisions or current in chain:
            raise ValueError("Dependencia faltante, ramificación o ciclo")
        chain.append(current)
        current = revisions[current]
    if len(chain) != 14 or chain[-1] != ROOT_REV:
        raise ValueError("Cadena incompleta o raíz inesperada")
    return list(reversed(chain))

if __name__ == "__main__":
    try:
        chain = validate(Path(__file__).resolve().parent)
        print("VALIDACIÓN ESTÁTICA: OK — 14 migraciones")
        for i, revision in enumerate(chain, 1):
            print(f"{i:02d}. {revision}")
        print("No prueba ejecución SQL, integridad de datos ni ausencia de secretos.")
        print("Sin conexión a PostgreSQL; sin ejecución de migraciones.")
    except (OSError, ValueError, SyntaxError, KeyError, TypeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
