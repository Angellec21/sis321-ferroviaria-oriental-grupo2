import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

export default function ComprarConfirmacionScreen({ navigation, route }) {
  const { ticket } = route.params;
  const primeraReserva = ticket.reservas[0];

  return (
    <View style={styles.container}>
      <View style={styles.ticket}>
        <Text style={styles.titulo}>✅ Pago aprobado</Text>
        <Text style={styles.codigo}>{ticket.codigo_venta}</Text>
        <Text style={styles.detalle}>{primeraReserva?.ruta}</Text>
        <Text style={styles.detalle}>
          {primeraReserva && new Date(primeraReserva.fecha_salida).toLocaleString('es-BO')}
        </Text>

        <FlatList
          data={ticket.reservas}
          keyExtractor={(item) => String(item.id_reserva)}
          style={{ marginTop: 12, marginBottom: 12 }}
          renderItem={({ item }) => (
            <View style={styles.fila}>
              <Text style={styles.filaTexto}>{item.codigo_asiento} · {item.nombre_pasajero}</Text>
              <Text style={styles.filaCodigo}>{item.codigo_reserva}</Text>
            </View>
          )}
        />

        <Text style={styles.total}>Total pagado: Bs {Number(ticket.monto_total).toLocaleString('es-BO')}</Text>
        <Text style={styles.ayuda}>Guarda el código {ticket.codigo_venta} para presentarlo al abordar.</Text>
      </View>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.botonTexto}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', padding: 16, justifyContent: 'center' },
  ticket: {
    backgroundColor: '#201912', borderColor: '#e8742c', borderWidth: 2,
    borderStyle: 'dashed', borderRadius: 12, padding: 18
  },
  titulo: { color: '#f5e03c', fontSize: 17, fontWeight: '700' },
  codigo: { color: '#f1e9df', fontSize: 15, fontWeight: '700', marginTop: 4 },
  detalle: { color: '#b8a890', fontSize: 13, marginTop: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  filaTexto: { color: '#f1e9df' },
  filaCodigo: { color: '#6b5d49', fontSize: 11 },
  total: { color: '#f5e03c', fontWeight: '700', fontSize: 15 },
  ayuda: { color: '#b8a890', fontSize: 12, marginTop: 8 },
  boton: { backgroundColor: '#e8742c', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  botonTexto: { color: '#1a1410', fontWeight: '700' }
});
