// panel.js
// Panel del cliente (panel.html): muestra sus solicitudes, un resumen por
// estado, un filtro por estado y permite cancelar las que siguen pendientes.

import { obtenerSesion } from "./auth.js";
import { obtenerSolicitudesDeUsuario, cancelarSolicitud } from "./datos.js";
import { contarPorEstado, ordenarRecientesPrimero } from "./procesamiento.js";
import {
  mostrarMensaje, ocultarMensaje, crearElemento, claseEstado,
  formatearFecha, formatearMarcaTiempo
} from "./ui.js";

// Elementos de la página
const saludo = document.querySelector("#saludo");
const resumen = document.querySelector("#resumen");
const selectEstado = document.querySelector("#filtro-estado");
const formFiltros = document.querySelector("#filtros-panel");
const mensaje = document.querySelector("#mensaje-panel");
const lista = document.querySelector("#lista-solicitudes");

// Solicitudes del cliente leídas de Firestore
let solicitudes = [];

/* ---------- DOM ---------- */

// Escribe los números del resumen
function mostrarResumen() {
  const conteo = contarPorEstado(solicitudes);
  resumen.querySelectorAll("[data-estado]").forEach((numero) => {
    numero.textContent = conteo[numero.dataset.estado];
  });
}

// Agrega una fila "dato: valor" a una lista de definición <dl>
function agregarDato(listaDatos, etiqueta, valor) {
  listaDatos.append(crearElemento("dt", "", etiqueta), crearElemento("dd", "", valor));
}

// Crea la tarjeta de una solicitud
function crearTarjetaSolicitud(solicitud) {
  const tarjeta = crearElemento("article", "solicitud");

  const cabecera = crearElemento("div", "solicitud-cabecera");
  cabecera.append(crearElemento("h3", "", solicitud.equipoNombre));
  cabecera.append(crearElemento("span", "estado " + claseEstado(solicitud.estado), solicitud.estado));
  tarjeta.append(cabecera);

  const datos = crearElemento("dl", "solicitud-datos");
  agregarDato(datos, "Cantidad", String(solicitud.cantidad));
  agregarDato(datos, "Inicio", formatearFecha(solicitud.inicio));
  agregarDato(datos, "Duración", solicitud.duracion + (solicitud.duracion === 1 ? " día" : " días"));
  agregarDato(datos, "Ubicación", solicitud.ubicacion);
  agregarDato(datos, "Operador", solicitud.conOperador ? "Con operador" : "Sin operador");
  agregarDato(datos, "Transporte", solicitud.transporte ? "Con lowboy" : "No");
  agregarDato(datos, "Enviada", formatearMarcaTiempo(solicitud.creadoEn));
  tarjeta.append(datos);

  if (solicitud.mensaje) {
    tarjeta.append(crearElemento("p", "solicitud-mensaje", "“" + solicitud.mensaje + "”"));
  }

  // Regla del negocio: solo se pueden cancelar las solicitudes pendientes
  if (solicitud.estado === "pendiente") {
    const botonCancelar = crearElemento("button", "boton-peligro", "Cancelar solicitud");
    botonCancelar.type = "button";
    botonCancelar.addEventListener("click", () => cancelar(solicitud, botonCancelar));
    tarjeta.append(botonCancelar);
  }

  return tarjeta;
}

// Dibuja la lista según el filtro de estado (las más recientes primero)
function mostrarSolicitudes() {
  lista.textContent = "";

  if (solicitudes.length === 0) {
    mostrarMensaje(mensaje, "Aún no tienes solicitudes. Usa el botón “Nueva solicitud” para pedir tu primera cotización.", "info");
    return;
  }

  const estado = selectEstado.value;
  const filtradas = ordenarRecientesPrimero(
    solicitudes.filter((solicitud) => estado === "" || solicitud.estado === estado)
  );

  if (filtradas.length === 0) {
    mostrarMensaje(mensaje, "No tienes solicitudes con el estado “" + estado + "”.", "info");
    return;
  }

  ocultarMensaje(mensaje);
  filtradas.forEach((solicitud) => {
    lista.append(crearTarjetaSolicitud(solicitud));
  });
}

/* ---------- ACCIONES ---------- */

async function cancelar(solicitud, boton) {
  const confirmado = confirm("¿Seguro que quieres cancelar la solicitud de " + solicitud.equipoNombre + "? Esta acción no se puede deshacer.");
  if (!confirmado) {
    return;
  }

  boton.disabled = true;
  boton.textContent = "Cancelando...";
  try {
    await cancelarSolicitud(solicitud.id);
    // Se quita del arreglo y se vuelve a dibujar todo
    solicitudes = solicitudes.filter((s) => s.id !== solicitud.id);
    mostrarResumen();
    mostrarSolicitudes();
    mostrarMensaje(mensaje, "La solicitud fue cancelada.", "exito");
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensaje, "No se pudo cancelar. Puede que ya no esté pendiente; recarga la página.", "error");
    boton.disabled = false;
    boton.textContent = "Cancelar solicitud";
  }
}

/* ---------- AL ABRIR LA PÁGINA ---------- */

async function iniciar() {
  const { usuario, rol } = await obtenerSesion();

  // Página protegida: sin sesión se va a login y luego regresa aquí
  if (!usuario) {
    window.location.href = "login.html?volver=panel.html";
    return;
  }
  // El administrador tiene su propio panel
  if (rol === "admin") {
    window.location.href = "admin.html";
    return;
  }

  saludo.textContent = "Hola, " + (usuario.displayName || usuario.email) + ". Revisa el estado de tus solicitudes de cotización.";
  mostrarMensaje(mensaje, "Cargando tus solicitudes...", "carga");

  try {
    solicitudes = await obtenerSolicitudesDeUsuario(usuario.uid);
    mostrarResumen();
    mostrarSolicitudes();
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensaje, "No se pudieron cargar tus solicitudes. Revisa tu conexión y recarga la página.", "error");
  }
}

// Eventos del filtro
selectEstado.addEventListener("change", mostrarSolicitudes);
formFiltros.addEventListener("submit", (evento) => evento.preventDefault());

iniciar();
