-- =========================================================
-- ESQUEMA REAL (según ERD proporcionado por el catedrático)
-- Base de datos: db_WebDevUMG
-- Estas tablas YA EXISTEN en el servidor compartido del curso.
-- Este archivo es solo de referencia / documentación, y sirve
-- para recrear el esquema en un entorno propio si algún día
-- necesitas una base de datos local para pruebas.
-- =========================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Estudiantes')
BEGIN
    CREATE TABLE Estudiantes (
        Carnet VARCHAR(25)   NOT NULL PRIMARY KEY,
        Nombre NVARCHAR(150) NOT NULL UNIQUE,
        Correo NVARCHAR(150) NOT NULL UNIQUE
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Misiones')
BEGIN
    CREATE TABLE Misiones (
        MisionID    INT IDENTITY(1,1) PRIMARY KEY,
        Nombre      NVARCHAR(100) NOT NULL UNIQUE,
        Descripcion NVARCHAR(250) NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EstudianteMisiones')
BEGIN
    CREATE TABLE EstudianteMisiones (
        DetalleID     INT IDENTITY(1,1) PRIMARY KEY,
        Carnet        VARCHAR(25) NOT NULL,
        MisionID      INT         NOT NULL,
        Estado        BIT         NOT NULL,
        FechaRegistro DATETIME    NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_EM_Estudiante FOREIGN KEY (Carnet) REFERENCES Estudiantes(Carnet),
        CONSTRAINT FK_EM_Mision     FOREIGN KEY (MisionID) REFERENCES Misiones(MisionID),
        CONSTRAINT UQ_EstudianteMision UNIQUE (Carnet, MisionID)
    );
END
GO
