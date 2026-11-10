// firebase-config.js
// Solo configuración e inicialización de Firebase.
// Los demás módulos importan "auth" y "db" desde aquí.

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Datos del proyecto (Consola de Firebase > Configuración del proyecto > Tus apps > Web).
// Estos valores identifican el proyecto, no son contraseñas: la seguridad real
// la dan las reglas de Firestore (firestore.rules).
const configuracion = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI_TU_PROYECTO.firebaseapp.com",
  projectId: "PEGA_AQUI_TU_PROYECTO",
  storageBucket: "PEGA_AQUI_TU_PROYECTO.appspot.com",
  messagingSenderId: "PEGA_AQUI_TU_SENDER_ID",
  appId: "PEGA_AQUI_TU_APP_ID"
};

// Se inicializa la aplicación una sola vez
const app = initializeApp(configuracion);

// Servicio de autenticación (correo y contraseña)
export const auth = getAuth(app);

// Base de datos Cloud Firestore
export const db = getFirestore(app);
