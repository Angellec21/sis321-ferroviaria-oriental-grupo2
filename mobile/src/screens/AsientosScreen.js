import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/client';

export default function AsientosScreen({ route }) {
  const { viaje } = route.params;
  const [asientos, setAsientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get(`/catalogo/viajes/${viaje.id_viaje}/asientos`)
      .then((r) => setAsientos(r.data.data))
      .finally(() => setCargando(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{viaje.ruta}</Text>
      <Text style={styles.subtitulo}>{viaje.codigo_viaje} · Asientos disponibles</Text>

      {cargando ? (
        <ActivityIndicator color="#e8742c" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={asientos}
          numColumns={4}
          keyExtractor={(item) => String(item.id_asiento)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.asiento}>
              <Text style={styles.asientoTexto}>{item.codigo_asiento}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vacio}>No hay asientos disponibles en este viaje.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', padding: 16 },
  titulo: { color: '#f5e03c', fontSize: 17, fontWeight: '700' },
  subtitulo: { color: '#b8a890', fontSize: 13, marginTop: 4, marginBottom: 10 },
  asiento: {
    backgroundColor: '#201912', borderColor: '#e8742c', borderWidth: 1,
    borderRadius: 8, padding: 12, margin: 4, alignItems: 'center', minWidth: 60
  },
  asientoTexto: { color: '#f1e9df', fontWeight: '700' },
  vacio: { color: '#b8a890', textAlign: 'center', marginTop: 20 }
});
