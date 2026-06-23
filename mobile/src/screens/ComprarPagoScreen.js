import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/client';

function patronQr(semilla) {
  const celdas = [];
  let hash = 0;
  for (let i = 0; i < semilla.length; i++) hash = (hash * 31 + semilla.charCodeAt(i)) % 100000;
  for (let i = 0; i < 64; i++) {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    celdas.push(hash % 3 !== 0);
  }
  return celdas;
}

export default function ComprarPagoScreen({ navigation, route }) {
  const { venta } = route.params;
  const [metodo, setMetodo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const confirmarPago = async () => {
    setError('');
    setProcesando(true);
    try {
      await new Promise((r) => setTimeout(r, 1400)); // simula la pasarela externa
      await api.post('/public/pagos', { id_venta: venta.id_venta, tipo_pago: metodo });
      const { data } = await api.get(`/public/compras/${venta.codigo_venta}`);
      navigation.replace('ComprarConfirmacion', { ticket: data.data });
    } catch (err) {
      setError(err.response?.data?.message || 'La pasarela no pudo procesar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pasos}>1. Viaje  →  2. Pasajeros  →  3. Pago  →  4. Listo</Text>
      <Text style={styles.titulo}>Pasarela de Pagos</Text>
      <Text style={styles.monto}>Bs {Number(venta.monto_total).toLocaleString('es-BO')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.opciones}>
        <TouchableOpacity
          style={[styles.opcion, metodo === 'qr' && styles.opcionActiva]}
          onPress={() => setMetodo('qr')}
        >
          <Text style={styles.opcionTexto}>📱 Pago QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.opcion, metodo === 'transferencia' && styles.opcionActiva]}
          onPress={() => setMetodo('transferencia')}
        >
          <Text style={styles.opcionTexto}>🏦 Transferencia</Text>
        </TouchableOpacity>
      </View>

      {metodo === 'qr' && (
        <View style={styles.qrBox}>
          <View style={styles.qrGrid}>
            {patronQr(venta.codigo_venta).map((on, i) => (
              <View key={i} style={[styles.qrCelda, !on && styles.qrCeldaOff]} />
            ))}
          </View>
          <Text style={styles.qrCodigo}>{venta.codigo_venta}</Text>
          <Text style={styles.qrAyuda}>Escanea con tu app bancaria o billetera digital</Text>
        </View>
      )}

      {metodo === 'transferencia' && (
        <View style={styles.transferBox}>
          <Text style={styles.transferTexto}>Banco: Banco Ferroviario Oriental</Text>
          <Text style={styles.transferTexto}>Cuenta: 4001-998877-01</Text>
          <Text style={styles.transferTexto}>Titular: Ferroviaria Oriental S.A.</Text>
          <Text style={styles.transferTexto}>Referencia: {venta.codigo_venta}</Text>
        </View>
      )}

      {metodo && (
        <TouchableOpacity style={styles.botonPagar} onPress={confirmarPago} disabled={procesando}>
          {procesando ? (
            <ActivityIndicator color="#1a1410" />
          ) : (
            <Text style={styles.botonPagarTexto}>
              {metodo === 'qr' ? 'Ya escaneé, confirmar pago' : 'Ya transferí, confirmar pago'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', padding: 16 },
  pasos: { color: '#6b5d49', fontSize: 12, marginBottom: 12 },
  titulo: { color: '#f5e03c', fontSize: 18, fontWeight: '700' },
  monto: { color: '#f5e03c', fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 16 },
  error: { color: '#ff8a8a', marginBottom: 10 },
  opciones: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  opcion: {
    flex: 1, backgroundColor: '#201912', borderColor: '#3a2c1c', borderWidth: 1,
    borderRadius: 10, padding: 16, alignItems: 'center'
  },
  opcionActiva: { borderColor: '#f5e03c' },
  opcionTexto: { color: '#f1e9df', fontWeight: '600' },
  qrBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  qrGrid: { width: 160, height: 160, flexDirection: 'row', flexWrap: 'wrap' },
  qrCelda: { width: 20, height: 20, backgroundColor: '#15110d' },
  qrCeldaOff: { backgroundColor: 'transparent' },
  qrCodigo: { color: '#15110d', fontSize: 11, marginTop: 8 },
  qrAyuda: { color: '#444', fontSize: 11, marginTop: 4, textAlign: 'center' },
  transferBox: { backgroundColor: '#201912', borderRadius: 10, padding: 14, marginBottom: 16 },
  transferTexto: { color: '#f1e9df', marginBottom: 4 },
  botonPagar: { backgroundColor: '#e8742c', borderRadius: 8, padding: 14, alignItems: 'center' },
  botonPagarTexto: { color: '#1a1410', fontWeight: '700' }
});
