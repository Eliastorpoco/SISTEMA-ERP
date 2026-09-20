"""Pruebas en memoria; no modifica migraciones."""
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from validate_catalog import validate

ROOT = Path(__file__).resolve().parent

class ValidatorTests(unittest.TestCase):
    def test_original(self):
        self.assertEqual(len(validate(ROOT)), 14)

    def test_altered_bytes(self):
        original = Path.read_bytes
        def altered(path):
            data = original(path)
            return data + b"\n" if path.name == "production_baseline_20260814.py" else data
        with patch.object(Path, "read_bytes", altered):
            with self.assertRaisesRegex(ValueError, "Huella distinta"):
                validate(ROOT)

    def test_missing_file(self):
        original = Path.iterdir
        def missing(path):
            return (p for p in original(path) if p.name != "production_baseline_20260814.py")
        with patch.object(Path, "iterdir", missing):
            with self.assertRaisesRegex(ValueError, "faltantes"):
                validate(ROOT)

    def test_duplicate_manifest_entry(self):
        original = Path.read_text
        def duplicate(path, *args, **kwargs):
            value = original(path, *args, **kwargs)
            if path.name == "manifest.json":
                obj = json.loads(value)
                obj["migrations"][1] = obj["migrations"][0]
                return json.dumps(obj)
            return value
        with patch.object(Path, "read_text", duplicate):
            with self.assertRaisesRegex(ValueError, "duplicados"):
                validate(ROOT)

if __name__ == "__main__":
    unittest.main()
