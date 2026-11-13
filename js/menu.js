// menu.js
// Cambia el enlace de sesión del menú según si hay sesión iniciada:
//   sin sesión  -> "Ingresar"
//   con sesión  -> "Mi panel" y botón "Salir"
// Se incluye en todas las páginas.

import { obtenerSesion, cerrarSesion } from "./auth.js";

// <li id="menu-sesion"> que está en el menú de cada página
const itemSesion = document.querySelector("#menu-sesion");

async function prepararMenu() {
  if (!itemSesion) {
    return;
  }

  const sesion = await obtenerSesion();

  // Sin sesión: se deja el enlace "Ingresar" que ya viene en el HTML
  if (!sesion.usuario) {
    return;
  }

  // Con sesión: se reemplaza por "Mi panel" y "Salir"
  itemSesion.textContent = "";

  const enlacePanel = document.createElement("a");
  // El administrador va a su propio panel
  if (sesion.rol === "admin") {
    enlacePanel.href = "admin.html";
  } else {
    enlacePanel.href = "panel.html";
  }
  enlacePanel.textContent = "Mi panel";

  // Al pasar el mouse se ve de quién es la sesión
  let nombreVisible = sesion.usuario.email;
  if (sesion.nombre) {
    nombreVisible = sesion.nombre;
  }
  enlacePanel.title = "Sesión de " + nombreVisible;

  // Marca el enlace como activo si estamos en esa página
  if (window.location.pathname.endsWith(enlacePanel.getAttribute("href"))) {
    enlacePanel.classList.add("activo");
  }

  const botonSalir = document.createElement("button");
  botonSalir.type = "button";
  botonSalir.className = "boton-salir";
  botonSalir.textContent = "Salir";

  // Cierra la sesión y vuelve al inicio
  async function salir() {
    botonSalir.disabled = true;
    botonSalir.textContent = "Saliendo...";
    try {
      await cerrarSesion();
      window.location.href = "index.html";
    } catch (error) {
      console.error(error);
      alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      botonSalir.disabled = false;
      botonSalir.textContent = "Salir";
    }
  }

  botonSalir.addEventListener("click", salir);

  itemSesion.append(enlacePanel);
  itemSesion.append(botonSalir);
}

prepararMenu();

/* Abrir y cerrar menú de hamburguesa */
const encabezado = document.querySelector(".encabezado");
const botonHamburguesa = document.querySelector(".boton-hamburguesa");

if (encabezado && botonHamburguesa) {
  botonHamburguesa.addEventListener("click", () => {
    const abierto = encabezado.classList.toggle("menu-abierto");

    botonHamburguesa.textContent = abierto ? "✕" : "☰";
    botonHamburguesa.setAttribute("aria-expanded", String(abierto));
    botonHamburguesa.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });
}

