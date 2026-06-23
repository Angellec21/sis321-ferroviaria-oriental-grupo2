"""
Modelo Predictivo de Demanda - Ferroviaria Oriental S.A.
Entrena una red neuronal (TensorFlow/Keras) para predecir la tasa de
ocupacion esperada de una ruta en una fecha futura, usando el historico
de dw.metrica_ocupacion.

Features: id_ruta (one-hot), dia_semana (one-hot), dias_desde_inicio (tendencia)
Target: tasa_ocupacion (%)
"""
import numpy as np
import pandas as pd
import psycopg2
import tensorflow as tf
from tensorflow import keras

conn = psycopg2.connect(dbname="dss_ferroviaria", host="localhost", port=5432, user="postgres", password="postgres")
df = pd.read_sql(
    """
    SELECT id_ruta, fecha_calculo, tasa_ocupacion
    FROM dw.metrica_ocupacion
    ORDER BY fecha_calculo
    """,
    conn
)
conn.close()

print(f"Filas de entrenamiento: {len(df)}")

df["fecha_calculo"] = pd.to_datetime(df["fecha_calculo"])
df["dia_semana"] = df["fecha_calculo"].dt.weekday
df["dias_desde_inicio"] = (df["fecha_calculo"] - df["fecha_calculo"].min()).dt.days

RUTAS = sorted(df["id_ruta"].unique().tolist())

def vectorizar(id_ruta, dia_semana, dias_desde_inicio):
    ruta_onehot = [1.0 if r == id_ruta else 0.0 for r in RUTAS]
    dia_onehot = [1.0 if d == dia_semana else 0.0 for d in range(7)]
    return ruta_onehot + dia_onehot + [dias_desde_inicio / 180.0]

X = np.array([
    vectorizar(row.id_ruta, row.dia_semana, row.dias_desde_inicio)
    for row in df.itertuples()
])
y = (df["tasa_ocupacion"].values / 100.0).astype("float32")  # normalizado 0-1

# Split simple train/test (ultimos 20% como validacion temporal)
corte = int(len(X) * 0.8)
X_train, X_val = X[:corte], X[corte:]
y_train, y_val = y[:corte], y[corte:]

modelo = keras.Sequential([
    keras.layers.Input(shape=(X.shape[1],)),
    keras.layers.Dense(16, activation="relu"),
    keras.layers.Dense(8, activation="relu"),
    keras.layers.Dense(1, activation="sigmoid")  # salida 0-1 -> % ocupacion
])

modelo.compile(optimizer="adam", loss="mse", metrics=["mae"])

historial = modelo.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=80,
    batch_size=16,
    verbose=0
)

mae_final = historial.history["val_mae"][-1] * 100
print(f"Error promedio (MAE) en validacion: {mae_final:.2f} puntos porcentuales de ocupacion")

modelo.save("modelo_demanda.keras")

# Guardar metadata (rutas y orden de features) para la API
import json
with open("modelo_metadata.json", "w") as f:
    json.dump({"rutas": RUTAS, "mae_validacion": float(mae_final)}, f)

print("Modelo guardado en modelo_demanda.keras")
