import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ViajesScreen({ navigation }) {
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { usuario, logout } = useAuth();

  useEffect(() => {
    api.get('/catalogo/viajes')
      .then((r) => setViajes(r.data.data))
      .finally(() => setCargando(false));
  }, []);

  const cerrarSesion = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Viajes Disponibles</Text>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.salir}>Salir ({usuario?.nombre})</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator color="#e8742c" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={viajes}
          keyExtractor={(item) => String(item.id_viaje)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Asientos', { viaje: item })}
            >
              <Text style={styles.ruta}>{item.ruta}</Text>
              <Text style={styles.detalle}>{item.codigo_viaje} · {item.codigo_tren}</Text>
              <Text style={styles.detalle}>{new Date(item.fecha_salida).toLocaleString('es-BO')}</Text>
              <Text style={styles.estado}>{item.estado_viaje}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#3a2c1c'
  },
  titulo: { color: '#f5e03c', fontSize: 18, fontWeight: '700' },
  salir: { color: '#b8a890', fontSize: 12 },
  card: {
    backgroundColor: '#201912', borderColor: '#3a2c1c', borderWidth: 1,
    borderRadius: 10, padding: 14, marginBottom: 10
  },
  ruta: { color: '#f1e9df', fontWeight: '700', fontSize: 15 },
  detalle: { color: '#b8a890', fontSize: 13, marginTop: 2 },
  estado: { color: '#f5e03c', fontSize: 12, marginTop: 4, textTransform: 'uppercase' }
});
