# SEQUENTIAL LAB · Create · Animate · Publish

Editor y lector de cómics digitales para la materia de Ilustración y Narrativa Secuencial. **Funciona en el navegador, sin registro ni servidor de almacenamiento.** La importación de PDF usa PDF.js, que se descarga al utilizar esa función.

## Funciones v1.1

- **Importar un PDF completo** en imágenes por página, ya sea como cómic nuevo o insertado en uno existente. Portada y contraportada opcionales, y detección de splash horizontal en documentos verticales.
- Subir una **página completa** como imagen (JPG/PNG/WebP/GIF) o video (MP4/WebM).
- Los videos se repiten **únicamente mientras su página está visible** en Reader Mode; se pausan al cambiar de página.
- Portada, contraportada, páginas interiores y splash dobles (dos páginas de ancho).
- Alternativa de composición libre por paneles: seis plantillas, agregar panel, arrastrar, redimensionar, superponer y reordenar.
- Numeración automática de interiores (las dobles cuentan como dos), ocultación global o por página.
- Reader Mode con efecto 3D de pasar la hoja, control de teclado, gestos táctiles, pantalla completa y diseño adaptable.
- PDF descargable con páginas estáticas; para videos se extrae el primer fotograma disponible. Las splash dobles se exportan como una página horizontal.
- Proyecto editable `.seqlab` (ZIP sin compresión con `project.json` y archivos originales).
- Exportación HTML ZIP independiente con `index.html`, lector y medios originales, apto para GitHub Pages.

## Lector animado y exportación de video (v1.7)

**Corrección de los MP4:** el lector genera una capa de reproducción independiente del motor de curvatura de hojas. En vez de clonar el video desde las hojas transformadas (que podía congelarse en el primer fotograma), crea reproductores a partir del proyecto y los coloca sobre la apertura visible. Las animaciones se ocultan mientras la hoja gira y vuelven a reproducirse, en loop y sin sonido, cuando termina el giro. La corrección también se incluye en los HTML exportados.

**Exportar un recorrido no interactivo:**

1. Desde el editor, abre **Leer cómic** y haz clic en **⏺ Exportar video**.
2. Configura **segundos por apertura**, **duración del giro** y si los MP4 se repiten durante el tiempo elegido o se reproducen completos.
3. Selecciona **WebM** (recomendado) o **MP4** si tu navegador admite grabación directa en ese formato.
4. En Chrome de escritorio, haz clic en **Comenzar grabación** y, en el permiso de captura, selecciona **Esta pestaña**.
5. La aplicación oculta sus controles, vuelve al inicio y recorre las páginas. Al terminar, descarga automáticamente el video. Puedes detener una grabación manualmente con **Esc** o desde el control de compartir de Chrome.

La primera versión graba los píxeles visibles de la pestaña mediante `getDisplayMedia()` y `MediaRecorder`: el formato vertical/horizontal y la resolución del video dependen de las dimensiones de la pestaña capturada. El resultado es un video **sin audio**. No se envía el cómic ni la grabación a un servidor externo. En navegadores que no soporten captura de pestañas o el formato seleccionado, la aplicación muestra un aviso.

**Importante:** los HTML exportados con versiones anteriores necesitan exportarse nuevamente. Para videos largos, ten en cuenta que la grabación conserva el archivo en memoria hasta terminar y descargarlo.

## Edición rápida y MP4 en el lector (v1.6)

- **Reordenar:** arrastra una miniatura de la columna izquierda y suéltala antes o después de otra (la línea verde indica la posición de inserción). Siguen disponibles los controles **Subir / Bajar**.
- **Eliminar:** usa la **×** de la miniatura. Se solicita confirmación antes de borrar; se mantiene al menos una página.
- **Sustituir una página estática por video:** selecciona su miniatura y usa **Página completa → Subir imagen/video** para reemplazar el archivo, o crea una página de video y elimina la estática desde la **×**.
- **MP4/WebM:** el editor previsualiza los videos; el lector muestra un video activo sobre la hoja abierta, en loop y sin audio. Durante el doblado se oculta temporalmente para evitar que la textura de video se congele; se reactiva al terminar el giro.
- El HTML exportado también incluye esta reproducción animada, sin depender del editor ni de una conexión a Internet una vez publicado o descargado.

**Importante:** los cómics HTML exportados antes de esta versión necesitan volver a exportarse para incorporar estos cambios.

## Lector con efecto de papel (v1.4)

Sequential Lab ahora usa el motor [StPageFlip](https://github.com/Nodlik/StPageFlip) (licencia MIT) para simular el doblado de una hoja desde la esquina, con sombras dinámicas y soporte táctil. El código del motor se incluye en `vendor/page-flip.browser.js`; los HTML exportados llevan su propia copia, por lo que no necesitan CDN.

- Las páginas interiores se comportan como papel flexible. La portada/contraportada conservan mayor rigidez.
- Los MP4 siguen en loop únicamente mientras sus páginas están abiertas.
- Las splash pages dobles se dividen visualmente entre las dos hojas enfrentadas, sin modificar el proyecto original.
- La lectura en pantallas angostas pasa a una página, mientras el escritorio muestra dos.
- Los proyectos `.seqlab`, la importación de PDF y la exportación de PDF permanecen compatibles.

**Nota:** vuelve a exportar los HTML creados con versiones anteriores para obtener el nuevo efecto.

## Importar PDF

1. Haz clic en **Importar PDF** y selecciona un PDF de hasta 250 MB y 120 páginas.
2. Elige **Crear cómic desde el PDF** (reemplaza las páginas actuales) o **Agregar a este cómic**.
3. Puedes marcar la primera hoja como portada y la última como contraportada.
4. Cada hoja se rasteriza como JPG de hasta 1900 px de lado mayor; los vectores y el texto seleccionable del PDF no se conservan.
5. Para convertir una página en animación, selecciónala y súbele un MP4 desde **Página completa**.
6. Guarda el proyecto editable `.seqlab` o exporta PDF / HTML interactivo como antes.

Para PDFs especialmente grandes, es más estable importarlos por partes (ejemplo: páginas 1–10 y luego 11–20) usando **Agregar a este cómic**. En Mac, abre el PDF en **Vista Previa → Visualización → Miniaturas**, selecciona un grupo y arrastra esas miniaturas al escritorio para crear otro PDF; repite por grupos. También puedes comprimir una copia desde **Archivo → Exportar → Filtro Quartz → Reducción del tamaño de archivo**, teniendo en cuenta que puede reducir la calidad de las ilustraciones.

La primera importación necesita conexión a Internet para obtener PDF.js. El PDF se procesa en el navegador y no se sube a un servidor de Sequential Lab. El proyecto guarda las imágenes convertidas, no el PDF original. La numeración se desactiva automáticamente al crear un cómic nuevo desde PDF, para evitar duplicar los números impresos.

## Ejecutar localmente

No requiere `npm install`. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080`. También puede usarse Live Server en VS Code. Se recomienda acceder por HTTP para que **Exportar HTML** pueda incluir los archivos del lector.

## Publicar el editor en GitHub Pages

1. Crear un repositorio llamado `sequential-lab`.
2. Subir todos los archivos de esta carpeta (incluido `.github/workflows/pages.yml`).
3. Ir a Settings → Pages y seleccionar **GitHub Actions** como origen.
4. El workflow desplegará el editor estático sin paso de compilación.

## Publicar un cómic

1. En el editor, pulsa **Exportar → HTML interactivo (.zip)**.
2. Extrae el ZIP. Contendrá `index.html`, `reader.css`, `reader.js` y `assets/`.
3. Sube **el contenido extraído** a un repositorio de publicación y activa GitHub Pages.
4. Para lectura local sin internet, abre `index.html` desde la carpeta extraída. El lector no utiliza CDNs.

## Nota sobre formatos y privacidad

- Los archivos se mantienen en memoria en el navegador mientras se edita. **Guarda tu proyecto `.seqlab` con frecuencia**: al recargar se pierde el trabajo no descargado.
- Las animaciones MP4/WebM requieren un códec que el dispositivo lector pueda reproducir. Para compatibilidad iPad se recomienda MP4 H.264.
- El lector reproduce videos sin audio por defecto, por las políticas de autoplay de los navegadores.
- Los PDF convierten animaciones a imágenes; se utiliza el primer fotograma que el navegador logra decodificar, aproximadamente en el segundo 0.
- El PDF se construye sin librerías externas y cada página se rasteriza a 1400 px de alto: no es un archivo vectorial para imprenta.
- El proyecto `.seqlab` y HTML ZIP contienen los medios originales y pueden ser grandes. No uses videos de tamaño desproporcionado.
- Las páginas dobles se conservan como una página panorámica en el PDF; la división en dos páginas individuales y los archivos CBR/CBZ son posibles mejoras posteriores.
- No se suben los medios a servidores por defecto.

## Estructura

```text
index.html       — editor
style.css        — estilos del editor
app.js           — manejo de proyecto, interfaz, composición y exportación
reader.js        — lector compartido por editor y cómics exportados
reader.css       — aspecto del lector
zip.js           — archivador ZIP sin compresión
pdf.js           — PDF binario de páginas JPG
pdf-import.js    — importación de PDF con PDF.js bajo demanda
.github/workflows/pages.yml — despliegue automático GitHub Pages
```

Proyecto educativo original. Sugerencia de licencia: MIT.

## Subir desde la terminal después de crear el repositorio

Una vez creado el repositorio vacío en GitHub, extrae este código y ejecuta **dentro de la carpeta**:

```bash
git init -b main
git add .
git commit -m "Initial release of Sequential Lab"
git remote add origin https://github.com/TU_USUARIO/sequential-lab.git
git push -u origin main
```

Cambia `TU_USUARIO` por tu cuenta de GitHub. En Settings → Pages, selecciona GitHub Actions como fuente.
