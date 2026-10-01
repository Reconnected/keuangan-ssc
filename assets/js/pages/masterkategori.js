// Halaman Master Kategori: kategori pemasukan & pengeluaran

function refreshAllUI() {
    renderKategoriLists();
}

function renderKategoriLists() {
    const masContainer = document.getElementById('kategoriPemasukanList');
    const kelContainer = document.getElementById('kategoriPengeluaranList');

    if (!masContainer || !kelContainer) return;

    masContainer.innerHTML = '';
    kelContainer.innerHTML = '';

    const list = window.dataStore.kategori || [];
    const isAdmin = window.isAdmin;

    list.forEach(k => {
        const el = `
            <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span class="font-medium text-slate-800 text-sm">${k.nama}</span>
                <div class="space-x-1 ${isAdmin ? 'flex' : 'hidden'}">
                    <button onclick="editKategori('${k.id}')" title="Edit Kategori" class="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteKategori('${k.id}', '${k.nama}')" title="Hapus Kategori" class="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        if (k.tipe === 'Pemasukan') masContainer.innerHTML += el;
        else kelContainer.innerHTML += el;
    });
}

function openModalKategori(id = null) {
    const form = document.getElementById('formKategori');
    if (form) form.reset();
    const kId = document.getElementById('kategoriId');
    if (kId) kId.value = '';
    const modalTitle = document.getElementById('modalKategoriTitle');
    if (modalTitle) modalTitle.innerText = id ? 'Edit Kategori' : 'Tambah Kategori';

    if (id) {
        const k = window.dataStore.kategori.find(x => x.id === id);
        if (k) {
            if (document.getElementById('kategoriId')) document.getElementById('kategoriId').value = k.id;
            if (document.getElementById('kategoriNama')) document.getElementById('kategoriNama').value = k.nama;
            if (document.getElementById('kategoriTipe')) document.getElementById('kategoriTipe').value = k.tipe;
        }
    }
    const modal = document.getElementById('modalKategori');
    if (modal) modal.classList.remove('hidden');
}

function closeModalKategori() {
    const modal = document.getElementById('modalKategori');
    if (modal) modal.classList.add('hidden');
}

async function saveKategori(e) {
    e.preventDefault();
    const id = document.getElementById('kategoriId')?.value;
    const item = {
        id: id || undefined,
        nama: document.getElementById('kategoriNama')?.value || '',
        tipe: document.getElementById('kategoriTipe')?.value || 'Pemasukan'
    };
    await window.dbSave('kategori', item);
    closeModalKategori();
}

function editKategori(id) { openModalKategori(id); }

function deleteKategori(id, nama) { window.confirmDelete('kategori', id, nama); }
