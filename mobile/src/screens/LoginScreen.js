import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('admin@ferroviariaoriental.com.bo');
  const [password, setPassword] = useState('admin123');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setCargando(true);
    setError('');
    try {
      await login(email, password);
      navigation.replace('Viajes');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🚆 Ferroviaria Oriental</Text>
      <Text style={styles.subtitulo}>App Móvil (React Native / Expo)</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6b5d49"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#6b5d49"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#1a1410" /> : <Text style={styles.botonTexto}>Ingresar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15110d', justifyContent: 'center', padding: 24 },
  titulo: { color: '#f5e03c', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitulo: { color: '#b8a890', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  input: {
    backgroundColor: '#201912', borderColor: '#3a2c1c', borderWidth: 1,
    borderRadius: 8, padding: 12, color: '#f1e9df', marginBottom: 12
  },
  boton: { backgroundColor: '#e8742c', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#1a1410', fontWeight: '700' },
  error: { color: '#ff8a8a', marginBottom: 12, textAlign: 'center' }
});
