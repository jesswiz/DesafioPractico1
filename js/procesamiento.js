// procesamiento.js
// Funciones de procesamiento de datos (cálculos, agrupaciones y orden).
// No usan Firebase ni el DOM: reciben arreglos y devuelven resultados.
// Las usan panel.js (cliente) y admin.js (administrador).

import { ESTADOS } from "./datos.js";

// Cuenta cuántas solicitudes hay en cada estado.
// Ejemplo: { total: 3, pendiente: 2, "en evaluación": 0, aprobada: 1, rechazada: 0 }
export function contarPorEstado(solicitudes) {
  const conteo = {};
  conteo.total = solicitudes.length;

  // Todos los estados empiezan en 0
  for (const estado of ESTADOS) {
    conteo[estado] = 0;
  }

  // Se suma 1 al estado de cada solicitud
  for (const solicitud of solicitudes) {
    if (conteo[solicitud.estado] !== undefined) {
      conteo[solicitud.estado] = conteo[solicitud.estado] + 1;
    }
  }
  return conteo;
}

// Compara dos grupos para ordenarlos:
// más solicitudes primero; si empatan, más unidades; luego por nombre
function compararGrupos(a, b) {
  if (a.solicitudes !== b.solicitudes) {
    return b.solicitudes - a.solicitudes;
  }
  if (a.unidades !== b.unidades) {
    return b.unidades - a.unidades;
  }
  return a.nombre.localeCompare(b.nombre, "es");
}

// Agrupa las solicitudes por equipo y devuelve los más solicitados.
// Cada elemento: { clave, nombre, solicitudes, unidades } (unidades = suma de "cantidad").
export function equiposMasSolicitados(solicitudes, limite = 5) {
  const grupos = [];

  for (const solicitud of solicitudes) {
    // El equipo se identifica por su id (o por su nombre si no tiene id)
    let clave = solicitud.equipoId;
    if (!clave) {
      clave = solicitud.equipoNombre;
    }

    // Se busca si ya hay un grupo para ese equipo
    let grupo = null;
    for (const grupoExistente of grupos) {
      if (grupoExistente.clave === clave) {
        grupo = grupoExistente;
      }
    }

    // Si no hay, se crea uno nuevo
    if (grupo === null) {
      grupo = {};
      grupo.clave = clave;
      grupo.nombre = solicitud.equipoNombre;
      grupo.solicitudes = 0;
      grupo.unidades = 0;
      grupos.push(grupo);
    }

    grupo.solicitudes = grupo.solicitudes + 1;
    const cantidad = Number(solicitud.cantidad);
    if (cantidad) {
      grupo.unidades = grupo.unidades + cantidad;
    }
  }

  grupos.sort(compararGrupos);
  return grupos.slice(0, limite);
}

// Convierte creadoEn (fecha de Firestore) a milisegundos para poder comparar
function milisegundos(solicitud) {
  if (solicitud.creadoEn && solicitud.creadoEn.toMillis) {
    return solicitud.creadoEn.toMillis();
  }
  return 0;
}

// Compara dos solicitudes: la más reciente va primero
function compararPorFecha(a, b) {
  return milisegundos(b) - milisegundos(a);
}

// Devuelve una copia de las solicitudes, de la más reciente a la más antigua
export function ordenarRecientesPrimero(solicitudes) {
  const copia = solicitudes.slice();
  copia.sort(compararPorFecha);
  return copia;
}
