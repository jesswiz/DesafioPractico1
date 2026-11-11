// auth.js
// Registro, ingreso, salida y consulta del rol del usuario.

import { auth } from "./firebase-config.js";
import { crearUsuario, obtenerUsuario } from "./datos.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// Registra un usuario nuevo y crea su documento en "usuarios" con rol "cliente".
// El nombre se guarda en ese documento.
export async function registrarUsuario(nombre, correo, contrasena) {
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
  const usuario = credencial.user;
  // Guarda el documento usuarios/{uid}.
  // Se usa usuario.email (como lo guardó Firebase) porque las reglas exigen
  // que coincida exactamente con el correo de la sesión.
  await crearUsuario(usuario.uid, nombre, usuario.email);
  return usuario;
}

// Inicia sesión con correo y contraseña
export async function iniciarSesion(correo, contrasena) {
  const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
  return credencial.user;
}

// Cierra la sesión actual
export async function cerrarSesion() {
  await signOut(auth);
}

// Devuelve el rol del usuario ("cliente" o "admin"). Si no hay documento, es "cliente".
export async function obtenerRol(uid) {
  const datos = await obtenerUsuario(uid);
  if (datos && datos.rol) {
    return datos.rol;
  }
  return "cliente";
}

// Espera a que Firebase sepa si hay sesión y devuelve un objeto "sesion" con:
//   sesion.usuario -> el usuario de Firebase (null si no hay sesión)
//   sesion.rol     -> "cliente" o "admin" (null si no hay sesión)
//   sesion.nombre  -> el nombre guardado en usuarios/{uid} ("" si no se encontró)
export function obtenerSesion() {
  return new Promise(function (resolver) {
    // onAuthStateChanged avisa cuando Firebase termina de revisar la sesión
    const dejarDeEscuchar = onAuthStateChanged(auth, async function (usuario) {
      dejarDeEscuchar(); // solo nos interesa la primera respuesta

      const sesion = {};
      sesion.usuario = null;
      sesion.rol = null;
      sesion.nombre = "";

      if (!usuario) {
        resolver(sesion);
        return;
      }

      sesion.usuario = usuario;
      sesion.rol = "cliente";
      try {
        // El rol y el nombre están en el documento usuarios/{uid}
        const datos = await obtenerUsuario(usuario.uid);
        if (datos && datos.rol) {
          sesion.rol = datos.rol;
        }
        if (datos && datos.nombre) {
          sesion.nombre = datos.nombre;
        }
      } catch (error) {
        console.error("No se pudo leer el rol:", error);
      }
      resolver(sesion);
    });
  });
}

// Traduce los códigos de error de Firebase Authentication a mensajes en español
export function mensajeErrorAuth(error) {
  const mensajes = {
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet."
  };
  const texto = mensajes[error.code];
  if (texto) {
    return texto;
  }
  return "Ocurrió un error. Inténtalo de nuevo.";
}
