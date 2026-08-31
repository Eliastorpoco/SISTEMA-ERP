from pathlib import Path
import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from controllers.incidencias_academicas_controller import (
    AccionTutorialCreate,
    EstadoIncidenciaUpdate,
    IncidenciaCreate,
    TRANSICIONES,
    _alcance_origen,
    _autorizar_gestion,
    _autorizar_lectura,
    _filtros_scope,
    _normalizar,
)


SOURCE = Path("/work/backend_incidencias_v1/controllers/incidencias_academicas_controller.py").read_text()


class _MappingsResult:
    def __init__(self, row=None): self.row = row
    def mappings(self): return self
    def first(self): return self.row


class _DB:
    def __init__(self, row=None): self.row = row
    def execute(self, *_args, **_kwargs): return _MappingsResult(self.row)


class IncidenciasControllerTest(unittest.TestCase):
    def test_01_normaliza_taxonomia(self):
        self.assertEqual(_normalizar("Académica"), "ACADEMICA")
        self.assertEqual(_normalizar("Tutoría"), "TUTORIA")

    def test_02_create_prohibe_tenant_cliente(self):
        with self.assertRaises(ValidationError):
            IncidenciaCreate(estudiante_id=1, tipo="TUTORIA", categoria="c", descripcion="d", responsable_id=2, tenant_id="ajeno")

    def test_03_origen_invalido(self):
        with self.assertRaises(ValidationError):
            IncidenciaCreate(estudiante_id=1, tipo="TUTORIA", categoria="c", descripcion="d", responsable_id=2, origen="AUTO")

    def test_04_accion_taxonomia(self):
        action = AccionTutorialCreate(tipo="Orientación", descripcion="Seguimiento", fecha="2026-08-26", responsable_id=2)
        self.assertEqual(action.tipo, "ORIENTACION")

    def test_05_accion_descripcion_obligatoria(self):
        with self.assertRaises(ValidationError):
            AccionTutorialCreate(tipo="ENTREVISTA", descripcion=" ", fecha="2026-08-26", responsable_id=2)

    def test_06_transiciones_unidireccionales(self):
        self.assertEqual(TRANSICIONES, {"ABIERTA": {"EN_SEGUIMIENTO"}, "EN_SEGUIMIENTO": {"CERRADA"}, "CERRADA": set()})

    def test_07_estado_observacion_obligatoria(self):
        with self.assertRaises(ValidationError):
            EstadoIncidenciaUpdate(estado="CERRADA", observacion=" ")

    def test_08_roles_lectura(self):
        for role in ("ADMIN", "DIRECTOR", "DOCENTE", "ESTUDIANTE"):
            _autorizar_lectura(role)
        with self.assertRaises(HTTPException): _autorizar_lectura("APODERADO")

    def test_09_admin_y_director_gestion(self):
        _autorizar_gestion(_DB(), "tenant", "ADMIN", 1, 2)
        _autorizar_gestion(_DB(), "tenant", "DIRECTOR", 1, 2)

    def test_10_docente_scope(self):
        _autorizar_gestion(_DB((1,)), "tenant", "DOCENTE", 3, 4)
        with self.assertRaises(HTTPException): _autorizar_gestion(_DB(), "tenant", "DOCENTE", 3, 4)

    def test_11_estudiante_no_gestiona(self):
        with self.assertRaises(HTTPException): _autorizar_gestion(_DB(), "tenant", "ESTUDIANTE", 3, 4)

    def test_12_filtros_docente_y_estudiante(self):
        self.assertTrue(any("asignaciones_docente" in item for item in _filtros_scope("DOCENTE")))
        self.assertIn("i.estudiante_id=:actor_id", _filtros_scope("ESTUDIANTE"))

    def test_13_filtros_tipo_estado_seccion(self):
        query = " ".join(_filtros_scope("ADMIN"))
        for token in (":tipo", ":estado", ":seccion_id", ":estudiante_id"):
            self.assertIn(token, query)

    def test_14_matricula_activa_define_alcance(self):
        body = IncidenciaCreate(estudiante_id=7, tipo="TUTORIA", categoria="c", descripcion="d", responsable_id=2)
        self.assertEqual(_alcance_origen(_DB({"estudiante_id": 7, "seccion_id": 8, "periodo_id": 9}), "tenant", body), (7, 8, 9))
        self.assertIn("m.activo IS TRUE", SOURCE)

    def test_15_asistencia_valida_estudiante_y_tenant(self):
        body = IncidenciaCreate(estudiante_id=7, tipo="ASISTENCIA", categoria="c", descripcion="d", responsable_id=2, origen="ASISTENCIA", referencia_origen="ASISTENCIA-11")
        self.assertEqual(_alcance_origen(_DB({"estudiante_id": 7, "seccion_id": 8, "periodo_id": 9}), "tenant", body), (7, 8, 9))
        self.assertIn("aa.tenant_id::text=:tenant_id", SOURCE)

    def test_16_endpoints_y_cross_tenant(self):
        for route in ('@router.get("")', '@router.post("", status_code=201)', '@router.get("/{incidencia_id}")', '@router.patch("/{incidencia_id}/estado")', '@router.post("/{incidencia_id}/acciones", status_code=201)', '@router.get("/{incidencia_id}/acciones")'):
            self.assertIn(route, SOURCE)
        self.assertGreater(SOURCE.count("tenant_id"), 45)


if __name__ == "__main__":
    unittest.main()
