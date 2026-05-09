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
  console.log("Saving to Firebase...", { favs, expenses });
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      favorites: favs,
      expenses: expenses,
      updatedAt: new Date()
    }, { merge: true });
    console.log("Save successful");
  } catch(e) {
    console.error("Error saving to Firebase:", e);
    alert("Error al guardar en la nube: " + e.message);
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

    // Real-time listener for user data
    console.log("Setting up real-time listener for:", user.uid);
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Real-time update received:", data);
        
        // Only update if data is present to avoid overwriting with defaults
        if (data.favorites && window.WTP_UPDATE_FAVS) {
          window.WTP_UPDATE_FAVS(data.favorites);
        }
        if (data.expenses && window.WTP_UPDATE_EXPENSES) {
          window.WTP_UPDATE_EXPENSES(data.expenses);
        }
      }
    }, (error) => {
      console.error("Snapshot error:", error);
    });

    // Cleanup listener on logout or change
    window.WTP_AUTH_UNSUB = unsub;

  } else {
    // Cleanup previous listener
    if (window.WTP_AUTH_UNSUB) {
      window.WTP_AUTH_UNSUB();
      window.WTP_AUTH_UNSUB = null;
    }

    currentUser = null;
    loginForm.style.display = 'flex';
    profileData.style.display = 'none';
    userEmailDisplay.textContent = '';
    authEmail.value = '';
    authPass.value = '';

    // Clear local data on logout
    localStorage.removeItem('wtp_favs');
    localStorage.removeItem('wtp_calc');
    if (window.WTP_UPDATE_FAVS) window.WTP_UPDATE_FAVS([]);
    if (window.WTP_UPDATE_EXPENSES) window.WTP_UPDATE_EXPENSES([]);

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

// Forgot Password Logic
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const resetBtn = document.getElementById('resetPassBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    if (!email) return alert('Por favor, ingresá tu email para recuperar la contraseña.');
    
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Se ha enviado un email para restablecer tu contraseña. Revisá tu casilla (y spam).');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}

