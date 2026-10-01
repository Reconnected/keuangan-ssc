// Halaman Transaksi: daftar, filter, catat/edit/hapus transaksi

function refreshAllUI() {
    renderTransaksiTable();
    populateCategoryFilter();
}

function populateCategoryFilter() {
    const select = document.getElementById('filterTxKategori');
    if (!select) return;

    select.innerHTML = '<option value="">Semua Kategori</option>';
    (window.dataStore.kategori || []).forEach(k => {
        select.innerHTML += `<option value="${k.id}">${k.nama} (${k.tipe})</option>`;
    });
}

function getFilteredTransaksi() {
    const tipe = document.getElementById('filterTxTipe')?.value || '';
    const kat = document.getElementById('filterTxKategori')?.value || '';
    const bulan = document.getElementById('filterTxBulan')?.value || '';

    let list = [...(window.dataStore.transaksi || [])];

    if (tipe) list = list.filter(t => t.tipe === tipe);
    if (kat) list = list.filter(t => t.kategoriId === kat);
    if (bulan) list = list.filter(t => t.tanggal && t.tanggal.startsWith(bulan));

    return list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
}

function renderTransaksiTable() {
    const tbody = document.getElementById('transaksiTableBody');
    if (!tbody) return;

    const list = getFilteredTransaksi();

    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 italic">Tidak ada catatan transaksi.</td></tr>`;
        return;
    }

    const isAdmin = window.isAdmin;

    list.forEach(t => {
        const isMasuk = t.tipe === 'Pemasukan';
        const katObj = window.dataStore.kategori.find(k => k.id === t.kategoriId);
        const memberObj = (window.dataStore.members || []).find(member => member.id === (t.memberId || t.wargaId));
        const memberLabel = memberObj ? getMemberLabel(memberObj) : '';
        const desc = t.keterangan || (katObj ? katObj.nama : 'Transaksi Kas');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 text-slate-600 font-medium">${t.tanggal}</td>
                <td class="p-4">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${t.tipe}
                    </span>
                </td>
                <td class="p-4 font-semibold text-slate-800">${katObj ? katObj.nama : 'Umum'}</td>
                <td class="p-4 text-slate-600">
                    ${t.keterangan || '-'}
                    ${memberObj ? `<div class="text-xs text-emerald-700 font-medium"><i class="fa-solid fa-user text-[10px]"></i> ${memberLabel}</div>` : ''}
                </td>
                <td class="p-4 text-right font-bold ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">
                    ${formatRupiah(t.jumlah)}
                </td>
                <td class="p-4 text-center space-x-2 ${isAdmin ? '' : 'hidden'}">
                    <button onclick="editTransaksi('${t.id}')" title="Edit Transaksi" class="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg border border-blue-200 transition">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteTransaksi('${t.id}', '${desc}')" title="Hapus Transaksi" class="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg border border-rose-200 transition">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function getTransaksiExportRows() {
    return getFilteredTransaksi().map(t => {
        const katObj = window.dataStore.kategori.find(k => k.id === t.kategoriId);
        const memberObj = (window.dataStore.members || []).find(member => member.id === (t.memberId || t.wargaId));
        const memberLabel = memberObj ? getMemberLabel(memberObj) : '';

        return {
            Tanggal: t.tanggal || '',
            Jenis: t.tipe || '',
            Kategori: katObj ? katObj.nama : 'Umum',
            'Keterangan / Member SSC': [t.keterangan || '-', memberLabel].filter(Boolean).join(' - '),
            'Jumlah (Rp)': Number(t.jumlah) || 0
        };
    });
}

function getTransaksiExportFilename(extension) {
    const bulan = document.getElementById('filterTxBulan')?.value || 'semua-waktu';
    return `transaksi-kas-${bulan}.${extension}`;
}

function downloadTransaksiExcel() {
    if (typeof XLSX === 'undefined') {
        window.showToast('Library Excel belum tersedia.', true);
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(getTransaksiExportRows());
    worksheet['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 42 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');
    XLSX.writeFile(workbook, getTransaksiExportFilename('xlsx'));
}

function downloadTransaksiPdf() {
    const pdfConstructor = window.jspdf?.jsPDF;
    if (!pdfConstructor) {
        window.showToast('Library PDF belum tersedia.', true);
        return;
    }

    const rows = getTransaksiExportRows();
    const pdf = new pdfConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const bulan = document.getElementById('filterTxBulan')?.value || '';
    const periodTitle = bulan ? `Periode ${bulan}` : 'Semua Periode';

    pdf.setFontSize(16);
    pdf.text('Catatan Transaksi Kas Suzuki S-Presso Community', 14, 15);
    pdf.setFontSize(10);
    pdf.text(periodTitle, 14, 22);
    pdf.autoTable({
        startY: 28,
        head: [['Tanggal', 'Jenis', 'Kategori', 'Keterangan / Member SSC', 'Jumlah (Rp)']],
        body: rows.map(row => [row.Tanggal, row.Jenis, row.Kategori, row['Keterangan / Member SSC'], formatRupiah(row['Jumlah (Rp)'])]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 118, 110] },
        columnStyles: { 4: { halign: 'right' } },
        didDrawPage: data => {
            pdf.setFontSize(8);
            pdf.text(`Halaman ${data.pageNumber}`, 196, 285, { align: 'right' });
        }
    });
    pdf.save(getTransaksiExportFilename('pdf'));
}

function populateModalCategoryDropdown() {
    const tipe = document.getElementById('txTipe')?.value || 'Pemasukan';
    const select = document.getElementById('txKategori');
    if (!select) return;
    select.innerHTML = '';

    const filtered = (window.dataStore.kategori || []).filter(k => k.tipe === tipe);
    filtered.forEach(k => { select.innerHTML += `<option value="${k.id}">${k.nama}</option>`; });
}

function getMemberLabel(member) {
    return `${member.nla ?? ''} | ${member.name ?? ''}`;
}

function closeMemberSuggestions() {
    const input = document.getElementById('txMemberSearch');
    const options = document.getElementById('txMemberOptions');
    if (!input || !options) return;
    options.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
}

function renderMemberSuggestions() {
    const input = document.getElementById('txMemberSearch');
    const options = document.getElementById('txMemberOptions');
    if (!input || !options) return;

    const query = input.value.trim().toLocaleLowerCase();
    const members = [...(window.dataStore.members || [])]
        .filter(member => getMemberLabel(member).toLocaleLowerCase().includes(query))
        .sort((first, second) => String(first.nla ?? '').localeCompare(String(second.nla ?? ''), undefined, { numeric: true, sensitivity: 'base' }));

    options.replaceChildren();
    if (members.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'px-3 py-2 text-sm text-slate-500';
        emptyState.textContent = 'Member tidak ditemukan.';
        options.appendChild(emptyState);
    } else {
        members.forEach(member => {
            const option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            option.className = 'block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none';
            option.textContent = getMemberLabel(member);
            option.addEventListener('mousedown', event => event.preventDefault());
            option.addEventListener('click', () => {
                input.value = getMemberLabel(member);
                document.getElementById('txMemberId').value = member.id;
                closeMemberSuggestions();
            });
            options.appendChild(option);
        });
    }

    options.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
}

function setupMemberSearch() {
    const input = document.getElementById('txMemberSearch');
    const options = document.getElementById('txMemberOptions');
    const memberId = document.getElementById('txMemberId');
    if (!input || !options || !memberId || input.dataset.searchReady) return;

    input.dataset.searchReady = 'true';
    input.addEventListener('input', () => {
        memberId.value = '';
        renderMemberSuggestions();
    });
    input.addEventListener('focus', renderMemberSuggestions);
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMemberSuggestions();
        if (event.key === 'Enter' && !options.classList.contains('hidden')) {
            const firstOption = options.querySelector('[role="option"]');
            if (firstOption) {
                event.preventDefault();
                firstOption.click();
            }
        }
    });
    document.addEventListener('click', event => {
        if (!input.parentElement.contains(event.target)) closeMemberSuggestions();
    });
}

function populateModalMemberDropdown() {
    setupMemberSearch();
}

function openModalTransaksi(id = null) {
    const form = document.getElementById('formTransaksi');
    if (form) form.reset();
    const txId = document.getElementById('transaksiId');
    if (txId) txId.value = '';
    const txDate = document.getElementById('txTanggal');
    if (txDate) txDate.valueAsDate = new Date();
    const modalTitle = document.getElementById('modalTransaksiTitle');
    if (modalTitle) modalTitle.innerText = id ? 'Edit Transaksi' : 'Catat Transaksi Baru';

    populateModalCategoryDropdown();
    populateModalMemberDropdown();

    if (id) {
        const t = window.dataStore.transaksi.find(x => x.id === id);
        if (t) {
            if (document.getElementById('transaksiId')) document.getElementById('transaksiId').value = t.id;
            if (document.getElementById('txTanggal')) document.getElementById('txTanggal').value = t.tanggal;
            if (document.getElementById('txTipe')) document.getElementById('txTipe').value = t.tipe;
            populateModalCategoryDropdown();
            if (document.getElementById('txKategori')) document.getElementById('txKategori').value = t.kategoriId;
            if (document.getElementById('txJumlah')) document.getElementById('txJumlah').value = t.jumlah;
            const memberId = t.memberId || t.wargaId || '';
            const member = (window.dataStore.members || []).find(item => item.id === memberId);
            if (document.getElementById('txMemberId')) document.getElementById('txMemberId').value = memberId;
            if (document.getElementById('txMemberSearch')) document.getElementById('txMemberSearch').value = member ? getMemberLabel(member) : '';
            if (document.getElementById('txKeterangan')) document.getElementById('txKeterangan').value = t.keterangan || '';
        }
    }
    const modal = document.getElementById('modalTransaksi');
    if (modal) modal.classList.remove('hidden');
}

function closeModalTransaksi() {
    const modal = document.getElementById('modalTransaksi');
    if (modal) modal.classList.add('hidden');
}

async function saveTransaksi(e) {
    e.preventDefault();
    const id = document.getElementById('transaksiId')?.value;
    const memberIdSelected = document.getElementById('txMemberId')?.value;
    const memberSearch = document.getElementById('txMemberSearch')?.value.trim();

    if (memberSearch && !memberIdSelected) {
        window.showToast('Pilih member dari daftar saran atau kosongkan pencarian.', true);
        return;
    }

    const item = {
        id: id || undefined,
        tanggal: document.getElementById('txTanggal')?.value || '',
        tipe: document.getElementById('txTipe')?.value || 'Pemasukan',
        kategoriId: document.getElementById('txKategori')?.value || '',
        jumlah: Number(document.getElementById('txJumlah')?.value) || 0,
        memberId: memberIdSelected || '',
        keterangan: document.getElementById('txKeterangan')?.value || ''
    };

    await window.dbSave('transaksi', item);
    closeModalTransaksi();
}

function editTransaksi(id) { openModalTransaksi(id); }

function deleteTransaksi(id, desc) { window.confirmDelete('transaksi', id, desc); }
