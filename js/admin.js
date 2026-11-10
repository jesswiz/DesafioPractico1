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
    // Las dos consultas se hacen al mismo tiempo y se espera a que terminen ambas
    [equipos, solicitudes] = await Promise.all([obtenerEquipos(), obtenerTodasLasSolicitudes()]);
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

botonSemilla.addEventListener("click", async () => {
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
});

/* =========================================================
   INDICADORES
   ========================================================= */

function mostrarIndicadores() {
  // Solicitudes por estado
  const conteo = contarPorEstado(solicitudes);
  indicadoresEstado.querySelectorAll("[data-estado]").forEach((numero) => {
    numero.textContent = conteo[numero.dataset.estado];
  });

  // Equipos más solicitados (los 5 primeros) como barras horizontales
  listaRanking.textContent = "";
  const ranking = equiposMasSolicitados(solicitudes, 5);
  sinRanking.hidden = ranking.length > 0;
  if (ranking.length === 0) {
    return;
  }

  const maximo = ranking[0].solicitudes; // el primero es el que tiene más
  ranking.forEach((item) => {
    const fila = crearElemento("li", "barra-item");
    fila.append(crearElemento("span", "barra-nombre", item.nombre));

    const fondo = crearElemento("div", "barra-fondo");
    const barra = crearElemento("div", "barra");
    barra.style.width = (item.solicitudes / maximo) * 100 + "%";
    fondo.append(barra);
    fila.append(fondo);

    const texto = item.solicitudes + (item.solicitudes === 1 ? " solicitud" : " solicitudes") +
      " · " + item.unidades + (item.unidades === 1 ? " unidad" : " unidades");
    fila.append(crearElemento("span", "barra-valor", texto));

    listaRanking.append(fila);
  });
}

/* =========================================================
   SOLICITUDES
   ========================================================= */

// Aplica la búsqueda y el filtro de estado, y ordena (recientes primero)
function filtrarSolicitudes() {
  const texto = normalizarTexto(buscarSolicitud.value.trim());
  const estado = filtroEstado.value;

  const filtradas = solicitudes.filter((solicitud) => {
    const contenidoSolicitud = normalizarTexto([
      solicitud.nombre, solicitud.empresa, solicitud.correo,
      solicitud.equipoNombre, solicitud.ubicacion
    ].join(" "));
    const coincideTexto = contenidoSolicitud.includes(texto);
    const coincideEstado = estado === "" || solicitud.estado === estado;
    return coincideTexto && coincideEstado;
  });

  return ordenarRecientesPrimero(filtradas);
}

// Crea una celda <td> con el contenido indicado y la agrega a la fila
function agregarCelda(fila, ...contenidoCelda) {
  const celda = document.createElement("td");
  celda.append(...contenidoCelda);
  fila.append(celda);
  return celda;
}

// Crea la fila <tr> de una solicitud
function crearFilaSolicitud(solicitud) {
  const fila = document.createElement("tr");

  agregarCelda(fila, formatearMarcaTiempo(solicitud.creadoEn));

  agregarCelda(fila,
    crearElemento("b", "", solicitud.nombre),
    document.createElement("br"),
    solicitud.empresa,
    crearElemento("small", "dato-secundario", solicitud.correo + " · " + solicitud.telefono)
  );

  agregarCelda(fila, solicitud.equipoNombre + " × " + solicitud.cantidad);

  agregarCelda(fila,
    formatearFecha(solicitud.inicio),
    crearElemento("small", "dato-secundario", solicitud.duracion + (solicitud.duracion === 1 ? " día" : " días"))
  );

  agregarCelda(fila, solicitud.ubicacion);

  const detalles = (solicitud.conOperador ? "Con operador" : "Sin operador") +
    (solicitud.transporte ? ", con lowboy" : ", sin transporte");
  const celdaDetalles = agregarCelda(fila, detalles);
  if (solicitud.mensaje) {
    celdaDetalles.append(crearElemento("small", "dato-secundario", "“" + solicitud.mensaje + "”"));
  }

  // Select para cambiar el estado, coloreado según el estado actual
  const selectEstado = document.createElement("select");
  selectEstado.className = "selector-estado " + claseEstado(solicitud.estado);
  selectEstado.setAttribute("aria-label", "Estado de la solicitud de " + solicitud.nombre);
  ESTADOS.forEach((estado) => {
    const opcion = crearElemento("option", "", estado);
    opcion.value = estado;
    selectEstado.append(opcion);
  });
  selectEstado.value = solicitud.estado;
  selectEstado.addEventListener("change", () => cambiarEstado(solicitud, selectEstado));
  agregarCelda(fila, selectEstado);

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
  filtradas.forEach((solicitud) => {
    cuerpoSolicitudes.append(crearFilaSolicitud(solicitud));
  });
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

// Eventos de los filtros de solicitudes
buscarSolicitud.addEventListener("input", mostrarSolicitudes);
filtroEstado.addEventListener("change", mostrarSolicitudes);
formFiltrosSolicitudes.addEventListener("submit", (evento) => evento.preventDefault());

/* =========================================================
   EQUIPOS: LISTA
   ========================================================= */

// Cuántas solicitudes tiene un equipo (todas, o solo las activas)
function contarSolicitudesDeEquipo(idEquipo, soloActivas = false) {
  return solicitudes.filter((solicitud) => {
    const esDelEquipo = solicitud.equipoId === idEquipo;
    const estaActiva = solicitud.estado === "pendiente" || solicitud.estado === "en evaluación";
    return esDelEquipo && (!soloActivas || estaActiva);
  }).length;
}

// Llena las sugerencias de categoría con las categorías existentes
function llenarCategorias() {
  listaCategorias.textContent = "";
  const categorias = [...new Set(equipos.map((equipo) => equipo.categoria))].sort((a, b) => a.localeCompare(b, "es"));
  categorias.forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    listaCategorias.append(opcion);
  });
}

// Crea la fila <tr> de un equipo con sus botones Editar y Eliminar
function crearFilaEquipo(equipo) {
  const fila = document.createElement("tr");

  agregarCelda(fila, crearElemento("b", "", equipo.nombre));
  agregarCelda(fila, equipo.categoria);
  agregarCelda(fila, equipo.capacidad);
  agregarCelda(fila, crearElemento("span",
    "disponibilidad " + (equipo.disponible ? "disponible" : "no-disponible"),
    equipo.disponible ? "Sí" : "No"));
  agregarCelda(fila, String(contarSolicitudesDeEquipo(equipo.id)));

  const botonEditar = crearElemento("button", "boton-secundario boton-pequeno", "Editar");
  botonEditar.type = "button";
  botonEditar.setAttribute("aria-label", "Editar " + equipo.nombre);
  botonEditar.addEventListener("click", () => editarEquipo(equipo));

  const botonEliminar = crearElemento("button", "boton-peligro boton-pequeno", "Eliminar");
  botonEliminar.type = "button";
  botonEliminar.setAttribute("aria-label", "Eliminar " + equipo.nombre);
  botonEliminar.addEventListener("click", () => borrarEquipo(equipo, botonEliminar));

  const acciones = crearElemento("div", "acciones");
  acciones.append(botonEditar, botonEliminar);
  agregarCelda(fila, acciones);

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
  const ordenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  ordenados.forEach((equipo) => {
    cuerpoEquipos.append(crearFilaEquipo(equipo));
  });
}

/* =========================================================
   EQUIPOS: FORMULARIO (CREAR Y EDITAR)
   ========================================================= */

// Lee el formulario y arma el objeto del equipo
function leerFormEquipo() {
  const f = formEquipo;
  return {
    nombre: f.nombre.value.trim(),
    categoria: f.categoria.value.trim(),
    descripcion: f.descripcion.value.trim(),
    capacidad: f.capacidad.value.trim(),
    // Un uso por línea; se quitan espacios y líneas vacías
    usos: f.usos.value.split("\n").map((uso) => uso.trim()).filter((uso) => uso !== ""),
    imagen: f.imagen.value.trim(),
    disponible: f.disponible.checked
  };
}

// Valida el equipo. Devuelve null si está bien, o { campo, texto } con el primer error.
function validarEquipo(datos, idEditando) {
  const f = formEquipo;

  if (datos.nombre.length < 3 || datos.nombre.length > 60) {
    return { campo: f.nombre, texto: "El nombre debe tener entre 3 y 60 caracteres." };
  }
  // Regla del negocio: no puede haber dos equipos con el mismo nombre
  // (se compara sin mayúsculas ni tildes, y sin contar el equipo que se está editando)
  const repetido = equipos.some((equipo) =>
    equipo.id !== idEditando && normalizarTexto(equipo.nombre) === normalizarTexto(datos.nombre));
  if (repetido) {
    return { campo: f.nombre, texto: "Ya existe un equipo llamado “" + datos.nombre + "”." };
  }
  if (datos.categoria.length < 3 || datos.categoria.length > 40) {
    return { campo: f.categoria, texto: "La categoría debe tener entre 3 y 40 caracteres." };
  }
  if (datos.descripcion.length < 10 || datos.descripcion.length > 300) {
    return { campo: f.descripcion, texto: "La descripción debe tener entre 10 y 300 caracteres." };
  }
  if (datos.capacidad.length < 2 || datos.capacidad.length > 60) {
    return { campo: f.capacidad, texto: "La capacidad debe tener entre 2 y 60 caracteres." };
  }
  if (datos.usos.length === 0 || datos.usos.length > 8) {
    return { campo: f.usos, texto: "Escribe entre 1 y 8 usos, uno por línea." };
  }
  if (datos.usos.some((uso) => uso.length > 60)) {
    return { campo: f.usos, texto: "Cada uso puede tener como máximo 60 caracteres." };
  }
  if (datos.imagen !== "" && !/^(img\/[\w.-]+|https:\/\/\S+)$/.test(datos.imagen)) {
    return { campo: f.imagen, texto: "La imagen debe ser una ruta como img/equipo.jpg o una dirección https://" };
  }
  return null;
}

// Deja el formulario listo para agregar un equipo nuevo
function modoNuevo() {
  formEquipo.reset();
  campoIdEquipo.value = "";
  tituloFormEquipo.textContent = "Nuevo equipo";
  botonGuardarEquipo.textContent = "Agregar equipo";
  botonCancelarEdicion.hidden = true;
  formEquipo.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
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
  f.usos.value = (equipo.usos || []).join("\n");
  f.imagen.value = equipo.imagen || "";
  f.disponible.checked = equipo.disponible === true;

  tituloFormEquipo.textContent = "Editar equipo: " + equipo.nombre;
  botonGuardarEquipo.textContent = "Guardar cambios";
  botonCancelarEdicion.hidden = false;
  formEquipo.scrollIntoView({ behavior: "smooth", block: "start" });
  f.nombre.focus({ preventScroll: true });
}

botonCancelarEdicion.addEventListener("click", () => {
  modoNuevo();
  ocultarMensaje(mensajeFormEquipo);
});

// Guardar: crea un equipo nuevo o actualiza el que se está editando
formEquipo.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  formEquipo.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
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
      // Se reemplaza el equipo en el arreglo local
      equipos = equipos.map((equipo) => (equipo.id === idEditando ? { id: idEditando, ...datos } : equipo));
      mostrarMensaje(mensajeFormEquipo, "Se guardaron los cambios de “" + datos.nombre + "”.", "exito");
    } else {
      const idNuevo = await crearEquipo(datos);
      equipos.push({ id: idNuevo, ...datos });
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
});

/* =========================================================
   EQUIPOS: ELIMINAR
   ========================================================= */

async function borrarEquipo(equipo, boton) {
  // Regla del negocio: no se elimina un equipo con solicitudes pendientes o en evaluación
  const activas = contarSolicitudesDeEquipo(equipo.id, true);
  if (activas > 0) {
    mostrarMensaje(mensajeEquipos,
      "No se puede eliminar “" + equipo.nombre + "” porque tiene " + activas +
      (activas === 1 ? " solicitud activa" : " solicitudes activas") +
      ". Puedes editarlo y marcarlo como no disponible.", "error");
    return;
  }

  if (!confirm("¿Eliminar el equipo “" + equipo.nombre + "”? Esta acción no se puede deshacer.")) {
    return;
  }

  bloquearBoton(boton, "Eliminando...");
  try {
    await eliminarEquipo(equipo.id);
    equipos = equipos.filter((e) => e.id !== equipo.id);
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

async function iniciar() {
  const { usuario, rol } = await obtenerSesion();

  // Sin sesión: a login y luego de vuelta aquí
  if (!usuario) {
    window.location.href = "login.html?volver=admin.html";
    return;
  }
  // Con sesión pero sin rol de administrador
  if (rol !== "admin") {
    mostrarMensaje(mensajeAdmin, "No tienes permisos para ver esta página. Te llevamos a tu panel...", "error");
    setTimeout(() => {
      window.location.href = "panel.html";
    }, 2500);
    return;
  }

  saludo.textContent = "Hola, " + (usuario.displayName || usuario.email) + ". Gestiona las solicitudes de cotización y la flota de equipos.";
  contenido.hidden = false;
  await cargarDatos();
}

iniciar();
