# Entreno

App para **planificar entrenamientos y llevar el seguimiento del rendimiento**.

Es una **PWA**: una web que se instala en la pantalla de inicio del móvil con su
propio icono, se abre a pantalla completa sin barra de navegador y funciona sin
conexión. Está hecha con Expo (React Native + react-native-web), así que el
mismo código puede compilarse también como app nativa si algún día hace falta.

Todo se guarda **en el propio teléfono** (no hay cuenta ni servidor). Hay
exportación e importación de copias de seguridad en Ajustes.

## Qué hace

- **Rutinas**: prepara tus entrenos por adelantado — ejercicios, series objetivo,
  reps, peso, distancia, tiempo y descanso.
- **Plan recomendado**: un cuestionario de cuatro pasos (material disponible,
  días por semana, minutos por sesión y objetivo) del que sale un plan semanal
  completo. Solo propone ejercicios que puedas hacer con lo que tienes, reparte
  la semana según los días y ajusta series, repeticiones y descansos al
  objetivo, cabiendo en el tiempo que dijiste tener.
- **Registro en el gimnasio**: abres la rutina y vas marcando series. Cada
  ejercicio muestra qué hiciste la última vez para saber si estás progresando.
- **Tres tipos de ejercicio**:
  - `Fuerza` → peso, repeticiones y RPE por serie.
  - `Cardio` → distancia (km) y tiempo, con el ritmo min/km calculado.
  - `Tiempo` → duración por serie (planchas, colgado, movilidad, estiramientos).
- **Temporizador de descanso** que arranca solo al marcar una serie.
- **Historial** de todas las sesiones, agrupado por mes, con volumen y kilómetros.
- **Progreso**: volumen / entrenos / distancia por semana, y por ejercicio la
  evolución del 1RM estimado, la distancia o la mejor plancha, con tus récords.
- Catálogo con ~50 ejercicios de inicio, ampliable con los tuyos.

## Instalarla en el iPhone

1. Abre la web publicada en **Safari** (tiene que ser Safari; Chrome en iOS no
   puede instalar PWAs).
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Ya tienes el icono. Al abrirlo va a pantalla completa y funciona aunque estés
   sin cobertura en el sótano del gimnasio.

> La primera vez ábrela con datos o wifi para que se descargue todo. A partir de
> ahí el service worker la sirve desde el propio móvil.

## Publicar

La web se despliega sola en GitHub Pages con cada `push` a `main`
(`.github/workflows/deploy.yml`): instala, ejecuta `npm run build:web` y sube
`dist/`.

La ruta base sale de `expo.experiments.baseUrl` en `app.json` y **tiene que
coincidir con el nombre del repositorio** (`/entreno` → repo `entreno`). Si
renombras el repo, cambia ese valor y vuelve a desplegar.

## Desarrollo

```bash
npm run web        # servidor de desarrollo en el navegador, con recarga en caliente
npm start          # servidor para el móvil con Expo Go (QR)
npm run build:web  # build de producción en dist/
npm run serve:web  # sirve dist/ en http://localhost:4173/entreno/ para probarlo
npm run icons      # regenera los iconos PNG desde el SVG
```

Comprobaciones:

```bash
npx tsc --noEmit
npm run lint
```

## Estructura

```
public/                   se copia tal cual a dist/
  sw.js                   service worker (offline)
  icons/                  iconos de la PWA
scripts/
  make-icons.mjs          genera los PNG desde un SVG (sharp)
  finish-web-build.mjs    inyecta manifest, meta de iOS y registro del SW en dist/
  serve-dist.mjs          servidor local para probar la build
src/
  app/                    rutas (expo-router)
    (tabs)/               Hoy · Rutinas · Historial · Progreso
    session/[id].tsx      registro del entreno (y vista de uno pasado)
    routine/[id].tsx      editor de rutinas ('new' para crear)
    recommended.tsx       plan generado a partir del cuestionario
    exercises.tsx         catálogo de ejercicios
    settings.tsx          unidades, descanso y copias de seguridad
  components/             UI compartida, gráficos, selector de ejercicios
    dialog.tsx            confirmaciones (Alert.alert no existe en web)
    profile-wizard.tsx    cuestionario de material, tiempo y objetivo
  lib/
    types.ts              modelo de datos
    store.tsx             estado global + persistencia
    storage.ts            AsyncStorage, export/import
    stats.ts              series temporales, récords, totales por semana
    recommend.ts          generador de rutinas a partir del cuestionario
    format.ts             formato de pesos, tiempos, ritmos y plurales
    seed.ts               catálogo inicial de ejercicios
```

El catálogo inicial lleva, por ejercicio, el material que necesita y su patrón
de movimiento (empuje / tirón / pierna / core / cardio). Eso es lo que permite
filtrar por lo que tienes y repartir la semana con sentido. El orden de la lista
no se puede tocar: el identificador de cada ejercicio es su posición, y las
rutinas y los entrenos guardados apuntan a él. Se añaden filas al final y
`settings.seedVersion` recuerda cuáles se han copiado ya a cada dispositivo, así
los ejercicios nuevos llegan a quien ya tenía la app sin resucitar los que haya
borrado.

### Modelo de datos

- `Exercise` — entrada del catálogo (nombre, grupo muscular, tipo).
- `Routine` → `PlanItem[]` — el plan: qué ejercicios y con qué objetivo.
- `Session` → `SessionEntry[]` → `SetLog[]` — lo que realmente hiciste.
  La sesión con `finishedAt: null` es la que está en curso; solo puede haber una.

Los pesos siempre se guardan en kilos; el ajuste kg/lb solo cambia cómo se
muestran e introducen.

En la web los datos viven en el `localStorage` del navegador. Son de ese
navegador y ese dispositivo: si borras los datos del sitio, se van. Por eso
existe la exportación de copias en Ajustes.
