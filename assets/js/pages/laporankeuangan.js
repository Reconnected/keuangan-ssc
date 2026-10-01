// Halaman Laporan Keuangan: rekap per periode & cetak

const REPORT_PAGE_SIZE = 50;
let reportCurrentPage = 1;
let isPrintingReport = false;

function refreshAllUI() {
    generateReport();
}

function resetReportPage() {
    reportCurrentPage = 1;
    generateReport();
}

function goToReportPage(page) {
    reportCurrentPage = page;
    generateReport();
}

function renderReportPagination(totalRows) {
    const container = document.getElementById('reportPagination');
    if (!container) return;

    const pageCount = Math.ceil(totalRows / REPORT_PAGE_SIZE);
    reportCurrentPage = Math.min(reportCurrentPage, Math.max(pageCount, 1));
    container.replaceChildren();
    container.classList.toggle('hidden', totalRows <= REPORT_PAGE_SIZE || isPrintingReport);
    if (totalRows <= REPORT_PAGE_SIZE || isPrintingReport) return;

    const startRow = (reportCurrentPage - 1) * REPORT_PAGE_SIZE + 1;
    const endRow = Math.min(reportCurrentPage * REPORT_PAGE_SIZE, totalRows);
    const status = document.createElement('span');
    status.className = 'text-xs text-slate-500';
    status.textContent = `Menampilkan ${startRow}-${endRow} dari ${totalRows} transaksi`;

    const controls = document.createElement('div');
    controls.className = 'no-print flex items-center gap-2';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
    previous.textContent = 'Sebelumnya';
    previous.disabled = reportCurrentPage === 1;
    previous.addEventListener('click', () => goToReportPage(reportCurrentPage - 1));

    const pageStatus = document.createElement('span');
    pageStatus.className = 'min-w-16 text-center text-xs font-semibold text-slate-600';
    pageStatus.textContent = `${reportCurrentPage} / ${pageCount}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = previous.className;
    next.textContent = 'Berikutnya';
    next.disabled = reportCurrentPage === pageCount;
    next.addEventListener('click', () => goToReportPage(reportCurrentPage + 1));

    controls.append(previous, pageStatus, next);
    container.append(status, controls);
}

function generateReport() {
    const bulan = document.getElementById('reportBulan')?.value || '';
    const periodTitle = document.getElementById('reportPeriodTitle');
    const tbody = document.getElementById('reportTableBody');

    if (!tbody) return;

    let list = window.dataStore.transaksi || [];

    if (bulan) {
        list = list.filter(t => t.tanggal && t.tanggal.startsWith(bulan));
        const d = new Date(bulan + "-01");
        const monthStr = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        if (periodTitle) periodTitle.innerText = `Periode: ${monthStr}`;
    } else {
        if (periodTitle) periodTitle.innerText = `Periode: Semua Waktu (Keseluruhan)`;
    }

    list.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    const pageCount = Math.ceil(list.length / REPORT_PAGE_SIZE);
    reportCurrentPage = Math.min(reportCurrentPage, Math.max(pageCount, 1));
    const startIndex = (reportCurrentPage - 1) * REPORT_PAGE_SIZE;
    const pageRows = isPrintingReport ? list : list.slice(startIndex, startIndex + REPORT_PAGE_SIZE);

    const totMasuk = list.reduce((total, transaction) => total + (transaction.tipe === 'Pemasukan' ? Number(transaction.jumlah) || 0 : 0), 0);
    const totKeluar = list.reduce((total, transaction) => total + (transaction.tipe === 'Pengeluaran' ? Number(transaction.jumlah) || 0 : 0), 0);

    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400 italic">Tidak ada data transaksi pada periode ini.</td></tr>`;
    } else {
        pageRows.forEach((t, idx) => {
            const isMasuk = t.tipe === 'Pemasukan';
            const amount = Number(t.jumlah) || 0;

            const katObj = window.dataStore.kategori.find(k => k.id === t.kategoriId);
            const memberObj = (window.dataStore.members || []).find(member => member.id === (t.memberId || t.wargaId));

            let ketDetail = t.keterangan || '-';
            if (memberObj) ketDetail += ` (${memberObj.nla ?? ''} | ${memberObj.name ?? ''})`;

            tbody.innerHTML += `
                <tr class="border-b border-slate-100">
                    <td class="py-2.5 px-3 text-slate-500">${isPrintingReport ? idx + 1 : startIndex + idx + 1}</td>
                    <td class="py-2.5 px-3 font-medium text-slate-800">${t.tanggal}</td>
                    <td class="py-2.5 px-3">${t.tipe}</td>
                    <td class="py-2.5 px-3">${katObj ? katObj.nama : 'Umum'}</td>
                    <td class="py-2.5 px-3 text-slate-600">${ketDetail}</td>
                    <td class="py-2.5 px-3 text-right font-medium text-emerald-600">${isMasuk ? formatRupiah(amount) : '-'}</td>
                    <td class="py-2.5 px-3 text-right font-medium text-rose-600">${!isMasuk ? formatRupiah(amount) : '-'}</td>
                </tr>
            `;
        });
    }
    renderReportPagination(list.length);

    const repMasuk = document.getElementById('repTotalMasuk');
    if (repMasuk) repMasuk.innerText = formatRupiah(totMasuk);
    const repKeluar = document.getElementById('repTotalKeluar');
    if (repKeluar) repKeluar.innerText = formatRupiah(totKeluar);

    const selisih = totMasuk - totKeluar;
    const selisihEl = document.getElementById('repSelisih');
    if (selisihEl) {
        selisihEl.innerText = formatRupiah(selisih);
        selisihEl.className = `text-lg sm:text-xl font-bold mt-1 ${selisih >= 0 ? 'text-slate-800' : 'text-rose-600'}`;
    }
}

window.addEventListener('beforeprint', () => {
    isPrintingReport = true;
    generateReport();
});

window.addEventListener('afterprint', () => {
    isPrintingReport = false;
    generateReport();
});
