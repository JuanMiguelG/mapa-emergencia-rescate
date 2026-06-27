# JMG Cambios

## Contexto rapido

Estoy documentando aqui las mejoras de UI, experiencia de uso y ajustes tecnicos que voy aplicando en el proyecto.

Esta pagina esta orientada a ayudar a damnificados en Venezuela, por eso mi prioridad es que todo sea claro, rapido de entender y facil de usar en momentos de emergencia.

Estoy trabajando con criterio de programador senior: cambios simples, bien ubicados, faciles de mantener y sin tocar mas codigo del necesario.

## Criterios de mejora

- Quiero que la informacion importante se entienda rapido.
- Voy a reducir ruido visual sin quitar senales utiles.
- Voy a mejorar botones, menus, jerarquia, lectura y navegacion.
- Voy a cuidar que la interfaz sea clara en movil y en desktop.
- Voy a documentar cada ajuste importante en este archivo.

## Cambios realizados

- Reemplace la franja superior oscura por una navbar clara normal, fija arriba y de ancho completo.
- Unifique altura, radio y espaciado de los botones principales.
- Corregi el contenedor para que los mini menus se desplieguen sin quedar recortados.
- Reemplace los emojis de los mini menus por iconos.
- Aplique color solo a los iconos de los mini menus para orientar sin recargar el texto.
- Alinee el boton de donar con el resto del header.
- Ajuste el flujo de donaciones para enviar a PayPal el monto elegido mediante parametros `amount` y `currency_code`.
- Mejore el modal de donacion con una UI mas clara para movil: cabecera compacta, botones de monto mas faciles de tocar, resumen visual del aporte, aviso de PayPal y accion principal fija al pie del modal.
- Mejore la seccion de reporte: cambie emojis por iconos con color, ordene mejor los pasos, el CTA, los tips, la leyenda de marcadores y los avisos.
- Restableci la visibilidad de la cinta de luto subiendola por encima de la navbar.
- Agregue un buscador claro en la navbar que reutiliza `/api/geocode` para lugares y `/api/missing` para personas, con resultados rapidos y navegacion directa.
- Conecte `?personSearch=` con la lista de personas desaparecidas para abrir la seccion ya filtrada desde la navbar.
- Refine el buscador de la navbar para que sea mas compacto, claro y facil de usar: placeholder directo, boton por icono, limpieza rapida y resultados mejor diferenciados.
- Corregi la alineacion de la navbar: los enlaces siguen en flujo normal y solo el input de busqueda queda hacia la derecha.
- Ajuste la navbar para que quede pegada arriba con fondo blanco solido, sin transparencia ni blur.
- Quite el contenedor visual del icono de busqueda dentro del input de la navbar para que se vea mas limpio.
- Mejore el carrusel de personas desaparecidas: iconos reales, encabezado mas visible, contador mas claro, botones mas grandes, flechas profesionales y tarjetas mas legibles.
- Reduje el peso visual del header de personas desaparecidas y compacte las tarjetas del carrusel para que en movil se vean mas profesionales y menos grandes.
- Ajuste los pasos de reporte para que en movil funcionen como carrusel horizontal y quite los bordes visibles de esa seccion, dejando sombras suaves para separar las tarjetas.
- Quite la barra de scroll visible del carrusel movil de pasos y agregue dos flechas para avanzar o retroceder tarjeta por tarjeta.
- Agregue modo pantalla completa al mapa con boton de expandir/salir, manteniendo buscador, filtros y acciones flotantes dentro del mapa.
- Movi el boton de pantalla completa del mapa a la esquina inferior izquierda para que no compita con el buscador ni los filtros superiores.
- Ajuste el recalculo de tamaño del mapa para que Leaflet se acomode cuando entra o sale de pantalla completa.
- Reemplace los emojis de tipos de marcador por iconos reales en los chips del mapa, pines Leaflet, formulario de reporte, popups y boton de compartir.
- Reemplace los emojis del encabezado y controles de ubicacion del modal de reporte por iconos reales.
- Reemplace el emoji de camara del placeholder de foto del modal de reporte por un icono real.
- Agregue un helper central de iconos para reutilizar los mismos simbolos en React y en los marcadores SVG del mapa.
- Mejore el panel de reportes debajo del mapa con iconos reales, filtros mas claros, buscador consistente, tarjetas sin bordes fuertes, estado vacio mas entendible y aviso demo integrado con la misma UI.
- Quite los emojis restantes en acciones y avisos relacionados con el mapa para mantener una interfaz uniforme.
- Mejore la seccion completa de personas desaparecidas/localizadas: tabs con iconos reales, panel sin card duplicada, header mas claro, buscador consistente, estado vacio mas util, tarjetas mas limpias y paginacion alineada a la nueva UI.
- Redondee los botones principales del carrusel de desaparecidos y mejore la bottom bar movil con iconos reales, botones mas claros y un sidebar lateral izquierdo para mostrar todos los accesos.
- Corregi el boton de donar dentro del menu movil para que abra el modal antes de cerrar el sidebar y no se desmonte antes de tiempo.
- Reemplace los simbolos de la zona "Ayuda a difundir" por logos SVG reales de X, Facebook e Instagram, y use un icono real para copiar enlace.
- Agregue un header superior solo para movil con acceso al mapa, cambio de idioma y apoyo psicologico, y quite los botones flotantes de idioma/apoyo en movil manteniendolos igual en desktop.
- Ajuste el espaciado del header movil, el hero principal y la bottom bar para que no se solapen ni tapen informacion importante en pantallas pequenas.
- Converti la bottom bar movil en una barra plana pegada al borde inferior, con fondo blanco solido y borde superior como el header.
- Aumente ligeramente el tamano de los iconos de la bottom bar movil para que se lean mejor al tacto.
- Reforce el margen lateral del carrusel movil de pasos para que la primera tarjeta no se vea pegada al borde de la pantalla.
- Aumente el espacio reservado para el header movil y el margen de anclaje superior para que no solape el hero ni las secciones al navegar.
- Movi las flechas del carrusel movil de pasos debajo de las tarjetas para dejar el encabezado mas limpio.
- Baje ligeramente el hero en movil con margen superior para que no quede pegado al header fijo.

## Archivos modificados

- Deje cambios en `app/page.tsx`, `app/components/SectionNav.tsx`, `app/components/DonateButton.tsx`, `app/components/MourningRibbon.tsx`, `app/components/PersonsTabs.tsx`, `app/components/MissingPersons.tsx`, `app/components/FoundPersons.tsx`, `app/components/MissingPersonsCarousel.tsx`, `app/components/MissingPersonDetail.tsx`, `app/components/ReportStepsCarousel.tsx`, `app/components/EmergencyApp.tsx`, `app/components/MapView.tsx`, `app/components/ReportForm.tsx`, `app/components/EdificiosAfectadosLayer.tsx`, `app/globals.css`, `app/api/donations/route.ts`, `lib/donations.ts`, `lib/donation-shared.ts` y `lib/report-type-icons.tsx`.
- Agregue un comentario JMG en `SectionNav.tsx` junto al header desktop para indicar que esta documentacion contiene el detalle de los cambios.
