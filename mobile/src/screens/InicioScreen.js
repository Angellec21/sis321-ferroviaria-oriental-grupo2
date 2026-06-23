import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function InicioScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.titulo}>Ferroviaria Oriental</Text>
      <Text style={styles.subtitulo}>Sistema de Apoyo a la Toma de Decisiones</Text>

      <TouchableOpacity
        style={[styles.boton, styles.botonPrimario]}
        onPress={() => navigation.navigate('ComprarViaje')}
      >
        <Text style={styles.botonPrimarioTexto}>🎫 Comprar Pasaje</Text>
        <Text style={styles.botonAyuda}>Sin crear cuenta</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.boton, styles.botonSecundario]}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.botonSecundarioTexto}>Soy personal de la empresa</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { width: 90, height: 90, marginBottom: 16, borderRadius: 45 },
  titulo: { color: '#f5e03c', fontSize: 22, fontWeight: '700' },
  subtitulo: { color: '#b8a890', marginBottom: 36, marginTop: 4, textAlign: 'center' },
  boton: { width: '100%', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 14 },
  botonPrimario: { backgroundColor: '#e8742c' },
  botonPrimarioTexto: { color: '#1a1410', fontWeight: '700', fontSize: 16 },
  botonAyuda: { color: '#1a1410', fontSize: 12, marginTop: 2, opacity: 0.8 },
  botonSecundario: { borderWidth: 1, borderColor: '#3a2c1c' },
  botonSecundarioTexto: { color: '#b8a890', fontSize: 14 }
});
