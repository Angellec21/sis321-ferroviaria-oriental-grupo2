"""
Servidor de IA - Ferroviaria Oriental S.A.
Equivale al nodo "Servidor de IA (Python/TensorFlow) - Modelo Predictivo Demanda"
del diagrama de despliegue.

Protocolo: el diagrama especifica gRPC; aqui se simplifico a REST (FastAPI)
para reducir la complejidad de implementacion (ver infra/README.md).
"""
import json
from datetime import date

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="DSS Ferroviaria - Servidor de IA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

modelo = tf.keras.models.load_model("modelo_demanda.keras")
with open("modelo_metadata.json") as f:
    metadata = json.load(f)

RUTAS = metadata["rutas"]
FECHA_INICIO_HISTORIA = date.today()  # aproximacion: dias_desde_inicio se recalcula relativo a hoy


class PrediccionRequest(BaseModel):
    id_ruta: int
    fecha: str  # YYYY-MM-DD


def vectorizar(id_ruta: int, fecha: date) -> np.ndarray:
    dia_semana = fecha.weekday()
    dias_desde_inicio = (fecha - FECHA_INICIO_HISTORIA).days + 180  # aprox. relativo al dataset de entrenamiento

    ruta_onehot = [1.0 if r == id_ruta else 0.0 for r in RUTAS]
    dia_onehot = [1.0 if d == dia_semana else 0.0 for d in range(7)]
    return np.array([ruta_onehot + dia_onehot + [dias_desde_inicio / 180.0]], dtype="float32")


@app.get("/health")
def health():
    return {"status": "ok", "modelo": "modelo_demanda.keras", "rutas_entrenadas": RUTAS}


@app.post("/predecir")
def predecir(req: PrediccionRequest):
    if req.id_ruta not in RUTAS:
        raise HTTPException(status_code=400, detail=f"id_ruta debe ser uno de: {RUTAS}")

    try:
        fecha = date.fromisoformat(req.fecha)
    except ValueError:
        raise HTTPException(status_code=400, detail="fecha debe tener formato YYYY-MM-DD")

    entrada = vectorizar(req.id_ruta, fecha)
    prediccion = modelo.predict(entrada, verbose=0)[0][0]
    ocupacion_estimada = round(float(prediccion) * 100, 2)

    return {
        "id_ruta": req.id_ruta,
        "fecha": req.fecha,
        "ocupacion_estimada_pct": ocupacion_estimada,
        "mae_validacion_modelo": metadata["mae_validacion"]
    }
