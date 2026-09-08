# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Web es la única plataforma que se ejecuta

La app se usa instalada en el iPhone, y una PWA instalada sigue siendo web:
`Platform.OS` vale `'web'`. El código nativo se conserva por si algún día se
compila de verdad, pero **hoy no lo ejecuta nadie**, así que toda rama que no
sea la de web está sin probar y hay que tratarla como tal.

Antes de usar un módulo de Expo, mira la sección de plataformas soportadas de
su página de la v57. Si Web no aparece, ahí no funciona: `expo-file-system` es
solo nativo y reventaba la exportación de copias en el iPhone. Y aunque
aparezca, puede comportarse distinto — `expo-sharing` lista Web pero no
comparte ficheros por URI, y `expo-status-bar` no hace nada.

Lo mismo vale para react-native-web: `Alert.alert` es una función vacía (usa
`components/dialog.tsx`), `KeyboardAvoidingView` es inerte, y `flex: 0` pone
`flexBasis: 0` y colapsa el contenedor.

# El plan B va antes de la llamada que puede fallar

Tres bugs distintos han tenido la misma forma: código de reserva escrito
después de la línea que fallaba, y por tanto inalcanzable. La exportación
copiaba al portapapeles solo si no se podía compartir, pero el fallo ocurría
antes; el usuario veía un error técnico en vez del recurso.

Comprueba la disponibilidad antes de intentarlo (`isAvailableAsync`, el
booleano que devuelve `setStringAsync` en web), y que cada `catch` deje al
usuario en un sitio útil y no solo con el texto del error. Y no des por buena
una operación que no has comprobado: decirle a alguien que tiene una copia de
seguridad que no existe es peor que decirle que ha fallado.

Esto importa el doble donde se puedan perder datos. Todo vive en el teléfono y
no hay servidor: si una escritura falla en silencio, no hay de dónde
recuperarlo.
