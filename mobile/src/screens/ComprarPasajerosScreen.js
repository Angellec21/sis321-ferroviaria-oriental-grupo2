import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator
} from 'react-native';
import api from '../api/client';

export default function ComprarPasajerosScreen({ navigation, route }) {
  const { viaje } = route.params;
  const [asientos, setAsientos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [cargandoAsientos, setCargandoAsientos] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/viajes/${viaje.id_viaje}/asientos`)
      .then((r) => setAsientos(r.data.data))
      .finally(() => setCargandoAsientos(false));
  }, []);

  const agregarPasajero = () => {
    if (!nombre || !documento) {
      setError('Ingresa nombre y documento del pasajero');
      return;
    }
    const libre = asientos.find((a) => !seleccionados.some((s) => s.id_asiento === a.id_asiento));
    if (!libre) {
      setError('No hay más asientos disponibles en este viaje');
      return;
    }
    setSeleccionados([...seleccionados, {
      id_asiento: libre.id_asiento,
      codigo_asiento: libre.codigo_asiento,
      nombre_pasajero: nombre,
      documento_pasajero: documento
    }]);
    setNombre('');
    setDocumento('');
    setError('');
  };

  const quitarPasajero = (idAsiento) => {
    setSeleccionados(seleccionados.filter((s) => s.id_asiento !== idAsiento));
  };

  const continuar = async () => {
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/public/compras', {
        id_viaje: viaje.id_viaje,
        pasajeros: seleccionados
      });
      navigation.navigate('ComprarPago', { venta: data.data.venta });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar la compra. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pasos}>1. Viaje  →  2. Pasajeros  →  3. Pago  →  4. Listo</Text>
      <Text style={styles.titulo}>{viaje.ruta}</Text>
      <Text style={styles.ayuda}>
        {cargandoAsientos ? 'Cargando asientos...' : `${asientos.length - seleccionados.length} asiento(s) disponibles`}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#6b5d49"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Documento de identidad"
        placeholderTextColor="#6b5d49"
        value={documento}
        onChangeText={setDocumento}
      />
      <TouchableOpacity style={styles.botonAgregar} onPress={agregarPasajero}>
        <Text style={styles.botonAgregarTexto}>+ Agregar pasajero</Text>
      </TouchableOpacity>

      <FlatList
        data={seleccionados}
        keyExtractor={(item) => String(item.id_asiento)}
        style={{ marginTop: 8 }}
        renderItem={({ item }) => (
          <View style={styles.filaPasajero}>
            <Text style={styles.filaTexto}>{item.codigo_asiento} · {item.nombre_pasajero}</Text>
            <TouchableOpacity onPress={() => quitarPasajero(item.id_asiento)}>
              <Text style={styles.quitar}>Quitar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vacio}>Agrega al menos un pasajero.</Text>}
      />

      <TouchableOpacity
        style={[styles.botonContinuar, (seleccionados.length === 0 || cargando) && styles.deshabilitado]}
        onPress={continuar}
        disabled={seleccionados.length === 0 || cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#1a1410" />
        ) : (
          <Text style={styles.botonContinuarTexto}>Continuar al pago ({seleccionados.length})</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', padding: 16 },
  pasos: { color: '#6b5d49', fontSize: 12, marginBottom: 12 },
  titulo: { color: '#f5e03c', fontSize: 17, fontWeight: '700' },
  ayuda: { color: '#b8a890', fontSize: 13, marginTop: 4, marginBottom: 12 },
  error: { color: '#ff8a8a', marginBottom: 10 },
  input: {
    backgroundColor: '#201912', borderColor: '#3a2c1c', borderWidth: 1,
    borderRadius: 8, padding: 12, color: '#f1e9df', marginBottom: 10
  },
  botonAgregar: { backgroundColor: '#e8742c', borderRadius: 8, padding: 12, alignItems: 'center' },
  botonAgregarTexto: { color: '#1a1410', fontWeight: '700' },
  filaPasajero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#201912', borderRadius: 8, padding: 10, marginBottom: 6
  },
  filaTexto: { color: '#f1e9df' },
  quitar: { color: '#ff8a8a', fontSize: 12 },
  vacio: { color: '#6b5d49', textAlign: 'center', marginTop: 12 },
  botonContinuar: { backgroundColor: '#f5e03c', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  botonContinuarTexto: { color: '#1a1410', fontWeight: '700' },
  deshabilitado: { opacity: 0.5 }
});
