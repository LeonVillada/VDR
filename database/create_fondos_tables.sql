-- Crear tabla fondos
CREATE TABLE fondos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT
);

-- Crear tabla fondos_especificos
CREATE TABLE fondos_especificos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fondo_id INT NOT NULL,
    FOREIGN KEY (fondo_id) REFERENCES fondos(id) ON DELETE CASCADE
);