from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import sqlite3
from typing import List, Dict

app = FastAPI(title="Backend Polla Empresarial")

# Permitir que tu app de Vite (localhost:5173) se comunique con Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de fecha límite: 23 de Junio. 
# Menos 10 minutos de margen de trampa.
ZONA_HORARIA_COLOMBIA = timezone(timedelta(hours=-5))
FECHA_PARTIDO_COL = datetime(2026, 6, 23, 17, 0, 0, tzinfo=ZONA_HORARIA_COLOMBIA) # Ejemplo: 5:00 PM
FECHA_LIMITE_REGISTRO = FECHA_PARTIDO_COL - timedelta(minutes=10)

# Esquema de validación de datos con Pydantic
class PollaIn(BaseModel):
    nombre: str
    correo: EmailStr
    goles_colombia: int
    goles_congo: int
    titulares: List[int]
    goleadores: Dict[str, dict]
    cambio_sale: str
    cambio_entra: str

# Inicializar Base de Datos de forma rápida
def init_db():
    conn = sqlite3.connect("polla.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS participantes (
            correo TEXT PRIMARY KEY,
            nombre TEXT,
            goles_colombia INTEGER,
            goles_congo INTEGER,
            datos_completos TEXT,
            fecha_registro TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

@app.post("/api/polla")
def registrar_polla(voto: PollaIn):
    # CONTROL 1: Validar el tiempo del servidor contra la trampa
    ahora_colombia = datetime.now(ZONA_HORARIA_COLOMBIA)
    if ahora_colombia >= FECHA_LIMITE_REGISTRO:
        raise HTTPException(
            status_code=400, 
            detail="El tiempo de registro ha cerrado. La polla bloqueó el ingreso de datos 10 minutos antes del partido."
        )

    # CONTROL 2: Validar extensión del correo corporativo
    if not voto.correo.endswith("@bancodeoccidente.com.co"):
        raise HTTPException(
            status_code=400, 
            detail="Dominio de correo no autorizado. Debe ser institucional."
        )

    # CONTROL 3: Evitar registros duplicados en la Base de Datos
    conn = sqlite3.connect("polla.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT correo FROM participantes WHERE correo = ?", (voto.correo,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400, 
            detail="Ya registraste un juego con este correo electrónico. Solo se permite una polla por participante."
        )

    # Guardar la información si pasa todos los filtros
    try:
        cursor.execute("""
            INSERT INTO participantes (correo, nombre, goles_colombia, goles_congo, datos_completos, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            voto.correo, 
            voto.nombre, 
            voto.goles_colombia, 
            voto.goles_congo, 
            voto.json(), 
            ahora_colombia.isoformat()
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Error interno al guardar los datos.")
    
    conn.close()
    return {"status": "success", "message": "Polla registrada correctamente"}