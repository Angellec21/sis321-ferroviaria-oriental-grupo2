export default function EstadoVacio({ icono = '📭', mensaje = 'No hay datos para mostrar.' }) {
  return (
    <div className="estado-vacio">
      <span className="icono">{icono}</span>
      <p>{mensaje}</p>
    </div>
  );
}
