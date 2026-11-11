// datos.js
// Todas las operaciones con Cloud Firestore (crear, leer, actualizar y eliminar).
// Las páginas no usan Firestore directamente: llaman a estas funciones.

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Estados posibles de una solicitud, en el orden en que avanzan
export const ESTADOS = ["pendiente", "en evaluación", "aprobada", "rechazada"];

// Convierte el resultado de una consulta en un arreglo de objetos con su id
function convertirDocumentos(resultado) {
  const lista = [];
  for (const documento of resultado.docs) {
    const datos = documento.data();
    datos.id = documento.id;
    lista.push(datos);
  }
  return lista;
}

/* ---------- USUARIOS ---------- */

// Crea el documento usuarios/{uid}. El rol siempre es "cliente".
export async function crearUsuario(uid, nombre, correo) {
  const datosUsuario = {};
  datosUsuario.nombre = nombre;
  datosUsuario.correo = correo;
  datosUsuario.rol = "cliente";
  datosUsuario.creadoEn = serverTimestamp();
  await setDoc(doc(db, "usuarios", uid), datosUsuario);
}

// Devuelve los datos del usuario o null si no existe
export async function obtenerUsuario(uid) {
  const documento = await getDoc(doc(db, "usuarios", uid));
  if (!documento.exists()) {
    return null;
  }
  const datos = documento.data();
  datos.id = documento.id;
  return datos;
}

/* ---------- EQUIPOS ---------- */

// Lee todos los equipos de la colección
export async function obtenerEquipos() {
  const resultado = await getDocs(collection(db, "equipos"));
  return convertirDocumentos(resultado);
}

// Lee un equipo por su id (o null si no existe)
export async function obtenerEquipo(id) {
  const documento = await getDoc(doc(db, "equipos", id));
  if (!documento.exists()) {
    return null;
  }
  const datos = documento.data();
  datos.id = documento.id;
  return datos;
}

// Crea un equipo nuevo y devuelve su id
export async function crearEquipo(equipo) {
  const referencia = await addDoc(collection(db, "equipos"), equipo);
  return referencia.id;
}

// Cambia los datos de un equipo existente
export async function actualizarEquipo(id, cambios) {
  await updateDoc(doc(db, "equipos", id), cambios);
}

// Elimina un equipo
export async function eliminarEquipo(id) {
  await deleteDoc(doc(db, "equipos", id));
}

/* ---------- SOLICITUDES ---------- */

// Crea una solicitud de cotización. El estado inicial es "pendiente"
// y la fecha de creación la pone el servidor.
export async function crearSolicitud(solicitud) {
  solicitud.estado = "pendiente";
  solicitud.creadoEn = serverTimestamp();
  const referencia = await addDoc(collection(db, "solicitudes"), solicitud);
  return referencia.id;
}

// Solicitudes de un solo cliente (las reglas solo permiten leer las propias)
export async function obtenerSolicitudesDeUsuario(uid) {
  const consulta = query(collection(db, "solicitudes"), where("uid", "==", uid));
  const resultado = await getDocs(consulta);
  return convertirDocumentos(resultado);
}

// Todas las solicitudes (solo el administrador puede leerlas)
export async function obtenerTodasLasSolicitudes() {
  const resultado = await getDocs(collection(db, "solicitudes"));
  return convertirDocumentos(resultado);
}

// El administrador cambia el estado de una solicitud
export async function actualizarEstadoSolicitud(id, estado) {
  if (!ESTADOS.includes(estado)) {
    throw new Error("Estado no válido: " + estado);
  }
  const cambios = {};
  cambios.estado = estado;
  await updateDoc(doc(db, "solicitudes", id), cambios);
}

// El cliente cancela una solicitud pendiente: se elimina el documento
export async function cancelarSolicitud(id) {
  await deleteDoc(doc(db, "solicitudes", id));
}

/* ---------- DATOS INICIALES ---------- */

// Guarda en Firestore los equipos y las solicitudes de ejemplo (ver semilla.js).
// - Cada equipo trae su propio id (por ejemplo "excavadora") para que las
//   solicitudes puedan apuntar a él con equipoId.
// - creadoEn llega como texto "AAAA-MM-DDTHH:MM" y se convierte a fecha (Date);
//   Firestore la guarda como fecha y hora.
// Se guarda un documento a la vez con for y await. Si la conexión falla a
// mitad de camino, lo que ya se guardó se queda en la base.
export async function guardarDatosIniciales(equipos, solicitudes) {
  for (const equipo of equipos) {
    // Se copian los campos uno por uno (el id va en la ruta, no como campo)
    const datosEquipo = {};
    datosEquipo.nombre = equipo.nombre;
    datosEquipo.categoria = equipo.categoria;
    datosEquipo.descripcion = equipo.descripcion;
    datosEquipo.capacidad = equipo.capacidad;
    datosEquipo.usos = equipo.usos;
    datosEquipo.imagen = equipo.imagen;
    datosEquipo.disponible = equipo.disponible;
    await setDoc(doc(db, "equipos", equipo.id), datosEquipo);
  }

  for (const solicitud of solicitudes) {
    const datosSolicitud = {};
    datosSolicitud.uid = solicitud.uid;
    datosSolicitud.nombre = solicitud.nombre;
    datosSolicitud.empresa = solicitud.empresa;
    datosSolicitud.correo = solicitud.correo;
    datosSolicitud.telefono = solicitud.telefono;
    datosSolicitud.equipoId = solicitud.equipoId;
    datosSolicitud.equipoNombre = solicitud.equipoNombre;
    datosSolicitud.cantidad = solicitud.cantidad;
    datosSolicitud.inicio = solicitud.inicio;
    datosSolicitud.duracion = solicitud.duracion;
    datosSolicitud.ubicacion = solicitud.ubicacion;
    datosSolicitud.conOperador = solicitud.conOperador;
    datosSolicitud.transporte = solicitud.transporte;
    datosSolicitud.mensaje = solicitud.mensaje;
    datosSolicitud.estado = solicitud.estado;
    datosSolicitud.creadoEn = new Date(solicitud.creadoEn);
    await addDoc(collection(db, "solicitudes"), datosSolicitud);
  }
}
