-- ============================================================
-- MIGRACIÓN: Sistema de Préstamos VDR
-- Ejecutar en la base de datos: verdaderos
-- ============================================================

-- Tabla de préstamos
CREATE TABLE IF NOT EXISTS `prestamos` (
  `id`               INT(11)        NOT NULL AUTO_INCREMENT,
  `responsable`      VARCHAR(255)   NOT NULL COMMENT 'Nombre del deudor / responsable',
  `monto_original`   DECIMAL(12,2)  NOT NULL COMMENT 'Capital prestado',
  `interes_cobrado`  DECIMAL(12,2)  NOT NULL DEFAULT 0 COMMENT 'Monto fijo de interés acordado (en pesos)',
  `fecha_prestamo`   DATE           NOT NULL COMMENT 'Fecha de desembolso',
  `fecha_vencimiento` DATE          NOT NULL COMMENT 'Fecha límite de pago',
  `estado`           ENUM('activo','pagado','vencido') NOT NULL DEFAULT 'activo',
  `notas`            TEXT           DEFAULT NULL,
  `created_at`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla de abonos por préstamo
CREATE TABLE IF NOT EXISTS `prestamo_abonos` (
  `id`           INT(11)       NOT NULL AUTO_INCREMENT,
  `prestamo_id`  INT(11)       NOT NULL,
  `fecha_abono`  DATE          NOT NULL,
  `monto_abono`  DECIMAL(12,2) NOT NULL,
  `tipo_abono`   ENUM('capital','interes','mixto') NOT NULL DEFAULT 'mixto',
  `notas`        TEXT          DEFAULT NULL,
  `created_at`   DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_abono_prestamo` FOREIGN KEY (`prestamo_id`) REFERENCES `prestamos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
