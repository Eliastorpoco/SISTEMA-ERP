import hashlib
import hmac
import importlib.util
import os
import pathlib
import time


ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTROLLER = ROOT / "backend_v1n/controllers/finanzas_integraciones_controller.py"


def load_controller():
    spec = importlib.util.spec_from_file_location("finanzas_integraciones_v1n_test", CONTROLLER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def signature(secret: str, request_id: str, data_id: str, ts: str) -> str:
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{ts};"
    digest = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={digest}"


def test_webhook_signature_accepts_official_manifest(monkeypatch):
    module = load_controller()
    monkeypatch.setenv("MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS", "300")
    ts = str(int(time.time()))
    value = signature("test-secret", "request-123", "PAYMENT-456", ts)
    assert module.validar_firma_mercadopago(value, "request-123", "PAYMENT-456", "test-secret")


def test_webhook_signature_rejects_tampering_and_replay(monkeypatch):
    module = load_controller()
    monkeypatch.setenv("MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS", "300")
    current = str(int(time.time()))
    valid = signature("test-secret", "request-123", "456", current)
    assert not module.validar_firma_mercadopago(valid, "request-altered", "456", "test-secret")
    old = str(int(time.time()) - 301)
    assert not module.validar_firma_mercadopago(signature("test-secret", "request-123", "456", old), "request-123", "456", "test-secret")


def test_exports_do_not_contain_secret_values():
    forbidden = ("TEST-", "APP_USR-", "Bearer ey", "MERCADOPAGO_ACCESS_TOKEN=")
    for path in (ROOT / "n8n/workflows").glob("v1n_*.json"):
        contents = path.read_text(encoding="utf-8")
        assert all(value not in contents for value in forbidden)


def test_migration_uses_real_production_head():
    migration = (ROOT / "backend_v1n/alembic/versions_production/20260816_finanzas_integraciones_v1n.py").read_text(encoding="utf-8")
    assert 'revision: str = "finanzas_integraciones_v1n"' in migration
    assert 'down_revision: Union[str, Sequence[str], None] = "apoderados_comunicacion_v1mf"' in migration
    assert '"tenant_id", "provider", "external_payment_id"' in migration
