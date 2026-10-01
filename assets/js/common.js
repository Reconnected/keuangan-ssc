// Fungsi bersama semua halaman: format Rupiah, modal login, sidebar mobile

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number || 0);
}

function openModalAuth() {
    toggleAuthMode('login');
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.remove('hidden');
}

function closeModalAuth() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.add('hidden');
}

function toggleAuthMode(mode) {
    const formLogin = document.getElementById('formLogin');
    const formReg = document.getElementById('formRegister');
    const title = document.getElementById('authModalTitle');

    if (!formLogin || !formReg || !title) return;

    if (mode === 'register') {
        formLogin.classList.add('hidden');
        formReg.classList.remove('hidden');
        title.innerText = 'Daftar Akun Admin Baru';
    } else {
        formReg.classList.add('hidden');
        formLogin.classList.remove('hidden');
        title.innerText = 'Login Admin Tulip IX';
    }
}

// Mobile Sidebar Listeners
document.getElementById('openSidebarMobile')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('-translate-x-full');
});
document.getElementById('closeSidebarMobile')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
});
