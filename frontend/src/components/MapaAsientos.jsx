import './MapaAsientos.css';

/**
 * Mapa visual de asientos agrupado por vagón, respetando fila/columna y
 * dejando un pasillo central (según el flag `pasillo` de cada asiento) para
 * que se lea como un vagón real en vez de una grilla plana.
 *
 * Props:
 *  - asientos: [{ id_asiento, codigo_asiento, fila, columna, ventana, pasillo, id_wagon, tipo_wagon, estado }]
 *  - seleccionados: [{ id_asiento, ... }]  (pasajeros ya agregados a la venta)
 *  - asientoActivo: id_asiento elegido en este momento (aún sin agregar), o ''
 *  - onElegir: (asiento) => void
 */
export default function MapaAsientos({ asientos, seleccionados = [], asientoActivo = '', onElegir }) {
  const idsVagon = [...new Set(asientos.map((a) => a.id_wagon))].sort((a, b) => a - b);

  return (
    <div className="mapa-asientos">
      <p className="mapa-asientos-leyenda">
        <span className="chip chip-disponible" />Disponible
        <span className="chip chip-ocupado" />Ocupado
        <span className="chip chip-elegido" />Tu selección
      </p>

      <div className="mapa-asientos-vagones">
        {idsVagon.map((idWagon) => {
          const deEsteVagon = asientos.filter((a) => a.id_wagon === idWagon);
          const maxColumna = Math.max(...deEsteVagon.map((a) => a.columna));
          const maxFila = Math.max(...deEsteVagon.map((a) => a.fila));

          // Columna donde arranca el pasillo central: la primera columna
          // marcada como pasillo. Todo lo que esté después se desplaza una
          // columna de grilla para dejar el hueco visual del pasillo.
          const columnasPasillo = [...new Set(deEsteVagon.filter((a) => a.pasillo).map((a) => a.columna))];
          const bordePasillo = columnasPasillo.length ? Math.min(...columnasPasillo) : null;
          const columnaGrid = (col) => col + (bordePasillo && col > bordePasillo ? 1 : 0);
          const totalColumnasGrid = columnaGrid(maxColumna);

          return (
            <div className="vagon-box" key={idWagon}>
              <div className="vagon-titulo">🚃 Vagón {idWagon}{deEsteVagon[0]?.tipo_wagon ? ` · ${deEsteVagon[0].tipo_wagon}` : ''}</div>
              <div
                className="vagon-grid"
                style={{
                  gridTemplateColumns: `repeat(${totalColumnasGrid}, 2.1rem)`,
                  gridTemplateRows: `repeat(${maxFila}, 2.1rem)`
                }}
              >
                {deEsteVagon.map((a) => {
                  const yaAgregado = seleccionados.some((s) => s.id_asiento === a.id_asiento);
                  const esActivo = String(asientoActivo) === String(a.id_asiento);
                  const ocupado = a.estado === 'ocupado';

                  let clase = 'asiento-btn asiento-disponible';
                  if (ocupado) clase = 'asiento-btn asiento-ocupado';
                  else if (yaAgregado || esActivo) clase = 'asiento-btn asiento-elegido';

                  return (
                    <button
                      key={a.id_asiento}
                      type="button"
                      className={clase}
                      style={{ gridColumn: columnaGrid(a.columna), gridRow: a.fila }}
                      disabled={ocupado || yaAgregado}
                      title={ocupado ? 'Ocupado' : `${a.codigo_asiento}${a.ventana ? ' · ventana' : ''}`}
                      onClick={() => onElegir?.(a)}
                    >
                      {a.codigo_asiento}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
