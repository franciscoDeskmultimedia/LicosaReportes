# Guía de Despliegue en Vercel - Sistema LICOSA Control de Obra

Esta guía detalla paso a paso cómo desplegar la plataforma **LICOSA - Control de Obra Vial & Bodega** en **Vercel**, migrando de la base de datos local SQLite a una base de datos **PostgreSQL** administrada en la nube (como Neon o Supabase).

---

## 📌 1. ¿Por qué cambiar de SQLite a PostgreSQL para Vercel?

En un entorno Serverless como Vercel:
- Cada función o página se ejecuta en contenedores efímeros que se crean y destruyen dinámicamente.
- Un archivo local `dev.db` de SQLite no persiste entre peticiones y no se comparte entre usuarios simultáneos.
- Por ello, se requiere una base de datos relacional externa con conexión segura (SSL), como **Neon.tech** (recomendado por su capa gratuita y compatibilidad con serverless) o **Supabase**.

---

## 🚀 2. Paso a Paso para el Despliegue

### Paso 2.1: Crear la Base de Datos PostgreSQL en Neon.tech (Gratis)
1. Ingresa a [https://neon.tech](https://neon.tech) y crea una cuenta o inicia sesión con GitHub.
2. Haz clic en **Create Project**.
3. Asigna un nombre (ej. `licosa-control-db`) y selecciona la región más cercana (ej. `US East / N. Virginia` o `US West / Oregon`).
4. Una vez creado el proyecto, Neon te mostrará la **Connection String**.
5. Copia la URL de conexión en modo **Pooled** (ideal para serverless/Vercel):
   ```
   postgresql://usuario:contraseña@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### Paso 2.2: Ajustar `prisma/schema.prisma`

En tu repositorio local (o en tu rama antes de hacer push), edita el bloque `datasource db` en `prisma/schema.prisma`:

**Cambiar:**
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**Por:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

### Paso 2.3: Aplicar el Esquema a la Base de Datos Remota

En tu terminal local, configura temporalmente la variable de entorno o pásala directamente para inicializar las tablas en Neon:

```bash
# Exportar tu cadena de conexión de Neon
export DATABASE_URL="postgresql://usuario:contraseña@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Empujar el esquema completo a PostgreSQL
npx prisma db push
```

Este comando creará automáticamente todas las tablas, relaciones, claves foráneas e índices (`Project`, `Rubro`, `DailyReport`, `Worker`, `Contractor`, `WorkRequest`, `MaterialKardex`, etc.).

---

### Paso 2.4: Inicializar el Usuario Administrador (Empezar desde 0)

Para dejar la base de datos limpia con únicamente el usuario SuperAdmin inicial (`admin@licosa.com` / `admin123`):

```bash
npm run db:reset-clean
```

> **Nota:** El script `prisma/clean-reset.ts` limpiará proyectos y reportes de prueba y asegurará la creación del usuario administrador con contraseña encriptada mediante `bcryptjs`.

---

### Paso 2.5: Subir los Cambios a GitHub

Asegúrate de haber guardado tus cambios y haz push a tu repositorio remoto:

```bash
git add .
git commit -m "feat: personal, contratistas, catalogo rubros y preparacion para vercel"
git push origin main
```

---

### Paso 2.6: Crear y Configurar el Proyecto en Vercel

1. Ingresa a [https://vercel.com](https://vercel.com) y conecta tu cuenta de GitHub.
2. Haz clic en **Add New...** -> **Project**.
3. Selecciona tu repositorio `LicosaReport`.
4. En **Framework Preset**, Vercel detectará automáticamente `Next.js`.
5. En la sección **Environment Variables**, agrega las siguientes variables de entorno:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://usuario:contraseña@...neon.tech/neondb?sslmode=require` | Cadena de conexión pooled de PostgreSQL |
| `SESSION_SECRET` | *(Clave segura de al menos 32 caracteres aleatorios)* | Clave para encriptar cookies de sesión (`iron-session`) |

> 💡 **Tip:** Puedes generar un `SESSION_SECRET` seguro en tu terminal con:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

6. Haz clic en **Deploy**.

---

## ⚙️ 3. Verificación Post-Despliegue

1. Vercel ejecutará automáticamente:
   - `npm install` (que disparará `"postinstall": "prisma generate"`)
   - `next build`
2. Una vez completado, Vercel te proporcionará una URL de producción (ej. `https://licosa-report.vercel.app`).
3. Abre el enlace e inicia sesión con las credenciales de administrador:
   - **Correo:** `admin@licosa.com`
   - **Contraseña:** `admin123`
4. Desde el módulo **Usuarios & Roles** (`/usuarios`), podrás cambiar la contraseña del administrador y registrar nuevos usuarios (Ingenieros Residentes, Fiscalizadores, Bodegueros).

---

## 🛠️ 4. Preguntas Frecuentes y Solución de Problemas

### ¿Cómo vuelvo a encerar la base de datos en producción si quiero empezar desde cero?
Si ya estás en producción y deseas purgar todos los datos ingresados para iniciar una obra real desde cero:
1. En tu máquina local, establece `DATABASE_URL` apuntando a tu base de datos de producción:
   ```bash
   DATABASE_URL="tu_url_de_neon" npm run db:reset-clean
   ```
2. Esto borrará todos los reportes, kardex, solicitudes y proyectos, dejando listo el sistema con el usuario `admin@licosa.com`.

### ¿Por qué la numeración de reportes difiere entre proyectos (ej. Rep 05 vs Rep 24)?
Cada obra tiene un contrato de fiscalización independiente. La numeración es correlativa y secuencial por obra (`reportNumber` por `projectId`), garantizando la trazabilidad histórica de cada frente de trabajo.
