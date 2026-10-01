// Halaman Laporan Keuangan: rekap per periode & cetak

function refreshAllUI() {
    generateReport();
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

    let totMasuk = 0;
    let totKeluar = 0;

    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400 italic">Tidak ada data transaksi pada periode ini.</td></tr>`;
    } else {
        list.forEach((t, idx) => {
            const isMasuk = t.tipe === 'Pemasukan';
            const amount = Number(t.jumlah) || 0;

            if (isMasuk) totMasuk += amount;
            else totKeluar += amount;

            const katObj = window.dataStore.kategori.find(k => k.id === t.kategoriId);
            const wargaObj = window.dataStore.warga.find(w => w.id === t.wargaId);

            let ketDetail = t.keterangan || '-';
            if (wargaObj) ketDetail += ` (${wargaObj.nama} - ${wargaObj.blok})`;

            tbody.innerHTML += `
                <tr class="border-b border-slate-100">
                    <td class="py-2.5 px-3 text-slate-500">${idx + 1}</td>
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
