-- ============================================
-- SCRIPT: Corrige FKs que apuntaban a dw.usuario_venta (tabla legacy
-- del MER original) y ahora deben apuntar a dw.usuarios (tabla real
-- de autenticación). Luego elimina dw.usuario_venta, ya sin uso.
--
-- venta.id_usuario: sin conflictos verificados (local y producción).
-- pago_ventanilla.id_usuario_operador: en producción hay filas
-- históricas (demo) que solo existían en usuario_venta -> se agrega
-- la FK como NOT VALID para no romper/alterar esos registros viejos,
-- pero sí exigirla desde ahora en adelante.
-- ============================================

BEGIN;

ALTER TABLE dw.venta DROP CONSTRAINT IF EXISTS venta_id_usuario_fkey;
ALTER TABLE dw.venta
  ADD CONSTRAINT venta_id_usuario_fkey
  FOREIGN KEY (id_usuario) REFERENCES dw.usuarios(id_usuario);

ALTER TABLE dw.pago_ventanilla DROP CONSTRAINT IF EXISTS pago_ventanilla_id_usuario_operador_fkey;
ALTER TABLE dw.pago_ventanilla
  ADD CONSTRAINT pago_ventanilla_id_usuario_operador_fkey
  FOREIGN KEY (id_usuario_operador) REFERENCES dw.usuarios(id_usuario) NOT VALID;

DROP TABLE IF EXISTS dw.usuario_venta;

COMMIT;
