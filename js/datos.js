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
  serverTimestamp,
  writeBatch,
  Timestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Estados posibles de una solicitud, en el orden en que avanzan
export const ESTADOS = ["pendiente", "en evaluación", "aprobada", "rechazada"];

// Convierte el resultado de una consulta en un arreglo de objetos con su id
function convertirDocumentos(resultado) {
  const lista = [];
  resultado.forEach((documento) => {
    lista.push({ id: documento.id, ...documento.data() });
  });
  return lista;
}

/* ---------- USUARIOS ---------- */

// Crea el documento usuarios/{uid}. El rol siempre es "cliente".
export async function crearUsuario(uid, nombre, correo) {
  await setDoc(doc(db, "usuarios", uid), {
    nombre: nombre,
    correo: correo,
    rol: "cliente",
    creadoEn: serverTimestamp()
  });
}

// Devuelve los datos del usuario o null si no existe
export async function obtenerUsuario(uid) {
  const documento = await getDoc(doc(db, "usuarios", uid));
  if (!documento.exists()) {
    return null;
  }
  return { id: documento.id, ...documento.data() };
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
  return { id: documento.id, ...documento.data() };
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
  const referencia = await addDoc(collection(db, "solicitudes"), {
    ...solicitud,
    estado: "pendiente",
    creadoEn: serverTimestamp()
  });
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
  await updateDoc(doc(db, "solicitudes", id), { estado: estado });
}

// El cliente cancela una solicitud pendiente: se elimina el documento
export async function cancelarSolicitud(id) {
  await deleteDoc(doc(db, "solicitudes", id));
}

/* ---------- DATOS INICIALES ---------- */

// Guarda en un solo lote los equipos y las solicitudes de ejemplo (ver semilla.js).
// - Cada equipo trae su propio id (por ejemplo "excavadora") para que las
//   solicitudes puedan apuntar a él con equipoId.
// - creadoEn llega como texto "AAAA-MM-DDTHH:MM" y se convierte a Timestamp.
// Un lote (writeBatch) es "todo o nada": si una escritura falla, no se guarda ninguna.
export async function guardarDatosIniciales(equipos, solicitudes) {
  const lote = writeBatch(db);

  equipos.forEach((equipo) => {
    const { id, ...datosEquipo } = equipo; // separa el id del resto de los datos
    lote.set(doc(db, "equipos", id), datosEquipo);
  });

  solicitudes.forEach((solicitud) => {
    const referencia = doc(collection(db, "solicitudes")); // id automático
    lote.set(referencia, {
      ...solicitud,
      creadoEn: Timestamp.fromDate(new Date(solicitud.creadoEn))
    });
  });

  await lote.commit();
}
