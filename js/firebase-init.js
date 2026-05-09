import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-iHJZCyXtOr8PZkYD_pCkuR13NkJ3eK0",
  authDomain: "wheretopit.firebaseapp.com",
  projectId: "wheretopit",
  storageBucket: "wheretopit.firebasestorage.app",
  messagingSenderId: "853266067853",
  appId: "1:853266067853:web:1c6f2e7210df0e6825cdc4",
  measurementId: "G-KCH6RYSXEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const authEmail = document.getElementById('authEmail');
const authPass = document.getElementById('authPass');
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const profileData = document.getElementById('profileData');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Global User State
let currentUser = null;

// Auth Logic
const handleAuth = async (mode) => {
  const email = authEmail.value.trim();
  const pass = authPass.value.trim();
  if (!email || !pass) return alert('Por favor, ingresá email y contraseña.');
  if (pass.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');

  const btn = mode === 'login' ? authBtn : registerBtn;
  const originalText = btn.textContent;
  btn.textContent = 'Cargando...';
  btn.disabled = true;

  try {
    if (mode === 'login') {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      await createUserWithEmailAndPassword(auth, email, pass);
      alert('Cuenta creada exitosamente.');
    }
  } catch (error) {
    console.error("Auth error:", error.code, error.message);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      alert('Email o contraseña incorrectos.');
    } else if (error.code === 'auth/email-already-in-use') {
      alert('Este email ya está registrado. Por favor, iniciá sesión.');
    } else if (error.code === 'auth/weak-password') {
      alert('La contraseña es muy débil.');
    } else {
      alert('Error: ' + error.message);
    }
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

authBtn.addEventListener('click', () => handleAuth('login'));
const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
  registerBtn.addEventListener('click', () => handleAuth('register'));
}


logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// Sync data to Firestore
window.saveDataToFirebase = async (favs, expenses) => {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      favorites: favs,
      expenses: expenses,
      updatedAt: new Date()
    }, { merge: true });
  } catch(e) {
    console.error("Error saving to Firebase:", e);
  }
};

// Helpers for app.js
window.WTP_IS_LOGGED_IN = () => !!currentUser;
window.WTP_SHOW_AUTH_PROMPT = () => {
  const confirmed = confirm('Para usar esta función necesitas iniciar sesión. ¿Querés ir a tu perfil ahora?');
  if (confirmed) {
    if (window.switchView) window.switchView('profile');
    else {
        // Fallback if switchView isn't available yet
        document.querySelector('[data-target=profile]').click();
    }
  }
};

// Listen to Auth State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginForm.style.display = 'none';
    profileData.style.display = 'block';
    userEmailDisplay.textContent = user.email;
    
    // Update Profile Tab labels
    const navProfile = document.getElementById('navProfile');
    const sidebarProfile = document.getElementById('sidebarProfile');
    if (navProfile) navProfile.textContent = 'Mi Perfil';
    if (sidebarProfile) {
        sidebarProfile.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Mi Perfil
        `;
    }

    // Load user data from Firestore
    console.log("Logged in as:", user.uid, user.email);
    const docSnap = await getDoc(doc(db, "users", user.uid));
    
    const localFavs = window.WTP_GET_FAVS ? window.WTP_GET_FAVS() : [];
    const localExps = window.WTP_GET_EXPENSES ? window.WTP_GET_EXPENSES() : [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Cloud data found:", data);
      
      // Merge Favorites: Combine both and remove duplicates
      const cloudFavs = data.favorites || [];
      const mergedFavs = [...new Set([...localFavs, ...cloudFavs])];
      
      // Merge Expenses: Use cloud if it has content, otherwise use local
      const cloudExps = data.expenses || [];
      const mergedExps = cloudExps.length > 0 ? cloudExps : localExps;

      if (window.WTP_UPDATE_FAVS) window.WTP_UPDATE_FAVS(mergedFavs);
      if (window.WTP_UPDATE_EXPENSES) window.WTP_UPDATE_EXPENSES(mergedExps);
      
      // If we merged new local data into cloud, save it back
      if (localFavs.length > 0 || localExps.length > 0) {
          window.saveDataToFirebase(mergedFavs, mergedExps);
      }
    } else {
      console.log("No cloud data. Initializing with local data.");
      // Create initial doc with current local data
      window.saveDataToFirebase(localFavs, localExps);
    }
  } else {
    currentUser = null;
    loginForm.style.display = 'flex';
    profileData.style.display = 'none';
    userEmailDisplay.textContent = '';
    authEmail.value = '';
    authPass.value = '';

    const navProfile = document.getElementById('navProfile');
    const sidebarProfile = document.getElementById('sidebarProfile');
    if (navProfile) navProfile.textContent = 'Ingresar';
    if (sidebarProfile) {
        sidebarProfile.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Ingresar
        `;
    }
  }
});
