// login.js
// Comportamiento de login.html: formularios de ingreso y de registro.

import { iniciarSesion, registrarUsuario, obtenerRol, obtenerSesion, mensajeErrorAuth } from "./auth.js";
import {
  mostrarMensaje, ocultarMensaje, bloquearBoton, desbloquearBoton,
  esCorreoValido, soloContiene, tieneLetra, tieneNumero, LETRAS_Y_ESPACIOS
} from "./ui.js";

// Elementos de la página
const formIngreso = document.querySelector("#form-ingreso");
const mensajeIngreso = document.querySelector("#mensaje-ingreso");
const formRegistro = document.querySelector("#form-registro");
const mensajeRegistro = document.querySelector("#mensaje-registro");

// Páginas a las que se puede volver después de entrar (?volver=...)
const PAGINAS_PERMITIDAS = ["index.html", "flota.html", "nosotros.html", "contacto.html", "panel.html", "admin.html"];

// Decide a qué página ir después de entrar.
// Si la URL trae ?volver=contacto.html, regresa allí; si no, va al panel según el rol.
function paginaDestino(rol) {
  const parametros = new URLSearchParams(window.location.search);
  const volver = parametros.get("volver");
  // Solo se aceptan páginas propias del sitio
  if (volver && PAGINAS_PERMITIDAS.includes(volver)) {
    return volver;
  }
  if (rol === "admin") {
    return "admin.html";
  }
  return "panel.html";
}

// Marca un campo como inválido, le pone el foco y muestra el mensaje
function marcarError(campo, contenedor, texto) {
  campo.setAttribute("aria-invalid", "true");
  campo.focus();
  mostrarMensaje(contenedor, texto, "error");
}

// Quita la marca de error de todos los campos de un formulario
function limpiarErrores(formulario) {
  const camposConError = formulario.querySelectorAll("[aria-invalid]");
  for (const campo of camposConError) {
    campo.removeAttribute("aria-invalid");
  }
}

/* ---------- INGRESO ---------- */

async function ingresar(evento) {
  evento.preventDefault(); // evita que la página se recargue
  limpiarErrores(formIngreso);
  ocultarMensaje(mensajeIngreso);

  const campoCorreo = formIngreso.correo;
  const campoContrasena = formIngreso.contrasena;
  const correo = campoCorreo.value.trim();
  const contrasena = campoContrasena.value;

  // Validaciones
  if (!esCorreoValido(correo)) {
    marcarError(campoCorreo, mensajeIngreso, "Escribe un correo válido.");
    return;
  }
  if (contrasena.length < 6) {
    marcarError(campoContrasena, mensajeIngreso, "La contraseña tiene al menos 6 caracteres.");
    return;
  }

  const boton = formIngreso.querySelector("button");
  bloquearBoton(boton, "Ingresando...");
  mostrarMensaje(mensajeIngreso, "Verificando tus datos...", "carga");

  try {
    const usuario = await iniciarSesion(correo, contrasena);
    const rol = await obtenerRol(usuario.uid);
    mostrarMensaje(mensajeIngreso, "¡Bienvenido! Te estamos redirigiendo...", "exito");
    window.location.href = paginaDestino(rol);
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensajeIngreso, mensajeErrorAuth(error), "error");
    desbloquearBoton(boton);
  }
}

formIngreso.addEventListener("submit", ingresar);

/* ---------- REGISTRO ---------- */

async function registrarse(evento) {
  evento.preventDefault();
  limpiarErrores(formRegistro);
  ocultarMensaje(mensajeRegistro);

  const campoNombre = formRegistro.nombre;
  const campoCorreo = formRegistro.correo;
  const campoContrasena = formRegistro.contrasena;
  const campoConfirmacion = formRegistro.confirmacion;

  const nombre = campoNombre.value.trim();
  const correo = campoCorreo.value.trim();
  const contrasena = campoContrasena.value;
  const confirmacion = campoConfirmacion.value;

  // Validaciones
  if (nombre.length < 3 || nombre.length > 60) {
    marcarError(campoNombre, mensajeRegistro, "El nombre debe tener entre 3 y 60 caracteres.");
    return;
  }
  if (!soloContiene(nombre, LETRAS_Y_ESPACIOS)) {
    marcarError(campoNombre, mensajeRegistro, "El nombre solo puede tener letras y espacios.");
    return;
  }
  if (!esCorreoValido(correo)) {
    marcarError(campoCorreo, mensajeRegistro, "Escribe un correo válido.");
    return;
  }
  if (contrasena.length < 6 || !tieneLetra(contrasena) || !tieneNumero(contrasena)) {
    marcarError(campoContrasena, mensajeRegistro, "La contraseña necesita mínimo 6 caracteres, una letra y un número.");
    return;
  }
  if (contrasena !== confirmacion) {
    marcarError(campoConfirmacion, mensajeRegistro, "Las contraseñas no coinciden.");
    return;
  }

  const boton = formRegistro.querySelector("button");
  bloquearBoton(boton, "Creando cuenta...");
  mostrarMensaje(mensajeRegistro, "Creando tu cuenta...", "carga");

  try {
    // Crea la cuenta y el documento usuarios/{uid} con rol "cliente"
    await registrarUsuario(nombre, correo, contrasena);
    mostrarMensaje(mensajeRegistro, "¡Cuenta creada! Te estamos redirigiendo...", "exito");
    window.location.href = paginaDestino("cliente");
  } catch (error) {
    console.error(error);
    mostrarMensaje(mensajeRegistro, mensajeErrorAuth(error), "error");
    desbloquearBoton(boton);
  }
}

formRegistro.addEventListener("submit", registrarse);

/* ---------- AL ABRIR LA PÁGINA ---------- */

// Si ya hay una sesión iniciada, no tiene sentido mostrar los formularios
async function revisarSesionActual() {
  const sesion = await obtenerSesion();
  if (sesion.usuario) {
    window.location.href = paginaDestino(sesion.rol);
  }
}

revisarSesionActual();
