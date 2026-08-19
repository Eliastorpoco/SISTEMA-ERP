"""
Enumeraciones del dominio.
Definen valores válidos para roles, secciones y estados.
"""
from enum import Enum


class SeccionEnum(str, Enum):
    CUATRO_A = "4A"
    CUATRO_B = "4B"
    CINCO_A = "5A"
    CINCO_B = "5B"


class EstadoAsistencia(str, Enum):
    PRESENTE = "presente"
    FALTA = "falta"
    TARDANZA = "tardanza"
    JUSTIFICADO = "justificado"


class RolUsuario(str, Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    DOCENTE = "docente"
    ESTUDIANTE = "estudiante"
