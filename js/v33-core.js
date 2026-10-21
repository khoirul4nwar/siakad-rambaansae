/* =====================================================================
   SIAKAD SISWA v3.3 — v33-core.js
   Titik sambung fitur v3.3 (menempel tanpa mengubah halaman lama):
   aksi baca baru, pembuangan cache saat menulis, menu baru (Kepegawaian, Leaderboard),
   komponen unggah berkas bukti (suket / surat tugas / lampiran), penampil berkas privat,
   statistik yang bisa diklik, dan kriteria "Perlu Pendampingan" yang bisa diatur.
   ===================================================================== */
'use strict';

// ---------------------------------------------------------------- Aksi baca baru (dedupe + batch)
(function () {
  var tambah = 'pegawai\\.ringkas|presensi\\.saya|izin\\.(saya|list)|aktivitas\\.(saya|list)|leaderboard|absensi\\.suketList|bukti\\.lihat';
  var dasar = window.READ_EXT ? READ_EXT.source.replace(/^\^/, '').replace(/\$$/, '') : '(?!)';
  READ_EXT = new RegExp('^(?:' + dasar + '|' + tambah + ')$');
})();

// Aksi tulis v3.3 → cache baca terkait di perangkat dibuang (tampilan berikutnya selalu segar)
(Hooks.tulis = Hooks.tulis || []).push(function (action) {
  if (/^(presensi\.(pegawai|manual|guru)|izin\.|aktivitas\.|pegawai\.)/.test(action)) {
    Store.del(userKey('a:presensi.saya')); Store.del(userKey('a:sa.monitor')); Store.del(userKey('a:pegawai.ringkas'));
    if (window.LC) LC.hapus(function (k) { return /^lc:(pegawai|presensi|izin|aktivitas)\./.test(k); });
  }
  if (!window.LC) return;
  if (/^rating\.aspek/.test(action)) LC.hapus(function (k) { return /^lc:rating\./.test(k); });
  if (/^absensi\.(suket|manual)/.test(action)) LC.hapus(function (k) { return /^lc:absensi\.suketList/.test(k); });
  if (/^(tugas\.kirim|kuis\.kirim|siswa\.|migrasi\.csv|nilai\.|config\.save|pdp\.)/.test(action)) LC.hapus(function (k) { return /^lc:leaderboard/.test(k); });
});

// ---------------------------------------------------------------- Menu
(function () {
  if (typeof MENU_DEF === 'undefined') return;
  function sisip(list, setelah, items) { var i = list.map(function (m) { return m.p; }).indexOf(setelah); if (i < 0) i = list.length - 1; Array.prototype.splice.apply(list, [i + 1, 0].concat(items)); }
  MENU_DEF.guru.forEach(function (m) { if (m.p === 'presensi') { m.t = 'Presensi Pegawai'; m.i = 'fingerprint'; } });
  sisip(MENU_DEF.guru, 'monitoring', [{ p: 'kepegawaian', t: 'Kepegawaian & Izin', i: 'briefcase-business', sa: true }]);
  sisip(MENU_DEF.guru, 'laporan', [{ p: 'leaderboard', t: 'Leaderboard Siswa', i: 'trophy' }]);
  sisip(MENU_DEF.siswa, 'nilai', [{ p: 'leaderboard', t: 'Leaderboard', i: 'trophy' }]);
})();

/** Server lama (belum v3.3) → pesan yang jelas, bukan "Aksi tidak dikenal" */
function pesanV33(msg) { return /tidak dikenal/i.test(msg || '') ? 'Fitur ini membutuhkan backend v3.3: tempel Kepegawaian.gs & Fitur33.gs (serta RatingGuru.gs terbaru) di Apps Script, jalankan setupV33, lalu Deploy → Manage deployments → Edit → New version.' : msg; }
function backendLama(r) { return !!(r && !r.success && /tidak dikenal/i.test(r.message || '')); }

// ---------------------------------------------------------------- Berkas bukti (suket, surat tugas, lampiran)
var BERKAS_MAKS = 3 * 1024 * 1024;
var BERKAS_TIPE = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'application/pdf': 1 };
/** File → { name, mime, data(base64), size }. Foto besar dikompres (≤1600 px) agar unggah cepat di HP. */
async function siapkanBerkas(file) {
  if (!file) return null;
  var mime = String(file.type || '').toLowerCase();
  if (/\.(jpe?g)$/i.test(file.name) && !mime) mime = 'image/jpeg';
  if (/\.pdf$/i.test(file.name) && !mime) mime = 'application/pdf';
  if (/^image\/(heic|heif)$/.test(mime)) throw new Error('Format HEIC belum didukung. Ubah kamera ke format JPG atau kirim tangkapan layar.');
  if (!BERKAS_TIPE[mime] && !/^image\//.test(mime)) throw new Error('Format berkas harus JPG, PNG, WEBP, atau PDF.');
  if (/^image\//.test(mime) && (file.size > 900 * 1024 || mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/webp')) {
    var url = await compressImage(file, 1600, 0.82);
    var data = url.split(',')[1];
    return { name: String(file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', data: data, size: Math.round(data.length * 0.75) };
  }
  if (file.size > BERKAS_MAKS) throw new Error('Ukuran berkas maksimal 3 MB' + (mime === 'application/pdf' ? ' (kompres PDF atau foto halamannya).' : '.'));
  return readFileB64(file);
}
/** HTML kotak unggah. opt: { id, label, hint, wajib, kamera } */
function berkasHtml(o) {
  return '<div class="field berkas-f" data-berkas="' + esc(o.id) + '"><label>' + esc(o.label) + (o.wajib ? ' <span class="req">*</span>' : ' <span class="muted xs">(opsional)</span>') + '</label>' +
    '<label class="drop berkas-drop"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"' + (o.kamera ? ' capture="environment"' : '') + ' hidden>' +
    '<span class="ic">' + ic('file-up') + '</span><span class="grow"><b class="berkas-nama">Pilih foto / PDF</b><small class="berkas-info">' + esc(o.hint || 'JPG, PNG, WEBP, atau PDF • maks 3 MB') + '</small></span>' +
    '<button type="button" class="btn-ic berkas-x" hidden aria-label="Hapus berkas">' + ic('x') + '</button></label></div>';
}
/** Pasang kotak unggah → { ambil(): Promise<berkas|null>, ada(): bool, reset() } */
function berkasPasang(root, id) {
  var box = $('[data-berkas="' + id + '"]', root), inp = $('input[type=file]', box), file = null, siap = null;
  function gambar() {
    $('.berkas-nama', box).textContent = file ? file.name : 'Pilih foto / PDF';
    $('.berkas-info', box).textContent = file ? fmtSize(file.size) + (/^image\//.test(file.type) && file.size > 900 * 1024 ? ' • akan dikompres otomatis' : '') : 'JPG, PNG, WEBP, atau PDF • maks 3 MB';
    $('.berkas-x', box).hidden = !file; box.classList.toggle('ada', !!file);
    $('.ic', box).innerHTML = ic(file ? (/pdf/.test(file.type) ? 'file-text' : 'file-image') : 'file-up');
  }
  inp.onchange = async function () {
    var f = inp.files[0]; inp.value = ''; if (!f) return;
    try { siap = await siapkanBerkas(f); file = f; } catch (e) { toast(e.message, 'bad'); file = null; siap = null; }
    gambar();
  };
  $('.berkas-x', box).onclick = function (e) { e.preventDefault(); e.stopPropagation(); file = null; siap = null; gambar(); };
  return { ambil: function () { return Promise.resolve(siap); }, ada: function () { return !!siap; }, reset: function () { file = null; siap = null; gambar(); } };
}
/** Buka berkas privat (suket/surat tugas/lampiran) — hanya lewat server, tidak pernah tautan publik Drive */
function lihatBukti(id, judul) {
  if (!id) return;
  var url = '';
  var m = modal({ title: judul || 'Berkas Bukti', sub: 'Berkas privat — hanya pemilik & Super Admin yang dapat membuka', size: 'lg', onClose: function () { if (url) URL.revokeObjectURL(url); },
    body: '<div id="bkIsi" class="bukti-isi"><div class="sk" style="height:320px"></div></div>', foot: '<a class="btn btn-outline" id="bkUnduh" hidden>' + ic('download') + 'Unduh</a><button class="btn btn-primary" data-x>Tutup</button>' });
  api('bukti.lihat', { bukti_id: id }).then(function (r) {
    var box = $('#bkIsi', m.el); if (!box) return;
    if (!r.success) { box.innerHTML = errorBox(pesanV33(r.message)); return; }
    var d = r.data, bin = atob(d.data), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    url = URL.createObjectURL(new Blob([arr], { type: d.mime }));
    box.innerHTML = /^image\//.test(d.mime) ? '<img src="' + url + '" alt="' + esc(d.nama_file) + '">' : /pdf/.test(d.mime) ? '<iframe src="' + url + '" title="' + esc(d.nama_file) + '"></iframe>' : emptyHtml(d.nama_file, 'Pratinjau tidak tersedia — unduh berkas.', 'file');
    var a = $('#bkUnduh', m.el); a.hidden = false; a.href = url; a.download = d.nama_file || 'bukti';
  });
}

// ---------------------------------------------------------------- Kriteria "Perlu Pendampingan" (diatur Super Admin)
function kriteriaPdp() {
  var bn = cfg('PDP_BATAS_NILAI', '');
  return { hadir: Number(cfg('BATAS_KEHADIRAN', 75)), nilai: bn === '' || bn == null ? kkm() : Number(bn), nilaiKkm: bn === '' || bn == null,
    dasar: cfg('PDP_DASAR', 'rata') === 'mapel' ? 'mapel' : 'rata', minMapel: Math.max(1, Number(cfg('PDP_MIN_MAPEL', 1)) || 1), aturan: cfg('PDP_ATURAN', 'ATAU') === 'DAN' ? 'DAN' : 'ATAU' };
}
/** r: { hadir: % | null, akhir: rata | '', ak: [nilai akhir per mapel] } → { perlu, hadir, nilai } */
function cekPdp(r, k) {
  k = k || kriteriaPdp();
  var h = r.hadir != null && r.hadir !== '' && Number(r.hadir) < k.hadir;
  var n = k.dasar === 'mapel' ? (r.ak || []).filter(function (v) { return Number(v) < k.nilai; }).length >= k.minMapel : r.akhir !== '' && r.akhir != null && Number(r.akhir) < k.nilai;
  return { perlu: k.aturan === 'DAN' ? h && n : h || n, hadir: h, nilai: n };
}
function teksPdp(k) {
  k = k || kriteriaPdp();
  return 'kehadiran < ' + k.hadir + '% ' + (k.aturan === 'DAN' ? 'DAN' : 'ATAU') + ' ' + (k.dasar === 'mapel' ? 'minimal ' + k.minMapel + ' mapel nilai akhir < ' + k.nilai : 'rata-rata nilai akhir < ' + k.nilai) + (k.nilaiKkm ? ' (KKM)' : '');
}

// ---------------------------------------------------------------- Statistik (kartu KPI) bisa diklik → halaman / bagian terkait
var KpiNav = {
  /** [peran, halaman, pola label, tujuan]. Tujuan: 'rute[/param]' | function(halaman, kartu) */
  aturan: [
    ['guru', 'monitoring', /guru hadir/i, function (pg) { KpiNav.tab(pg, '#monTabs [data-t="guru"]'); }],
    ['guru', 'monitoring', /siswa hadir/i, function (pg) { KpiNav.tab(pg, '#monTabs [data-t="siswa"]'); }],
    ['guru', 'monitoring', /online/i, function (pg) { KpiNav.tab(pg, '#monTabs [data-t="online"]'); }],
    ['guru', 'monitoring', /akun terdaftar/i, 'akun'],
    ['guru', 'akun', /total akun/i, function (pg) { KpiNav.pilih(pg, '#akStatus', ''); }],
    ['guru', 'akun', /nonaktif/i, function (pg) { KpiNav.pilih(pg, '#akStatus', 'TIDAK'); }],
    ['guru', 'akun', /online/i, function (pg) { KpiNav.pilih(pg, '#akStatus', 'online'); }],
    ['guru', 'akun', /perangkat/i, function (pg) { KpiNav.pilih(pg, '#akStatus', 'perangkat'); }],
    ['guru', 'siswa', /status akun/i, function (pg) { KpiNav.pilih(pg, '#sStatus', 'akun-belum'); }],
    ['guru', 'siswa', /kartu qr/i, function (pg) { var b = $('#sPrint', pg); if (b) b.click(); }],
    ['guru', 'laporan', /pendampingan/i, function (pg) { KpiNav.tab(pg, '#lSeg [data-s="perhatian"]', '#lTable'); }],
    ['guru', 'laporan', /indeks nilai/i, function (pg) { KpiNav.tab(pg, '#lSeg [data-s="top"]', '#lTable'); }],
    ['guru', 'laporan', /kehadiran/i, function (pg) { KpiNav.gulir($('#lTrend', pg)); }],
    ['guru', 'laporan', /efektivitas/i, 'materi'],
    ['guru', 'tagihan', /menunggu/i, 'tagihan/verifikasi'],
    ['guru', 'tagihan', /tunggakan/i, function (pg) { KpiNav.tagihan(pg, 'Belum'); }],
    ['guru', 'tagihan', /lunas/i, function (pg) { KpiNav.tagihan(pg, 'Lunas'); }],
    ['guru', 'tagihan', /total tagihan/i, function (pg) { KpiNav.tagihan(pg, ''); }],
    ['guru', 'ratingguru', /status penilaian/i, function (pg) { var b = $('#rtAtur', pg); if (b) b.click(); }],
    ['guru', 'kepegawaian', /menunggu/i, function (pg) { KpiNav.tab(pg, '#kpTabs [data-t="izin"]'); }],
    ['guru', 'kepegawaian', /belum presensi/i, function (pg) { KpiNav.tab(pg, '#kpTabs [data-t="manual"]'); }],
    ['guru', 'kepegawaian', /aktivitas/i, function (pg) { KpiNav.tab(pg, '#kpTabs [data-t="aktivitas"]'); }],
    ['guru', 'kepegawaian', /hadir/i, function (pg) { KpiNav.tab(pg, '#kpTabs [data-t="rekap"]'); }],
    ['siswa', 'dashboard', /kehadiran/i, 'absensi'],
    ['siswa', 'dashboard', /akademik|nilai/i, 'nilai'],
    ['siswa', 'dashboard', /mata pelajaran/i, 'mapel'],
    ['siswa', 'dashboard', /materi/i, 'materi'],
    ['siswa', 'nilai', /peringkat/i, 'leaderboard'],
    ['siswa', 'nilai', /kelayakan/i, 'absensi'],
    ['siswa', 'tagihan', /.*/, function (pg) { KpiNav.gulir($('.card:not(.kpi)', pg)); }]
  ],
  tab: function (pg, sel, gulirKe) { var b = $(sel, pg); if (b) { b.click(); setTimeout(function () { KpiNav.gulir(gulirKe ? $(gulirKe, pg) : b); }, 60); } },
  pilih: function (pg, sel, v) { var s = $(sel, pg); if (!s) return; s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); setTimeout(function () { KpiNav.gulir(s.closest('.card') || s); }, 60); },
  tagihan: function (pg, status) {
    var p = Pages.guru.tagihan; if (!p) return;
    p.st.tab = 'daftar'; p.st.f.status = status; p.st.page = 1; p.draw(pg);
    setTimeout(function () { var s = $('[data-f=status]', pg); if (s) s.value = status; KpiNav.gulir($('#tgBody', pg)); }, 60);
  },
  gulir: function (el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('kpi-sorot'); void el.offsetWidth; el.classList.add('kpi-sorot');
    setTimeout(function () { el.classList.remove('kpi-sorot'); }, 1400);
  },
  /** Cadangan: gulir ke kartu konten pertama setelah deret statistik */
  cadangan: function (kartu) {
    var grid = kartu.closest('.grid') || kartu.parentNode, n = grid && grid.nextElementSibling;
    while (n && (n.offsetParent === null || n.classList.contains('kpi'))) n = n.nextElementSibling;
    if (!n && grid && grid.parentNode) { var semua = $$('.card:not(.kpi)', grid.parentNode); n = semua.filter(function (c) { return !grid.contains(c) && c.offsetParent !== null; })[0]; }
    if (n) this.gulir(n);
  },
  klik: function (kartu) {
    var pg = kartu.closest('.page'); if (!pg) return;
    var halaman = pg.dataset.page, peran = regRole(), label = ($('.kl', kartu) || {}).textContent || '';
    var a = this.aturan.filter(function (x) { return x[0] === peran && x[1] === halaman && x[2].test(label); })[0];
    if (!a) return this.cadangan(kartu);
    if (typeof a[3] === 'function') return a[3](pg, kartu);
    var p = a[3].split('/'); go(p[0], p[1] || '');
  },
  tandai: function (root) {
    $$('.kpi:not([data-kpi]):not([data-kpinav])', root || document).forEach(function (k) { if (k.closest('.modal')) return; k.dataset.kpinav = '1'; k.classList.add('click'); k.setAttribute('tabindex', '0'); k.setAttribute('role', 'button'); });
  }
};
document.addEventListener('click', function (e) {
  var k = e.target.closest('.kpi'); if (!k || k.hasAttribute('data-kpi') || k.closest('.modal') || !k.closest('#content')) return;
  if (e.target.closest('a,button,input,select,label,textarea')) return;
  KpiNav.klik(k);
});
document.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('kpi') && e.target.dataset.kpinav) { e.preventDefault(); KpiNav.klik(e.target); }
});
// tandai kartu KPI yang baru dirender (halaman menggambar ulang KPI kapan saja)
(function () {
  var tunda = null;
  function jalan() { tunda = null; var c = $('#content'); if (c) KpiNav.tandai(c); }
  new MutationObserver(function () { if (!tunda) tunda = (window.requestAnimationFrame || setTimeout)(jalan); }).observe(document.documentElement, { childList: true, subtree: true });
})();
