// Formulario de solicitud de cotización (contacto.html).
// - Llena el select con los equipos disponibles de Firestore.
// - Solo permite enviar con sesión iniciada como cliente.
// - Valida los datos y guarda la solicitud en la colección "solicitudes".

import { obtenerSesion } from "./auth.js";
import { obtenerEquipos, crearSolicitud } from "./datos.js";
import {
  mostrarMensaje, ocultarMensaje, crearElemento, bloquearBoton, desbloquearBoton, fechaHoy,
  esCorreoValido, soloContiene, LETRAS_Y_ESPACIOS
} from "./ui.js";

// Elementos de la página
const formulario = document.querySelector("#form-solicitud");
const avisoSesion = document.querySelector("#aviso-sesion");
const selectEquipo = document.querySelector("#equipo");
const campoInicio = document.querySelector("#inicio");
const mensaje = document.querySelector("#mensaje-solicitud");
const botonEnviar = formulario.querySelector('button[type="submit"]');

// Caracteres permitidos en el nombre (letras, espacios y punto) y en el teléfono
const CARACTERES_NOMBRE = LETRAS_Y_ESPACIOS + ".";
const DIGITOS = "0123456789";

let usuarioActual = null;   // usuario con sesión (o null)
let equiposDisponibles = []; // equipos que se pueden solicitar

//ACTIVAR O DESACTIVAR EL FORMULARIO

// Desactiva o activa todos los campos del formulario y el botón
function activarFormulario(activo) {
  const grupos = formulario.querySelectorAll("fieldset");
  for (const grupo of grupos) {
    grupo.disabled = !activo;
  }
  botonEnviar.disabled = !activo;
}

//CARGA DE EQUIPOS EN EL SELECT 

// Devuelve true si el equipo está disponible
function estaDisponible(equipo) {
  return equipo.disponible === true;
}

// Compara dos equipos por nombre
function compararPorNombre(a, b) {
  return a.nombre.localeCompare(b.nombre, "es");
}

// Busca un equipo disponible por su id. Devuelve el equipo o null.
function buscarEquipoDisponible(idEquipo) {
  for (const equipo of equiposDisponibles) {
    if (equipo.id === idEquipo) {
      return equipo;
    }
  }
  return null;
}

async function cargarEquipos() {
  selectEquipo.disabled = true;
  try {
    const equipos = await obtenerEquipos();
    // Solo se pueden solicitar los equipos disponibles, ordenados por nombre
    equiposDisponibles = equipos.filter(estaDisponible);
    equiposDisponibles.sort(compararPorNombre);

    selectEquipo.textContent = "";
    let textoInicial = "No hay equipos disponibles";
    if (equiposDisponibles.length > 0) {
      textoInicial = "Selecciona un equipo";
    }
    const opcionInicial = crearElemento("option", "", textoInicial);
    opcionInicial.value = "";
    selectEquipo.append(opcionInicial);

    for (const equipo of equiposDisponibles) {
      const opcion = crearElemento("option", "", equipo.nombre);
      opcion.value = equipo.id;
      selectEquipo.append(opcion);
    }

    preseleccionarEquipo();
  } catch (error) {
    console.error(error);
    selectEquipo.textContent = "";
    selectEquipo.append(crearElemento("option", "", "No se pudieron cargar los equipos"));
    mostrarMensaje(mensaje, "No se pudo cargar la lista de equipos. Recarga la página para intentarlo de nuevo.", "error");
  } finally {
    selectEquipo.disabled = false;
  }
}

// Si se llegó desde "Cotizar este equipo" (contacto.html?equipo=ID), se selecciona ese equipo
function preseleccionarEquipo() {
  const idEquipo = new URLSearchParams(window.location.search).get("equipo");
  if (!idEquipo) {
    return;
  }
  if (buscarEquipoDisponible(idEquipo) !== null) {
    selectEquipo.value = idEquipo;
  } else {
    mostrarMensaje(mensaje, "El equipo que elegiste ya no está disponible. Selecciona otro de la lista.", "info");
  }
}

//VALIDACIÓN

// Arma el objeto de error: el campo con problema y el texto que se muestra
function crearError(campo, texto) {
  const error = {};
  error.campo = campo;
  error.texto = texto;
  return error;
}

// Revisa los datos del formulario.
// Devuelve null si todo está bien, o un error { campo, texto } con el primer problema.
function validarSolicitud(datos) {
  const f = formulario;

  if (datos.nombre.length < 3 || datos.nombre.length > 60 || !soloContiene(datos.nombre, CARACTERES_NOMBRE)) {
    return crearError(f.nombre, "Escribe tu nombre completo (3 a 60 letras).");
  }
  if (datos.empresa.length < 2 || datos.empresa.length > 80) {
    return crearError(f.empresa, "Escribe el nombre de tu empresa (2 a 80 caracteres).");
  }
  if (!esCorreoValido(datos.correo)) {
    return crearError(f.correo, "Escribe un correo válido.");
  }
  if (datos.telefono.length !== 8 || !soloContiene(datos.telefono, DIGITOS)) {
    return crearError(f.telefono, "El teléfono debe tener 8 dígitos, sin guiones.");
  }
  if (buscarEquipoDisponible(datos.equipoId) === null) {
    return crearError(f.equipo, "Selecciona un equipo de la lista.");
  }
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 20) {
    return crearError(f.cantidad, "La cantidad debe ser un número entero entre 1 y 20.");
  }
  if (!datos.inicio) {
    return crearError(f.inicio, "Selecciona la fecha de inicio.");
  }
  // Las fechas "AAAA-MM-DD" se pueden comparar como texto
  if (datos.inicio < fechaHoy()) {
    return crearError(f.inicio, "La fecha de inicio no puede ser una fecha pasada.");
  }
  if (!Number.isInteger(datos.duracion) || datos.duracion < 1 || datos.duracion > 365) {
    return crearError(f.duracion, "La duración debe ser un número entero entre 1 y 365 días.");
  }
  if (datos.ubicacion.length < 5 || datos.ubicacion.length > 150) {
    return crearError(f.ubicacion, "Escribe la ubicación de la obra (5 a 150 caracteres).");
  }
  if (f.operador.value === "") {
    return crearError(f.querySelector("#con-op"), "Indica si necesitas operador.");
  }
  if (f.transporte.value === "") {
    return crearError(f.querySelector("#tr-si"), "Indica si requieres transporte con lowboy.");
  }
  if (datos.mensaje.length > 500) {
    return crearError(f.mensaje, "El mensaje puede tener como máximo 500 caracteres.");
  }
  if (!f.acepto.checked) {
    return crearError(f.acepto, "Debes aceptar el tratamiento de tus datos para enviar la solicitud.");
  }
  return null;
}

// Lee los campos del formulario y arma el objeto de la solicitud
function leerFormulario() {
  const f = formulario;
  const equipo = buscarEquipoDisponible(f.equipo.value);

  const solicitud = {};
  solicitud.uid = usuarioActual.uid;
  solicitud.nombre = f.nombre.value.trim();
  solicitud.empresa = f.empresa.value.trim();
  solicitud.correo = f.correo.value.trim();
  solicitud.telefono = f.telefono.value.trim();
  solicitud.equipoId = f.equipo.value;
  solicitud.equipoNombre = "";
  if (equipo !== null) {
    solicitud.equipoNombre = equipo.nombre;
  }
  solicitud.cantidad = Number(f.cantidad.value);
  solicitud.inicio = f.inicio.value;
  solicitud.duracion = Number(f.duracion.value);
  solicitud.ubicacion = f.ubicacion.value.trim();
  solicitud.conOperador = f.operador.value === "con";
  solicitud.transporte = f.transporte.value === "si";
  solicitud.mensaje = f.mensaje.value.trim();
  return solicitud;
}

// Quita la marca de error de todos los campos
function limpiarErrores() {
  const camposConError = formulario.querySelectorAll("[aria-invalid]");
  for (const campo of camposConError) {
    campo.removeAttribute("aria-invalid");
  }
}

// ENVÍO

async function enviarSolicitud(evento) {
  evento.preventDefault();
  limpiarErrores();
  ocultarMensaje(mensaje);

  if (!usuarioActual) {
    mostrarMensaje(mensaje, "Debes iniciar sesión para enviar una solicitud.", "error");
    return;
  }

  const datos = leerFormulario();
  const error = validarSolicitud(datos);
  if (error) {
    error.campo.setAttribute("aria-invalid", "true");
    error.campo.focus();
    mostrarMensaje(mensaje, error.texto, "error");
    return;
  }

  bloquearBoton(botonEnviar, "Enviando...");
  mostrarMensaje(mensaje, "Enviando tu solicitud...", "carga");

  try {
    await crearSolicitud(datos);
    mostrarMensaje(mensaje, "¡Solicitud enviada! Te responderemos en menos de 24 horas.", "exito");
    // Enlace para ver la solicitud en el panel
    const enlacePanel = crearElemento("a", "enlace", "Ver mis solicitudes");
    enlacePanel.href = "panel.html";
    mensaje.append(" ");
    mensaje.append(enlacePanel);

    // Limpia el formulario, pero conserva los datos de contacto
    formulario.equipo.value = "";
    formulario.cantidad.value = "";
    formulario.inicio.value = "";
    formulario.duracion.value = "";
    formulario.ubicacion.value = "";
    formulario.mensaje.value = "";
    formulario.acepto.checked = false;
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensaje, "No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.", "error");
  } finally {
    desbloquearBoton(botonEnviar);
  }
}

formulario.addEventListener("submit", enviarSolicitud);

// AL ABRIR LA PÁGINA 

async function iniciar() {
  // El calendario no deja elegir fechas anteriores a hoy
  campoInicio.min = fechaHoy();

  // Mientras se revisa la sesión, el formulario queda desactivado
  activarFormulario(false);

  const sesion = await obtenerSesion();

  if (!sesion.usuario) {
    // Sin sesión: se muestra el aviso con el enlace a login.html
    avisoSesion.hidden = false;
  } else if (sesion.rol === "admin") {
    mostrarMensaje(mensaje, "Estás como administrador. Las solicitudes las crean los clientes; gestiónalas desde tu panel.", "info");
  } else {
    usuarioActual = sesion.usuario;
    activarFormulario(true);
    // Se llenan nombre y correo con los datos de la cuenta (se pueden cambiar)
    if (sesion.nombre && formulario.nombre.value === "") {
      formulario.nombre.value = sesion.nombre;
    }
    if (formulario.correo.value === "") {
      formulario.correo.value = sesion.usuario.email;
    }
  }

  await cargarEquipos();
}

iniciar();
