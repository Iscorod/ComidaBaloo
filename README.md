# 🐾 Registros Comida Baloo

App de registro de alimentación y medicación para Baloo.  
Los datos se guardan como **JSON directamente en tu repositorio de GitHub**.

## Registro por toma

| Categoría | Unidad | Incrementos |
|-----------|--------|-------------|
| Pienso | gramos (acumulativo) | +5, +10, +20, +30, +40, +50 |
| Puré | cucharas (acumulativo) | +1, +2, +3, +4, +5, +6 |
| Caballo | puñados (acumulativo) | +1, +2, +3, +4, +5, +6 |
| Micofenolato | pastilla | 1 (toggle) |
| Promax | toma | 1 (toggle) |
| Corticoides | dosis (acumulativo) | +¼, +½, +¾, +1 |

## Configuración

### 1. Crear un token de GitHub

1. Ve a [GitHub → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. **Generate new token**
3. Dale un nombre (ej: `baloo-app`)
4. En **Repository access** → selecciona **Only select repositories** → elige tu repo
5. En **Permissions** → **Contents** → **Read and write**
6. **Generate token** → copia el token

### 2. Configurar variables en Vercel

En [Vercel](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**, añade:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `VITE_GITHUB_TOKEN` | tu token | `github_pat_xxxxx` |
| `VITE_GITHUB_REPO` | `usuario/repositorio` | `paco/registros-comida-baloo` |
| `VITE_GITHUB_FILE` | ruta del JSON | `data.json` |

### 3. Redeploy

Deployments → ⋮ → **Redeploy**

## Cómo funciona

Cada vez que registras una toma, la app:
1. Lee el `data.json` actual de tu repo vía la API de GitHub
2. Añade el nuevo registro al array
3. Hace un commit automático con el JSON actualizado

Los datos se refrescan automáticamente cada 30 segundos.

## Desarrollo local

Crea un archivo `.env` en la raíz:

```env
VITE_GITHUB_TOKEN=github_pat_tu_token
VITE_GITHUB_REPO=tu_usuario/tu_repo
VITE_GITHUB_FILE=data.json
```

```bash
npm install
npm run dev
```

## Despliegue en Vercel

1. Sube el repo a GitHub
2. Importa en Vercel → Framework: **Vite**
3. Configura las variables de entorno
4. Deploy
