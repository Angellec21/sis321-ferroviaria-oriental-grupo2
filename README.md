# DSS Ferroviaria Oriental S.A.

Sistema de Apoyo a la Toma de Decisiones — monorepo con un nodo del **Diagrama de
Despliegue** (Actividad 3) por subcarpeta. Cada una es un componente desplegable
independiente; viven juntas aquí para facilitar la entrega y revisión.

| Carpeta | Nodo del diagrama | Stack |
|---|---|---|
| [`backend/`](backend) | Servidor de Aplicaciones (Node.js) | Express + PostgreSQL + Redis |
| [`frontend/`](frontend) | App React SPA + Service Worker (PWA) | React + Vite |
| [`ia/`](ia) | Servidor de IA — Modelo Predictivo de Demanda | Python + TensorFlow/Keras + FastAPI |
| [`mobile/`](mobile) | App Móvil (React Native) | Expo / React Native |
| [`backend/infra/`](backend/infra) | Balanceador de Carga (Nginx) + Monitoreo (Prometheus/Grafana) | Configs |

## Cómo levantar todo

```bash
# 1. Base de datos
brew services start postgresql@16 redis

# 2. Backend (2 instancias para el balanceador)
cd backend && npm install
npm run db:init && npm run db:seed
npm run dev                          # instancia 1, puerto 3000
PORT=3001 node src/index.js &        # instancia 2, puerto 3001

# 3. Servidor de IA
cd ../ia && source venv/bin/activate
pip install -r requirements.txt      # o ver ia/README si no existe aun
python entrenar_modelo.py            # si no existe modelo_demanda.keras
uvicorn servidor_ia:app --port 8500

# 4. Frontend
cd ../frontend && npm install && npm run dev   # puerto 5173

# 5. App móvil (modo web; no hay Xcode/Android Studio en esta máquina)
cd ../mobile && npm install && npx expo start --web --port 19006

# 6. Nginx (balanceador + TLS) y Prometheus/Grafana
# Ver backend/infra/README.md para los pasos detallados
```

## Documentación por módulo

- [`backend/README.md`](backend/README.md) — API, auth JWT, roles, setup completo
- [`backend/infra/README.md`](backend/infra/README.md) — Nginx, Redis, Prometheus/Grafana, Servidor de IA, app móvil
- [`backend/SPRINT-REVIEW.md`](backend/SPRINT-REVIEW.md) — guion de demo (Actividad 5)
- [`backend/RETROSPECTIVE.md`](backend/RETROSPECTIVE.md) — retrospectiva del sprint

## Limitaciones conocidas (documentadas, no ocultas)

- **App móvil**: verificada en modo web (`react-native-web`), no en emulador
  Android/iOS real — esta máquina no tiene Xcode con simulador ni Android Studio.
- **Servidor de IA**: el diagrama especifica gRPC; se implementó REST por
  simplicidad (mismo backend Node como cliente).
- **Pasarela de Pagos**: simulada dentro del propio backend, no como servicio
  externo separado.
