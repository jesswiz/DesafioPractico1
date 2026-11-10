// ui.js
// Ayudas para el DOM: mensajes, creación de elementos, botones y formatos.
// No usa Firebase; solo trabaja con la página.

// Muestra un mensaje dentro de un contenedor.
// tipo: "info", "exito", "error" o "carga"
export function mostrarMensaje(contenedor, texto, tipo = "info") {
  contenedor.textContent = texto;
  contenedor.className = "mensaje mensaje-" + tipo;
  contenedor.hidden = false;
}

// Oculta y vacía el mensaje
export function ocultarMensaje(contenedor) {
  contenedor.textContent = "";
  contenedor.hidden = true;
}

// Crea un elemento con clase y texto opcionales.
// Se usa textContent (no innerHTML) para que el texto de la base no se interprete como HTML.
export function crearElemento(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) {
    elemento.className = clase;
  }
  if (texto) {
    elemento.textContent = texto;
  }
  return elemento;
}

// Desactiva un botón mientras se espera una operación y cambia su texto
export function bloquearBoton(boton, textoEspera = "Procesando...") {
  boton.dataset.textoOriginal = boton.textContent;
  boton.textContent = textoEspera;
  boton.disabled = true;
}

// Devuelve el botón a su estado normal
export function desbloquearBoton(boton) {
  if (boton.dataset.textoOriginal) {
    boton.textContent = boton.dataset.textoOriginal;
  }
  boton.disabled = false;
}

// Convierte "en evaluación" en "estado-en-evaluacion" para usarlo como clase CSS
export function claseEstado(estado) {
  const sinTildes = estado.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return "estado-" + sinTildes.replace(/\s+/g, "-");
}

// Formatea una fecha "AAAA-MM-DD" como "DD/MM/AAAA"
export function formatearFecha(textoFecha) {
  if (!textoFecha) {
    return "";
  }
  const [anio, mes, dia] = textoFecha.split("-");
  return dia + "/" + mes + "/" + anio;
}

// Formatea un Timestamp de Firestore (como creadoEn) a fecha y hora local
export function formatearMarcaTiempo(marca) {
  if (!marca || !marca.toDate) {
    return "";
  }
  return marca.toDate().toLocaleString("es-SV");
}

// Devuelve la fecha de hoy como "AAAA-MM-DD" (hora local), útil para inputs de tipo date
export function fechaHoy() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return hoy.getFullYear() + "-" + mes + "-" + dia;
}
