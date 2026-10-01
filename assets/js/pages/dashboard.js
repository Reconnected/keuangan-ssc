// Halaman Dashboard: ringkasan kas, grafik 6 bulan, transaksi terakhir

let myFinanceChart = null;

function refreshAllUI() {
    renderDashboard();
}

function renderDashboard() {
    const transaksi = window.dataStore.transaksi || [];
    const members = window.dataStore.members || [];

    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7);

    let totalKas = 0;
    let masukBulanIni = 0;
    let keluarBulanIni = 0;

    transaksi.forEach(t => {
        const amount = Number(t.jumlah) || 0;
        if (t.tipe === 'Pemasukan') {
            totalKas += amount;
            if (t.tanggal && t.tanggal.startsWith(currentYearMonth)) masukBulanIni += amount;
        } else if (t.tipe === 'Pengeluaran') {
            totalKas -= amount;
            if (t.tanggal && t.tanggal.startsWith(currentYearMonth)) keluarBulanIni += amount;
        }
    });

    const dashKas = document.getElementById('dashTotalKas');
    if (dashKas) dashKas.innerText = formatRupiah(totalKas);
    const dashMasuk = document.getElementById('dashMasukBulan');
    if (dashMasuk) dashMasuk.innerText = formatRupiah(masukBulanIni);
    const dashKeluar = document.getElementById('dashKeluarBulan');
    if (dashKeluar) dashKeluar.innerText = formatRupiah(keluarBulanIni);
    const dashMember = document.getElementById('dashTotalMember');
    if (dashMember) dashMember.innerText = members.length + " Member";
    const recentContainer = document.getElementById('dashRecentTransactions');
    if (recentContainer) {
        recentContainer.innerHTML = '';
        const sortedTx = [...transaksi].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 5);

        if (sortedTx.length === 0) {
            recentContainer.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada data transaksi.</p>`;
        } else {
            sortedTx.forEach(t => {
                const isMasuk = t.tipe === 'Pemasukan';
                const icon = isMasuk ? 'fa-arrow-down text-emerald-600 bg-emerald-50' : 'fa-arrow-up text-rose-600 bg-rose-50';
                const kat = window.dataStore.kategori.find(k => k.id === t.kategoriId)?.nama || 'Umum';

                recentContainer.innerHTML += `
                    <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${icon}">
                                <i class="fa-solid ${icon.split(' ')[0]}"></i>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-800">${t.keterangan || kat}</p>
                                <p class="text-[10px] text-slate-400">${t.tanggal}</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">
                            ${isMasuk ? '+' : '-'}${formatRupiah(t.jumlah)}
                        </span>
                    </div>
                `;
            });
        }
    }

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    const labels = [];
    const masukData = [];
    const keluarData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yearMonth = d.toISOString().slice(0, 7);
        const monthName = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });

        labels.push(monthName);

        let sumMasuk = 0;
        let sumKeluar = 0;

        (window.dataStore.transaksi || []).forEach(t => {
            if (t.tanggal && t.tanggal.startsWith(yearMonth)) {
                if (t.tipe === 'Pemasukan') sumMasuk += Number(t.jumlah) || 0;
                if (t.tipe === 'Pengeluaran') sumKeluar += Number(t.jumlah) || 0;
            }
        });

        masukData.push(sumMasuk);
        keluarData.push(sumKeluar);
    }

    if (myFinanceChart) myFinanceChart.destroy();

    myFinanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Pemasukan', data: masukData, backgroundColor: '#22c55e', borderRadius: 6 },
                { label: 'Pengeluaran', data: keluarData, backgroundColor: '#f43f5e', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (val) => 'Rp ' + (val / 1000) + 'k' }
                }
            }
        }
    });
}
