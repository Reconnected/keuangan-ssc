// Firebase: inisialisasi, autentikasi admin, sinkronisasi Firestore realtime, dan CRUD (dbSave / confirmDelete)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "./config/firebase-config.js";

// Initialize Firebase Apps
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let pendingDeleteInfo = null;

// Data Store Global
window.dataStore = { warga: [], kategori: [], transaksi: [] };
window.isAdmin = false;

// Realtime Data Sync from Firestore
function setupFirestoreSync() {
    updateDbStatusBadge(true);

    // Hanya subscribe koleksi yang dibutuhkan halaman ini (atribut data-collections pada <body>)
    const wanted = (document.body.dataset.collections || 'warga,kategori,transaksi')
        .split(',').map(s => s.trim()).filter(Boolean);

    wanted.forEach((name) => {
        onSnapshot(collection(db, name), (snapshot) => {
            window.dataStore[name] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (typeof refreshAllUI === 'function') refreshAllUI();
        });
    });
}

// Custom Toast Helper
window.showToast = (msg, isError = false) => {
    const toast = document.getElementById('toastNotification');
    const icon = document.getElementById('toastIcon');
    const message = document.getElementById('toastMessage');

    if (!toast || !message || !icon) return;

    message.innerText = msg;
    icon.className = isError ? "fa-solid fa-circle-exclamation text-rose-400 text-base" : "fa-solid fa-circle-check text-emerald-400 text-base";

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};

// Auth Listener & Protection Controls
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    window.isAdmin = !!user;

    const adminStatus = document.getElementById('adminUserStatus');
    const emailDisplay = document.getElementById('adminEmailDisplay');
    const authBtnText = document.getElementById('authBtnText');
    const authBtn = document.getElementById('authBtn');

    if (user) {
        if (adminStatus) {
            adminStatus.innerText = "Mode Admin";
            adminStatus.className = "text-xs font-semibold text-emerald-600 uppercase tracking-wider";
        }
        if (emailDisplay) emailDisplay.innerText = user.email;
        if (authBtnText) authBtnText.innerText = "Logout";
        if (authBtn) authBtn.className = "flex items-center space-x-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition";

        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('hidden');
            if (el.tagName === 'BUTTON') el.classList.add('flex');
        });
        document.querySelectorAll('.th-aksi-col').forEach(el => el.classList.remove('hidden'));
    } else {
        if (adminStatus) {
            adminStatus.innerText = "Mode Warga (Tamu)";
            adminStatus.className = "text-xs font-semibold text-slate-400 uppercase tracking-wider";
        }
        if (emailDisplay) emailDisplay.innerText = "Akses Hanya Lihat";
        if (authBtnText) authBtnText.innerText = "Login Admin";
        if (authBtn) authBtn.className = "flex items-center space-x-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition";

        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.th-aksi-col').forEach(el => el.classList.add('hidden'));
    }
    refreshAllUI();
});

function updateDbStatusBadge(online) {
    const badge = document.getElementById('dbStatusBadge');
    if (badge && online) {
        badge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> Firestore Live`;
    }
}

// Auth Operations
window.handleAuthAction = () => {
    if (currentUser) {
        signOut(auth).then(() => window.showToast("Berhasil Logout sebagai Admin."));
    } else {
        openModalAuth();
    }
};

window.handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const alertBox = document.getElementById('authAlert');

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeModalAuth();
        window.showToast("Selamat datang, Admin!");
    } catch (err) {
        if (alertBox) {
            alertBox.classList.remove('hidden');
            alertBox.innerText = "Login Gagal: " + err.message;
        }
    }
};

window.handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const alertBox = document.getElementById('regAlert');

    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        window.showToast("Akun Admin berhasil terdaftar!");
        closeModalAuth();
    } catch (err) {
        if (alertBox) {
            alertBox.classList.remove('hidden');
            alertBox.innerText = "Pendaftaran Gagal: " + err.message;
        }
    }
};

// Database CRUD Operations (Save & Delete)
window.dbSave = async function(colName, item) {
    if (!currentUser) {
        window.showToast("Akses ditolak: Anda harus login Admin!", true);
        return;
    }
    try {
        const id = item.id || 'id_' + Date.now();
        const payload = { ...item, id };
        await setDoc(doc(db, colName, id), payload);
        window.showToast("Data tersimpan ke Firebase!");
    } catch (err) {
        window.showToast("Gagal menyimpan: " + err.message, true);
    }
};

window.confirmDelete = function(colName, id, label) {
    if (!currentUser) {
        window.showToast("Akses ditolak: Login Admin dibutuhkan!", true);
        return;
    }
    pendingDeleteInfo = { colName, id };
    const confirmText = document.getElementById('deleteConfirmText');
    if (confirmText) confirmText.innerText = `Apakah Anda yakin ingin menghapus "${label}" dari Firebase?`;
    const deleteModal = document.getElementById('modalDelete');
    if (deleteModal) deleteModal.classList.remove('hidden');
};

window.closeModalDelete = function() {
    pendingDeleteInfo = null;
    const deleteModal = document.getElementById('modalDelete');
    if (deleteModal) deleteModal.classList.add('hidden');
};

document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    if (pendingDeleteInfo) {
        try {
            await deleteDoc(doc(db, pendingDeleteInfo.colName, pendingDeleteInfo.id));
            window.showToast("Data berhasil dihapus dari Firebase!");
        } catch (err) {
            window.showToast("Gagal menghapus: " + err.message, true);
        }
        closeModalDelete();
    }
});

// Init App Data Sync Listener
setupFirestoreSync();
