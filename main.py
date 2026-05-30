from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, model_validator
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

app = FastAPI()

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIGURACIÓN DE SUPABASE ───
SUPABASE_URL = "https://qhplmoapbbsnexbrdyjb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocGxtb2FwYmJzbmV4YnJkeWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU0NjcsImV4cCI6MjA5NTM5MTQ2N30.67dGUmB6tGOoatSJcbO4ZM8_I9SsQG0yRDTZtbzfy_A"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── MODELO DE DATOS OPTIMIZADO PARA AMBOS EQUIPOS ───
class PollaPayload(BaseModel):
    nombre: str
    correo: EmailStr
    goles_colombia: int
    goles_congo: int
    titulares: List[int]       # Puedes meter aquí todos los IDs de titulares juntos
    goleadores: Dict[str, Any]  # Recibe el diccionario estructurado con {"colombia": {...}, "congo": {...}}
    cambio_sale: Optional[str] = None
    cambio_entra: Optional[str] = None

    @model_validator(mode='after')
    def validar_goles_doble_vía(self) -> 'PollaPayload':
        # Extraemos los diccionarios por país de manera segura
        goleadores_colombia = self.goleadores.get("colombia", {})
        goleadores_congo = self.goleadores.get("congo", {})

        total_colombia = 0
        total_congo = 0

        # 1. Contar goles de Colombia
        for jugador_id, info in goleadores_colombia.items():
            if info.get("hizoGol"):
                total_colombia += info.get("cantidadGoles", 1)

        # 2. Contar goles del Congo
        for jugador_id, info in goleadores_congo.items():
            if info.get("hizoGol"):
                total_congo += info.get("cantidadGoles", 1)

        # 3. Validar consistencia de Colombia
        if total_colombia != self.goles_colombia:
            raise ValueError(
                f"Inconsistencia en Colombia: El marcador global dice {self.goles_colombia} gol(es), "
                f"pero se asignaron {total_colombia} gol(es) a sus jugadores."
            )

        # 4. Validar consistencia del Congo
        if total_congo != self.goles_congo:
            raise ValueError(
                f"Inconsistencia en RD Congo: El marcador global dice {self.goles_congo} gol(es), "
                f"pero se asignaron {total_congo} gol(es) a sus jugadores."
            )

        return self


@app.post("/api/polla")
async def registrar_polla(payload: PollaPayload):
    try:
        datos_apuesta = {
            "nombre": payload.nombre,
            "correo": payload.correo.lower(),
            "goles_colombia": payload.goles_colombia,
            "goles_congo": payload.goles_congo,
            "titulares": payload.titulares,   
            "goleadores": payload.goleadores, # Aquí se guardará el JSON estructurado con ambos equipos
            "cambio_sale": payload.cambio_sale,
            "cambio_entra": payload.cambio_entra
        }

        response = supabase.table("apuestas").insert(datos_apuesta).execute()
        return {"status": "success", "message": "¡Polla registrada correctamente con ambos equipos!"}

    except Exception as e:
        error_msg = str(e)
        
        # Captura nuestros mensajes de error personalizados
        if "Inconsistencia" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
            
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Este correo electrónico ya registró su polla.")
        
        raise HTTPException(status_code=500, detail=f"Error interno: {error_msg}")