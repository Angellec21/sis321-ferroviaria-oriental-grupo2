import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import InicioScreen from './src/screens/InicioScreen';
import LoginScreen from './src/screens/LoginScreen';
import ViajesScreen from './src/screens/ViajesScreen';
import AsientosScreen from './src/screens/AsientosScreen';
import ComprarViajeScreen from './src/screens/ComprarViajeScreen';
import ComprarPasajerosScreen from './src/screens/ComprarPasajerosScreen';
import ComprarPagoScreen from './src/screens/ComprarPagoScreen';
import ComprarConfirmacionScreen from './src/screens/ComprarConfirmacionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Inicio"
          screenOptions={{
            headerStyle: { backgroundColor: '#201912' },
            headerTintColor: '#f5e03c',
            contentStyle: { backgroundColor: '#15110d' }
          }}
        >
          {/* Entrada: elegir comprar sin cuenta o iniciar sesión como personal */}
          <Stack.Screen name="Inicio" component={InicioScreen} options={{ headerShown: false }} />

          {/* Flujo público: comprar pasaje sin registro */}
          <Stack.Screen name="ComprarViaje" component={ComprarViajeScreen} options={{ title: 'Comprar Pasaje' }} />
          <Stack.Screen name="ComprarPasajeros" component={ComprarPasajerosScreen} options={{ title: 'Pasajeros' }} />
          <Stack.Screen name="ComprarPago" component={ComprarPagoScreen} options={{ title: 'Pago' }} />
          <Stack.Screen name="ComprarConfirmacion" component={ComprarConfirmacionScreen} options={{ title: 'Listo', headerBackVisible: false }} />

          {/* Flujo de personal: requiere login */}
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Viajes" component={ViajesScreen} options={{ title: 'Viajes' }} />
          <Stack.Screen name="Asientos" component={AsientosScreen} options={{ title: 'Asientos' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
