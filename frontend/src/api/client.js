import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function irALogin() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('usuario');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

let renovando = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const esLogin = config?.url?.includes('/auth/login');
    const esRefresh = config?.url?.includes('/auth/refresh');

    if (response?.status !== 401 || esLogin || esRefresh || config._reintentado) {
      if (response?.status === 401 && !esLogin) irALogin();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      irALogin();
      return Promise.reject(error);
    }

    try {
      // Evita disparar múltiples refresh en paralelo si varias peticiones fallan a la vez
      renovando = renovando || axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const { data } = await renovando;
      renovando = null;

      localStorage.setItem('accessToken', data.tokens.accessToken);

      config._reintentado = true;
      config.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
      return api(config);
    } catch (refreshError) {
      renovando = null;
      irALogin();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
