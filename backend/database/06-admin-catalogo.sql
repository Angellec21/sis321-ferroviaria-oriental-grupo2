-- ============================================
-- SCRIPT: Permiso para administrar el catálogo (estaciones, rutas, viajes)
-- Antes solo se podía cargar por SQL directo; ahora hay pantalla de admin.
-- ============================================

INSERT INTO dw.permisos (nombre, modulo, accion, descripcion)
VALUES
  ('catalogo:administrar', 'catalogo', 'crear', 'Crear estaciones, rutas y viajes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'administrador'
  AND p.nombre = 'catalogo:administrar'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;
