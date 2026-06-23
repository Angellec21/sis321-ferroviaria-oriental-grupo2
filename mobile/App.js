import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ViajesScreen from './src/screens/ViajesScreen';
import AsientosScreen from './src/screens/AsientosScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#201912' },
            headerTintColor: '#f5e03c',
            contentStyle: { backgroundColor: '#15110d' }
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Viajes" component={ViajesScreen} options={{ title: 'Viajes' }} />
          <Stack.Screen name="Asientos" component={AsientosScreen} options={{ title: 'Asientos' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
