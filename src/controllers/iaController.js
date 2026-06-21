// ============================================
// Controlador: Modelo Predictivo de Demanda
// Cliente del nodo "Servidor de IA (Python/TensorFlow)" del diagrama de
// despliegue. El diagrama especifica gRPC; aqui se usa REST por simplicidad
// (ver dss-ferroviaria-ia/servidor_ia.py y infra/README.md).
// ============================================

const IA_SERVER_URL = process.env.IA_SERVER_URL || 'http://localhost:8500';

/**
 * GET /api/reportes/prediccion-demanda?id_ruta=&fecha=
 */
export const predecirDemanda = async (req, res) => {
  const { id_ruta, fecha } = req.query;

  if (!id_ruta || !fecha) {
    return res.status(400).json({
      success: false,
      message: 'Parámetros requeridos: id_ruta, fecha (YYYY-MM-DD)',
      code: 'MISSING_FIELDS'
    });
  }

  try {
    const respuesta = await fetch(`${IA_SERVER_URL}/predecir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_ruta: Number(id_ruta), fecha })
    });

    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}));
      return res.status(respuesta.status).json({
        success: false,
        message: error.detail || 'El servidor de IA rechazó la solicitud',
        code: 'IA_SERVER_ERROR'
      });
    }

    const prediccion = await respuesta.json();
    res.json({ success: true, data: prediccion });
  } catch (error) {
    console.error('[IA PREDICCION] Error:', error.message);
    res.status(503).json({
      success: false,
      message: 'Servidor de IA no disponible. ¿Está corriendo uvicorn en el puerto 8500?',
      code: 'IA_SERVER_UNAVAILABLE'
    });
  }
};

export default { predecirDemanda };
