"""
Genera 180 dias de historico de ocupacion (sintetico pero realista) para
entrenar el Modelo Predictivo de Demanda. Se inserta en dw.metrica_ocupacion
para que el sistema tenga datos historicos reales sobre los que entrenar,
en vez de usar datos puramente artificiales fuera de la BD.

Patron simulado: tendencia leve + estacionalidad semanal (fin de semana
sube demanda) + ruido aleatorio, distinto por ruta (rutas largas/
internacionales con demanda mas estable, rutas cortas mas variables).
"""
import random
import psycopg2
from datetime import date, timedelta

random.seed(42)

RUTAS = [
    # id_ruta, id_wagon, asientos_totales, ocupacion_base, amplitud_fin_semana, tendencia_diaria
    (1, 1, 100, 55, 20, 0.02),   # Santa Cruz - Montero (corta, alta variabilidad)
    (2, 4, 95,  60, 10, 0.01),   # Montero - Puerto Quijarro (internacional)
    (3, 4, 95,  50, 15, 0.03),   # Santa Cruz - Yacuiba (internacional, creciendo)
    (4, 1, 100, 45, 12, 0.00),   # Warnes - Robore
]

DIAS_HISTORIA = 180
ID_INDICADOR = 1  # Tasa de Ocupacion

conn = psycopg2.connect(dbname="dss_ferroviaria", host="localhost", port=5432, user="postgres", password="postgres")
cur = conn.cursor()

hoy = date.today()
filas_insertadas = 0

for id_ruta, id_wagon, asientos_totales, base, amplitud_finde, tendencia in RUTAS:
    for dias_atras in range(DIAS_HISTORIA, 0, -1):
        fecha = hoy - timedelta(days=dias_atras)
        dia_semana = fecha.weekday()  # 0=lunes .. 6=domingo

        efecto_finde = amplitud_finde if dia_semana >= 4 else 0  # vie/sab/dom
        efecto_tendencia = tendencia * (DIAS_HISTORIA - dias_atras)
        ruido = random.gauss(0, 6)

        ocupacion = base + efecto_finde + efecto_tendencia + ruido
        ocupacion = max(5, min(98, ocupacion))  # limites realistas

        asientos_vendidos = round(asientos_totales * ocupacion / 100)
        tasa_real = round(asientos_vendidos / asientos_totales * 100, 2)

        cur.execute(
            """
            INSERT INTO dw.metrica_ocupacion
                (id_indicador, id_ruta, id_wagon, fecha_calculo, asientos_vendidos, asientos_totales, tasa_ocupacion, estado_ruta)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'activa')
            ON CONFLICT (id_ruta, id_wagon, fecha_calculo) DO NOTHING
            """,
            (ID_INDICADOR, id_ruta, id_wagon, fecha, asientos_vendidos, asientos_totales, tasa_real)
        )
        filas_insertadas += cur.rowcount

conn.commit()
print(f"Filas insertadas: {filas_insertadas}")
cur.close()
conn.close()
