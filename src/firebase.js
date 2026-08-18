import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, remove } from "firebase/database";

// ─── CONFIGURA AQUÍ TU PROYECTO FIREBASE ───
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (o usa uno existente)
// 3. Activa "Realtime Database" (no Firestore)
// 4. En reglas, pon:  { "rules": { ".read": true, ".write": true } }
// 5. Ve a Configuración del proyecto → Tu app → Web → Registrar app
// 6. Copia los valores aquí abajo:

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "TU_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, push, onValue, remove };
