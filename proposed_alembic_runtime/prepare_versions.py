"""Monta revisiones verificadas; no conecta a PostgreSQL ni ejecuta Alembic."""
import argparse
import ast
import hashlib
import json
from pathlib import Path

CANDIDATE_SHA256 = "123552febaf763f46bd49df9f84463ca9887e0bdf0f8c3bc08ad90838c2463d0"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    args = parser.parse_args()
    runtime = Path(__file__).resolve().parent
    destino = runtime / "versions"
    if destino.exists():
        raise SystemExit("DETENIDO: versions ya existe; no se sobrescribe.")
    manifest = json.loads((args.catalog / "manifest.json").read_text(encoding="utf-8"))
    entradas = manifest["migrations"]
    if len(entradas) != 14:
        raise SystemExit("DETENIDO: se esperaban 14 migraciones históricas.")
    archivos = {}
    for entrada in entradas:
        nombre = entrada["file"]
        if Path(nombre).name != nombre or not nombre.endswith(".py") or nombre in archivos:
            raise SystemExit("DETENIDO: nombre inválido o repetido.")
        contenido = (args.catalog / "migrations" / nombre).read_bytes()
        if hashlib.sha256(contenido).hexdigest() != entrada["sha256"]:
            raise SystemExit("DETENIDO: huella histórica diferente.")
        ast.parse(contenido)
        archivos[nombre] = contenido
    candidata = runtime.parent / "proposed_migrations" / "20260920_pensiones_tenant_fk_v1.py"
    contenido = candidata.read_bytes()
    if candidata.name in archivos:
        raise SystemExit("DETENIDO: nombre de candidata duplicado.")
    if hashlib.sha256(contenido).hexdigest() != CANDIDATE_SHA256:
        raise SystemExit("DETENIDO: la candidata cambió; requiere nueva revisión.")
    ast.parse(contenido)
    archivos[candidata.name] = contenido
    destino.mkdir()
    for nombre, contenido in archivos.items():
        (destino / nombre).write_bytes(contenido)
    print("OK: 14 revisiones históricas y candidata verificadas y copiadas.")
    print("No se abrió ninguna conexión a PostgreSQL.")

if __name__ == "__main__":
    main()
