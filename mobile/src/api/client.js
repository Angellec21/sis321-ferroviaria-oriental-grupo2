import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// La misma API REST del backend (Node.js/Express) que consume el frontend web
// y que está balanceada por Nginx en :8443. Para el preview web usamos
// directo el backend en :3000 para evitar problemas de certificado autofirmado.
const BASE_URL = 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
