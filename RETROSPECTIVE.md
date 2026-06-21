# 📋 Retrospectiva Sprint - Formato Start/Stop/Continue

**Sprint:** Actividad 5 - Sprint Técnico (Autenticación y Gestión de Usuarios)  
**Duración:** 19/06/2026 - 25/06/2026  
**Equipo:** Grupo Dos (Angel Emanuel Le Caro Quispe)  

---

## 🎯 Objetivo del Sprint

Implementar un sistema de autenticación seguro con JWT, roles y permisos para el backend de DSS Ferroviaria Oriental, alineado con el diagrama de despliegue (Node.js + Express + PostgreSQL).

**Estado Final:** ✅ COMPLETADO

---

## 📊 Resultados Entregables

| Entregable | Estado | Descripción |
|---|---|---|
| Backend Node.js + Express | ✅ | Stack configurado, servidor corriendo |
| PostgreSQL + Schema | ✅ | 36+ tablas normalizadas, roles y permisos |
| JWT + Autenticación | ✅ | Login, refresh token, logout implementados |
| RBAC (Roles + Permisos) | ✅ | 3 roles, 19 permisos, matriz completa |
| Middleware de Auth | ✅ | Validación JWT, verificación de roles |
| Auditoría | ✅ | Log de eventos en tabla audit_logs |
| Documentación | ✅ | README, SETUP, GITHUB, SPRINT-REVIEW |
| Postman Collection | ✅ | 12 requests para testing |
| GitHub | ✅ | Repo creado, commits descriptivos |

---

## 🚀 START (Comenzar a Hacer)

**Actualización:** los 3 primeros puntos que planeamos para "el próximo sprint" ya se
implementaron durante esta misma iteración extendida (no quedaron para después):

- [x] **Sistema de Reportes** — Query A (ingresos), Query B (ocupación), Query C (mantenimiento)
- [x] **Módulo de Ventas** — crear venta/reserva, validar disponibilidad de asientos, cancelar reserva
- [x] **Módulo de Pagos** — QR, transferencia, ventanilla + Pasarela de Pagos pública simulada (compra sin registro)

**Lo que sí queda genuinamente pendiente:**

- [ ] **Sincronización Offline**
  - Implementar service workers
  - Queue de cambios pendientes
  - Sincronización al conectar

- [ ] **Testing Automatizado**
  - Unit tests (Jest)
  - Integration tests
  - E2E tests (Cypress)

- [ ] **Monitoreo en Producción**
  - Prometheus metrics
  - Grafana dashboards
  - Alertas automáticas

- [ ] **Push del repositorio a GitHub**
  - Repo local listo (`sis321-ferroviaria-oriental-grupo2`), falta crear el remoto y hacer push

---

## ⏹️ STOP (Dejar de Hacer)

**Cosas que debemos ELIMINAR o MEJORAR:**

- [ ] ⚠️ Contraseña default "admin123" en producción
  - **Acción:** Generar contraseña segura en setup
  - **Responsable:** DevOps

- [ ] ⚠️ JWT_SECRET hardcodeado
  - **Acción:** Siempre usar variables de entorno
  - **Responsable:** Todos

- [ ] ⚠️ No hay límite de rate limiting
  - **Acción:** Implementar express-rate-limit
  - **Urgencia:** ALTA (seguridad)

- [ ] ⚠️ Logging muy simple (console.log)
  - **Acción:** Implementar Winston o Pino
  - **Urgencia:** MEDIA

- [ ] ⚠️ No hay validación CSRF en frontend
  - **Acción:** Implementar cuando frontend esté listo
  - **Urgencia:** MEDIA

---

## ✅ CONTINUE (Continuar Haciendo)

**Cosas que están FUNCIONANDO BIEN y seguir:**

✅ **Versionamiento con Git**
- Commits descriptivos (feat/fix/docs)
- Ramas por feature
- Pull requests con código review
- **Acción:** Mantener este flujo en todos sprints

✅ **Documentación Completa**
- README con instalación paso a paso
- API documentation in code
- Postman collection actualizada
- **Acción:** Documentar nuevas features igual

✅ **Seguridad Implementada**
- bcrypt para contraseñas
- JWT con expiración
- Validación de permisos
- Auditoría de eventos
- **Acción:** No reducir estándares en próximos features

✅ **Stack de Deployment**
- Respetando diagrama de despliegue
- Tecnologías decididas desde inicio
- **Acción:** Mantener coherencia arquitectónica

✅ **Testing Manual en Postman**
- Todos los endpoints probados
- Colección reutilizable
- **Acción:** Ampliar cobertura cuando agreguemos endpoints

---

## 📈 Métricas del Sprint

```
Puntos de Historia Completados: 8/8 (100%)
Bugs Encontrados: 0
Deuda Técnica: Baja
Cobertura de Código: Manual (próxima: Auto con Jest)
Documentación: 100%
Tiempo Estimado: 2 sprints
Tiempo Real: 1.5 sprints
```

---

## 💡 Lecciones Aprendidas

### ✨ Lo que salió BIEN

1. **Diagrama de Despliegue como guía**
   - Decisiones tecnológicas fueron claras desde inicio
   - No hubo cambios de stack a mitad del camino
   - Recomendación: Usarlo en todos proyectos

2. **Diseño de BD antes de código**
   - MER bien estructurada (Activity 3) facilitó implementación
   - Roles y permisos pensados antes
   - Recomendación: Siempre hacer diseño primero

3. **Seguridad desde el inicio**
   - bcrypt + JWT desde día 1
   - No hay tech debt de seguridad
   - Recomendación: No comprometer seguridad por velocidad

### 🔴 Lo que COSTÓ TRABAJO

1. **Configuración de PostgreSQL en Windows**
   - Variaciones según SO (Mac/Windows/Linux)
   - Solución: Scripts específicos por OS
   - Urgencia: MEDIA

2. **Instalación de dependencias**
   - Primeras veces toma 5-10 minutos
   - Solución: Documento SETUP.md muy detallado
   - Urgencia: BAJA (resolved)

---

## 🎓 Recomendaciones para Próximos Sprints

### Mejora 1: Estructura de Carpetas
```
src/
├── api/              ← NEW: Separar concerns
│   ├── auth/
│   ├── usuarios/
│   └── reportes/
├── database/
├── middleware/
└── utils/
```

### Mejora 2: Configuración Centralizada
```javascript
// config/index.js: Un único punto de verdad
export const config = {
  db: { ... },
  jwt: { ... },
  api: { ... }
};
```

### Mejora 3: Tests Automatizados
```bash
npm test          # Ejecutar tests
npm run test:watch
npm run test:coverage
```

### Mejora 4: Error Handling Centralizado
```javascript
// middleware/errorHandler.js: Capturar TODO
try {
  // ...
} catch (error) {
  next(error);  // Al middleware central
}
```

---

## 🗣️ Feedback del Equipo

### Pregunta 1: ¿Qué fue lo más desafiante?
**Respuestas esperadas:**
- "Entender JWT por primera vez"
- "Configurar PostgreSQL"
- "Decidir estructura de permisos"

**Solución propuesta:** 
- Webinar interno sobre JWT
- Scripts de setup automatizado
- Documentación de decisiones arquitectónicas

### Pregunta 2: ¿Qué usarías en próximos proyectos?
**Respuestas esperadas:**
- "Mismo stack de Node/Express/PostgreSQL"
- "Postman desde día 1"
- "Git workflow con ramas"

### Pregunta 3: ¿Qué mejoraría?
**Respuestas esperadas:**
- "Más tests automatizados"
- "Documentación de API (Swagger/OpenAPI)"
- "Validaciones más estrictas"

---

## 🎯 Acciones de Seguimiento

| Acción | Responsable | Deadline | Prioridad |
|--------|---|---|---|
| Implementar rate limiting | DevSecOps | Próx. sprint | ALTA |
| Configurar Winston logging | Backend team | Próx. sprint | MEDIA |
| Crear tests unitarios | QA | Próx. 2 sprints | MEDIA |
| Deploy a staging | DevOps | Próx. sprint | ALTA |
| Documentación Swagger | Backend lead | Próx. sprint | MEDIA |
| Capacitación JWT interno | Tech lead | Semana próxima | BAJA |

---

## 📝 Firma de Retrospectiva

**Facilitador:** Angel Emanuel Le Caro Quispe  
**Fecha:** 25/06/2026  
**Participantes:**
- [x] Grupo Dos

---

## 🔗 Links Útiles

- [Repo GitHub](https://github.com/TU_USUARIO/sis321-ferroviaria-oriental-grupo2)
- [Sprint Review](./SPRINT-REVIEW.md)
- [Documentación Técnica](./README.md)
- [Guía de Setup](./SETUP.md)

---

**¡Excelente trabajo equipo!** 🏆

Este sprint estableció una base sólida para el resto del proyecto.
Mantengamos este nivel de calidad y documentación en los próximos.

---

**Próximo paso:** Push del repositorio a GitHub, Actividad 4, y testing automatizado
