# 🐾 VetSystem Pro — Documentación Completa

> Sistema de gestión veterinaria full-stack desarrollado con React + Node.js + PostgreSQL

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Base de Datos](#base-de-datos)
6. [Sistema de Autenticación y Roles](#sistema-de-autenticación-y-roles)
7. [Módulos del Sistema](#módulos-del-sistema)
8. [API — Endpoints](#api--endpoints)
9. [Variables de Entorno](#variables-de-entorno)
10. [Despliegue](#despliegue)
11. [Guía de Uso](#guía-de-uso)

---

## Descripción General

VetSystem Pro es una plataforma SaaS multi-tenant para clínicas veterinarias. Permite gestionar múltiples clínicas (clientes) desde un panel maestro centralizado, con aislamiento total de datos por cliente.

### Características principales

- **Multi-tenant**: cada clínica tiene sus propios datos, usuarios y módulos
- **Módulos activables**: el Máster activa o desactiva módulos por cliente
- **Roles jerarquizados**: Máster → Admin → Auxiliar/Veterinario
- **14 módulos funcionales** cubriendo todas las áreas de una clínica veterinaria
- **Integración financiera automática** en todos los módulos de servicio

---

## Stack Tecnológico

| Capa              | Tecnología         | Versión |
| ----------------- | ------------------ | ------- |
| Frontend          | React + Vite       | 18.x    |
| Estilos           | Tailwind CSS       | 3.x     |
| Backend           | Node.js + Express  | 20.x    |
| Base de datos     | PostgreSQL         | 16      |
| ORM/Driver        | pg (node-postgres) | —       |
| Autenticación     | JWT + bcryptjs     | —       |
| Archivos          | Multer             | —       |
| Notificaciones UI | react-hot-toast    | —       |

---

## Estructura del Proyecto

```
vetsystem-pro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Configuración de conexión a PostgreSQL
│   │   ├── controllers/             # Lógica de negocio
│   │   │   ├── authController.js
│   │   │   ├── pacienteController.js
│   │   │   ├── historiaController.js
│   │   │   ├── medicamentoController.js
│   │   │   ├── citaController.js
│   │   │   ├── vacunaController.js
│   │   │   ├── financieroController.js
│   │   │   ├── modulosController.js
│   │   │   ├── groomingController.js
│   │   │   ├── adiestramientoController.js
│   │   │   ├── hospitalizacionController.js
│   │   │   └── guarderiaController.js
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js    # verificarToken, soloMaster, soloAdmin
│   │   ├── routes/                  # Definición de rutas Express
│   │   ├── uploads/                 # Archivos subidos (fotos, docs)
│   │   └── index.js                 # Entry point del servidor
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx      # Estado global de sesión + módulos
    │   ├── services/
    │   │   └── api.js               # Instancia axios configurada
    │   ├── components/
    │   │   ├── Sidebar.jsx          # Navegación lateral dinámica
    │   │   └── Layout.jsx           # Wrapper con sidebar
    │   ├── pages/                   # Una página por módulo
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Pacientes.jsx
    │   │   ├── Historias.jsx
    │   │   ├── Medicamentos.jsx
    │   │   ├── Citas.jsx
    │   │   ├── Adopciones.jsx
    │   │   ├── Tienda.jsx
    │   │   ├── Finanzas.jsx
    │   │   ├── Configuracion.jsx
    │   │   ├── Grooming.jsx
    │   │   ├── Adiestramiento.jsx
    │   │   ├── Hospitalizacion.jsx
    │   │   ├── Guarderia.jsx
    │   │   └── PanelMaster.jsx
    │   ├── App.jsx                  # Rutas principales
    │   └── index.css
    ├── .env
    └── package.json
```

---

## Instalación y Configuración

### Requisitos previos

- Node.js 20+
- PostgreSQL 16+
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/vetsystem-pro.git
cd vetsystem-pro
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 4. Configurar variables de entorno

Crear `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetsystem_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_clave_jwt_segura_aqui
FRONTEND_URL=http://localhost:5173
```

Crear `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Crear la base de datos

```bash
# En PostgreSQL
createdb vetsystem_db
```

Luego ejecutar los SQL en pgAdmin en este orden:

1. `EJECUTAR_EN_PGADMIN.sql` — tablas base
2. `CLIENTES_AISLAMIENTO.sql` — sistema multi-tenant
3. `MASTER_MODULOS_PGADMIN.sql` — módulos y usuario máster
4. `MEJORAS_CLIENTES_LOGIN.sql` — login por username
5. `NUEVOS_MODULOS.sql` — módulos de grooming, adiestramiento, hospitalización, guardería
6. `HOSP_DOCS.sql` — documentos de hospitalización

### 6. Iniciar servidores

```bash
# Backend (puerto 5000)
cd backend && npm run dev

# Frontend (puerto 5173)
cd frontend && npm run dev
```

---

## Base de Datos

### Tablas principales

#### Sistema y autenticación

| Tabla              | Descripción                                               |
| ------------------ | --------------------------------------------------------- |
| `clientes`         | Clínicas registradas en el sistema                        |
| `usuarios`         | Todos los usuarios (master, admin, auxiliar, veterinario) |
| `modulos`          | Catálogo de los 14 módulos disponibles                    |
| `modulos_admin`    | Módulos habilitados por admin                             |
| `modulos_auxiliar` | Módulos habilitados por auxiliar                          |

#### Gestión clínica

| Tabla              | Descripción                   |
| ------------------ | ----------------------------- |
| `propietarios`     | Tutores/dueños de mascotas    |
| `pacientes`        | Mascotas registradas          |
| `historia_clinica` | Consultas y registros médicos |
| `vacunas`          | Vacunación por paciente       |
| `medicamentos`     | Inventario de medicamentos    |
| `citas`            | Agenda de citas               |
| `adopciones`       | Pacientes en adopción         |

#### Módulos especiales

| Tabla                          | Descripción                       |
| ------------------------------ | --------------------------------- |
| `grooming_citas`               | Citas de estética                 |
| `grooming_servicios_catalogo`  | Catálogo de servicios de grooming |
| `grooming_citas_servicios`     | Servicios por cita                |
| `adiestramiento_programas`     | Programas de entrenamiento        |
| `adiestramiento_matriculas`    | Inscripciones a programas         |
| `adiestramiento_sesiones`      | Sesiones de entrenamiento         |
| `adiestramiento_logros`        | Habilidades alcanzadas            |
| `adiestramiento_habilidades`   | Catálogo de habilidades           |
| `hospitalizacion_jaulas`       | Jaulas/boxes del hospital         |
| `hospitalizaciones`            | Ingresos hospitalarios            |
| `hospitalizacion_evoluciones`  | Notas de evolución diaria         |
| `hospitalizacion_medicamentos` | Medicación hospitalaria           |
| `hospitalizacion_documentos`   | Documentos adjuntos               |
| `guarderia_estancias`          | Estadías en guardería             |
| `guarderia_registros_diarios`  | Registro diario de guardería      |
| `guarderia_documentos`         | Documentos de estancia            |
| `guarderia_config`             | Configuración de guardería        |

#### Finanzas

| Tabla                     | Descripción          |
| ------------------------- | -------------------- |
| `movimientos_financieros` | Ingresos y gastos    |
| `categorias_financieras`  | Categorías contables |
| `tienda_productos`        | Productos de tienda  |
| `tienda_ventas`           | Ventas realizadas    |

---

## Sistema de Autenticación y Roles

### Jerarquía de roles

```
MASTER
  └── ADMIN (por cliente)
        ├── VETERINARIO
        └── AUXILIAR
```

### Credenciales iniciales

| Rol        | Email                | Username | Contraseña          |
| ---------- | -------------------- | -------- | ------------------- |
| Máster     | master@vetsystem.com | @master  | (definida al crear) |
| Admin demo | admin@vetsystem.com  | @admin   | admin123            |

### JWT — Estructura del token

```json
{
  "id": 1,
  "nombre": "Carlos López",
  "email": "admin@veterinaria.com",
  "username": "clopez",
  "rol": "admin",
  "cliente_id": 2,
  "clinica_nombre": "Veterinaria Huellas",
  "modulos": ["dashboard", "pacientes", "historias", "grooming"]
}
```

### Middleware de protección

```javascript
// Ruta pública
router.post("/login", login);

// Ruta autenticada (cualquier rol)
router.get("/pacientes", verificarToken, getAll);

// Solo admin o master
router.post("/usuarios", verificarToken, soloAdmin, crear);

// Solo master
router.post("/clientes", verificarToken, soloMaster, crearCliente);
```

---

## Módulos del Sistema

### 1. 📊 Dashboard

Resumen visual de la clínica: pacientes del día, citas próximas, ingresos recientes, alertas.

### 2. 🐾 Pacientes

CRUD completo de mascotas con foto, especie, raza, peso, microchip. Botón de hoja de vida completa.

### 3. 👤 Tutores

Propietarios/tutores de las mascotas con contacto, dirección y mascotas asociadas.

### 4. 📋 Historia Clínica

Registro de consultas con motivo, diagnóstico, tratamiento, examen físico, signos vitales y documentos adjuntos.

### 5. 💊 Medicamentos

Inventario con precio de compra/venta, margen de ganancia, stock mínimo y alertas.

### 6. 📅 Citas

Agenda con estados (pendiente/confirmada/en consulta/completada/cancelada) y vinculación con historia clínica.

### 7. 🏠 Adopciones

Pacientes disponibles para adopción con estado, fotos y proceso de seguimiento.

### 8. 🛍️ Tienda

Venta de productos con carrito, stock y registro financiero automático.

### 9. 💰 Ingresos & Gastos

Control financiero con categorías, balance mensual, gráficas y resumen.

### 10. ✂️ Estética Canina/Felina (Grooming)

- Catálogo de servicios con precio y duración
- Servicios personalizados por clínica
- Agenda de citas con estados en tiempo real
- Fotos antes/después por cita
- Historial por paciente
- Integración financiera automática al marcar como pagado

### 11. 🎓 Adiestramiento

- Programas (básico, intermedio, avanzado, especializado)
- Matrículas con barra de progreso automática
- Sesiones de entrenamiento con comportamiento observado
- Sistema de logros por habilidad con 3 niveles: 🌱 Iniciado / 📈 En progreso / ⭐ Dominado
- CRUD de habilidades agrupadas por categoría
- Integración financiera al marcar como pagado

### 12. 🏥 Hospitalización

- Mapa visual de jaulas agrupado por tipo (Standard/Recuperación/UCI/Aislamiento)
- Estados de jaulas: 🟢 Libre / 🔴 Ocupada / 🟡 En limpieza / ⚪ Mantenimiento
- Al dar alta → jaula pasa automáticamente a "en limpieza"
- Hoja de evolución diaria con signos vitales
- Control de medicamentos administrados
- Historia clínica vinculada al paciente
- Documentos adjuntos por hospitalización
- Impresión de expediente completo (PDF)
- Buscador de pacientes hospitalizados

### 13. 🏡 Guardería

- Control de aforo en tiempo real con barra visual
- Servicios adicionales: adiestramiento, transporte
- Verificación de vacunas del paciente
- Registros diarios (comportamiento, alimentación, horarios)
- Subida de documentos (carnet de vacunas, autorizaciones)
- Configuración de precios y horarios
- Integración financiera al finalizar la estancia

### 14. ⚙️ Configuración

- Gestión de usuarios del sistema (por cliente)
- Datos de la clínica
- Médicos/veterinarios
- Módulos activados (solo Máster)

---

## API — Endpoints

### Autenticación `/api/auth`

| Método | Ruta                     | Descripción                        | Auth     |
| ------ | ------------------------ | ---------------------------------- | -------- |
| POST   | `/login`                 | Iniciar sesión (email o @username) | ❌       |
| GET    | `/usuarios`              | Listar usuarios del cliente        | ✅ Admin |
| POST   | `/usuarios`              | Crear usuario                      | ✅ Admin |
| PUT    | `/usuarios/:id`          | Editar usuario                     | ✅ Admin |
| DELETE | `/usuarios/:id`          | Desactivar usuario                 | ✅ Admin |
| DELETE | `/usuarios/:id/eliminar` | Eliminar definitivamente           | ✅ Admin |

### Pacientes `/api/pacientes`

| Método | Ruta             | Descripción           | Auth |
| ------ | ---------------- | --------------------- | ---- |
| GET    | `/`              | Listar pacientes      | ✅   |
| GET    | `/:id`           | Obtener paciente      | ✅   |
| GET    | `/:id/hoja-vida` | Hoja de vida completa | ✅   |
| POST   | `/`              | Crear paciente        | ✅   |
| PUT    | `/:id`           | Editar paciente       | ✅   |
| DELETE | `/:id`           | Eliminar paciente     | ✅   |

### Historias Clínicas `/api/historias`

| Método | Ruta            | Descripción              |
| ------ | --------------- | ------------------------ |
| GET    | `/paciente/:id` | Historias de un paciente |
| POST   | `/`             | Crear historia           |
| PUT    | `/:id`          | Editar historia          |
| DELETE | `/:id`          | Eliminar historia        |

### Hospitalización `/api/hospitalizacion`

| Método | Ruta                        | Descripción                            |
| ------ | --------------------------- | -------------------------------------- |
| GET    | `/jaulas`                   | Mapa de jaulas                         |
| POST   | `/jaulas`                   | Crear jaula                            |
| PUT    | `/jaulas/:id`               | Actualizar estado jaula                |
| GET    | `/`                         | Lista de hospitalizaciones             |
| GET    | `/:id`                      | Detalle con evoluciones y medicamentos |
| POST   | `/`                         | Nuevo ingreso                          |
| PUT    | `/:id`                      | Actualizar / dar de alta               |
| POST   | `/evoluciones`              | Registrar evolución                    |
| DELETE | `/evoluciones/:id`          | Eliminar evolución                     |
| POST   | `/medicamentos`             | Agregar medicamento                    |
| DELETE | `/medicamentos/:id`         | Eliminar medicamento                   |
| POST   | `/documentos`               | Subir documento                        |
| DELETE | `/documentos/:id`           | Eliminar documento                     |
| GET    | `/historiales/:paciente_id` | Historial clínico del paciente         |

### Grooming `/api/grooming`

| Método | Ruta                      | Descripción                     |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/catalogo`               | Catálogo de servicios           |
| POST   | `/catalogo`               | Crear servicio                  |
| PUT    | `/catalogo/:id`           | Editar servicio                 |
| DELETE | `/catalogo/:id`           | Eliminar servicio               |
| GET    | `/citas`                  | Agenda (filtros: fecha, estado) |
| POST   | `/citas`                  | Nueva cita                      |
| PUT    | `/citas/:id`              | Actualizar cita / marcar pagado |
| DELETE | `/citas/:id`              | Eliminar cita                   |
| POST   | `/citas/:id/foto`         | Subir foto antes/después        |
| GET    | `/historial/:paciente_id` | Historial del paciente          |

### Adiestramiento `/api/adiestramiento`

| Método | Ruta                                  | Descripción                |
| ------ | ------------------------------------- | -------------------------- |
| GET    | `/programas`                          | Catálogo de programas      |
| POST   | `/programas`                          | Crear programa             |
| PUT    | `/programas/:id`                      | Editar programa            |
| GET    | `/habilidades`                        | Catálogo de habilidades    |
| POST   | `/habilidades`                        | Crear habilidad            |
| PUT    | `/habilidades/:id`                    | Editar habilidad           |
| DELETE | `/habilidades/:id`                    | Eliminar habilidad         |
| GET    | `/matriculas`                         | Listar matrículas          |
| GET    | `/matriculas/:id`                     | Detalle matrícula          |
| POST   | `/matriculas`                         | Nueva matrícula            |
| PUT    | `/matriculas/:id`                     | Actualizar estado/progreso |
| POST   | `/sesiones`                           | Registrar sesión           |
| DELETE | `/sesiones/:id`                       | Eliminar sesión            |
| POST   | `/logros`                             | Establecer logro           |
| DELETE | `/logros/:matricula_id/:habilidad_id` | Quitar logro               |

### Guardería `/api/guarderia`

| Método | Ruta              | Descripción              |
| ------ | ----------------- | ------------------------ |
| GET    | `/config`         | Configuración            |
| PUT    | `/config`         | Actualizar configuración |
| GET    | `/aforo`          | Ocupación actual         |
| GET    | `/estancias`      | Listar estancias         |
| GET    | `/estancias/:id`  | Detalle estancia         |
| POST   | `/estancias`      | Nueva estancia           |
| PUT    | `/estancias/:id`  | Actualizar / finalizar   |
| POST   | `/registros`      | Registro diario          |
| PUT    | `/registros/:id`  | Editar registro          |
| POST   | `/documentos`     | Subir documento          |
| DELETE | `/documentos/:id` | Eliminar documento       |

### Módulos y Panel Máster `/api/modulos`

| Método | Ruta                   | Descripción               | Auth   |
| ------ | ---------------------- | ------------------------- | ------ |
| GET    | `/clientes`            | Listar clientes           | Máster |
| POST   | `/clientes`            | Crear cliente             | Máster |
| PUT    | `/clientes/:id`        | Editar cliente            | Máster |
| DELETE | `/clientes/:id`        | Eliminar cliente          | Máster |
| GET    | `/admins/:clienteId`   | Admins de un cliente      | Máster |
| POST   | `/admins`              | Crear admin               | Máster |
| DELETE | `/admins/:id`          | Desactivar admin          | Máster |
| DELETE | `/admins/:id/eliminar` | Eliminar admin definitivo | Máster |
| GET    | `/modulos/:adminId`    | Módulos del admin         | Máster |
| PUT    | `/modulos/:adminId`    | Guardar módulos           | Máster |

---

## Variables de Entorno

### Backend (`backend/.env`)

```env
# Servidor
PORT=5000

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetsystem_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui

# Autenticación
JWT_SECRET=clave_secreta_muy_larga_y_segura_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173

# Email (para recuperación de contraseña)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_app_password_gmail
EMAIL_FROM=VetSystem Pro <noreply@vetsystem.com>
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Despliegue

### Backend en producción

```bash
# Instalar PM2
npm install -g pm2

# Iniciar backend
cd backend
pm2 start src/index.js --name vetsystem-backend

# Guardar configuración
pm2 save
pm2 startup
```

### Frontend en producción

```bash
cd frontend
npm run build
# Carpeta dist/ lista para servir con Nginx o Vercel
```

### Nginx (ejemplo básico)

```nginx
server {
    listen 80;
    server_name tudominio.com;

    # Frontend
    location / {
        root /var/www/vetsystem/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Archivos subidos
    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

---

## Guía de Uso

### Flujo inicial — Configuración como Máster

1. Ingresar con `master@vetsystem.com`
2. Ir a **Panel Máster → Gestión de Clientes**
3. Crear un cliente (clínica) con nombre, NIT, logo, representante
4. Crear el usuario Admin de esa clínica
5. Activar los módulos que el cliente contrató con los switches
6. Entregar las credenciales al cliente

### Flujo del Admin de clínica

1. Ingresar con su `@username` o email
2. Configurar datos de la clínica en **Configuración**
3. Crear usuarios auxiliares y veterinarios
4. Registrar pacientes y propietarios
5. Gestionar citas, historias clínicas y servicios

### Sistema de módulos

Cada módulo tiene su propia sección en el sidebar. Solo aparecen los módulos habilitados por el Máster para ese cliente. Dashboard y Configuración son siempre obligatorios.

### Login

Acepta dos formatos:

- Email: `admin@veterinaria.com`
- Username con @: `@clopez`

---

## Organización en el repositorio

```
vetsystem-pro/
├── README.md                    ← Este archivo (documentación principal)
├── docs/
│   ├── ARCHITECTURE.md          ← Diagramas de arquitectura
│   ├── DATABASE.md              ← Esquema detallado de BD
│   ├── API.md                   ← Referencia completa de API
│   └── DEPLOYMENT.md            ← Guía de despliegue detallada
├── sql/
│   ├── 01_base.sql
│   ├── 02_multitenancy.sql
│   ├── 03_modulos.sql
│   ├── 04_login.sql
│   ├── 05_nuevos_modulos.sql
│   └── 06_hosp_docs.sql
├── backend/
└── frontend/
```

---

_Documentación generada para VetSystem Pro — Versión 1.0_
_Última actualización: Marzo 2026_
