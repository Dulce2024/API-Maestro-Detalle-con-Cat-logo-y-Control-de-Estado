# API Maestro-Detalle con Catálogo y Control de Estado

Proyecto para el laboratorio: registro de estudiantes (maestro) y sus misiones (detalle),
con validación contra el catálogo `Misiones` y actualización de estado en múltiples envíos.

## Estructura

```
proyecto/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   ├── registro.js       -> POST /api/registro
│   │   ├── misiones.js       -> GET  /api/misiones
│   │   └── estudiantes.js    -> GET  /api/estudiantes  y  /api/estudiantes/:carnet
│   ├── sql/schema.sql        -> referencia del esquema (las tablas ya existen en el server compartido)
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── frontend/
    └── index.html            -> tablero de avance (estático, para GitHub Pages)
```

## Esquema de base de datos (según el ERD del curso)

- **Estudiantes**(`Carnet` PK, `Nombre` UNIQUE, `Correo` UNIQUE)
- **Misiones**(`MisionID` PK identity, `Nombre` UNIQUE, `Descripcion`)
- **EstudianteMisiones**(`DetalleID` PK identity, `Carnet` FK, `MisionID` FK, `Estado` BIT, `FechaRegistro`,
  con `UNIQUE(Carnet, MisionID)` — esa es la llave que usa el `MERGE` para decidir si inserta o actualiza el detalle)

Estas tablas ya existen en el servidor compartido (`db_WebDevUMG`), así que normalmente **no necesitas ejecutar `schema.sql`**;
está incluido solo como referencia y por si necesitas recrear el esquema en una base local para pruebas.

## 1. Configuración local

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y coloca la contraseña real de la base de datos (no la subas a GitHub):

```
DB_USER=UsuarioEncuestas
DB_PASSWORD=tu_password_real
DB_SERVER=svr-sql-ctezo.southcentralus.cloudapp.azure.com
DB_DATABASE=db_WebDevUMG
PORT=3000
```

Levanta el servidor:

```bash
npm start
# o en desarrollo con recarga automática:
npm run dev
```

Deberías ver `Servidor escuchando en el puerto 3000` y `Conectado a SQL Server: db_WebDevUMG`.

## 2. Probar los endpoints

### POST /api/registro

```bash
curl -X POST http://localhost:3000/api/registro \
  -H "Content-Type: application/json" \
  -d '{
    "maestro": {
      "carnet": "1890-20-11489",
      "nombre": "MERCEDES AZUCENA LOPEZ PEREZ",
      "correo": "mlopezp58@miumg.edu.gt"
    },
    "detalle": [
      { "misionId": 1, "estado": true },
      { "misionId": 2, "estado": false },
      { "misionId": 3, "estado": true }
    ]
  }'
```

- Si `misionId` no existe en el catálogo, la API responde `400` con `error de referencia` y la lista de IDs inválidos, sin insertar nada (todo o nada, vía transacción).
- Si el `carnet` ya existe, se actualiza `Nombre`/`Correo`; si no, se inserta.
- Cada misión del detalle se inserta si es la primera vez, o actualiza su `Estado` si ya existía para ese `Carnet` + `MisionID`.
- Puedes enviar el mismo POST varias veces: el resultado final siempre refleja el último `estado` enviado por misión.

### GET /api/misiones

```bash
curl http://localhost:3000/api/misiones
```

### GET /api/estudiantes

```bash
curl http://localhost:3000/api/estudiantes
curl http://localhost:3000/api/estudiantes/1890-20-11489
```

## 3. Frontend (tablero)

Abre `frontend/index.html` (localmente o ya publicado), pega la URL de tu API en el campo de arriba
(por ejemplo `http://localhost:3000` o tu URL de Render/Azure) y presiona **Actualizar**.
El tablero muestra, por estudiante: misiones completadas vs. pendientes y el % de avance.

## 4. Despliegue

### Backend (elige una opción — todas tienen plan gratuito)

**Render** (recomendado, más simple):
1. Sube la carpeta `backend/` a un repositorio de GitHub.
2. En [render.com](https://render.com) → New → Web Service → conecta el repo.
3. Build command: `npm install` — Start command: `npm start`.
4. En "Environment", agrega las variables `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE` (los mismos valores del `.env`, nunca los subas al repo).
5. Al desplegar, tu API queda en algo como `https://tu-api.onrender.com`.

**Railway / Azure App Service / Heroku**: mismo principio — instalar dependencias, definir variables de entorno, comando de arranque `node server.js`.

### Frontend (GitHub Pages)

1. Sube la carpeta `frontend/` (o todo el repo) a GitHub.
2. En el repositorio: Settings → Pages → Source: rama `main`, carpeta `/frontend` (o `/root` si solo subes el frontend).
3. GitHub te da una URL tipo `https://tu-usuario.github.io/tu-repo/`.
4. Abre esa URL, pega la URL de tu backend desplegado y listo.

### Importante: CORS

El backend ya tiene `cors()` habilitado para todos los orígenes, así que el frontend en GitHub Pages podrá
consumir la API sin problema aunque estén en dominios distintos.

## 5. Seguridad

- `.env` está en `.gitignore`: nunca subas la contraseña real de la base de datos a GitHub.
- En el hosting (Render/Azure/etc.) configura la contraseña como variable de entorno del panel, no en el código.
