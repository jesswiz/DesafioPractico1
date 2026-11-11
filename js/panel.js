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
  const numeros = resumen.querySelectorAll("[data-estado]");
  for (const numero of numeros) {
    numero.textContent = conteo[numero.dataset.estado];
  }
}

// Agrega una fila "dato: valor" a una lista de definición <dl>
function agregarDato(listaDatos, etiqueta, valor) {
  listaDatos.append(crearElemento("dt", "", etiqueta));
  listaDatos.append(crearElemento("dd", "", valor));
}

// Crea la tarjeta de una solicitud
function crearTarjetaSolicitud(solicitud) {
  const tarjeta = crearElemento("article", "solicitud");

  const cabecera = crearElemento("div", "solicitud-cabecera");
  cabecera.append(crearElemento("h3", "", solicitud.equipoNombre));
  cabecera.append(crearElemento("span", "estado " + claseEstado(solicitud.estado), solicitud.estado));
  tarjeta.append(cabecera);

  // Textos que dependen de un valor
  let textoDuracion = solicitud.duracion + " días";
  if (solicitud.duracion === 1) {
    textoDuracion = "1 día";
  }
  let textoOperador = "Sin operador";
  if (solicitud.conOperador) {
    textoOperador = "Con operador";
  }
  let textoTransporte = "No";
  if (solicitud.transporte) {
    textoTransporte = "Con lowboy";
  }

  const datos = crearElemento("dl", "solicitud-datos");
  agregarDato(datos, "Cantidad", String(solicitud.cantidad));
  agregarDato(datos, "Inicio", formatearFecha(solicitud.inicio));
  agregarDato(datos, "Duración", textoDuracion);
  agregarDato(datos, "Ubicación", solicitud.ubicacion);
  agregarDato(datos, "Operador", textoOperador);
  agregarDato(datos, "Transporte", textoTransporte);
  agregarDato(datos, "Enviada", formatearMarcaTiempo(solicitud.creadoEn));
  tarjeta.append(datos);

  if (solicitud.mensaje) {
    tarjeta.append(crearElemento("p", "solicitud-mensaje", "“" + solicitud.mensaje + "”"));
  }

  // Regla del negocio: solo se pueden cancelar las solicitudes pendientes
  if (solicitud.estado === "pendiente") {
    const botonCancelar = crearElemento("button", "boton-peligro", "Cancelar solicitud");
    botonCancelar.type = "button";
    botonCancelar.addEventListener("click", function () {
      cancelar(solicitud, botonCancelar);
    });
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

  // Se dejan solo las del estado elegido ("" = todas)
  const estado = selectEstado.value;
  const delEstado = [];
  for (const solicitud of solicitudes) {
    if (estado === "" || solicitud.estado === estado) {
      delEstado.push(solicitud);
    }
  }
  const filtradas = ordenarRecientesPrimero(delEstado);

  if (filtradas.length === 0) {
    mostrarMensaje(mensaje, "No tienes solicitudes con el estado “" + estado + "”.", "info");
    return;
  }

  ocultarMensaje(mensaje);
  for (const solicitud of filtradas) {
    lista.append(crearTarjetaSolicitud(solicitud));
  }
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
    const restantes = [];
    for (const otra of solicitudes) {
      if (otra.id !== solicitud.id) {
        restantes.push(otra);
      }
    }
    solicitudes = restantes;
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
  const sesion = await obtenerSesion();

  // Página protegida: sin sesión se va a login y luego regresa aquí
  if (!sesion.usuario) {
    window.location.href = "login.html?volver=panel.html";
    return;
  }
  // El administrador tiene su propio panel
  if (sesion.rol === "admin") {
    window.location.href = "admin.html";
    return;
  }

  let nombreVisible = sesion.usuario.email;
  if (sesion.nombre) {
    nombreVisible = sesion.nombre;
  }
  saludo.textContent = "Hola, " + nombreVisible + ". Revisa el estado de tus solicitudes de cotización.";
  mostrarMensaje(mensaje, "Cargando tus solicitudes...", "carga");

  try {
    solicitudes = await obtenerSolicitudesDeUsuario(sesion.usuario.uid);
    mostrarResumen();
    mostrarSolicitudes();
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensaje, "No se pudieron cargar tus solicitudes. Revisa tu conexión y recarga la página.", "error");
  }
}

// Eventos del filtro
function evitarRecarga(evento) {
  evento.preventDefault();
}
selectEstado.addEventListener("change", mostrarSolicitudes);
formFiltros.addEventListener("submit", evitarRecarga);

iniciar();
