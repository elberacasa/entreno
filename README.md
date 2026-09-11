# AbenzaGym

App para **planificar entrenamientos y llevar el seguimiento del rendimiento**.

Es una **PWA**: una web que se instala en la pantalla de inicio del móvil con su
propio icono, se abre a pantalla completa sin barra de navegador y funciona sin
conexión. Está hecha con Expo (React Native + react-native-web), así que el
mismo código puede compilarse también como app nativa si algún día hace falta.

Todo se guarda **en el propio teléfono** (no hay cuenta ni servidor). Hay
exportación e importación de copias de seguridad en Ajustes.

## AbenzaGym: nueva experiencia

- **Identidad propia**: logo SVG original con grupos preparados para animación,
  iconos PWA generados y tipografías locales con sus licencias.
- **Entrenar**: primera semana visible desde el inicio y guardado en un toque.
  Después muestra la sesión de hoy, su finalización o el descanso previsto.
- **Tu plan**: semana recurrente primero; biblioteca personal y edición después.
  Importa archivos de rutina con revisión previa, sin reemplazar el historial.
- **Modo de enfoque**: un ejercicio a la vez o toda la sesión. Consulta la
  última referencia, cambia de ejercicio y conserva cada serie registrada.
  Los ejercicios sin carga muestran repeticiones; el lastre es opcional.
- **Calculadora de discos**: total con barra, tamaños disponibles y cantidades
  por lado. Busca la combinación exacta o una inferior, nunca aumenta la carga.
- **Calendario e historial**: selecciona un día, cambia de mes y busca sesiones.
- **Distribución del trabajo**: series por grupo principal en 7 o 28 días,
  además de las gráficas y récords por ejercicio. No estima recuperación.
- **Apariencia**: clara, oscura o automática, guardada en los ajustes.
- **Persistencia**: backups validados, guardado atómico, borradores recuperables
  y protección contra escrituras de pestañas desactualizadas.
- **Offline**: app, tipografías, iconos y recursos disponibles tras la primera
  carga completa. La sesión abierta y el descanso sobreviven a una recarga.

El formato para compartir rutinas es independiente del backup completo. Solo
incluye la rutina y sus ejercicios, nunca sesiones, peso corporal ni perfil.

## Qué hace

- **Rutinas**: prepara tus entrenos por adelantado — ejercicios, series objetivo,
  reps, peso, distancia, tiempo y descanso.
- **Plan semanal**: vista previa inmediata, de 2 a 6 días, material, tiempo,
  experiencia y prioridad muscular. Una sola operación guarda rutinas y días.
  Reconfigurar actualiza las rutinas asignadas sin duplicarlas ni tocar sesiones.
  Los avisos de material y tiempo aparecen antes de guardar.
  El reparto usa plantillas propias informadas por la
  [guía ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/):
  cuerpo completo con 2–3 días, torso/pierna con 4, y empuje/tirón/pierna
  con 5–6. Las dosis iniciales y selección de ejercicios son decisiones de
  programación de la app, no una prescripción individual ni una medida de recuperación.
  El resumen muscular cuenta series y días reales del plan por grupo principal.
- **Catálogo de rutinas**: 24 rutinas ya montadas, una por cada combinación de
  nivel (fácil / media / difícil) y zona (cuerpo completo, empuje, tirón,
  piernas, core, brazos, tren superior, tren inferior). Se filtran por material,
  se ven enteras antes de decidir y se copian a tus rutinas de un toque. A
  también puedes explorar el catálogo sin configurar una semana.
- **Registro en el gimnasio**: abres la rutina y vas marcando series. Cada
  ejercicio muestra qué hiciste la última vez para saber si estás progresando.
- **Tres tipos de ejercicio**:
  - `Fuerza` → peso, repeticiones y RPE por serie.
  - `Cardio` → distancia (km) y tiempo, con el ritmo min/km calculado.
  - `Tiempo` → duración por serie (planchas, colgado, movilidad, estiramientos).
- **Demostración de cada ejercicio**: dos fotos, la posición inicial y la final,
  que se alternan para que veas el movimiento. Se abre tocando el nombre del
  ejercicio, tanto en la rutina como en mitad del entreno.
- **Agenda**: programa una rutina para un día y una hora. Aparece en «Entrenar» y
  desde ahí se empieza de un toque. No hay notificaciones: una web instalada en
  el iPhone no puede mandarlas sin un servidor de push detrás.
- **Temporizador de descanso** que arranca solo al marcar una serie.
- **Historial** de todas las sesiones, agrupado por mes, con volumen y kilómetros.
- **Progreso**: volumen / entrenos / distancia por semana, y por ejercicio la
  evolución del 1RM estimado, la distancia o la mejor plancha, con tus récords.
- Catálogo con 61 ejercicios de inicio, ampliable con los tuyos.

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
npm run check     # tipos de app y tests, lint y pruebas automáticas
npm run typecheck
npm run lint
npm test
```

## Agentes

En `.claude/agents/` hay tres agentes de Claude Code con el contexto de esta app
ya cargado — las trampas de react-native-web, dónde se usa y cómo se entrena —
para no tener que repetirlo en cada conversación. Se invocan por nombre.

- **Mark** — ingeniero. Todo el trabajo de código: features, bugs, refactors,
  revisiones y despliegue. Conoce Expo 57 + react-native-web, el modelo de datos
  y por qué el orden de `seed.ts` no se toca.
- **Joel** — analista de UX. Audita una pantalla o un flujo y ordena los
  problemas por gravedad, contando toques y midiendo la legibilidad en el móvil,
  que es donde se usa. Diagnostica; no rediseña ni toca código.
- **Stefi** — especialista en entrenamiento. Series, repeticiones, descansos,
  repartos semanales, progresión y qué ejercicios entran en el catálogo. Da el
  número y dónde aterriza (`PRESCRIPTION`, `SPLITS`, las filas de `seed.ts`).
  No es médica: no diagnostica lesiones ni pauta dietas.

Cada uno tiene sus límites escritos a propósito, para que no se pisen: una
decisión de código no la toma Joel, y un número de entrenamiento no lo elige
Mark.

## Estructura

```
.claude/
  agents/                 Mark (código) · Joel (UX) · Stefi (entrenamiento)
public/                   se copia tal cual a dist/
  sw.js                   service worker (offline)
  icons/                  iconos de la PWA
assets/
  exercises/              fotogramas de las demostraciones (generados)
scripts/
  make-icons.mjs          genera los PNG desde un SVG (sharp)
  fetch-exercise-images.mjs  baja y optimiza las demostraciones
  finish-web-build.mjs    inyecta manifest, meta de iOS y registro del SW en dist/
  serve-dist.mjs          servidor local para probar la build
src/
  app/                    rutas (expo-router)
    (tabs)/               Hoy · Rutinas · Historial · Progreso
    session/[id].tsx      registro del entreno (y vista de uno pasado)
    routine/[id].tsx      editor de rutinas ('new' para crear)
    recommended.tsx       plan generado a partir del cuestionario
    routine-catalog.tsx   catálogo de rutinas ya montadas, con filtros
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
    recommend.ts          estimaciones y generador de rutinas previo
    weekly-plan.ts        reparto semanal, músculos y calendario recurrente
    routine-catalog.ts    las 24 rutinas fijas del catálogo
    demos.ts              fotogramas por ejercicio (generado, no editar)
    format.ts             formato de pesos, tiempos, ritmos y plurales
    seed.ts               catálogo inicial de ejercicios
```

Las demostraciones salen de [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
de dominio público. `npm run exercise-images` las baja, las reescala a 480 px de
ancho en WebP y regenera `src/lib/demos.ts`. Son 116 imágenes y 1,6 MB en total,
frente a los ~60 MB que ocuparían en gif. Van en `assets/` a propósito, para que
pasen por el empaquetador: así llevan hash, funcionan también en nativo y el
service worker las cachea como cualquier otro estático.

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
- `Routine` → `PlanItem[]` — el plan: qué ejercicios y con qué objetivo. Si
  salió del catálogo de rutinas, `sourceId` guarda de cuál, para poder marcar
  allí las que ya tienes aunque las renombres.
- `Session` → `SessionEntry[]` → `SetLog[]` — lo que realmente hiciste.
  La sesión con `finishedAt: null` es la que está en curso; solo puede haber una.

Los pesos siempre se guardan en kilos; el ajuste kg/lb solo cambia cómo se
muestran e introducen.

En la web los datos viven en el `localStorage` del navegador. Son de ese
navegador y ese dispositivo: si borras los datos del sitio, se van. Por eso
existe la exportación de copias en Ajustes.

### Comprobaciones de esta versión

63 pruebas cubren validación de backups, migración, guardado interrumpido, orden de escrituras, conflictos entre pestañas, recuperación, unidades, récords, restricciones de material e instalación offline. Los pull requests y los despliegues ejecutan las comprobaciones y la build de producción.

La revisión manual local verificó la creación de una semana en un toque, su persistencia, el ajuste por músculos y el avance tras completar la sesión, además de registro y resumen, navegación por ejercicio, importación aditiva y rechazo de archivos inválidos, calendario, calculadora de discos y apariencia clara/oscura. Se revisaron vistas de 390 × 844 y 1280 × 900. Con el servidor de pruebas apagado se recargó una sesión abierta: conservó la serie registrada, las tipografías y el descanso. Falta la prueba en un iPhone físico para confirmar teclado, compartir y comportamiento al bloquear la pantalla. La app sigue siendo local y no incorpora cuentas ni sincronización en la nube.

Las claves originales `wk.*.v1` se conservan como respaldo de migración; `wk.data.v2` es la fuente actual después del primer guardado. No vuelvas a una versión antigua para continuar registrando datos: esa versión no conoce el snapshot nuevo. Los borradores `wk.draft.*` son independientes del backup de rutinas guardadas.

### Vercel deployment

The Vercel project connects to `elberacasa/entreno`. Pushes to
`feat/entreno-revamp` create preview deployments. The build runs type checks,
lint, all tests, and the Expo web export before publishing static files.

`scripts/prepare-vercel.mjs` places the export under `/entreno/`, preserving
the same asset paths, PWA scope, and client routes as local previews and
GitHub Pages. `vercel.json` redirects the site root and serves the app shell
for deep links. The service worker is revalidated on each update check.

Share one stable branch alias when testing updates. Browser storage belongs
to the URL's origin: different deployment domains have separate data.
Export a backup before moving to another domain. No workout data is sent to
a database, and clearing site data removes locally stored workouts.
