// procesamiento.js
// Funciones de procesamiento de datos (cálculos, agrupaciones y orden).
// No usan Firebase ni el DOM: reciben arreglos y devuelven resultados.
// Las usan panel.js (cliente) y admin.js (administrador).

import { ESTADOS } from "./datos.js";

// Cuenta cuántas solicitudes hay en cada estado.
// Ejemplo: { total: 3, pendiente: 2, "en evaluación": 0, aprobada: 1, rechazada: 0 }
export function contarPorEstado(solicitudes) {
  const conteo = { total: solicitudes.length };
  ESTADOS.forEach((estado) => {
    conteo[estado] = 0;
  });
  solicitudes.forEach((solicitud) => {
    if (conteo[solicitud.estado] !== undefined) {
      conteo[solicitud.estado]++;
    }
  });
  return conteo;
}

// Agrupa las solicitudes por equipo y devuelve los más solicitados.
// Cada elemento: { nombre, solicitudes, unidades } (unidades = suma de "cantidad").
export function equiposMasSolicitados(solicitudes, limite = 5) {
  const grupos = {};

  solicitudes.forEach((solicitud) => {
    const clave = solicitud.equipoId || solicitud.equipoNombre;
    if (!grupos[clave]) {
      grupos[clave] = { nombre: solicitud.equipoNombre, solicitudes: 0, unidades: 0 };
    }
    grupos[clave].solicitudes++;
    grupos[clave].unidades += Number(solicitud.cantidad) || 0;
  });

  // Más solicitudes primero; si empatan, más unidades; luego por nombre
  return Object.values(grupos)
    .sort((a, b) =>
      b.solicitudes - a.solicitudes ||
      b.unidades - a.unidades ||
      a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, limite);
}

// Convierte creadoEn (Timestamp de Firestore) a milisegundos para poder comparar
function milisegundos(solicitud) {
  return solicitud.creadoEn && solicitud.creadoEn.toMillis ? solicitud.creadoEn.toMillis() : 0;
}

// Devuelve una copia de las solicitudes, de la más reciente a la más antigua
export function ordenarRecientesPrimero(solicitudes) {
  return [...solicitudes].sort((a, b) => milisegundos(b) - milisegundos(a));
}
