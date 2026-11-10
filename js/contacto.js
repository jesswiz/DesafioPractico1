// contacto.js
// Formulario de solicitud de cotización (contacto.html).
// - Llena el select con los equipos disponibles de Firestore.
// - Solo permite enviar con sesión iniciada como cliente.
// - Valida los datos y guarda la solicitud en la colección "solicitudes".

import { obtenerSesion } from "./auth.js";
import { obtenerEquipos, crearSolicitud } from "./datos.js";
import { mostrarMensaje, ocultarMensaje, crearElemento, bloquearBoton, desbloquearBoton, fechaHoy } from "./ui.js";

// Elementos de la página
const formulario = document.querySelector("#form-solicitud");
const avisoSesion = document.querySelector("#aviso-sesion");
const selectEquipo = document.querySelector("#equipo");
const campoInicio = document.querySelector("#inicio");
const mensaje = document.querySelector("#mensaje-solicitud");
const botonEnviar = formulario.querySelector('button[type="submit"]');

// Reglas de validación
const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const patronNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.]+$/;
const patronTelefono = /^[0-9]{8}$/;

let usuarioActual = null;   // usuario con sesión (o null)
let equiposDisponibles = []; // equipos que se pueden solicitar

/* ---------- ACTIVAR O DESACTIVAR EL FORMULARIO ---------- */

// Desactiva o activa todos los campos del formulario y el botón
function activarFormulario(activo) {
  formulario.querySelectorAll("fieldset").forEach((grupo) => {
    grupo.disabled = !activo;
  });
  botonEnviar.disabled = !activo;
}

/* ---------- CARGA DE EQUIPOS EN EL SELECT ---------- */

async function cargarEquipos() {
  selectEquipo.disabled = true;
  try {
    const equipos = await obtenerEquipos();
    // Solo se pueden solicitar los equipos disponibles, ordenados por nombre
    equiposDisponibles = equipos
      .filter((equipo) => equipo.disponible === true)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    selectEquipo.textContent = "";
    const opcionInicial = crearElemento("option", "", equiposDisponibles.length > 0 ? "Selecciona un equipo" : "No hay equipos disponibles");
    opcionInicial.value = "";
    selectEquipo.append(opcionInicial);

    equiposDisponibles.forEach((equipo) => {
      const opcion = crearElemento("option", "", equipo.nombre);
      opcion.value = equipo.id;
      selectEquipo.append(opcion);
    });

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
  const existe = equiposDisponibles.some((equipo) => equipo.id === idEquipo);
  if (existe) {
    selectEquipo.value = idEquipo;
  } else {
    mostrarMensaje(mensaje, "El equipo que elegiste ya no está disponible. Selecciona otro de la lista.", "info");
  }
}

/* ---------- VALIDACIÓN ---------- */

// Revisa los datos del formulario.
// Devuelve null si todo está bien, o { campo, texto } con el primer error.
function validarSolicitud(datos) {
  const f = formulario;

  if (datos.nombre.length < 3 || datos.nombre.length > 60 || !patronNombre.test(datos.nombre)) {
    return { campo: f.nombre, texto: "Escribe tu nombre completo (3 a 60 letras)." };
  }
  if (datos.empresa.length < 2 || datos.empresa.length > 80) {
    return { campo: f.empresa, texto: "Escribe el nombre de tu empresa (2 a 80 caracteres)." };
  }
  if (!patronCorreo.test(datos.correo)) {
    return { campo: f.correo, texto: "Escribe un correo válido." };
  }
  if (!patronTelefono.test(datos.telefono)) {
    return { campo: f.telefono, texto: "El teléfono debe tener 8 dígitos, sin guiones." };
  }
  if (!equiposDisponibles.some((equipo) => equipo.id === datos.equipoId)) {
    return { campo: f.equipo, texto: "Selecciona un equipo de la lista." };
  }
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 20) {
    return { campo: f.cantidad, texto: "La cantidad debe ser un número entero entre 1 y 20." };
  }
  if (!datos.inicio) {
    return { campo: f.inicio, texto: "Selecciona la fecha de inicio." };
  }
  // Las fechas "AAAA-MM-DD" se pueden comparar como texto
  if (datos.inicio < fechaHoy()) {
    return { campo: f.inicio, texto: "La fecha de inicio no puede ser una fecha pasada." };
  }
  if (!Number.isInteger(datos.duracion) || datos.duracion < 1 || datos.duracion > 365) {
    return { campo: f.duracion, texto: "La duración debe ser un número entero entre 1 y 365 días." };
  }
  if (datos.ubicacion.length < 5 || datos.ubicacion.length > 150) {
    return { campo: f.ubicacion, texto: "Escribe la ubicación de la obra (5 a 150 caracteres)." };
  }
  if (f.operador.value === "") {
    return { campo: f.querySelector("#con-op"), texto: "Indica si necesitas operador." };
  }
  if (f.transporte.value === "") {
    return { campo: f.querySelector("#tr-si"), texto: "Indica si requieres transporte con lowboy." };
  }
  if (datos.mensaje.length > 500) {
    return { campo: f.mensaje, texto: "El mensaje puede tener como máximo 500 caracteres." };
  }
  if (!f.acepto.checked) {
    return { campo: f.acepto, texto: "Debes aceptar el tratamiento de tus datos para enviar la solicitud." };
  }
  return null;
}

// Lee los campos del formulario y arma el objeto de la solicitud
function leerFormulario() {
  const f = formulario;
  const equipo = equiposDisponibles.find((e) => e.id === f.equipo.value);
  return {
    uid: usuarioActual.uid,
    nombre: f.nombre.value.trim(),
    empresa: f.empresa.value.trim(),
    correo: f.correo.value.trim(),
    telefono: f.telefono.value.trim(),
    equipoId: f.equipo.value,
    equipoNombre: equipo ? equipo.nombre : "",
    cantidad: Number(f.cantidad.value),
    inicio: f.inicio.value,
    duracion: Number(f.duracion.value),
    ubicacion: f.ubicacion.value.trim(),
    conOperador: f.operador.value === "con",
    transporte: f.transporte.value === "si",
    mensaje: f.mensaje.value.trim()
  };
}

// Quita la marca de error de todos los campos
function limpiarErrores() {
  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => {
    campo.removeAttribute("aria-invalid");
  });
}

/* ---------- ENVÍO ---------- */

formulario.addEventListener("submit", async (evento) => {
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
    mensaje.append(" ", enlacePanel);

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
});

/* ---------- AL ABRIR LA PÁGINA ---------- */

async function iniciar() {
  // El calendario no deja elegir fechas anteriores a hoy
  campoInicio.min = fechaHoy();

  // Mientras se revisa la sesión, el formulario queda desactivado
  activarFormulario(false);

  const { usuario, rol } = await obtenerSesion();

  if (!usuario) {
    // Sin sesión: se muestra el aviso con el enlace a login.html
    avisoSesion.hidden = false;
  } else if (rol === "admin") {
    mostrarMensaje(mensaje, "Estás como administrador. Las solicitudes las crean los clientes; gestiónalas desde tu panel.", "info");
  } else {
    usuarioActual = usuario;
    activarFormulario(true);
    // Se llenan nombre y correo con los datos de la cuenta (se pueden cambiar)
    if (usuario.displayName && formulario.nombre.value === "") {
      formulario.nombre.value = usuario.displayName;
    }
    if (formulario.correo.value === "") {
      formulario.correo.value = usuario.email;
    }
  }

  await cargarEquipos();
}

iniciar();
