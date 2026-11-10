# LogicTrans: cotizaciones de maquinaria pesada

Aplicación web de **LogicTrans**, empresa salvadoreña que alquila maquinaria pesada con operador. Es la ampliación del sitio del Desafío Práctico I (4 páginas en HTML y CSS) para el **Desafío Práctico II de Desarrollo Web I (ESEN, 2026)**.

- **Versión publicada:** _(pegar aquí la URL de GitHub Pages)_
- **Integrantes:** _(completar con los nombres de los 3 integrantes)_

---

## 1. Problema

Las constructoras pedían cotizaciones por teléfono o con un formulario que no guardaba nada. LogicTrans no tenía forma de:

- saber qué equipos están disponibles y mostrar el catálogo actualizado;
- registrar las solicitudes de cotización y su estado;
- que el cliente consulte en qué va su solicitud;
- medir qué equipos se piden más.

La aplicación resuelve esto con cuentas de usuario, un catálogo que se administra desde la web y un seguimiento de solicitudes con estados.

## 2. Roles

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| **Visitante** (sin sesión) | — | Ver el sitio y el catálogo de equipos. |
| **Cliente** | Se registra en `login.html`. Todo usuario nuevo es cliente. | Consultar equipos, crear solicitudes de cotización, ver **solo las suyas** y cancelar las que siguen pendientes. |
| **Administrador** | Se asigna **a mano** en la consola de Firebase (`usuarios/{uid}.rol = "admin"`). | Ver indicadores, ver y cambiar el estado de **todas** las solicitudes, y crear, editar y eliminar equipos. |

Un usuario no puede darse el rol de administrador: las reglas de Firestore solo permiten crear el documento de usuario con `rol: "cliente"` y nadie puede modificarlo desde la aplicación.

## 3. Procesos

**Proceso 1: Gestión de la flota (administrador → todos)**
1. El administrador agrega, edita o elimina equipos en `admin.html`. Se valida, por ejemplo, que no se repita el nombre.
2. El catálogo de `flota.html` se genera con esos datos y permite buscar, filtrar por categoría, ordenar y ver solo los disponibles.
3. Solo los equipos **disponibles** aparecen para cotizar.
4. No se puede eliminar un equipo con solicitudes pendientes o en evaluación; en ese caso se marca como no disponible.

**Proceso 2: Solicitud de cotización (cliente → administrador)**
1. El cliente inicia sesión y llena el formulario de `contacto.html`. El equipo se elige de la base y la fecha de inicio no puede ser pasada.
2. La solicitud se guarda con estado **pendiente**.
3. El cliente la ve en `panel.html`, con un resumen por estado y un filtro, y puede **cancelarla** mientras esté pendiente.
4. El administrador la ve en `admin.html`, la busca o filtra y cambia su estado a **en evaluación**, **aprobada** o **rechazada**. Los indicadores se recalculan.

Los dos procesos están relacionados: cada solicitud apunta a un equipo (`equipoId`) y el panel del administrador calcula qué equipos son los más solicitados.

## 4. Tecnología

- **HTML5, CSS3 y JavaScript nativo** con **módulos ES**, sin frameworks.
- **Firebase Authentication** (correo y contraseña) y **Cloud Firestore**, con el SDK **13.1.0** cargado por CDN desde `gstatic.com`.
- **Reglas de seguridad de Firestore** (`firestore.rules`) para controlar los permisos por rol.
- Publicación en **GitHub Pages**.

### Colecciones de Firestore

| Colección | Campos |
|---|---|
| `usuarios/{uid}` | `nombre`, `correo`, `rol` (`"cliente"` o `"admin"`), `creadoEn` |
| `equipos/{id}` | `nombre`, `categoria`, `descripcion`, `capacidad`, `usos` (lista), `imagen`, `disponible` |
| `solicitudes/{id}` | `uid`, `nombre`, `empresa`, `correo`, `telefono`, `equipoId`, `equipoNombre`, `cantidad`, `inicio`, `duracion`, `ubicacion`, `conOperador`, `transporte`, `mensaje`, `estado`, `creadoEn` |

Estados de una solicitud: `pendiente` → `en evaluación` → `aprobada` o `rechazada`.

## 5. Estructura del proyecto

```
├── index.html          Inicio (Desafío I)
├── flota.html          Catálogo de equipos generado desde Firestore
├── nosotros.html       Quiénes somos (Desafío I)
├── contacto.html       Formulario de solicitud de cotización
├── login.html          Ingreso y registro
├── panel.html          Panel del cliente
├── admin.html          Panel del administrador
├── firestore.rules     Reglas de seguridad de Firestore
├── css/
│   ├── base.css        Estilos generales (Desafío I)
│   ├── inicio.css, flota.css, nosotros.css, contacto.css   Estilos por página (Desafío I)
│   └── app.css         Estilos nuevos: mensajes, estados, tablas, indicadores, paneles
├── img/                Imágenes del sitio
└── js/
    ├── firebase-config.js  Configuración e inicialización de Firebase (solo esto)
    ├── datos.js            Todas las operaciones con Firestore (CRUD)
    ├── auth.js             Registro, ingreso, salida y rol del usuario
    ├── ui.js               Ayudas del DOM: mensajes, botones, formatos de fecha
    ├── procesamiento.js    Cálculos: conteo por estado, más solicitados, orden
    ├── semilla.js          Datos iniciales (9 equipos y 8 solicitudes)
    ├── menu.js             Enlace de sesión del menú (Ingresar / Mi panel / Salir)
    ├── login.js            Comportamiento de login.html
    ├── flota.js            Comportamiento de flota.html
    ├── contacto.js         Comportamiento de contacto.html
    ├── panel.js            Comportamiento de panel.html
    └── admin.js            Comportamiento de admin.html
```

**Separación de responsabilidades:** `firebase-config.js` solo configura la plataforma. `datos.js` y `auth.js` son los únicos que hablan con Firebase. `ui.js` y `procesamiento.js` no usan Firebase. Cada página tiene su propio archivo de comportamiento, que une todo lo anterior.

## 6. Configuración de Firebase

1. En la [consola de Firebase](https://console.firebase.google.com/) crea un proyecto y registra una **app web**.
2. Copia los datos de configuración de la app en `js/firebase-config.js`, en el objeto `configuracion`.
   Estos valores identifican el proyecto y no son secretos; la protección de los datos la dan las reglas. No se usa ninguna clave privada ni de servicio.
3. **Authentication > Método de acceso:** activa **Correo electrónico/contraseña**.
4. **Firestore Database:** crea la base de datos.
5. **Firestore Database > Reglas:** pega el contenido de `firestore.rules` y presiona **Publicar**.
6. **Crear el administrador:**
   1. Regístrate en `login.html` con la cuenta que será administradora.
   2. En **Firestore > usuarios**, abre el documento de esa cuenta (su id es el UID que aparece en Authentication).
   3. Cambia el campo `rol` de `cliente` a `admin`.
   4. Cierra sesión y vuelve a entrar.
7. **Datos iniciales:** entra como administrador a `admin.html` y presiona **Cargar datos iniciales**. Se cargan los 9 equipos de la flota y 8 solicitudes de ejemplo con distintos estados. El botón solo aparece cuando no hay equipos.
8. **Authentication > Configuración > Dominios autorizados:** agrega el dominio de GitHub Pages (`usuario.github.io`) para que el inicio de sesión funcione en la versión publicada.

## 7. Cómo ejecutarlo en tu computadora

Los módulos ES **no funcionan abriendo el archivo con doble clic** (`file://`); hace falta un servidor local:

- **VS Code:** instala la extensión **Live Server**, abre `index.html` y presiona **Go Live**.
- **O con Python:** en la carpeta del proyecto ejecuta `python -m http.server 5500` y abre `http://localhost:5500`.

## 8. Cómo probar la aplicación

Las credenciales de prueba (un cliente y un administrador) se entregan **por Moodle**; no se publican en este repositorio.

**Como visitante**
1. Abre `flota.html`: el catálogo se carga desde Firestore. Prueba la búsqueda (por ejemplo "zanjas"), el filtro de categoría, el orden y "Solo disponibles".
2. Abre `contacto.html`: el formulario está desactivado y pide iniciar sesión.

**Como cliente**
1. Regístrate en `login.html`. Prueba también las validaciones: correo inválido, contraseña sin números o contraseñas que no coinciden.
2. En `flota.html`, presiona **Cotizar este equipo**: el formulario se abre con ese equipo ya elegido.
3. Envía una solicitud. Prueba también con una fecha de inicio pasada o un teléfono que no tenga 8 dígitos.
4. En **Mi panel** revisa el resumen por estado, usa el filtro y **cancela** una solicitud pendiente.
5. Intenta abrir `admin.html`: no tienes permiso y vuelves a tu panel.

**Como administrador**
1. En **Mi panel** (`admin.html`) revisa los indicadores: solicitudes por estado y equipos más solicitados.
2. Busca y filtra solicitudes, y cambia el estado de una. Los indicadores se actualizan. Como cliente, esa solicitud aparece con el nuevo estado.
3. Agrega un equipo. Intenta repetir un nombre existente: el sistema no lo permite.
4. Edita un equipo y márcalo como no disponible: deja de aparecer para cotizar.
5. Intenta eliminar un equipo con solicitudes activas: el sistema no lo permite.

**Seguridad:** aunque alguien llame a Firestore desde la consola del navegador, las reglas impiden, por ejemplo:
- que un cliente lea solicitudes ajenas;
- que un cliente cambie un estado o edite equipos;
- que un usuario se ponga el rol de administrador.

Las reglas se probaron con el emulador de Firestore en 43 casos permitidos y bloqueados.

## 9. Publicación en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub. `index.html` debe estar en la raíz.
2. En el repositorio ve a **Settings > Pages**.
3. En **Source** elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y guarda.
4. Después de uno o dos minutos, GitHub muestra la URL: `https://usuario.github.io/repositorio/`.
5. Agrega `usuario.github.io` a los **Dominios autorizados** de Firebase Authentication (paso 8 de la configuración).
6. Abre la URL publicada y repite las pruebas de la sección 8: el registro, el inicio de sesión y los datos deben funcionar también allí.
