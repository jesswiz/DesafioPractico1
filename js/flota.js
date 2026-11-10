// flota.js
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

// Llena el select de categorías con las categorías que existen en los datos
function llenarCategorias() {
  // Set elimina las categorías repetidas
  const categorias = [...new Set(equipos.map((equipo) => equipo.categoria))];
  categorias.sort((a, b) => a.localeCompare(b, "es"));

  categorias.forEach((categoria) => {
    const opcion = crearElemento("option", "", categoria);
    opcion.value = categoria;
    selectCategoria.append(opcion);
  });
}

/* ---------- PROCESAMIENTO: FILTRAR Y ORDENAR ---------- */

// Devuelve solo los equipos que cumplen con la búsqueda y los filtros
function filtrarEquipos() {
  const texto = normalizarTexto(campoBuscar.value.trim());
  const categoria = selectCategoria.value;
  const soloDisponibles = casillaDisponibles.checked;

  return equipos.filter((equipo) => {
    // Se busca en el nombre, la descripción y los usos del equipo
    const usos = (equipo.usos || []).join(" ");
    const textoEquipo = normalizarTexto(equipo.nombre + " " + equipo.descripcion + " " + usos);

    const coincideTexto = textoEquipo.includes(texto);
    const coincideCategoria = categoria === "" || equipo.categoria === categoria;
    const coincideDisponible = !soloDisponibles || equipo.disponible === true;

    return coincideTexto && coincideCategoria && coincideDisponible;
  });
}

// Devuelve una copia ordenada de la lista según la opción elegida
function ordenarEquipos(listaEquipos) {
  const copia = [...listaEquipos];
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

  if (selectOrden.value === "nombre-desc") {
    copia.sort((a, b) => porNombre(b, a));
  } else if (selectOrden.value === "categoria") {
    // Primero por categoría y, dentro de cada una, por nombre
    copia.sort((a, b) => a.categoria.localeCompare(b.categoria, "es") || porNombre(a, b));
  } else if (selectOrden.value === "disponibles") {
    // true se pone antes que false; con el mismo valor, por nombre
    copia.sort((a, b) => Number(b.disponible) - Number(a.disponible) || porNombre(a, b));
  } else {
    copia.sort(porNombre);
  }
  return copia;
}

/* ---------- DOM: TARJETAS ---------- */

// Crea la tarjeta <article> de un equipo
function crearTarjeta(equipo) {
  const tarjeta = crearElemento("article", "tarjeta");

  const imagen = document.createElement("img");
  imagen.src = equipo.imagen || IMAGEN_POR_DEFECTO;
  imagen.alt = "Ilustración de " + equipo.nombre;
  imagen.width = 800;
  imagen.height = 500;
  imagen.loading = "lazy";
  // Si la imagen no existe, se cambia por la imagen por defecto (una sola vez)
  imagen.addEventListener("error", () => {
    imagen.src = IMAGEN_POR_DEFECTO;
  }, { once: true });

  const texto = crearElemento("div", "tarjeta-texto");
  texto.append(crearElemento("span", "etiqueta-categoria", equipo.categoria));
  texto.append(crearElemento("h3", "", equipo.nombre));
  texto.append(crearElemento("p", "", equipo.descripcion));

  const capacidad = crearElemento("p");
  capacidad.append(crearElemento("b", "", "Capacidad referencial: "), equipo.capacidad);
  texto.append(capacidad);

  // Lista de usos
  if (equipo.usos && equipo.usos.length > 0) {
    const listaUsos = crearElemento("ul");
    equipo.usos.forEach((uso) => {
      listaUsos.append(crearElemento("li", "", uso));
    });
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

  tarjeta.append(imagen, texto);
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
  resultado.forEach((equipo) => {
    lista.append(crearTarjeta(equipo));
  });
}

/* ---------- EVENTOS ---------- */

// Se actualiza la lista mientras se escribe o se cambia un filtro
campoBuscar.addEventListener("input", mostrarEquipos);
selectCategoria.addEventListener("change", mostrarEquipos);
selectOrden.addEventListener("change", mostrarEquipos);
casillaDisponibles.addEventListener("change", mostrarEquipos);

// Enter en el buscador no debe recargar la página
formFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
});

// Devuelve los filtros a sus valores iniciales
botonLimpiar.addEventListener("click", () => {
  formFiltros.reset();
  mostrarEquipos();
});

cargarEquipos();
