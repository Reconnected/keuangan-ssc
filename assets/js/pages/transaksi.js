// Halaman Transaksi: daftar, filter, catat/edit/hapus transaksi

let pendingCashFlowImport = null;
let cashFlowImportBusy = false;

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
    const selectedMember = (window.dataStore.members || []).find(member => member.id === memberIdSelected);

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
        memberid: selectedMember ? normalizeMemberNla(selectedMember.nla) : '',
        memberId: memberIdSelected || '',
        keterangan: document.getElementById('txKeterangan')?.value || ''
    };

    await window.dbSave('transaksi', item);
    closeModalTransaksi();
}

function editTransaksi(id) { openModalTransaksi(id); }

function deleteTransaksi(id, desc) { window.confirmDelete('transaksi', id, desc); }

function openCashFlowImport() {
    const modal = document.getElementById('modalCashFlowImport');
    const fileInput = document.getElementById('cashFlowFile');
    const summary = document.getElementById('cashFlowImportSummary');
    const preview = document.getElementById('cashFlowImportPreview');
    const confirmButton = document.getElementById('btnConfirmCashFlowImport');
    if (!modal) return;

    pendingCashFlowImport = null;
    if (fileInput) fileInput.value = '';
    if (summary) {
        summary.replaceChildren();
        summary.classList.add('hidden');
    }
    if (preview) {
        preview.replaceChildren();
        preview.classList.add('hidden');
    }
    if (confirmButton) confirmButton.disabled = true;
    modal.classList.remove('hidden');
}

function closeCashFlowImport() {
    if (cashFlowImportBusy) return;
    document.getElementById('modalCashFlowImport')?.classList.add('hidden');
}

function normalizeCashFlowHeader(value) {
    return String(value ?? '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCashFlowDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value ?? '').trim())) {
        const serial = Number(value);
        if (serial > 20000 && serial < 100000) {
            return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000).toISOString().slice(0, 10);
        }
    }

    const text = String(value ?? '').trim();
    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

    const indonesianMatch = text.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    if (indonesianMatch) {
        const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        const month = monthNames.indexOf(indonesianMatch[2].toLocaleLowerCase());
        if (month >= 0) {
            const date = new Date(Date.UTC(Number(indonesianMatch[3]), month, Number(indonesianMatch[1])));
            return date.toISOString().slice(0, 10);
        }
    }

    return '';
}

function parseCashFlowAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value ?? '').trim();
    if (!text) return 0;
    const numericText = text.replace(/[^\d-]/g, '');
    if (!numericText || numericText === '-') return null;
    const amount = Number(numericText);
    return Number.isFinite(amount) ? amount : null;
}

function normalizeMemberNla(value) {
    const nla = String(value ?? '').trim();
    return /^\d+$/.test(nla) ? nla.padStart(3, '0') : '';
}

function findMemberByNla(nla) {
    return (window.dataStore.members || []).find(member => normalizeMemberNla(member.nla) === nla);
}

function findMemberByName(name) {
    const normalizedName = String(name ?? '').trim().toLocaleLowerCase();
    return (window.dataStore.members || []).find(member => String(member.name ?? '').trim().toLocaleLowerCase() === normalizedName);
}

function stableImportHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function buildCashFlowImport(rows) {
    const requiredHeaders = ['tanggal', 'keterangan', 'pemasukan', 'pengeluaran', 'nla', 'note'];
    const headerIndex = rows.findIndex(row => {
        const headers = row.map(normalizeCashFlowHeader);
        return requiredHeaders.every(header => headers.includes(header));
    });
    if (headerIndex < 0) throw new Error('Header Tanggal, Keterangan, Pemasukan, Pengeluaran, NLA, dan Note tidak ditemukan.');

    const headers = rows[headerIndex].map(normalizeCashFlowHeader);
    const column = Object.fromEntries(requiredHeaders.map(header => [header, headers.indexOf(header)]));
    const transactions = [];
    const errors = [];
    const warnings = [];
    let skippedRows = 0;

    rows.slice(headerIndex + 1).forEach((row, offset) => {
        if (!row.some(value => String(value ?? '').trim())) return;
        const rowNumber = headerIndex + offset + 2;
        const date = parseCashFlowDate(row[column.tanggal]);
        const description = String(row[column.keterangan] ?? '').trim();
        const note = String(row[column.note] ?? '').trim();
        const income = parseCashFlowAmount(row[column.pemasukan]);
        const expense = parseCashFlowAmount(row[column.pengeluaran]);

        if (!date || !note || income === null || expense === null) {
            errors.push(`Baris ${rowNumber}: tanggal, Note, Pemasukan, atau Pengeluaran tidak valid.`);
            return;
        }
        if (income < 0 || expense < 0 || (income > 0 && expense > 0)) {
            errors.push(`Baris ${rowNumber}: nilai pemasukan/pengeluaran negatif atau keduanya terisi.`);
            return;
        }
        if (income === 0 && expense === 0) {
            skippedRows += 1;
            return;
        }

        const rawNla = row[column.nla];
        let nla = normalizeMemberNla(rawNla);
        let member = nla ? findMemberByNla(nla) : null;
        if (!nla && String(rawNla ?? '').trim()) {
            member = findMemberByName(rawNla);
            nla = member ? normalizeMemberNla(member.nla) : '';
            if (!member) warnings.push(`Baris ${rowNumber}: NLA "${String(rawNla).trim()}" tidak cocok dengan member; transaksi tetap diimpor tanpa member.`);
        } else if (nla && !member) {
            warnings.push(`Baris ${rowNumber}: NLA ${nla} tidak ditemukan di koleksi members; transaksi tetap diimpor tanpa member ID dokumen.`);
        }

        const type = income > 0 ? 'Pemasukan' : 'Pengeluaran';
        const amount = income > 0 ? income : expense;
        const sourceKey = [rowNumber, date, description, note, type, amount, nla].join('|');
        transactions.push({
            id: `cashflow_${stableImportHash(sourceKey)}`,
            tanggal: date,
            tipe: type,
            kategoriNama: note,
            jumlah: amount,
            keterangan: description,
            memberid: nla,
            memberId: member?.id || ''
        });
    });

    if (transactions.length === 0 && errors.length === 0) throw new Error('Tidak ada transaksi bernilai untuk diimpor.');

    return {
        transactions,
        errors,
        warnings,
        skippedRows,
        incomeTotal: transactions.filter(item => item.tipe === 'Pemasukan').reduce((sum, item) => sum + item.jumlah, 0),
        expenseTotal: transactions.filter(item => item.tipe === 'Pengeluaran').reduce((sum, item) => sum + item.jumlah, 0)
    };
}

function renderCashFlowImportResult(result, fileName) {
    const summary = document.getElementById('cashFlowImportSummary');
    const preview = document.getElementById('cashFlowImportPreview');
    const confirmButton = document.getElementById('btnConfirmCashFlowImport');
    if (!summary || !preview || !confirmButton) return;

    summary.replaceChildren();
    const details = [
        `${fileName}: ${result.transactions.length} transaksi`,
        `Pemasukan ${formatRupiah(result.incomeTotal)}`,
        `Pengeluaran ${formatRupiah(result.expenseTotal)}`,
        `${result.skippedRows} baris bernilai nol dilewati`
    ];
    const summaryText = document.createElement('p');
    summaryText.className = 'font-semibold';
    summaryText.textContent = details.join(' | ');
    summary.appendChild(summaryText);

    if (result.errors.length) {
        const errors = document.createElement('p');
        errors.className = 'mt-2 text-rose-700';
        errors.textContent = `Impor diblokir: ${result.errors.slice(0, 5).join(' ')}`;
        summary.appendChild(errors);
    }
    if (result.warnings.length) {
        const warnings = document.createElement('p');
        warnings.className = 'mt-2 text-amber-700';
        warnings.textContent = `${result.warnings.length} peringatan. ${result.warnings.slice(0, 3).join(' ')}`;
        summary.appendChild(warnings);
    }

    preview.replaceChildren();
    const table = document.createElement('table');
    table.className = 'w-full text-left text-xs';
    table.innerHTML = '<thead class="sticky top-0 bg-slate-100 text-slate-600"><tr><th class="p-2">Tanggal</th><th class="p-2">Jenis</th><th class="p-2">Note / Kategori</th><th class="p-2 text-right">Jumlah</th></tr></thead>';
    const body = document.createElement('tbody');
    result.transactions.slice(0, 8).forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'border-t border-slate-100';
        [transaction.tanggal, transaction.tipe, transaction.kategoriNama, formatRupiah(transaction.jumlah)].forEach((value, index) => {
            const cell = document.createElement('td');
            cell.className = `p-2${index === 3 ? ' text-right' : ''}`;
            cell.textContent = value;
            row.appendChild(cell);
        });
        body.appendChild(row);
    });
    table.appendChild(body);
    preview.appendChild(table);
    if (result.transactions.length > 8) {
        const remainder = document.createElement('p');
        remainder.className = 'border-t border-slate-100 p-2 text-xs text-slate-500';
        remainder.textContent = `dan ${result.transactions.length - 8} transaksi lainnya`;
        preview.appendChild(remainder);
    }

    summary.classList.remove('hidden');
    preview.classList.toggle('hidden', result.transactions.length === 0);
    confirmButton.disabled = result.transactions.length === 0 || result.errors.length > 0;
}

async function previewCashFlowFile(event) {
    const file = event.target.files?.[0];
    const summary = document.getElementById('cashFlowImportSummary');
    const confirmButton = document.getElementById('btnConfirmCashFlowImport');
    if (!file || !summary || !confirmButton) return;

    pendingCashFlowImport = null;
    confirmButton.disabled = true;
    try {
        if (!window.firestoreReadyCollections?.has('members') || !window.firestoreReadyCollections?.has('kategori')) {
            throw new Error('Tunggu hingga data member dan kategori selesai dimuat, lalu pilih kembali file.');
        }
        if (typeof XLSX === 'undefined') throw new Error('Library Excel belum tersedia.');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('File tidak memiliki worksheet.');
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: true, defval: '', blankrows: false });
        pendingCashFlowImport = buildCashFlowImport(rows);
        renderCashFlowImportResult(pendingCashFlowImport, file.name);
    } catch (error) {
        summary.replaceChildren();
        const message = document.createElement('p');
        message.className = 'text-rose-700';
        message.textContent = error.message || 'File tidak dapat dibaca.';
        summary.appendChild(message);
        summary.classList.remove('hidden');
    }
}

function normalizeCategoryName(name) {
    return String(name ?? '').trim().toLocaleLowerCase();
}

async function importCashFlowData() {
    if (!pendingCashFlowImport || cashFlowImportBusy) return;
    if (typeof window.dbSaveBatch !== 'function') {
        window.showToast('Fungsi impor Firestore belum tersedia.', true);
        return;
    }

    cashFlowImportBusy = true;
    const confirmButton = document.getElementById('btnConfirmCashFlowImport');
    if (confirmButton) confirmButton.disabled = true;

    const categories = [...(window.dataStore.kategori || [])];
    const categoryByName = new Map(categories.map(category => [normalizeCategoryName(category.nama), category]));
    const categoryOperations = [];
    const transactions = pendingCashFlowImport.transactions.map(source => {
        const categoryName = source.kategoriNama.trim();
        const categoryKey = normalizeCategoryName(categoryName);
        let category = categoryByName.get(categoryKey);

        if (!category) {
            category = {
                id: `cashflow_category_${stableImportHash(categoryKey)}`,
                nama: categoryName,
                tipe: source.tipe
            };
            categoryByName.set(categoryKey, category);
            categoryOperations.push({ collectionName: 'kategori', item: category });
        }

        return {
            id: source.id,
            tanggal: source.tanggal,
            tipe: source.tipe,
            kategoriId: category.id,
            jumlah: source.jumlah,
            keterangan: source.keterangan,
            memberid: source.memberid,
            memberId: source.memberId
        };
    });

    const operations = [
        ...categoryOperations,
        ...transactions.map(item => ({ collectionName: 'transaksi', item }))
    ];
    const summary = document.getElementById('cashFlowImportSummary');

    try {
        const savedCount = await window.dbSaveBatch(operations);
        if (summary) {
            const result = document.createElement('p');
            result.className = 'mt-2 font-semibold text-emerald-700';
            result.textContent = `Impor selesai: ${transactions.length} transaksi dan ${categoryOperations.length} kategori baru diproses.`;
            summary.appendChild(result);
        }
        window.showToast(`${savedCount} data saldo awal berhasil disimpan.`);
        pendingCashFlowImport = null;
        document.getElementById('modalCashFlowImport')?.classList.add('hidden');
        renderTransaksiTable();
        populateCategoryFilter();
    } catch (error) {
        if (summary) {
            const message = document.createElement('p');
            message.className = 'mt-2 text-rose-700';
            message.textContent = `Impor gagal: ${error.message || 'Terjadi kesalahan saat menyimpan ke Firestore.'}`;
            summary.appendChild(message);
        }
        window.showToast('Impor gagal disimpan ke Firestore.', true);
    } finally {
        cashFlowImportBusy = false;
        if (confirmButton && pendingCashFlowImport) confirmButton.disabled = pendingCashFlowImport.errors.length > 0;
    }
}
