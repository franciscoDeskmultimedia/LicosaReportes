# 🛡️ Guía de Configuración: Respaldo Automatizado a Cloudflare R2

Este proyecto incluye un flujo de trabajo de **GitHub Actions** (`.github/workflows/db-backup.yml`) que genera un respaldo comprimido (`.dump`) de tu base de datos **Neon PostgreSQL** todos los días a las **00:00 (hora Ecuador)** y permite disparar respaldos manuales en cualquier momento con un solo clic.

---

## 1. Obtener Credenciales de Cloudflare R2

### A. Obtener tu `Account ID` de Cloudflare
1. Inicia sesión en el panel de **Cloudflare**.
2. En el menú lateral izquierdo, haz clic en **R2** (o en la barra de direcciones / panel principal).
3. En la columna derecha verás un apartado llamado **"Account ID"** (un código alfanumérico de 32 caracteres).
4. Cópialo: este será tu **`R2_ACCOUNT_ID`**.

### B. Crear un Token de API para R2
1. En el panel de **R2**, haz clic en el botón superior derecho: **"Manage R2 API Tokens"** (Administrar tokens de la API de R2).
2. Haz clic en **"Create API Token"** (Crear token de API).
3. Asígnale un nombre (ejemplo: `licosa-backup-token`).
4. En **Permissions** (Permisos), selecciona:
   - **`Object Read & Write`** (Lectura y escritura de objetos).
5. En **Specify bucket(s)**, puedes elegir tu bucket (ejemplo: `licosa-backups`) o dejarlo para todos los buckets.
6. Haz clic en **"Create API Token"** al final de la página.
7. Guarda inmediatamente los dos valores que aparecerán en pantalla (solo se muestran una vez):
   - **Access Key ID** ➔ Este será tu **`R2_ACCESS_KEY_ID`**.
   - **Secret Access Key** ➔ Este será tu **`R2_SECRET_ACCESS_KEY`**.

---

## 2. Configurar los Secretos en GitHub

Ve a tu repositorio en GitHub: `https://github.com/franciscoDeskmultimedia/LicosaReportes`

1. Entra a **Settings** (Configuración del repositorio).
2. En el menú lateral izquierdo, expande **Secrets and variables** ➔ selecciona **Actions**.
3. Haz clic en el botón verde **"New repository secret"** y agrega cada uno de estos **5 secretos**:

| Nombre del Secreto | De dónde se obtiene | Ejemplo |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | Consola de Neon (Cadena de conexión directa de Postgres) | `postgresql://neondb_owner:xyz@ep-cool-brook-a5.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| **`R2_ACCOUNT_ID`** | Panel principal de Cloudflare R2 (columna derecha) | `e4b31a2c98d7...` |
| **`R2_ACCESS_KEY_ID`** | Token generado en Cloudflare R2 | `32a76f8e...` |
| **`R2_SECRET_ACCESS_KEY`** | Secret generado junto con el token en R2 | `89d4fe1a...` |
| **`R2_BUCKET_NAME`** | El nombre exacto del bucket que creaste | `licosa-backups` |

> 💡 **Nota sobre DATABASE_URL**: Asegúrate de usar la URL de conexión **directa** de Neon (sin el sufijo `-pooler`) para que `pg_dump` pueda conectarse sin restricciones de sesión.

---

## 3. Cómo Probar el Respaldo Inmediatamente

No tienes que esperar a la medianoche para comprobar que todo funciona:

1. En tu repositorio de GitHub, ve a la pestaña **Actions**.
2. En la lista izquierda, haz clic en **"Neon Database Backup to Cloudflare R2"**.
3. En el lado derecho verás un botón que dice **"Run workflow"** (Desplegar menú).
4. Haz clic en el botón verde **"Run workflow"**.
5. Verás el trabajo ejecutándose en vivo. En ~30 segundos:
   - Descarga la base de datos de Neon en formato `.dump`.
   - La sube a tu bucket de R2 bajo la carpeta `backups/backup_licosa_YYYYMMDD_HHMMSS.dump`.
   - Crea un puntero de acceso rápido `backups/latest.dump`.
6. Si vas a tu bucket en Cloudflare R2, verás el archivo guardado y su peso en KB/MB.

---

## 4. Cómo Restaurar un Respaldo desde R2 en Cualquier Momento

Si necesitas levantar el sistema de nuevo desde cero:

### Opción A: Descargar desde la Web de Cloudflare R2
1. Entra a tu bucket en Cloudflare R2.
2. Haz clic en la carpeta `backups/` y descarga el archivo `latest.dump` o el de la fecha deseada.
3. En tu terminal, restaura sobre tu nueva base de datos Neon:
   ```bash
   pg_restore -d "NUEVA_DATABASE_URL" -v --no-owner --no-acl latest.dump
   ```

### Opción B: Con AWS CLI / Terminal
```bash
# 1. Descargar el último dump desde R2
aws s3 cp s3://TU_BUCKET/backups/latest.dump ./latest.dump \
  --endpoint-url https://TU_ACCOUNT_ID.r2.cloudflarestorage.com

# 2. Restaurar a la base de datos
pg_restore -d "NUEVA_DATABASE_URL" -v --no-owner --no-acl latest.dump
```
