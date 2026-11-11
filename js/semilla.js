// semilla.js
// Datos iniciales para probar la aplicación: los 9 equipos de la flota
// y 8 solicitudes de ejemplo con distintos estados.
// El administrador los carga con el botón "Cargar datos iniciales" (admin.html)
// cuando la base está vacía.

import { obtenerEquipos, guardarDatosIniciales } from "./datos.js";

// Los 9 equipos que estaban escritos en flota.html.
// El id es fijo y legible para que las solicitudes de ejemplo puedan usarlo.
export const EQUIPOS_INICIALES = [
  {
    id: "lowboy",
    nombre: "Lowboy (cama baja)",
    categoria: "Transporte",
    descripcion: "Camión de transporte de carga pesada y sobredimensionada, con plataforma baja para subir y bajar maquinaria con seguridad.",
    capacidad: "40 a 60 toneladas",
    usos: ["Traslado de bulldozers", "Movimiento de excavadoras", "Cambio de maquinaria entre obras"],
    imagen: "img/lowboy.jpg",
    disponible: true
  },
  {
    id: "camion-cisterna",
    nombre: "Camión cisterna",
    categoria: "Transporte",
    descripcion: "Transporte y distribución de agua directamente en la obra, con tanque de gran volumen y salida controlada.",
    capacidad: "2,000 a 4,000 galones",
    usos: ["Control de polvo", "Compactación de suelos", "Abastecimiento en obra"],
    imagen: "img/camion-cisterna.jpeg",
    disponible: true
  },
  {
    id: "camion-volteo",
    nombre: "Camión volteo",
    categoria: "Transporte",
    descripcion: "Transporte de material a granel con caja basculante que descarga en el punto indicado.",
    capacidad: "12 a 14 m³",
    usos: ["Acarreo de tierra y arena", "Transporte de grava", "Retiro de escombro"],
    imagen: "img/camion-volteo.jpg",
    disponible: true
  },
  {
    id: "bulldozer",
    nombre: "Bulldozer (tractor de orugas)",
    categoria: "Movimiento de tierra",
    descripcion: "Empuje y nivelación de terreno con hoja frontal; avanza con firmeza en suelos difíciles.",
    capacidad: "Aprox. 20 toneladas",
    usos: ["Movimiento de tierras", "Apertura de caminos", "Limpieza de terreno"],
    imagen: "img/bulldozer.jpg",
    disponible: true
  },
  {
    id: "excavadora",
    nombre: "Excavadora",
    categoria: "Movimiento de tierra",
    descripcion: "Excavación y carga con brazo hidráulico y cucharón, sobre orugas para mayor estabilidad.",
    capacidad: "Aprox. 20 toneladas",
    usos: ["Zanjas", "Cimentaciones", "Carga de camiones"],
    imagen: "img/excavadora.jpg",
    disponible: true
  },
  {
    id: "retroexcavadora",
    nombre: "Retroexcavadora",
    categoria: "Movimiento de tierra",
    descripcion: "Equipo versátil con cucharón frontal y trasero, ideal para espacios reducidos.",
    capacidad: "Cucharón frontal y trasero",
    usos: ["Zanjas", "Drenajes", "Trabajos urbanos"],
    imagen: "img/retroexcavadora.jpg",
    disponible: true
  },
  {
    id: "montacargas",
    nombre: "Montacargas (elevador de carga)",
    categoria: "Manejo de carga",
    descripcion: "Levantamiento y movimiento de materiales paletizados con horquillas.",
    capacidad: "3 a 5 toneladas",
    usos: ["Bodegas", "Patios de obra", "Descarga de camiones"],
    imagen: "img/montacargas.jpeg",
    disponible: false
  },
  {
    id: "motoniveladora",
    nombre: "Motoniveladora",
    categoria: "Nivelación y compactación",
    descripcion: "Nivelación fina de superficies con cuchilla central ajustable.",
    capacidad: "Cuchilla de 3.6 m",
    usos: ["Caminos", "Terracerías", "Preparación de plataformas"],
    imagen: "img/motoniveladora.jpg",
    disponible: false
  },
  {
    id: "rodillo-compactador",
    nombre: "Rodillo compactador",
    categoria: "Nivelación y compactación",
    descripcion: "Compactación de suelos y asfalto con tambor metálico vibratorio.",
    capacidad: "Aprox. 10 toneladas",
    usos: ["Bases de carreteras", "Parqueos", "Plataformas"],
    imagen: "img/rodillo-compactador.jpg",
    disponible: true
  }
];

// 8 solicitudes de ejemplo con distintos estados.
// Son de clientes ficticios (uid "demo-..."), por eso solo las ve el administrador.
// equipoNombre no se escribe aquí: se toma de EQUIPOS_INICIALES al cargar.
export const SOLICITUDES_EJEMPLO = [
  {
    uid: "demo-cliente-1",
    nombre: "Andrea Martínez",
    empresa: "Constructora Volcán",
    correo: "andrea.martinez@ejemplo.com",
    telefono: "71234567",
    equipoId: "excavadora",
    cantidad: 2,
    inicio: "2026-11-20",
    duracion: 30,
    ubicacion: "Santa Tecla, La Libertad",
    conOperador: true,
    transporte: true,
    mensaje: "Excavación para cimentaciones de un edificio de 4 niveles.",
    estado: "pendiente",
    creadoEn: "2026-11-08T09:15"
  },
  {
    uid: "demo-cliente-2",
    nombre: "Roberto Hernández",
    empresa: "Urbanizadora Los Pinos",
    correo: "roberto.hernandez@ejemplo.com",
    telefono: "78889900",
    equipoId: "camion-volteo",
    cantidad: 3,
    inicio: "2026-11-25",
    duracion: 15,
    ubicacion: "Soyapango, San Salvador",
    conOperador: true,
    transporte: false,
    mensaje: "Acarreo de tierra para relleno de lotes.",
    estado: "pendiente",
    creadoEn: "2026-11-09T14:40"
  },
  {
    uid: "demo-cliente-3",
    nombre: "Karla Pineda",
    empresa: "Obras Viales del Pacífico",
    correo: "karla.pineda@ejemplo.com",
    telefono: "60011223",
    equipoId: "rodillo-compactador",
    cantidad: 1,
    inicio: "2026-12-01",
    duracion: 10,
    ubicacion: "La Libertad, La Libertad",
    conOperador: true,
    transporte: true,
    mensaje: "Compactación de base para tramo de carretera de 2 km.",
    estado: "pendiente",
    creadoEn: "2026-11-10T08:05"
  },
  {
    uid: "demo-cliente-1",
    nombre: "Andrea Martínez",
    empresa: "Constructora Volcán",
    correo: "andrea.martinez@ejemplo.com",
    telefono: "71234567",
    equipoId: "lowboy",
    cantidad: 1,
    inicio: "2026-11-18",
    duracion: 2,
    ubicacion: "Santa Tecla, La Libertad",
    conOperador: true,
    transporte: false,
    mensaje: "Traslado de excavadora entre dos obras.",
    estado: "en evaluación",
    creadoEn: "2026-11-05T10:30"
  },
  {
    uid: "demo-cliente-4",
    nombre: "Luis Alfaro",
    empresa: "Grupo Constructor Alfaro",
    correo: "luis.alfaro@ejemplo.com",
    telefono: "75556677",
    equipoId: "excavadora",
    cantidad: 1,
    inicio: "2026-11-16",
    duracion: 45,
    ubicacion: "San Miguel, San Miguel",
    conOperador: true,
    transporte: true,
    mensaje: "Zanjas para tubería de agua potable.",
    estado: "en evaluación",
    creadoEn: "2026-11-03T16:20"
  },
  {
    uid: "demo-cliente-2",
    nombre: "Roberto Hernández",
    empresa: "Urbanizadora Los Pinos",
    correo: "roberto.hernandez@ejemplo.com",
    telefono: "78889900",
    equipoId: "bulldozer",
    cantidad: 1,
    inicio: "2026-10-20",
    duracion: 20,
    ubicacion: "Soyapango, San Salvador",
    conOperador: true,
    transporte: true,
    mensaje: "Limpieza y nivelación de terreno para lotificación.",
    estado: "aprobada",
    creadoEn: "2026-10-10T11:00"
  },
  {
    uid: "demo-cliente-5",
    nombre: "Sofía Ramírez",
    empresa: "Inversiones Ramírez",
    correo: "sofia.ramirez@ejemplo.com",
    telefono: "61112233",
    equipoId: "camion-volteo",
    cantidad: 2,
    inicio: "2026-10-28",
    duracion: 7,
    ubicacion: "Antiguo Cuscatlán, La Libertad",
    conOperador: true,
    transporte: false,
    mensaje: "Retiro de escombro de una demolición.",
    estado: "aprobada",
    creadoEn: "2026-10-18T09:45"
  },
  {
    uid: "demo-cliente-4",
    nombre: "Luis Alfaro",
    empresa: "Grupo Constructor Alfaro",
    correo: "luis.alfaro@ejemplo.com",
    telefono: "75556677",
    equipoId: "excavadora",
    cantidad: 4,
    inicio: "2026-10-15",
    duracion: 90,
    ubicacion: "Usulután, Usulután",
    conOperador: false,
    transporte: true,
    mensaje: "Se necesitan sin operador para un proyecto largo.",
    estado: "rechazada",
    creadoEn: "2026-10-01T15:10"
  }
];

// Busca en EQUIPOS_INICIALES el nombre del equipo que tiene ese id
function buscarNombreEquipo(idEquipo) {
  for (const equipo of EQUIPOS_INICIALES) {
    if (equipo.id === idEquipo) {
      return equipo.nombre;
    }
  }
  return "";
}

// Carga los datos iniciales en Firestore. Solo funciona si la colección
// "equipos" está vacía, para no duplicar datos. Devuelve cuántos se guardaron.
export async function cargarDatosIniciales() {
  const equiposActuales = await obtenerEquipos();
  if (equiposActuales.length > 0) {
    throw new Error("La base ya tiene equipos; no se cargaron los datos iniciales.");
  }

  // Completa equipoNombre de cada solicitud a partir de su equipoId
  for (const solicitud of SOLICITUDES_EJEMPLO) {
    solicitud.equipoNombre = buscarNombreEquipo(solicitud.equipoId);
  }

  await guardarDatosIniciales(EQUIPOS_INICIALES, SOLICITUDES_EJEMPLO);

  const resultado = {};
  resultado.equipos = EQUIPOS_INICIALES.length;
  resultado.solicitudes = SOLICITUDES_EJEMPLO.length;
  return resultado;
}
