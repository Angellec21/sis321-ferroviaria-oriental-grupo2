# Usuarios del Sistema (dw.usuarios)

> Las contraseñas son las usadas en el seed (`database/seed.js` y
> `database/import-mockaroo.js`). El admin tiene su propio hash en
> `01-auth-schema.sql`. Cámbialas antes de cualquier despliegue real.

## Administradores (acceso total)

| Email | Contraseña | Estación |
|---|---|---|
| admin@ferroviariaoriental.com.bo | `admin123` | — |
| fernando.diaz@ferroviariaoriental.com.bo | `Password123!` | Santa Cruz - Terminal Bimodal |

## Gerentes (reportes, supervisión, lectura de usuarios)

| Nombre | Email | Estación |
|---|---|---|
| María García López | maria.garcia@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Juan Hernández López | juan.hernandez@ferroviariaoriental.com.bo | Montero |
| Roberto Flores Vega | roberto.flores@ferroviariaoriental.com.bo | Warnes |
| Daniela Vargas Soliz | daniela.vargas@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Patricia Rojas Apaza | patricia.rojas@ferroviariaoriental.com.bo | Montero |
| Ramiro Gutierrez Salvatierra | ramiro.gutierrez@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Veronica Paredes Camacho | veronica.paredes@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |

Contraseña de todos: `Password123!`

## Operadores (ventas, reservas, pagos en estación)

| Nombre | Email | Estación |
|---|---|---|
| Carlos Rodríguez Martínez | carlos.rodriguez@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Ana Pérez Gómez | ana.perez@ferroviariaoriental.com.bo | Montero |
| Sofía Moreno García | sofia.moreno@ferroviariaoriental.com.bo | Warnes |
| Valentina Castillo Ruiz | valentina.castillo@ferroviariaoriental.com.bo | Warnes |
| Gabriela Quispe Mamani | gabriela.quispe@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Marcelo Choque Ticona | marcelo.choque@ferroviariaoriental.com.bo | Montero |
| Hugo Mamani Condori | hugo.mamani@ferroviariaoriental.com.bo | Warnes |
| Eduardo Flores Mendoza | eduardo.flores@ferroviariaoriental.com.bo | Santa Cruz - Terminal Bimodal |
| Carla Justiniano Paz | carla.justiniano@ferroviariaoriental.com.bo | Warnes |
| Lucia Antezana Soto | lucia.antezana@ferroviariaoriental.com.bo | Montero |
| Freddy Suarez Roca | freddy.suarez@ferroviariaoriental.com.bo | Warnes |
| Oscar Limachi Yujra | oscar.limachi@ferroviariaoriental.com.bo | Montero |
| Test Nuevo *(usuario de prueba, sin estación)* | test.nuevo@ferroviariaoriental.com.bo | — |

Contraseña de todos: `Password123!` (Test Nuevo usa `Test1234!`)

## Resumen por rol

| Rol | Cantidad | Permisos clave |
|---|---|---|
| Administrador | 2 | Todo: usuarios, roles, reportes, operaciones, sistema |
| Gerente | 7 | Reportes (A/B/C + predicción IA), lectura/edición de usuarios, dashboard |
| Operador | 13 | Crear venta, crear reserva, registrar pago, ver dashboard |

**Total: 22 usuarios** en `dw.usuarios` (tabla de autenticación, distinta de
`dw.usuario_venta` del MER original).

## Cómo regenerar/ampliar esta lista

```bash
cd backend
npm run db:seed              # 8 usuarios base (María, Carlos, Ana, etc.)
npm run db:import-mockaroo   # 12 usuarios adicionales estilo Mockaroo
```

Consulta SQL directa:
```sql
SELECT u.id_usuario, u.nombre, u.email, r.nombre AS rol, e.nombre AS estacion
FROM dw.usuarios u
JOIN dw.roles r ON u.id_rol = r.id_rol
LEFT JOIN dw.estacion e ON u.id_estacion = e.id_estacion
ORDER BY u.id_usuario;
```
