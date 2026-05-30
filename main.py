from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, model_validator  # <-- Añadimos model_validator aquí
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

app = FastAPI()

# Configura los CORS para que Vercel pueda comunicarse sin bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción puedes cambiarlo por tu link de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIGURACIÓN DE SUPABASE ───
SUPABASE_URL = "https://qhplmoapbbsnexbrdyjb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocGxtb2FwYmJzbmV4YnJkeWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU0NjcsImV4cCI6MjA5NTM5MTQ2N30.67dGUmB6tGOoatSJcbO4ZM8_I9SsQG0yRDTZtbzfy_A"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── MODELO DE DATOS DE PYDANTIC (Con Validación de Consistencia) ───
class PollaPayload(BaseModel):
    nombre: str
    correo: EmailStr
    goles_colombia: int
    goles_congo: int
    titulares: List[int]
    goleadores: Dict[str, Any] # Recibe la estructura flexible multi-gol
    cambio_sale: Optional[str] = None
    cambio_entra: Optional[str] = None

    # === ESTO ES LO QUE PREVIENE EL ERROR DE LAS ANOTACIONES DE MÁS ===
    @model_validator(mode='after')
    def validar_consistencia_goles(self) -> 'PollaPayload':
        total_goles_goleadores = 0
        
        # Recorremos el objeto de goleadores para contar cuántos goles reales se asignaron
        for jugador_id, info in self.goleadores.items():
            if info.get("hizoGol"):
                # Si viene 'cantidadGoles' (como el 2 que pusiste) lo suma, si no, asume 1 gol básico
                goles_jugador = info.get("cantidadGoles", 1)
                total_goles_goleadores += goles_jugador
        
        # Si los goles asignados a los jugadores NO coinciden con el marcador global de Colombia
        if total_goles_goleadores != self.goles_colombia:
            raise ValueError(
                f"Marcador inconsistente. Indicaste {self.goles_colombia} gol(es) para Colombia, "
                f"pero sumaste {total_goles_goleadores} gol(es) en el desglose de los jugadores."
            )
            
        return self


@app.post("/api/polla")
async def registrar_polla(payload: PollaPayload):
    try:
        # 1. Preparar el diccionario con los datos exactos para la tabla
        datos_apuesta = {
            "nombre": payload.nombre,
            "correo": payload.correo.lower(),
            "goles_colombia": payload.goles_colombia,
            "goles_congo": payload.goles_congo,
            "titulares": payload.titulares,   
            "goleadores": payload.goleadores, 
            "cambio_sale": payload.cambio_sale,
            "cambio_entra": payload.cambio_entra
        }

        # 2. Insertar directamente en la tabla 'apuestas' de Supabase
        response = supabase.table("apuestas").insert(datos_apuesta).execute()
        
        return {"status": "success", "message": "Polla registrada correctamente en la base de datos."}

    except Exception as e:
        # Captura tanto los errores de Supabase como los de nuestra validación personalizada
        error_msg = str(e)
        
        # Si nuestra validación de Pydantic falla, lanzamos un Bad Request estructurado
        if "Marcador inconsistente" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
            
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Este correo electrónico ya registró su polla.")
        
        raise HTTPException(status_code=500, detail=f"Error interno: {error_msg}")