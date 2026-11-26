# SEQUENTIAL LAB · Create · Animate · Publish

Editor y lector de cómics digitales para la materia de Ilustración y Narrativa Secuencial. **Funciona en el navegador, sin registro, sin servidor de almacenamiento y sin dependencias externas.**

## Funciones v1.0

- Subir una **página completa** como imagen (JPG/PNG/WebP/GIF) o video (MP4/WebM).
- Los videos se repiten **únicamente mientras su página está visible** en Reader Mode; se pausan al cambiar de página.
- Portada, contraportada, páginas interiores y splash dobles (dos páginas de ancho).
- Alternativa de composición libre por paneles: seis plantillas, agregar panel, arrastrar, redimensionar, superponer y reordenar.
- Numeración automática de interiores (las dobles cuentan como dos), ocultación global o por página.
- Reader Mode con efecto 3D de pasar la hoja, control de teclado, gestos táctiles, pantalla completa y diseño adaptable.
- PDF descargable con páginas estáticas; para videos se extrae el primer fotograma disponible. Las splash dobles se exportan como una página horizontal.
- Proyecto editable `.seqlab` (ZIP sin compresión con `project.json` y archivos originales).
- Exportación HTML ZIP independiente con `index.html`, lector y medios originales, apto para GitHub Pages.

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
