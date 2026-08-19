"""
Servicio de finanzas — conceptos de pago, pensiones, pagos y presupuesto.
Consultas directas a ORM; tenant_id siempre filtra cada query.
"""
import uuid
from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from decimal import Decimal

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from infrastructure.orm_models import (
    ConceptoPagoORM, EstudianteORM, PensionORM, PagoORM, PresupuestoORM,
)


# ---------- Excepciones de dominio ------------------------------------------

class ConceptoYaExiste(Exception):    pass
class ConceptoNoEncontrado(Exception): pass
class PensionYaExiste(Exception):     pass
class PensionNoEncontrada(Exception): pass
class PagoInvalido(Exception):        pass


# ---------- Interface --------------------------------------------------------

class IFinanzasService(ABC):
    @abstractmethod
    def crear_concepto(self, nombre: str, monto_default: float, descripcion: str) -> Dict: ...

    @abstractmethod
    def listar_conceptos(self) -> List[Dict]: ...

    @abstractmethod
    def registrar_pension(
        self, estudiante_id: int, concepto_id: int,
        anio: int, mes: int, monto: Optional[float],
    ) -> Dict: ...

    @abstractmethod
    def listar_pensiones(
        self,
        estudiante_id: Optional[int],
        anio: Optional[int],
        mes: Optional[int],
    ) -> List[Dict]: ...

    @abstractmethod
    def registrar_pago(
        self, pension_id: int, monto_pagado: float, fecha_pago: date,
        metodo_pago: str, referencia: Optional[str], creado_por: Optional[int],
    ) -> Dict: ...

    @abstractmethod
    def dashboard(self, anio: int, mes: int) -> Dict: ...

    @abstractmethod
    def morosos(
        self,
        mes: Optional[int],
        anio: Optional[int],
        estado_filtro: Optional[str],
    ) -> Dict: ...


# ---------- Implementation --------------------------------------------------

class FinanzasService(IFinanzasService):
    def __init__(self, db: Session, tenant_id: uuid.UUID):
        self._db        = db
        self._tenant_id = tenant_id

    # ---- base query helper -------------------------------------------------

    def _q(self, model):
        return self._db.query(model).filter(model.tenant_id == self._tenant_id)

    # ---- conceptos ---------------------------------------------------------

    def crear_concepto(
        self, nombre: str, monto_default: float, descripcion: str = "",
    ) -> Dict:
        if self._q(ConceptoPagoORM).filter(ConceptoPagoORM.nombre == nombre).first():
            raise ConceptoYaExiste(f"Concepto '{nombre}' ya existe en este tenant")
        orm = ConceptoPagoORM(
            tenant_id=self._tenant_id,
            nombre=nombre,
            descripcion=descripcion or None,
            monto_default=monto_default,
            activo=True,
        )
        self._db.add(orm)
        self._db.commit()
        self._db.refresh(orm)
        return self._concepto_dict(orm)

    def listar_conceptos(self) -> List[Dict]:
        rows = self._q(ConceptoPagoORM).filter(ConceptoPagoORM.activo == True).all()
        return [self._concepto_dict(r) for r in rows]

    # ---- pensiones ---------------------------------------------------------

    def registrar_pension(
        self,
        estudiante_id: int,
        concepto_id: int,
        anio: int,
        mes: int,
        monto: Optional[float],
    ) -> Dict:
        concepto = self._q(ConceptoPagoORM).filter(ConceptoPagoORM.id == concepto_id).first()
        if not concepto:
            raise ConceptoNoEncontrado(f"Concepto id={concepto_id} no encontrado")
        duplicado = (
            self._q(PensionORM)
            .filter(
                PensionORM.estudiante_id == estudiante_id,
                PensionORM.concepto_id   == concepto_id,
                PensionORM.anio          == anio,
                PensionORM.mes           == mes,
            )
            .first()
        )
        if duplicado:
            raise PensionYaExiste(
                f"Pensión ya registrada para estudiante {estudiante_id} en {mes:02d}/{anio}"
            )
        orm = PensionORM(
            tenant_id=self._tenant_id,
            estudiante_id=estudiante_id,
            concepto_id=concepto_id,
            anio=anio,
            mes=mes,
            monto=monto if monto is not None else concepto.monto_default,
            estado="pendiente",
        )
        self._db.add(orm)
        self._db.commit()
        self._db.refresh(orm)
        return self._pension_dict(orm)

    def listar_pensiones(
        self,
        estudiante_id: Optional[int] = None,
        anio: Optional[int] = None,
        mes: Optional[int] = None,
    ) -> List[Dict]:
        q = self._q(PensionORM)
        if estudiante_id is not None:
            q = q.filter(PensionORM.estudiante_id == estudiante_id)
        if anio is not None:
            q = q.filter(PensionORM.anio == anio)
        if mes is not None:
            q = q.filter(PensionORM.mes == mes)
        return [self._pension_dict(r) for r in q.all()]

    # ---- pagos -------------------------------------------------------------

    def registrar_pago(
        self,
        pension_id: int,
        monto_pagado: float,
        fecha_pago: date,
        metodo_pago: str,
        referencia: Optional[str],
        creado_por: Optional[int],
    ) -> Dict:
        pension = self._q(PensionORM).filter(PensionORM.id == pension_id).with_for_update().first()
        if not pension:
            raise PensionNoEncontrada(f"Pensión id={pension_id} no encontrada")
        if monto_pagado <= 0:
            raise PagoInvalido("El monto debe ser mayor a 0")
        aplicado = self._db.execute(text("""
            SELECT COALESCE(SUM(monto_aplicado),0)
            FROM aplicaciones_pago
            WHERE tenant_id=:tenant AND obligacion_id=:obligacion
        """), {"tenant": self._tenant_id, "obligacion": pension_id}).scalar_one()
        saldo = Decimal(str(pension.monto)).quantize(Decimal("0.01")) - Decimal(str(aplicado)).quantize(Decimal("0.01"))
        monto = Decimal(str(monto_pagado)).quantize(Decimal("0.01"))
        if monto > saldo:
            raise PagoInvalido("El monto excede el saldo pendiente")
        orm = PagoORM(
            tenant_id=self._tenant_id,
            pension_id=pension_id,
            monto_pagado=monto_pagado,
            fecha_pago=fecha_pago,
            metodo_pago=metodo_pago,
            referencia=referencia,
            creado_por=creado_por,
        )
        self._db.add(orm)
        self._db.flush()
        self._db.execute(text("""
            INSERT INTO aplicaciones_pago
              (tenant_id,pago_id,obligacion_id,monto_aplicado)
            VALUES (:tenant,:pago,:obligacion,:monto)
        """), {"tenant": self._tenant_id, "pago": orm.id, "obligacion": pension_id, "monto": monto})
        pension.estado = "pagado" if monto == saldo else "parcial"
        self._db.commit()
        self._db.refresh(orm)
        return self._pago_dict(orm)

    # ---- dashboard ---------------------------------------------------------

    def dashboard(self, anio: int, mes: int) -> Dict:
        def _agg(q):
            return q.with_entities(
                func.count().label("cnt"),
                func.coalesce(func.sum(PensionORM.monto), 0).label("monto"),
            ).first()

        base = self._q(PensionORM).filter(PensionORM.anio == anio, PensionORM.mes == mes)
        pendiente = _agg(base.filter(PensionORM.estado == "pendiente"))
        pagada    = _agg(base.filter(PensionORM.estado == "pagado"))
        vencida   = _agg(base.filter(PensionORM.estado == "vencido"))

        cobrado = (
            self._q(PagoORM)
            .filter(
                func.extract("year",  PagoORM.fecha_pago) == anio,
                func.extract("month", PagoORM.fecha_pago) == mes,
            )
            .with_entities(
                func.count().label("cnt"),
                func.coalesce(func.sum(PagoORM.monto_pagado), 0).label("monto"),
            )
            .first()
        )

        monto_total = float(pendiente.monto) + float(pagada.monto) + float(vencida.monto)
        tasa = round(float(pagada.monto) / max(monto_total, 0.01) * 100, 1)

        return {
            "periodo": f"{mes:02d}/{anio}",
            "pensiones": {
                "pendientes": {"cantidad": pendiente.cnt, "monto": round(float(pendiente.monto), 2)},
                "pagadas":    {"cantidad": pagada.cnt,    "monto": round(float(pagada.monto),    2)},
                "vencidas":   {"cantidad": vencida.cnt,   "monto": round(float(vencida.monto),   2)},
                "monto_total": round(monto_total, 2),
            },
            "cobranza": {
                "pagos_registrados": cobrado.cnt,
                "monto_cobrado":     round(float(cobrado.monto), 2),
                "tasa_pct":          tasa,
            },
        }

    # ---- morosos -----------------------------------------------------------

    def morosos(
        self,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        estado_filtro: Optional[str] = None,
    ) -> Dict:
        estados_deuda = [estado_filtro.lower()] if estado_filtro else ["pendiente", "vencido"]

        # Estudiantes con deuda agrupada
        q = (
            self._db.query(
                EstudianteORM.id.label("estudiante_id"),
                EstudianteORM.nombre.label("nombre_completo"),
                EstudianteORM.seccion,
                func.sum(PensionORM.monto).label("deuda_total"),
                func.count(PensionORM.id).label("meses_adeudados"),
            )
            .join(EstudianteORM, PensionORM.estudiante_id == EstudianteORM.id)
            .filter(
                PensionORM.tenant_id == self._tenant_id,
                PensionORM.estado.in_(estados_deuda),
            )
        )
        if mes is not None:
            q = q.filter(PensionORM.mes == mes)
        if anio is not None:
            q = q.filter(PensionORM.anio == anio)

        filas = (
            q.group_by(EstudianteORM.id, EstudianteORM.nombre, EstudianteORM.seccion)
             .having(func.sum(PensionORM.monto) > 0)
             .order_by(func.sum(PensionORM.monto).desc())
             .all()
        )

        if not filas:
            return {
                "total_morosos": 0,
                "deuda_total_inst": 0.0,
                "fecha_consulta": date.today().isoformat(),
                "morosos": [],
            }

        student_ids = [f.estudiante_id for f in filas]

        # Detalle de pensiones pendientes/vencidas por estudiante
        detalle_rows = (
            self._db.query(
                PensionORM.estudiante_id,
                PensionORM.mes,
                PensionORM.anio,
                PensionORM.monto,
                PensionORM.estado,
                ConceptoPagoORM.nombre.label("concepto"),
            )
            .join(ConceptoPagoORM, PensionORM.concepto_id == ConceptoPagoORM.id)
            .filter(
                PensionORM.tenant_id == self._tenant_id,
                PensionORM.estudiante_id.in_(student_ids),
                PensionORM.estado.in_(estados_deuda),
            )
            .order_by(PensionORM.estudiante_id, PensionORM.anio.desc(), PensionORM.mes.desc())
            .all()
        )

        detalles: Dict[int, List[Dict]] = {}
        for d in detalle_rows:
            detalles.setdefault(d.estudiante_id, []).append({
                "concepto": d.concepto,
                "mes": d.mes,
                "anio": d.anio,
                "monto": round(float(d.monto), 2),
                "estado": d.estado,
            })

        # Último pago realizado por cada estudiante
        ultimo_rows = (
            self._db.query(
                PensionORM.estudiante_id,
                func.max(PagoORM.fecha_pago).label("ultimo_pago"),
            )
            .join(PagoORM, PagoORM.pension_id == PensionORM.id)
            .filter(
                PagoORM.tenant_id == self._tenant_id,
                PensionORM.estudiante_id.in_(student_ids),
            )
            .group_by(PensionORM.estudiante_id)
            .all()
        )
        ultimo_pago_map: Dict[int, Optional[str]] = {
            r.estudiante_id: str(r.ultimo_pago) for r in ultimo_rows
        }

        morosos_list = []
        for f in filas:
            eid = f.estudiante_id
            det = detalles.get(eid, [])
            tiene_vencida = any(d["estado"] == "vencido" for d in det)
            morosos_list.append({
                "id": eid,
                "nombre_completo": f.nombre_completo,
                "seccion": f.seccion,
                "deuda_total": round(float(f.deuda_total), 2),
                "meses_adeudados": int(f.meses_adeudados),
                "ultimo_pago": ultimo_pago_map.get(eid),
                "estado": "Vencido" if tiene_vencida else "Pendiente",
                "detalle": det,
            })

        return {
            "total_morosos": len(morosos_list),
            "deuda_total_inst": round(sum(m["deuda_total"] for m in morosos_list), 2),
            "fecha_consulta": date.today().isoformat(),
            "morosos": morosos_list,
        }

    # ---- dict helpers ------------------------------------------------------

    @staticmethod
    def _concepto_dict(orm: ConceptoPagoORM) -> Dict:
        return {
            "id":            orm.id,
            "nombre":        orm.nombre,
            "descripcion":   orm.descripcion,
            "monto_default": orm.monto_default,
            "activo":        orm.activo,
        }

    @staticmethod
    def _pension_dict(orm: PensionORM) -> Dict:
        return {
            "id":            orm.id,
            "estudiante_id": orm.estudiante_id,
            "concepto_id":   orm.concepto_id,
            "anio":          orm.anio,
            "mes":           orm.mes,
            "monto":         orm.monto,
            "estado":        orm.estado,
        }

    @staticmethod
    def _pago_dict(orm: PagoORM) -> Dict:
        return {
            "id":          orm.id,
            "pension_id":  orm.pension_id,
            "monto_pagado": orm.monto_pagado,
            "fecha_pago":  str(orm.fecha_pago),
            "metodo_pago": orm.metodo_pago,
            "referencia":  orm.referencia,
            "creado_por":  orm.creado_por,
            "creado_en":   orm.creado_en.isoformat() if orm.creado_en else None,
        }
