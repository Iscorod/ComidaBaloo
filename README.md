# 🐾 Registros Comida Baloo

App de registro de alimentación y medicación para Baloo con **base de datos compartida en tiempo real** (Firebase).
Cualquier persona con acceso puede registrar tomas y ver el historial al instante.

## Registro por toma

| Categoría | Unidad | Incrementos |
|-----------|--------|-------------|
| Pienso | gramos (acumulativo) | +5, +10, +20, +30, +40, +50 |
| Puré | cucharas (acumulativo) | +1, +2, +3, +4, +5, +6 |
| Caballo | puñados (acumulativo) | +1, +2, +3, +4, +5, +6 |
| Micofenolato | pastilla | 1 (toggle) |
| Promax | toma | 1 (toggle) |
| Corticoides | dosis (acumulativo) | +¼, +½, +¾, +1 |

## Configuración Firebase (obligatorio)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un proyecto nuevo (desactiva Google Analytics si quieres)
3. En el menú lateral → **Build → Realtime Database** → Crear base de datos
4. Elige la región `europe-west1` (o la que prefieras)
5. En la pestaña **Reglas**, pon esto y pulsa Publicar:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

6. Ve a **Configuración del proyecto** (⚙️) → **Tus apps** → icono Web `</>` → Registrar app
7. Copia los datos de `firebaseConfig` en el archivo `src/firebase.js`

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue en Vercel

1. Sube el repositorio a GitHub
2. Importa el proyecto en [vercel.com](https://vercel.com)
3. Framework preset: **Vite**
4. Deploy

Cada dispositivo que abra la URL verá los mismos registros en tiempo real.
