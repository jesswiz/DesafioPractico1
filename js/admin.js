// admin.js
// Panel del administrador (admin.html):
//   1. Verifica que el usuario tenga rol "admin".
//   2. Indicadores: solicitudes por estado y equipos más solicitados.
//   3. Tabla de todas las solicitudes con búsqueda, filtro y cambio de estado.
//   4. CRUD de equipos: crear, editar y eliminar.
//   5. Botón "Cargar datos iniciales" cuando la base está vacía.
// Nota: ocultar la página no basta para proteger los datos; las reglas de
// Firestore (firestore.rules) también impiden que un cliente haga estas operaciones.

import { obtenerSesion } from "./auth.js";
import {
  obtenerEquipos, obtenerTodasLasSolicitudes, actualizarEstadoSolicitud,
  crearEquipo, actualizarEquipo, eliminarEquipo, ESTADOS
} from "./datos.js";
import { cargarDatosIniciales } from "./semilla.js";
import { contarPorEstado, equiposMasSolicitados, ordenarRecientesPrimero } from "./procesamiento.js";
import {
  mostrarMensaje, ocultarMensaje, crearElemento, claseEstado, formatearFecha,
  formatearMarcaTiempo, normalizarTexto, bloquearBoton, desbloquearBoton
} from "./ui.js";

// Elementos generales
const saludo = document.querySelector("#saludo-admin");
const mensajeAdmin = document.querySelector("#mensaje-admin");
const contenido = document.querySelector("#contenido-admin");

// Datos iniciales
const seccionSemilla = document.querySelector("#seccion-semilla");
const botonSemilla = document.querySelector("#boton-semilla");
const mensajeSemilla = document.querySelector("#mensaje-semilla");

// Indicadores
const indicadoresEstado = document.querySelector("#indicadores-estado");
const listaRanking = document.querySelector("#mas-solicitados");
const sinRanking = document.querySelector("#sin-ranking");

// Solicitudes
const formFiltrosSolicitudes = document.querySelector("#filtros-solicitudes");
const buscarSolicitud = document.querySelector("#buscar-solicitud");
const filtroEstado = document.querySelector("#filtro-estado-admin");
const contadorSolicitudes = document.querySelector("#contador-solicitudes");
const mensajeSolicitudes = document.querySelector("#mensaje-solicitudes");
const contenedorSolicitudes = document.querySelector("#contenedor-solicitudes");
const cuerpoSolicitudes = document.querySelector("#cuerpo-solicitudes");

// Equipos
const formEquipo = document.querySelector("#form-equipo");
// Campo oculto con el id del equipo que se edita (vacío = equipo nuevo).
// Se busca por su id porque formEquipo.id es el id del propio formulario.
const campoIdEquipo = document.querySelector("#equipo-id");
const tituloFormEquipo = document.querySelector("#titulo-form-equipo");
const listaCategorias = document.querySelector("#lista-categorias");
const mensajeFormEquipo = document.querySelector("#mensaje-form-equipo");
const botonGuardarEquipo = document.querySelector("#boton-guardar-equipo");
const botonCancelarEdicion = document.querySelector("#boton-cancelar-edicion");
const mensajeEquipos = document.querySelector("#mensaje-equipos");
const contenedorEquipos = document.querySelector("#contenedor-equipos");
const cuerpoEquipos = document.querySelector("#cuerpo-equipos");

// Datos leídos de Firestore
let equipos = [];
let solicitudes = [];

/* =========================================================
   CARGA DE DATOS
   ========================================================= */

async function cargarDatos() {
  mostrarMensaje(mensajeAdmin, "Cargando datos...", "carga");
  try {
    // Primero se leen los equipos y luego las solicitudes
    equipos = await obtenerEquipos();
    solicitudes = await obtenerTodasLasSolicitudes();
    ocultarMensaje(mensajeAdmin);
    actualizarTodo();
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensajeAdmin, "No se pudieron cargar los datos. Revisa tu conexión y recarga la página.", "error");
  }
}

// Vuelve a dibujar todas las partes de la página con los datos actuales
function actualizarTodo() {
  seccionSemilla.hidden = equipos.length > 0;
  mostrarIndicadores();
  mostrarSolicitudes();
  mostrarEquipos();
  llenarCategorias();
}

/* =========================================================
   DATOS INICIALES
   ========================================================= */

async function cargarSemilla() {
  if (!confirm("Se cargarán 9 equipos y 8 solicitudes de ejemplo. ¿Continuar?")) {
    return;
  }
  bloquearBoton(botonSemilla, "Cargando...");
  mostrarMensaje(mensajeSemilla, "Guardando los datos iniciales...", "carga");
  try {
    const resultado = await cargarDatosIniciales();
    ocultarMensaje(mensajeSemilla);
    await cargarDatos();
    mostrarMensaje(mensajeAdmin, "Se cargaron " + resultado.equipos + " equipos y " + resultado.solicitudes + " solicitudes de ejemplo.", "exito");
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensajeSemilla, "No se pudieron cargar los datos iniciales. " + error.message, "error");
  } finally {
    desbloquearBoton(botonSemilla);
  }
}

botonSemilla.addEventListener("click", cargarSemilla);

/* =========================================================
   INDICADORES
   ========================================================= */

function mostrarIndicadores() {
  // Solicitudes por estado
  const conteo = contarPorEstado(solicitudes);
  const numeros = indicadoresEstado.querySelectorAll("[data-estado]");
  for (const numero of numeros) {
    numero.textContent = conteo[numero.dataset.estado];
  }

  // Equipos más solicitados (los 5 primeros) como barras horizontales
  listaRanking.textContent = "";
  const ranking = equiposMasSolicitados(solicitudes, 5);
  sinRanking.hidden = ranking.length > 0;
  if (ranking.length === 0) {
    return;
  }

  const maximo = ranking[0].solicitudes; // el primero es el que tiene más
  for (const item of ranking) {
    const fila = crearElemento("li", "barra-item");
    fila.append(crearElemento("span", "barra-nombre", item.nombre));

    const fondo = crearElemento("div", "barra-fondo");
    const barra = crearElemento("div", "barra");
    barra.style.width = (item.solicitudes / maximo) * 100 + "%";
    fondo.append(barra);
    fila.append(fondo);

    let textoSolicitudes = item.solicitudes + " solicitudes";
    if (item.solicitudes === 1) {
      textoSolicitudes = "1 solicitud";
    }
    let textoUnidades = item.unidades + " unidades";
    if (item.unidades === 1) {
      textoUnidades = "1 unidad";
    }
    fila.append(crearElemento("span", "barra-valor", textoSolicitudes + " · " + textoUnidades));

    listaRanking.append(fila);
  }
}

/* =========================================================
   SOLICITUDES
   ========================================================= */

// Devuelve true si la solicitud coincide con la búsqueda y el filtro de estado
function cumpleFiltrosSolicitud(solicitud) {
  const texto = normalizarTexto(buscarSolicitud.value.trim());
  const estado = filtroEstado.value;

  const contenidoSolicitud = normalizarTexto(
    solicitud.nombre + " " + solicitud.empresa + " " + solicitud.correo + " " +
    solicitud.equipoNombre + " " + solicitud.ubicacion
  );
  const coincideTexto = contenidoSolicitud.includes(texto);
  const coincideEstado = estado === "" || solicitud.estado === estado;
  return coincideTexto && coincideEstado;
}

// Aplica la búsqueda y el filtro de estado, y ordena (recientes primero)
function filtrarSolicitudes() {
  const filtradas = solicitudes.filter(cumpleFiltrosSolicitud);
  return ordenarRecientesPrimero(filtradas);
}

// Crea una celda <td> con el contenido indicado y la agrega a la fila.
// "etiqueta" es el nombre de la columna: en móvil la tabla se muestra como
// tarjetas y el CSS escribe esa etiqueta antes de cada dato (data-etiqueta).
// Si la celda necesita más contenido, se agrega después con celda.append().
function agregarCelda(fila, etiqueta, contenidoCelda) {
  const celda = document.createElement("td");
  celda.dataset.etiqueta = etiqueta;
  celda.append(contenidoCelda);
  fila.append(celda);
  return celda;
}

// Crea la fila <tr> de una solicitud
function crearFilaSolicitud(solicitud) {
  const fila = document.createElement("tr");

  agregarCelda(fila, "Enviada", formatearMarcaTiempo(solicitud.creadoEn));

  const celdaCliente = agregarCelda(fila, "Cliente", crearElemento("b", "", solicitud.nombre));
  celdaCliente.append(document.createElement("br"));
  celdaCliente.append(solicitud.empresa);
  celdaCliente.append(crearElemento("small", "dato-secundario", solicitud.correo + " · " + solicitud.telefono));

  agregarCelda(fila, "Equipo", solicitud.equipoNombre + " × " + solicitud.cantidad);

  let textoDuracion = solicitud.duracion + " días";
  if (solicitud.duracion === 1) {
    textoDuracion = "1 día";
  }
  const celdaInicio = agregarCelda(fila, "Inicio", formatearFecha(solicitud.inicio));
  celdaInicio.append(crearElemento("small", "dato-secundario", textoDuracion));

  agregarCelda(fila, "Ubicación", solicitud.ubicacion);

  let detalles = "Sin operador";
  if (solicitud.conOperador) {
    detalles = "Con operador";
  }
  if (solicitud.transporte) {
    detalles = detalles + ", con lowboy";
  } else {
    detalles = detalles + ", sin transporte";
  }
  const celdaDetalles = agregarCelda(fila, "Detalles", detalles);
  if (solicitud.mensaje) {
    celdaDetalles.append(crearElemento("small", "dato-secundario", "“" + solicitud.mensaje + "”"));
  }

  // Select para cambiar el estado, coloreado según el estado actual
  const selectEstado = document.createElement("select");
  selectEstado.className = "selector-estado " + claseEstado(solicitud.estado);
  selectEstado.setAttribute("aria-label", "Estado de la solicitud de " + solicitud.nombre);
  for (const estado of ESTADOS) {
    const opcion = crearElemento("option", "", estado);
    opcion.value = estado;
    selectEstado.append(opcion);
  }
  selectEstado.value = solicitud.estado;
  selectEstado.addEventListener("change", function () {
    cambiarEstado(solicitud, selectEstado);
  });
  agregarCelda(fila, "Estado", selectEstado);

  return fila;
}

// Dibuja la tabla de solicitudes (o el mensaje que corresponda)
function mostrarSolicitudes() {
  cuerpoSolicitudes.textContent = "";

  if (solicitudes.length === 0) {
    contadorSolicitudes.textContent = "";
    contenedorSolicitudes.hidden = true;
    mostrarMensaje(mensajeSolicitudes, "Todavía no hay solicitudes registradas.", "info");
    return;
  }

  const filtradas = filtrarSolicitudes();
  contadorSolicitudes.textContent = "Mostrando " + filtradas.length + " de " + solicitudes.length + " solicitudes";

  if (filtradas.length === 0) {
    contenedorSolicitudes.hidden = true;
    mostrarMensaje(mensajeSolicitudes, "Ninguna solicitud coincide con la búsqueda o el filtro.", "info");
    return;
  }

  ocultarMensaje(mensajeSolicitudes);
  contenedorSolicitudes.hidden = false;
  for (const solicitud of filtradas) {
    cuerpoSolicitudes.append(crearFilaSolicitud(solicitud));
  }
}

// Guarda el nuevo estado de una solicitud en Firestore
async function cambiarEstado(solicitud, selectEstado) {
  const nuevoEstado = selectEstado.value;
  const estadoAnterior = solicitud.estado;
  selectEstado.disabled = true;

  try {
    await actualizarEstadoSolicitud(solicitud.id, nuevoEstado);
    solicitud.estado = nuevoEstado; // se actualiza también el dato local
    mostrarIndicadores();
    mostrarSolicitudes();
    mostrarMensaje(mensajeSolicitudes,
      "La solicitud de " + solicitud.nombre + " (" + solicitud.equipoNombre + ") ahora está: " + nuevoEstado + ".", "exito");
  } catch (error) {
    console.error(error);
    selectEstado.value = estadoAnterior; // se regresa al valor que tenía
    selectEstado.disabled = false;
    mostrarMensaje(mensajeSolicitudes, "No se pudo cambiar el estado. Inténtalo de nuevo.", "error");
  }
}

// Enter en el buscador no debe recargar la página
function evitarRecarga(evento) {
  evento.preventDefault();
}

// Eventos de los filtros de solicitudes
buscarSolicitud.addEventListener("input", mostrarSolicitudes);
filtroEstado.addEventListener("change", mostrarSolicitudes);
formFiltrosSolicitudes.addEventListener("submit", evitarRecarga);

/* =========================================================
   EQUIPOS: LISTA
   ========================================================= */

// Cuántas solicitudes tiene un equipo (todas, o solo las activas)
function contarSolicitudesDeEquipo(idEquipo, soloActivas = false) {
  let cantidad = 0;
  for (const solicitud of solicitudes) {
    const esDelEquipo = solicitud.equipoId === idEquipo;
    const estaActiva = solicitud.estado === "pendiente" || solicitud.estado === "en evaluación";
    if (esDelEquipo && (!soloActivas || estaActiva)) {
      cantidad = cantidad + 1;
    }
  }
  return cantidad;
}

// Compara dos textos en orden alfabético (en español)
function compararTextos(a, b) {
  return a.localeCompare(b, "es");
}

// Compara dos equipos por nombre
function compararPorNombre(a, b) {
  return a.nombre.localeCompare(b.nombre, "es");
}

// Llena las sugerencias de categoría con las categorías existentes
function llenarCategorias() {
  listaCategorias.textContent = "";

  // Lista de categorías sin repetir
  const categorias = [];
  for (const equipo of equipos) {
    if (!categorias.includes(equipo.categoria)) {
      categorias.push(equipo.categoria);
    }
  }
  categorias.sort(compararTextos);

  for (const categoria of categorias) {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    listaCategorias.append(opcion);
  }
}

// Crea la fila <tr> de un equipo con sus botones Editar y Eliminar
function crearFilaEquipo(equipo) {
  const fila = document.createElement("tr");

  agregarCelda(fila, "Nombre", crearElemento("b", "", equipo.nombre));
  agregarCelda(fila, "Categoría", equipo.categoria);
  agregarCelda(fila, "Capacidad", equipo.capacidad);

  let claseDisponible = "disponibilidad no-disponible";
  let textoDisponible = "No";
  if (equipo.disponible) {
    claseDisponible = "disponibilidad disponible";
    textoDisponible = "Sí";
  }
  agregarCelda(fila, "Disponible", crearElemento("span", claseDisponible, textoDisponible));

  agregarCelda(fila, "Solicitudes", String(contarSolicitudesDeEquipo(equipo.id)));

  const botonEditar = crearElemento("button", "boton-secundario boton-pequeno", "Editar");
  botonEditar.type = "button";
  botonEditar.setAttribute("aria-label", "Editar " + equipo.nombre);
  botonEditar.addEventListener("click", function () {
    editarEquipo(equipo);
  });

  const botonEliminar = crearElemento("button", "boton-peligro boton-pequeno", "Eliminar");
  botonEliminar.type = "button";
  botonEliminar.setAttribute("aria-label", "Eliminar " + equipo.nombre);
  botonEliminar.addEventListener("click", function () {
    borrarEquipo(equipo, botonEliminar);
  });

  const acciones = crearElemento("div", "acciones");
  acciones.append(botonEditar);
  acciones.append(botonEliminar);
  agregarCelda(fila, "Acciones", acciones);

  return fila;
}

// Dibuja la tabla de equipos ordenada por nombre
function mostrarEquipos() {
  cuerpoEquipos.textContent = "";

  if (equipos.length === 0) {
    contenedorEquipos.hidden = true;
    mostrarMensaje(mensajeEquipos, "No hay equipos registrados. Agrega uno con el formulario o carga los datos iniciales.", "info");
    return;
  }

  ocultarMensaje(mensajeEquipos);
  contenedorEquipos.hidden = false;
  const ordenados = equipos.slice();
  ordenados.sort(compararPorNombre);
  for (const equipo of ordenados) {
    cuerpoEquipos.append(crearFilaEquipo(equipo));
  }
}

/* =========================================================
   EQUIPOS: FORMULARIO (CREAR Y EDITAR)
   ========================================================= */

// Lee el formulario y arma el objeto del equipo
function leerFormEquipo() {
  const f = formEquipo;

  // Un uso por línea; se quitan espacios y líneas vacías
  const usos = [];
  const lineas = f.usos.value.split("\n");
  for (const linea of lineas) {
    const uso = linea.trim();
    if (uso !== "") {
      usos.push(uso);
    }
  }

  const equipo = {};
  equipo.nombre = f.nombre.value.trim();
  equipo.categoria = f.categoria.value.trim();
  equipo.descripcion = f.descripcion.value.trim();
  equipo.capacidad = f.capacidad.value.trim();
  equipo.usos = usos;
  equipo.imagen = f.imagen.value.trim();
  equipo.disponible = f.disponible.checked;
  return equipo;
}

// Arma el objeto de error: el campo con problema y el texto que se muestra
function crearError(campo, texto) {
  const error = {};
  error.campo = campo;
  error.texto = texto;
  return error;
}

// Regla del negocio: no puede haber dos equipos con el mismo nombre.
// Se compara sin mayúsculas ni tildes, y sin contar el equipo que se está editando.
function nombreRepetido(nombre, idEditando) {
  for (const equipo of equipos) {
    if (equipo.id !== idEditando && normalizarTexto(equipo.nombre) === normalizarTexto(nombre)) {
      return true;
    }
  }
  return false;
}

// La imagen es opcional. Si se escribe, debe ser una ruta dentro de img/
// (como img/equipo.jpg) o una dirección que empiece con https://, sin espacios.
function imagenValida(imagen) {
  if (imagen === "") {
    return true;
  }
  if (imagen.includes(" ")) {
    return false;
  }
  if (imagen.startsWith("https://") && imagen.length > 8) {
    return true;
  }
  if (imagen.startsWith("img/") && imagen.length > 4) {
    // Después de "img/" no puede haber otra carpeta
    const nombreArchivo = imagen.slice(4);
    if (!nombreArchivo.includes("/")) {
      return true;
    }
  }
  return false;
}

// Valida el equipo. Devuelve null si está bien, o un error { campo, texto } con el primer problema.
function validarEquipo(datos, idEditando) {
  const f = formEquipo;

  if (datos.nombre.length < 3 || datos.nombre.length > 60) {
    return crearError(f.nombre, "El nombre debe tener entre 3 y 60 caracteres.");
  }
  if (nombreRepetido(datos.nombre, idEditando)) {
    return crearError(f.nombre, "Ya existe un equipo llamado “" + datos.nombre + "”.");
  }
  if (datos.categoria.length < 3 || datos.categoria.length > 40) {
    return crearError(f.categoria, "La categoría debe tener entre 3 y 40 caracteres.");
  }
  if (datos.descripcion.length < 10 || datos.descripcion.length > 300) {
    return crearError(f.descripcion, "La descripción debe tener entre 10 y 300 caracteres.");
  }
  if (datos.capacidad.length < 2 || datos.capacidad.length > 60) {
    return crearError(f.capacidad, "La capacidad debe tener entre 2 y 60 caracteres.");
  }
  if (datos.usos.length === 0 || datos.usos.length > 8) {
    return crearError(f.usos, "Escribe entre 1 y 8 usos, uno por línea.");
  }
  for (const uso of datos.usos) {
    if (uso.length > 60) {
      return crearError(f.usos, "Cada uso puede tener como máximo 60 caracteres.");
    }
  }
  if (!imagenValida(datos.imagen)) {
    return crearError(f.imagen, "La imagen debe ser una ruta como img/equipo.jpg o una dirección https://");
  }
  return null;
}

// Quita la marca de error de los campos del formulario de equipos
function limpiarErroresEquipo() {
  const camposConError = formEquipo.querySelectorAll("[aria-invalid]");
  for (const campo of camposConError) {
    campo.removeAttribute("aria-invalid");
  }
}

// Deja el formulario listo para agregar un equipo nuevo
function modoNuevo() {
  formEquipo.reset();
  campoIdEquipo.value = "";
  tituloFormEquipo.textContent = "Nuevo equipo";
  botonGuardarEquipo.textContent = "Agregar equipo";
  botonCancelarEdicion.hidden = true;
  limpiarErroresEquipo();
}

// Carga los datos de un equipo en el formulario para editarlo
function editarEquipo(equipo) {
  modoNuevo();
  ocultarMensaje(mensajeFormEquipo);
  const f = formEquipo;
  campoIdEquipo.value = equipo.id;
  f.nombre.value = equipo.nombre;
  f.categoria.value = equipo.categoria;
  f.descripcion.value = equipo.descripcion;
  f.capacidad.value = equipo.capacidad;
  if (equipo.usos) {
    f.usos.value = equipo.usos.join("\n");
  } else {
    f.usos.value = "";
  }
  if (equipo.imagen) {
    f.imagen.value = equipo.imagen;
  } else {
    f.imagen.value = "";
  }
  f.disponible.checked = equipo.disponible === true;

  tituloFormEquipo.textContent = "Editar equipo: " + equipo.nombre;
  botonGuardarEquipo.textContent = "Guardar cambios";
  botonCancelarEdicion.hidden = false;
  formEquipo.scrollIntoView();
  f.nombre.focus();
}

function cancelarEdicion() {
  modoNuevo();
  ocultarMensaje(mensajeFormEquipo);
}

botonCancelarEdicion.addEventListener("click", cancelarEdicion);

// Guardar: crea un equipo nuevo o actualiza el que se está editando
async function guardarEquipo(evento) {
  evento.preventDefault();
  limpiarErroresEquipo();
  ocultarMensaje(mensajeFormEquipo);

  const idEditando = campoIdEquipo.value; // vacío si es un equipo nuevo
  const datos = leerFormEquipo();
  const error = validarEquipo(datos, idEditando);
  if (error) {
    error.campo.setAttribute("aria-invalid", "true");
    error.campo.focus();
    mostrarMensaje(mensajeFormEquipo, error.texto, "error");
    return;
  }

  bloquearBoton(botonGuardarEquipo, "Guardando...");
  mostrarMensaje(mensajeFormEquipo, "Guardando el equipo...", "carga");

  try {
    if (idEditando) {
      await actualizarEquipo(idEditando, datos);
      // Se reemplaza el equipo en el arreglo local (el id se agrega
      // después de guardar para que no quede como campo en Firestore)
      datos.id = idEditando;
      for (let i = 0; i < equipos.length; i++) {
        if (equipos[i].id === idEditando) {
          equipos[i] = datos;
        }
      }
      mostrarMensaje(mensajeFormEquipo, "Se guardaron los cambios de “" + datos.nombre + "”.", "exito");
    } else {
      const idNuevo = await crearEquipo(datos);
      datos.id = idNuevo;
      equipos.push(datos);
      mostrarMensaje(mensajeFormEquipo, "Se agregó el equipo “" + datos.nombre + "”.", "exito");
    }
    desbloquearBoton(botonGuardarEquipo);
    modoNuevo();
    actualizarTodo();
  } catch (errorGuardar) {
    console.error(errorGuardar);
    desbloquearBoton(botonGuardarEquipo);
    mostrarMensaje(mensajeFormEquipo, "No se pudo guardar el equipo. Inténtalo de nuevo.", "error");
  }
}

formEquipo.addEventListener("submit", guardarEquipo);

/* =========================================================
   EQUIPOS: ELIMINAR
   ========================================================= */

async function borrarEquipo(equipo, boton) {
  // Regla del negocio: no se elimina un equipo con solicitudes pendientes o en evaluación
  const activas = contarSolicitudesDeEquipo(equipo.id, true);
  if (activas > 0) {
    let textoActivas = activas + " solicitudes activas";
    if (activas === 1) {
      textoActivas = "1 solicitud activa";
    }
    mostrarMensaje(mensajeEquipos,
      "No se puede eliminar “" + equipo.nombre + "” porque tiene " + textoActivas +
      ". Puedes editarlo y marcarlo como no disponible.", "error");
    return;
  }

  if (!confirm("¿Eliminar el equipo “" + equipo.nombre + "”? Esta acción no se puede deshacer.")) {
    return;
  }

  bloquearBoton(boton, "Eliminando...");
  try {
    await eliminarEquipo(equipo.id);
    // Se quita del arreglo local
    const restantes = [];
    for (const otro of equipos) {
      if (otro.id !== equipo.id) {
        restantes.push(otro);
      }
    }
    equipos = restantes;
    // Si se estaba editando ese mismo equipo, se limpia el formulario
    if (campoIdEquipo.value === equipo.id) {
      modoNuevo();
    }
    actualizarTodo();
    mostrarMensaje(mensajeEquipos, "Se eliminó el equipo “" + equipo.nombre + "”.", "exito");
  } catch (error) {
    console.error(error);
    desbloquearBoton(boton);
    mostrarMensaje(mensajeEquipos, "No se pudo eliminar el equipo. Inténtalo de nuevo.", "error");
  }
}

/* =========================================================
   AL ABRIR LA PÁGINA
   ========================================================= */

function irAlPanelDelCliente() {
  window.location.href = "panel.html";
}

async function iniciar() {
  const sesion = await obtenerSesion();

  // Sin sesión: a login y luego de vuelta aquí
  if (!sesion.usuario) {
    window.location.href = "login.html?volver=admin.html";
    return;
  }
  // Con sesión pero sin rol de administrador
  if (sesion.rol !== "admin") {
    mostrarMensaje(mensajeAdmin, "No tienes permisos para ver esta página. Te llevamos a tu panel...", "error");
    setTimeout(irAlPanelDelCliente, 2500);
    return;
  }

  let nombreVisible = sesion.usuario.email;
  if (sesion.nombre) {
    nombreVisible = sesion.nombre;
  }
  saludo.textContent = "Hola, " + nombreVisible + ". Gestiona las solicitudes de cotización y la flota de equipos.";
  contenido.hidden = false;
  await cargarDatos();
}

iniciar();
