// Catálogo dinámico de flota.html: lee la colección "equipos" de Firestore
// y genera las tarjetas. Permite buscar, filtrar por categoría, ordenar
// y mostrar solo los equipos disponibles.

import { obtenerEquipos } from "./datos.js";
import { mostrarMensaje, ocultarMensaje, crearElemento, normalizarTexto } from "./ui.js";

// Elementos de la página
const formFiltros = document.querySelector("#filtros");
const campoBuscar = document.querySelector("#buscar");
const selectCategoria = document.querySelector("#filtro-categoria");
const selectOrden = document.querySelector("#orden");
const casillaDisponibles = document.querySelector("#solo-disponibles");
const botonLimpiar = document.querySelector("#limpiar-filtros");
const mensaje = document.querySelector("#mensaje-flota");
const contador = document.querySelector("#contador-flota");
const lista = document.querySelector("#lista-equipos");

// Imagen que se usa si el equipo no tiene una o si no carga
const IMAGEN_POR_DEFECTO = "img/banner-flota.jpg";

// Todos los equipos leídos de Firestore. Se leen una sola vez;
// los filtros trabajan sobre este arreglo sin volver a consultar la base.
let equipos = [];

/* ---------- CARGA DE DATOS ---------- */

async function cargarEquipos() {
  mostrarMensaje(mensaje, "Cargando equipos...", "carga");
  try {
    equipos = await obtenerEquipos();
    llenarCategorias();
    mostrarEquipos();
  } catch (error) {
    console.error(error);
    contador.textContent = "";
    mostrarMensaje(mensaje, "No se pudieron cargar los equipos. Revisa tu conexión y recarga la página.", "error");
  }
}

// Compara dos textos en orden alfabético (en español)
function compararTextos(a, b) {
  return a.localeCompare(b, "es");
}

// Llena el select de categorías con las categorías que existen en los datos
function llenarCategorias() {
  // Se arma una lista sin categorías repetidas
  const categorias = [];
  for (const equipo of equipos) {
    if (!categorias.includes(equipo.categoria)) {
      categorias.push(equipo.categoria);
    }
  }
  categorias.sort(compararTextos);

  for (const categoria of categorias) {
    const opcion = crearElemento("option", "", categoria);
    opcion.value = categoria;
    selectCategoria.append(opcion);
  }
}

/* ---------- PROCESAMIENTO: FILTRAR Y ORDENAR ---------- */

// Devuelve true si el equipo cumple con la búsqueda y los filtros
function cumpleFiltros(equipo) {
  const texto = normalizarTexto(campoBuscar.value.trim());
  const categoria = selectCategoria.value;
  const soloDisponibles = casillaDisponibles.checked;

  // Se busca en el nombre, la descripción y los usos del equipo
  let usos = "";
  if (equipo.usos) {
    usos = equipo.usos.join(" ");
  }
  const textoEquipo = normalizarTexto(equipo.nombre + " " + equipo.descripcion + " " + usos);

  const coincideTexto = textoEquipo.includes(texto);
  const coincideCategoria = categoria === "" || equipo.categoria === categoria;
  const coincideDisponible = !soloDisponibles || equipo.disponible === true;

  return coincideTexto && coincideCategoria && coincideDisponible;
}

// Devuelve solo los equipos que cumplen con la búsqueda y los filtros
function filtrarEquipos() {
  return equipos.filter(cumpleFiltros);
}

// Funciones para ordenar (cada una compara dos equipos)
function compararPorNombre(a, b) {
  return a.nombre.localeCompare(b.nombre, "es");
}

function compararPorNombreInverso(a, b) {
  return b.nombre.localeCompare(a.nombre, "es");
}

// Primero por categoría y, dentro de cada una, por nombre
function compararPorCategoria(a, b) {
  const resultado = a.categoria.localeCompare(b.categoria, "es");
  if (resultado !== 0) {
    return resultado;
  }
  return compararPorNombre(a, b);
}

// Los disponibles van antes; con la misma disponibilidad, por nombre
function compararDisponiblesPrimero(a, b) {
  if (a.disponible === b.disponible) {
    return compararPorNombre(a, b);
  }
  if (a.disponible) {
    return -1;
  }
  return 1;
}

// Devuelve una copia ordenada de la lista según la opción elegida
function ordenarEquipos(listaEquipos) {
  const copia = listaEquipos.slice();

  if (selectOrden.value === "nombre-desc") {
    copia.sort(compararPorNombreInverso);
  } else if (selectOrden.value === "categoria") {
    copia.sort(compararPorCategoria);
  } else if (selectOrden.value === "disponibles") {
    copia.sort(compararDisponiblesPrimero);
  } else {
    copia.sort(compararPorNombre);
  }
  return copia;
}

/* ---------- DOM: TARJETAS ---------- */

// Crea la tarjeta <article> de un equipo
function crearTarjeta(equipo) {
  const tarjeta = crearElemento("article", "tarjeta");

  const imagen = document.createElement("img");
  if (equipo.imagen) {
    imagen.src = equipo.imagen;
  } else {
    imagen.src = IMAGEN_POR_DEFECTO;
  }
  imagen.alt = "Ilustración de " + equipo.nombre;
  imagen.width = 800;
  imagen.height = 500;
  imagen.loading = "lazy";
  // Si la imagen no existe, se cambia por la imagen por defecto.
  // onerror se borra antes para que no se repita si esa también fallara.
  imagen.onerror = function () {
    imagen.onerror = null;
    imagen.src = IMAGEN_POR_DEFECTO;
  };

  const texto = crearElemento("div", "tarjeta-texto");
  texto.append(crearElemento("span", "etiqueta-categoria", equipo.categoria));
  texto.append(crearElemento("h3", "", equipo.nombre));
  texto.append(crearElemento("p", "", equipo.descripcion));

  const capacidad = crearElemento("p");
  capacidad.append(crearElemento("b", "", "Capacidad referencial: "));
  capacidad.append(equipo.capacidad);
  texto.append(capacidad);

  // Lista de usos
  if (equipo.usos && equipo.usos.length > 0) {
    const listaUsos = crearElemento("ul");
    for (const uso of equipo.usos) {
      listaUsos.append(crearElemento("li", "", uso));
    }
    texto.append(listaUsos);
  }

  // Disponibilidad: si está disponible se puede cotizar
  if (equipo.disponible) {
    texto.append(crearElemento("p", "disponibilidad disponible", "Disponible"));
    const enlace = crearElemento("a", "enlace", "Cotizar este equipo");
    // El id del equipo viaja en la URL para seleccionarlo en el formulario
    enlace.href = "contacto.html?equipo=" + encodeURIComponent(equipo.id);
    texto.append(enlace);
  } else {
    texto.append(crearElemento("p", "disponibilidad no-disponible", "No disponible por ahora"));
  }

  tarjeta.append(imagen);
  tarjeta.append(texto);
  return tarjeta;
}

// Aplica filtros y orden, y dibuja las tarjetas (o el mensaje que corresponda)
function mostrarEquipos() {
  lista.textContent = "";

  // La base todavía no tiene equipos
  if (equipos.length === 0) {
    contador.textContent = "";
    mostrarMensaje(mensaje, "Todavía no hay equipos en el catálogo.", "info");
    return;
  }

  const resultado = ordenarEquipos(filtrarEquipos());
  contador.textContent = "Mostrando " + resultado.length + " de " + equipos.length + " equipos";

  // Hay equipos, pero ninguno coincide con los filtros
  if (resultado.length === 0) {
    mostrarMensaje(mensaje, "No hay equipos que coincidan con tu búsqueda. Prueba con otros filtros.", "info");
    return;
  }

  ocultarMensaje(mensaje);
  for (const equipo of resultado) {
    lista.append(crearTarjeta(equipo));
  }
}

/* ---------- EVENTOS ---------- */

// Se actualiza la lista mientras se escribe o se cambia un filtro
campoBuscar.addEventListener("input", mostrarEquipos);
selectCategoria.addEventListener("change", mostrarEquipos);
selectOrden.addEventListener("change", mostrarEquipos);
casillaDisponibles.addEventListener("change", mostrarEquipos);

// Enter en el buscador no debe recargar la página
function evitarRecarga(evento) {
  evento.preventDefault();
}
formFiltros.addEventListener("submit", evitarRecarga);

// Devuelve los filtros a sus valores iniciales
function limpiarFiltros() {
  formFiltros.reset();
  mostrarEquipos();
}
botonLimpiar.addEventListener("click", limpiarFiltros);

cargarEquipos();
