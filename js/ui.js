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
  const sinTildes = normalizarTexto(estado);
  const conGuiones = sinTildes.split(" ").join("-");
  return "estado-" + conGuiones;
}

// Letras con tilde y la letra que las reemplaza (se usa en normalizarTexto)
const SIN_TILDES = {
  "á": "a",
  "é": "e",
  "í": "i",
  "ó": "o",
  "ú": "u",
  "ü": "u",
  "ñ": "n"
};

// Pasa un texto a minúsculas y sin tildes para comparar en búsquedas.
// Así "Camión" y "camion" se consideran iguales.
export function normalizarTexto(texto) {
  if (!texto) {
    return "";
  }
  const minusculas = String(texto).toLowerCase();
  let resultado = "";
  // Se revisa letra por letra: si tiene tilde se cambia, si no se deja igual
  for (const letra of minusculas) {
    if (SIN_TILDES[letra]) {
      resultado = resultado + SIN_TILDES[letra];
    } else {
      resultado = resultado + letra;
    }
  }
  return resultado;
}

// Formatea una fecha "AAAA-MM-DD" como "DD/MM/AAAA"
export function formatearFecha(textoFecha) {
  if (!textoFecha) {
    return "";
  }
  const partes = textoFecha.split("-");
  const anio = partes[0];
  const mes = partes[1];
  const dia = partes[2];
  return dia + "/" + mes + "/" + anio;
}

// Formatea la fecha de Firestore (como creadoEn) a fecha y hora local
export function formatearMarcaTiempo(marca) {
  if (!marca || !marca.toDate) {
    return "";
  }
  return marca.toDate().toLocaleString("es-SV");
}

// Devuelve la fecha de hoy como "AAAA-MM-DD" (hora local), útil para inputs de tipo date
export function fechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const dia = hoy.getDate();

  // El mes y el día deben tener dos dígitos: 5 -> "05"
  let textoMes = String(mes);
  if (mes < 10) {
    textoMes = "0" + mes;
  }
  let textoDia = String(dia);
  if (dia < 10) {
    textoDia = "0" + dia;
  }

  return anio + "-" + textoMes + "-" + textoDia;
}

/* ---------- VALIDACIONES SENCILLAS ---------- */

// Letras que se aceptan en un nombre (con tildes, ñ, ü) y el espacio
export const LETRAS_Y_ESPACIOS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑüÜ ";

// Devuelve true si cada carácter del texto está dentro de "permitidos"
export function soloContiene(texto, permitidos) {
  for (const letra of texto) {
    if (!permitidos.includes(letra)) {
      return false;
    }
  }
  return true;
}

// Devuelve true si el texto tiene al menos una letra de la "a" a la "z" (mayúscula o minúscula)
export function tieneLetra(texto) {
  for (const letra of texto) {
    if (letra >= "a" && letra <= "z") {
      return true;
    }
    if (letra >= "A" && letra <= "Z") {
      return true;
    }
  }
  return false;
}

// Devuelve true si el texto tiene al menos un número del 0 al 9
export function tieneNumero(texto) {
  for (const letra of texto) {
    if (letra >= "0" && letra <= "9") {
      return true;
    }
  }
  return false;
}

// Revisa un correo: sin espacios, una sola @, algo escrito antes de la @
// y, después de la @, un punto que tenga texto antes y después (ej. empresa.com)
export function esCorreoValido(correo) {
  if (correo.includes(" ")) {
    return false;
  }

  const partes = correo.split("@");
  if (partes.length !== 2) {
    return false;
  }

  const usuario = partes[0];
  const dominio = partes[1];
  if (usuario === "") {
    return false;
  }

  // Se busca un punto que no sea el primer ni el último carácter del dominio
  for (let i = 1; i < dominio.length - 1; i++) {
    if (dominio[i] === ".") {
      return true;
    }
  }
  return false;
}
