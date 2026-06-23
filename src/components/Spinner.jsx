export default function Spinner({ texto = 'Cargando...' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>{texto}</span>
    </div>
  );
}
