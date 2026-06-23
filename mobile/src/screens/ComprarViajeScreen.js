import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/client';

export default function ComprarViajeScreen({ navigation }) {
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/public/viajes')
      .then((r) => setViajes(r.data.data))
      .finally(() => setCargando(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.pasos}>1. Viaje  →  2. Pasajeros  →  3. Pago  →  4. Listo</Text>
      <Text style={styles.titulo}>Elige tu viaje</Text>
      <Text style={styles.ayuda}>No necesitas crear una cuenta para comprar.</Text>

      {cargando ? (
        <ActivityIndicator color="#e8742c" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={viajes}
          keyExtractor={(item) => String(item.id_viaje)}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ComprarPasajeros', { viaje: item })}
            >
              <Text style={styles.ruta}>{item.ruta}</Text>
              <Text style={styles.detalle}>{item.codigo_viaje} · {item.codigo_tren}</Text>
              <Text style={styles.detalle}>{new Date(item.fecha_salida).toLocaleString('es-BO')}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', padding: 16 },
  pasos: { color: '#6b5d49', fontSize: 12, marginBottom: 16 },
  titulo: { color: '#f5e03c', fontSize: 18, fontWeight: '700' },
  ayuda: { color: '#b8a890', fontSize: 13, marginTop: 4, marginBottom: 8 },
  card: {
    backgroundColor: '#201912', borderColor: '#3a2c1c', borderWidth: 1,
    borderRadius: 10, padding: 14, marginBottom: 10
  },
  ruta: { color: '#f1e9df', fontWeight: '700', fontSize: 15 },
  detalle: { color: '#b8a890', fontSize: 13, marginTop: 2 }
});
