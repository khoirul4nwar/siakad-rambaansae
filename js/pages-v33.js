/* =====================================================================
   SIAKAD SISWA v3.3 — pages-v33.js
   Leaderboard siswa · Import Dapodik · PDF nilai akhir rata-rata semua mapel ·
   Hapus akun massal (akun login saja) · Suket absensi manual siswa ·
   Pengaturan kriteria "Perlu Pendampingan".
   Halaman lama dibungkus (fungsi lama dipanggil dulu, lalu ditambah) — bukan ditulis ulang.
   ===================================================================== */
'use strict';

// =====================================================================
// LEADERBOARD SISWA (siswa & guru / Super Admin)
// =====================================================================
function halamanLeaderboard(peran) {
  var siswa = peran === 'siswa';
  return {
    title: 'Leaderboard',
    st: { jenis: 'tercepat', cakupan: siswa ? 'kelas' : 'sekolah', kelas: '', batas: 10 },
    init: function (el) {
      var self = this, st = this.st;
      el.innerHTML = pageHead(siswa ? 'Portal Siswa <span>/ Leaderboard</span>' : (isSA() ? 'Super Admin' : 'Panel Guru') + ' <span>/ Leaderboard Siswa</span>', 'Leaderboard Siswa',
        'Peringkat semester berjalan: siswa tercepat menyelesaikan tugas & kuis, dan rata-rata nilai akhir tertinggi semua mata pelajaran.') +
        '<div class="lb-ctrl"><div class="lb-jenis" id="lbJenis" role="tablist"><button type="button" data-j="tercepat" role="tab">' + ic('zap') + '<span><b>Tercepat Selesai</b><small>Tugas & kuis LMS tepat waktu</small></span></button>' +
        '<button type="button" data-j="rata" role="tab">' + ic('trophy') + '<span><b>Nilai Rata-rata</b><small>Nilai akhir semua mapel</small></span></button></div>' +
        '<div class="row gap8 wrap"><div class="seg plain" id="lbCak"><button type="button" data-c="kelas">' + ic('users') + (siswa ? 'Kelasku' : 'Per kelas') + '</button><button type="button" data-c="sekolah">' + ic('school') + 'Satu sekolah</button></div>' +
        (siswa ? '' : '<select class="sel" id="lbKelas" style="width:auto;min-width:150px" aria-label="Kelas"></select>') + '</div></div>' +
        '<div id="lbBody" class="mt16"><div class="sk" style="height:320px"></div></div>';
      $('#lbJenis', el).onclick = function (e) { var b = e.target.closest('[data-j]'); if (b) { st.jenis = b.dataset.j; self.gambar(el); } };
      $('#lbCak', el).onclick = function (e) { var b = e.target.closest('[data-c]'); if (b) { st.cakupan = b.dataset.c; st.batas = 10; self.muat(el); } };
      if ($('#lbKelas', el)) $('#lbKelas', el).onchange = function () { st.kelas = this.value; st.cakupan = 'kelas'; st.batas = 10; self.muat(el); };
      el.addEventListener('click', function (e) { if (e.target.closest('#lbLagi')) { st.batas = 50; self.muat(el); } });
    },
    render: function (el) {
      var st = this.st;
      if (!siswa && $('#lbKelas', el)) {
        if (!st.kelas) { var wali = (B().kelas || []).filter(function (k) { return String(k.wali_kelas_id) === String(AppState.ref); })[0]; st.kelas = wali ? wali.kelas_id : ((B().kelas || [])[0] || {}).kelas_id || ''; }
        $('#lbKelas', el).innerHTML = kelasOpts(st.kelas);
      }
      this.muat(el);
    },
    muat: function (el) {
      var self = this, st = this.st, p = { cakupan: st.cakupan, batas: st.batas };
      if (!siswa && st.cakupan === 'kelas') p.kelas_id = st.kelas;
      $$('#lbCak button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.c === st.cakupan); });
      apiLR('leaderboard', p, function (r) {
        if (!$('#lbBody', el)) return;
        if (!r.success) { $('#lbBody', el).innerHTML = errorBox(pesanV33(r.message)); return; }
        self.d = r.data; self.gambar(el);
      });
    },
    gambar: function (el) {
      var d = this.d, st = this.st; if (!d) return;
      $$('#lbJenis button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.j === st.jenis); b.setAttribute('aria-selected', b.dataset.j === st.jenis); });
      var cepat = st.jenis === 'tercepat', list = cepat ? d.tercepat : d.rata, total = d.total[st.jenis] || 0, saya = d.saya ? d.saya[st.jenis] : null;
      var nilai = function (x) { return cepat ? durasi(x.rata_detik) : fmtN(x.rata, 1); }, satuan = function (x) { return cepat ? x.jumlah + ' tugas/kuis' : x.jumlah + ' mapel'; };
      var nis = String(AppState.ref || ''), lingkup = d.cakupan === 'sekolah' ? 'satu sekolah' : 'kelas ' + (d.nama_kelas || '');
      var info = cepat ? 'Rata-rata waktu dari membuka hingga mengumpulkan tugas / kuis LMS yang dikumpulkan tepat waktu (minimal ' + d.minTugas + ' item) sejak awal semester.' : 'Rata-rata nilai akhir semua mata pelajaran TA ' + d.periode.ta + ' semester ' + d.periode.sem + '.';
      var html = '<div class="note mb12">' + ic(cepat ? 'timer' : 'award') + '<div><b>' + (cepat ? 'Tercepat menyelesaikan tugas' : 'Rata-rata nilai tertinggi') + ' — ' + esc(lingkup) + '</b><div class="small">' + esc(info) + ' ' + total + ' siswa masuk peringkat.</div></div></div>';
      if (siswa) html += '<div class="card card-p lb-saya mb12">' + (saya ? '<span class="lb-rank">#' + saya.rank + '</span><div class="grow"><b>Posisi kamu</b><div class="small muted">dari ' + total + ' siswa • ' + esc(satuan(saya)) + '</div></div><b class="lb-nilai">' + esc(nilai(saya)) + '</b>' :
        '<span class="lb-rank muted">' + ic(cepat ? 'zap' : 'trophy') + '</span><div class="grow"><b>Kamu belum masuk peringkat</b><div class="small muted">' + (cepat ? 'Kumpulkan minimal ' + d.minTugas + ' tugas/kuis tepat waktu agar masuk peringkat tercepat.' : 'Peringkat muncul setelah nilai akhir diinput guru.') + '</div></div>') + '</div>';
      if (!list.length) { $('#lbBody', el).innerHTML = html + '<div class="card">' + emptyHtml('Belum ada peringkat', cepat ? 'Belum ada siswa dengan minimal ' + d.minTugas + ' tugas/kuis tepat waktu.' : 'Nilai akhir semester ini belum tersedia.', cepat ? 'zap' : 'trophy') + '</div>'; return; }
      var top = list.slice(0, 3), urut = top.length === 3 ? [top[1], top[0], top[2]] : top;
      html += '<div class="lb-podium">' + urut.map(function (x) {
        return '<div class="lb-pod r' + x.rank + (x.NIS === nis ? ' saya' : '') + '"><span class="lb-mahkota">' + ic(x.rank === 1 ? 'crown' : 'medal') + '</span>' + avatar(x.nama, x.foto, 'lg') + '<b class="clamp2">' + esc(x.nama) + '</b><small>' + esc(x.kelas || '') + '</small><span class="lb-nilai">' + esc(nilai(x)) + '</span><span class="lb-tiang">' + x.rank + '</span></div>';
      }).join('') + '</div>';
      var sisa = list.slice(3);
      if (sisa.length) html += '<div class="card mt16"><div class="lb-list">' + sisa.map(function (x) {
        return '<div class="lb-row' + (x.NIS === nis ? ' saya' : '') + '"><span class="lb-no">' + x.rank + '</span>' + avatar(x.nama, x.foto, 'sm') + '<div class="grow"><b class="small">' + esc(x.nama) + (x.NIS === nis ? ' <span class="bdg info">Kamu</span>' : '') + '</b><small class="muted">' + esc((d.cakupan === 'sekolah' ? x.kelas + ' • ' : '') + satuan(x)) + '</small></div><b class="lb-nilai">' + esc(nilai(x)) + '</b></div>';
      }).join('') + '</div></div>';
      if (total > list.length && st.batas < 50) html += '<div class="tc mt12"><button class="btn btn-soft" id="lbLagi">' + ic('chevrons-down') + 'Tampilkan hingga 50 besar</button></div>';
      $('#lbBody', el).innerHTML = html;
    }
  };
}
registerPage('siswa', 'leaderboard', halamanLeaderboard('siswa'));
registerPage('guru', 'leaderboard', halamanLeaderboard('guru'));

// =====================================================================
// IMPORT DATA SISWA DARI DAPODIK (.xlsx / .xls / .csv hasil unduh Dapodik)
// Kolom sensitif (NIK, No KK, rekening, KIP/KPS, dll.) TIDAK dibaca & tidak dikirim ke server.
// =====================================================================
var LIB_XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function dpkKunci(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function dpkTgl(v) {
  if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  var s = String(v == null ? '' : v).trim(), m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return s;
}
/** Baris mentah lembar Dapodik → { rows, peringatan }. Mendukung header 2 tingkat (Data Ayah/Ibu/Wali). */
function dpkUrai(aoa) {
  var hi = -1;
  for (var i = 0; i < Math.min(aoa.length, 30); i++) {
    var ks = (aoa[i] || []).map(dpkKunci);
    if (ks.indexOf('nama') > -1 && (ks.indexOf('nisn') > -1 || ks.indexOf('nipd') > -1 || ks.indexOf('nis') > -1)) { hi = i; break; }
  }
  if (hi < 0) throw new Error('Header Dapodik tidak ditemukan. Pastikan berkas adalah "Daftar Peserta Didik" hasil unduh Dapodik (ada kolom Nama, NIPD/NISN).');
  var atas = aoa[hi] || [], bawah = aoa[hi + 1] || [], kb = bawah.map(dpkKunci);
  var dua = kb.indexOf('nama') > -1 && (kb.indexOf('pekerjaan') > -1 || kb.indexOf('tahunlahir') > -1 || kb.indexOf('nik') > -1);
  var kolom = [], induk = '';
  for (var j = 0; j < Math.max(atas.length, bawah.length); j++) {
    var a = String(atas[j] == null ? '' : atas[j]).trim(), b = String(bawah[j] == null ? '' : bawah[j]).trim();
    if (a) induk = a;
    kolom.push(dua && b && /^data\s*(ayah|ibu|wali)/i.test(induk) ? dpkKunci(induk + b) : dpkKunci(a || (dua ? b : '')));
  }
  var cari = function (nama) { for (var x = 0; x < nama.length; x++) { var k = kolom.indexOf(nama[x]); if (k > -1) return k; } return -1; };
  var c = { nama: cari(['nama', 'namalengkap', 'namapesertadidik']), nipd: cari(['nipd', 'nis']), nisn: cari(['nisn']), jk: cari(['jk', 'jeniskelamin']), tl: cari(['tempatlahir']), tgl: cari(['tanggallahir']),
    alamat: cari(['alamat']), rt: cari(['rt']), rw: cari(['rw']), dusun: cari(['dusun']), kel: cari(['kelurahan', 'desakelurahan']), kec: cari(['kecamatan']),
    hp: cari(['hp', 'nohp', 'telepon']), email: cari(['email']), ayah: cari(['dataayahnama', 'namaayah']), ibu: cari(['dataibunama', 'namaibu']), wali: cari(['datawalinama', 'namawali']), rombel: cari(['rombelsaatini', 'rombel', 'kelas']) };
  if (c.nama < 0) throw new Error('Kolom "Nama" tidak ditemukan.');
  var ambil = function (r, k) { if (k < 0) return ''; var v = r[k]; return v instanceof Date ? v : String(v == null ? '' : v).trim(); };
  var out = [], tanpaId = 0;
  aoa.slice(hi + (dua ? 2 : 1)).forEach(function (r) {
    if (!r || !r.length) return;
    var nama = ambil(r, c.nama); if (!nama || dpkKunci(nama) === 'nama') return;
    var nisn = ambil(r, c.nisn), nipd = ambil(r, c.nipd);
    if (/^\d+$/.test(nisn) && nisn.length < 10) nisn = nisn.padStart(10, '0');
    var nis = nipd || nisn; if (!nis) { tanpaId++; return; }
    var rtrw = [ambil(r, c.rt), ambil(r, c.rw)].filter(Boolean).join('/');
    var alamat = [ambil(r, c.alamat), rtrw ? 'RT/RW ' + rtrw : '', ambil(r, c.dusun), ambil(r, c.kel), ambil(r, c.kec) ? 'Kec. ' + ambil(r, c.kec) : ''].filter(function (x) { return x && x !== '-' && x !== '0'; }).join(', ');
    out.push({ NIS: nis, NISN: nisn, 'Nama Lengkap': nama, JK: ambil(r, c.jk), Kelas: ambil(r, c.rombel), Email: /@/.test(ambil(r, c.email)) ? ambil(r, c.email) : '', 'No WA': ambil(r, c.hp),
      'Nama Ortu': ambil(r, c.ayah) || ambil(r, c.ibu) || ambil(r, c.wali), 'No WA Ortu': '', 'Tempat Lahir': ambil(r, c.tl), 'Tanggal Lahir': dpkTgl(ambil(r, c.tgl)), Alamat: alamat });
  });
  var peringatan = [];
  if (tanpaId) peringatan.push(tanpaId + ' baris tanpa NIPD/NISN dilewati.');
  if (c.rombel < 0) peringatan.push('Kolom Rombel tidak ditemukan — kelas siswa dikosongkan.');
  return { rows: out, peringatan: peringatan, dua: dua };
}
function imporDapodik(selesai) {
  var st = { rows: [], peta: {}, overwrite: false, buatAkun: true, siap: false };
  var m = modal({ title: 'Import Data Siswa dari Dapodik', sub: 'Unggah berkas "Daftar Peserta Didik" hasil unduh Dapodik (.xlsx / .xls / .csv)', size: 'lg',
    body: '<label class="drop" id="dpDrop"><input type="file" id="dpFile" accept=".xlsx,.xls,.csv" hidden><div class="ic">' + ic('file-spreadsheet') + '</div><b id="dpLbl">Pilih berkas Dapodik</b><div class="small muted">Dapodik → Peserta Didik → Unduh (Excel). Berkas dibaca di perangkat ini.</div></label>' +
      '<div class="note mt12">' + ic('shield-check') + '<div>Yang diimpor hanya: NIPD (sebagai NIS), NISN, nama, JK, tempat & tanggal lahir, alamat, HP, email, nama orang tua, dan rombel. <b>NIK, No KK, rekening, KIP/KPS, dan data sensitif lain tidak dibaca dan tidak dikirim ke server.</b></div></div>' +
      '<div id="dpIsi"></div>',
    foot: '<span class="xs muted grow" id="dpSt"></span><button class="btn btn-outline" data-x>Tutup</button><button class="btn btn-soft" id="dpScan" disabled>' + ic('scan-search') + 'Pindai (dry-run)</button><button class="btn btn-dark" id="dpRun" disabled>' + ic('upload') + 'Import</button>' });
  var el = m.el;
  function gambar(info) {
    var rombel = {}; st.rows.forEach(function (r) { if (r.Kelas) rombel[r.Kelas] = (rombel[r.Kelas] || 0) + 1; });
    var kelas = B().kelas || [], norm = function (s) { return dpkKunci(s).replace(/^kelas/, ''); };
    Object.keys(rombel).forEach(function (rb) { if (st.peta[rb] === undefined) { var cocok = kelas.filter(function (k) { return norm(k.nama_kelas) === norm(rb) || norm(k.kelas_id) === norm(rb); })[0]; st.peta[rb] = cocok ? cocok.nama_kelas : rb; } });
    $('#dpIsi', el).innerHTML = '<div class="row wrap gap8 mt16"><span class="bdg ok">' + ic('users') + st.rows.length + ' siswa terbaca</span><span class="bdg info">' + Object.keys(rombel).length + ' rombel</span>' + (info.dua ? '<span class="bdg">header 2 tingkat (Data Ayah/Ibu/Wali)</span>' : '') + '</div>' +
      (info.peringatan.length ? '<div class="note warn mt8">' + ic('triangle-alert') + '<div>' + info.peringatan.map(esc).join('<br>') + '</div></div>' : '') +
      (Object.keys(rombel).length ? '<div class="xs b muted mt16">PEMETAAN ROMBEL DAPODIK → KELAS SIAKAD</div><div class="tbl-wrap mt8"><table class="tbl"><thead><tr><th>Rombel Dapodik</th><th class="tc">Siswa</th><th>Masuk ke kelas</th></tr></thead><tbody>' + Object.keys(rombel).sort().map(function (rb) {
        var ada = kelas.some(function (k) { return k.nama_kelas === st.peta[rb]; });
        return '<tr><td><b>' + esc(rb) + '</b></td><td class="tc">' + rombel[rb] + '</td><td><select class="sel" data-rb="' + esc(rb) + '">' + kelas.map(function (k) { return '<option value="' + esc(k.nama_kelas) + '"' + (k.nama_kelas === st.peta[rb] ? ' selected' : '') + '>' + esc(k.nama_kelas) + '</option>'; }).join('') +
          '<option value="' + esc(rb) + '"' + (!ada ? ' selected' : '') + '>＋ Kelas baru "' + esc(rb) + '"</option></select></td></tr>';
      }).join('') + '</tbody></table></div>' : '') +
      '<div class="xs b muted mt16">PRATINJAU</div><div class="tbl-wrap mt8"><table class="tbl"><thead><tr><th>NIS (NIPD)</th><th>NISN</th><th>Nama</th><th>JK</th><th>Rombel</th><th class="hide-m">Tgl Lahir</th><th class="hide-m">Orang Tua</th></tr></thead><tbody>' +
      st.rows.slice(0, 6).map(function (r) { return '<tr><td class="mono small">' + esc(r.NIS) + '</td><td class="mono small">' + esc(r.NISN) + '</td><td class="small"><b>' + esc(r['Nama Lengkap']) + '</b></td><td>' + esc(r.JK) + '</td><td class="small">' + esc(r.Kelas) + '</td><td class="hide-m small">' + esc(r['Tanggal Lahir']) + '</td><td class="hide-m small">' + esc(r['Nama Ortu']) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (st.rows.length > 6 ? '<div class="xs muted mt4">+ ' + (st.rows.length - 6) + ' baris lainnya</div>' : '') +
      '<div class="row wrap gap16 mt16"><label class="chk small"><input type="checkbox" id="dpOver"' + (st.overwrite ? ' checked' : '') + '> Perbarui data siswa yang sudah ada (nama, NISN, kelas, orang tua, alamat)</label><label class="chk small"><input type="checkbox" id="dpAkun"' + (st.buatAkun ? ' checked' : '') + '> Buat akun login siswa baru (password awal = NIS)</label></div><div id="dpHasil" class="mt12"></div>';
    $$('[data-rb]', el).forEach(function (s) { s.onchange = function () { st.peta[s.dataset.rb] = s.value; $('#dpRun', el).disabled = true; }; });
    $('#dpOver', el).onchange = function () { st.overwrite = this.checked; $('#dpRun', el).disabled = true; };
    $('#dpAkun', el).onchange = function () { st.buatAkun = this.checked; };
  }
  $('#dpFile', el).onchange = async function () {
    var f = this.files[0]; this.value = ''; if (!f) return;
    $('#dpLbl', el).textContent = 'Membaca ' + f.name + '…'; $('#dpScan', el).disabled = true; $('#dpRun', el).disabled = true;
    try {
      await loadLib(LIB_XLSX);
      if (!window.XLSX) throw new Error('Pustaka pembaca Excel gagal dimuat. Periksa koneksi internet.');
      var wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
      var aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
      var info = dpkUrai(aoa);
      if (!info.rows.length) throw new Error('Tidak ada data siswa yang terbaca.');
      if (info.rows.length > 3000) throw new Error('Maksimal 3.000 siswa per import (berkas berisi ' + info.rows.length + '). Pisahkan per tingkat.');
      st.rows = info.rows; st.peta = {};
      $('#dpLbl', el).textContent = f.name + ' — ' + info.rows.length + ' siswa';
      gambar(info); $('#dpScan', el).disabled = false;
    } catch (e) { $('#dpLbl', el).textContent = 'Pilih berkas Dapodik'; $('#dpIsi', el).innerHTML = '<div class="note bad mt12">' + ic('circle-alert') + '<div>' + esc(e.message) + '</div></div>'; }
  };
  async function jalan(dry, btn) {
    if (!dry && !await confirmBox('Import ' + st.rows.length + ' siswa dari Dapodik?' + (st.overwrite ? '\n\nData siswa yang sudah ada akan DIPERBARUI.' : '\n\nSiswa yang sudah ada (NIS sama) tidak diubah.'), { ok: 'Import' })) return;
    var rows = st.rows.map(function (r) { return Object.assign({}, r, { Kelas: r.Kelas ? st.peta[r.Kelas] || r.Kelas : '' }); });
    btnBusy(btn, true); $('#dpSt', el).textContent = dry ? 'Memindai di server…' : 'Mengimpor…';
    var r = await api('migrasi.csv', { rows: rows, dryRun: dry, overwrite: st.overwrite, buatAkun: st.buatAkun });
    btnBusy(btn, false); $('#dpSt', el).textContent = '';
    if (!r.success) return toast(r.message, 'bad');
    var x = r.data.report.Siswa;
    $('#dpHasil', el).innerHTML = '<div class="note ' + (dry ? '' : 'ok') + '">' + ic(dry ? 'scan-search' : 'circle-check') + '<div><b>' + (dry ? 'Pratinjau:' : 'Selesai:') + '</b> ' + x.inserted + ' siswa baru, ' + x.updated + ' diperbarui, ' + x.skipped + ' dilewati.' +
      (r.data.warnings.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + r.data.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
    $('#dpRun', el).disabled = !dry;
    if (!dry) { toast('Import Dapodik selesai.', 'ok'); afterWrite(); if (selesai) selesai(); }
  }
  $('#dpScan', el).onclick = function () { jalan(true, this); };
  $('#dpRun', el).onclick = function () { jalan(false, this); };
}
(function () {
  var ds = Pages.guru.siswa; if (ds) {
    var initDs = ds.init;
    ds.init = function (el) {
      initDs.call(this, el);
      var acts = $('.ph .acts', el), self = this;
      if (isSA() && acts && !$('#sDapodik', el)) { acts.insertAdjacentHTML('afterbegin', '<button class="btn btn-outline" id="sDapodik">' + ic('file-input') + 'Import Dapodik</button>'); $('#sDapodik', el).onclick = function () { imporDapodik(function () { self.dirty = true; }); }; }
    };
  }
  var mg = Pages.guru.migrasi; if (mg) {
    var initMg = mg.init;
    mg.init = function (el) {
      initMg.call(this, el);
      var tpl = $('#csTpl', el);
      if (tpl && !$('#csDpk', el)) { tpl.insertAdjacentHTML('beforebegin', '<button class="btn btn-primary btn-sm" id="csDpk" style="margin-right:6px">' + ic('file-input') + 'Dari Dapodik (.xlsx)</button>'); $('#csDpk', el).onclick = function () { imporDapodik(); }; }
    };
  }
})();

// =====================================================================
// PDF NILAI AKHIR RATA-RATA SEMUA MAPEL
// =====================================================================
async function pdfV33(judulDok, lanskap) {
  await loadLib(LAP_LIB.pdf); await loadLib(LAP_LIB.tabel);
  if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.autoTable) throw new Error('Pustaka PDF gagal dimuat. Periksa koneksi internet.');
  var c = (AppState.boot || {}).cfg || {}, br = Brand.get(), alamat = String(c.ALAMAT_SEKOLAH || '');
  var kota = c.KOTA_LAPORAN || (alamat.split(',').map(function (x) { return x.trim(); }).filter(Boolean).pop() || '').replace(/\d+/g, '').trim();
  var d = { sekolah: { nama: c.NAMA_SEKOLAH || br.nama, alamat: alamat, tahun_ajaran: c.TAHUN_AJARAN || '', semester: c.SEMESTER || '', aplikasi: br.nama, kota: kota }, pembuat: AppState.nama, dibuat: new Date().toISOString() };
  var logo = await lapLogo(br.logo || c.LOGO_URL || LOGO);
  return new LapPdf(d, { landscapePertama: !!lanskap, warna: br.warna, judulDok: judulDok, kota: kota, tglTtd: todayStr(), kepala: c.KEPALA_SEKOLAH || '', nip: c.NIP_KEPALA_SEKOLAH || '' }, logo);
}
function predikatV33(n) { if (n === '' || n == null) return '-'; n = Number(n); var k = Number(cfg('KKM', 70)); return n >= 90 ? 'A' : n >= 80 ? 'B' : n >= k ? 'C' : 'D'; }
/** Siswa: PDF nilai akhir per mapel + rata-rata semua mapel (periode yang dipilih di halaman Nilai Saya) */
async function pdfNilaiSiswa(per, btn) {
  var b = SB(), p = b.profil || {}, x = String(per || '').split('|'), kk = kkmS();
  var rows = (b.nilai || []).filter(function (n) { return n.tahun_ajaran === x[0] && n.semester === x[1]; }).sort(function (a, c) { return String(a.mata_pelajaran).localeCompare(String(c.mata_pelajaran), 'id'); });
  if (!rows.length) return toast('Belum ada nilai pada periode ini.', 'warn');
  btnBusy(btn, true);
  try {
    var pdf = await pdfV33('Rekap Nilai Akhir ' + p.nama_lengkap, false);
    pdf.d.tahun_ajaran = x[0]; pdf.d.semester = x[1];
    var y = pdf.halaman(false);
    y = pdf.judul(y, 'REKAP NILAI AKHIR SISWA', ['Tahun Pelajaran ' + x[0] + '  |  Semester ' + x[1]]);
    y = pdf.identitas(y, [['Nama', p.nama_lengkap || AppState.nama], ['Kelas', p.nama_kelas || ''], ['NIS', p.NIS || ''], ['Wali kelas', p.wali_kelas || '-'], ['NISN', p.NISN || '-'], ['KKM', String(kk)]]);
    var fin = rows.filter(function (n) { return n.nilai_akhir !== ''; }), avg = fin.length ? Math.round(fin.reduce(function (a, n) { return a + Number(n.nilai_akhir); }, 0) / fin.length * 10) / 10 : null;
    var tuntas = fin.filter(function (n) { return Number(n.nilai_akhir) >= kk; }).length;
    y = pdf.tabel(y, [['No', 'Mata Pelajaran', 'Guru', 'Harian', 'UTS', 'UAS', 'Nilai Akhir', 'Predikat', 'Ketuntasan']],
      rows.map(function (n, i) { var ak = n.nilai_akhir === '' ? '' : Number(n.nilai_akhir); return [i + 1, n.mata_pelajaran, n.guru || '-', lapNilai(n.nilai_harian), lapNilai(n.nilai_uts), lapNilai(n.nilai_uas), lapNilai(ak), predikatV33(ak), ak === '' ? 'Belum lengkap' : ak >= kk ? 'Tuntas' : 'Belum tuntas']; }),
      { at: { foot: [[{ content: 'RATA-RATA NILAI AKHIR SEMUA MAPEL', colSpan: 6, styles: { halign: 'right' } }, avg == null ? '-' : fmtN(avg, 1), predikatV33(avg), tuntas + '/' + fin.length + ' tuntas']], columnStyles: { 0: { halign: 'center', cellWidth: 9 }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center', fontStyle: 'bold' }, 7: { halign: 'center' } } } });
    var r = b.rekap || {};
    y = pdf.tabel(y, [['Ringkasan', 'Nilai']], [['Rata-rata nilai akhir semua mapel', avg == null ? '-' : fmtN(avg, 1) + ' (predikat ' + predikatV33(avg) + ')'], ['Mapel tuntas (>= KKM ' + kk + ')', tuntas + ' dari ' + fin.length + ' mapel'],
      ['Peringkat kelas', b.peringkat ? b.peringkat + ' dari ' + b.jumlahSiswaKelas + ' siswa' : '-'], ['Kehadiran semester', r.persen == null ? '-' : fmtN(r.persen, 1) + '% (hadir ' + (r.H || 0) + ' hari)']], { at: { columnStyles: { 0: { cellWidth: 70 } }, headStyles: { halign: 'left' } } });
    y = pdf.catatan(y, 'Nilai akhir = Harian x ' + cfg('BOBOT_HARIAN', 40) + '% + UTS x ' + cfg('BOBOT_UTS', 30) + '% + UAS x ' + cfg('BOBOT_UAS', 30) + '%. Dokumen ini dicetak dari ' + Brand.get().nama + ' dan bukan pengganti rapor resmi.');
    pdf.ttd(y + 2, [{ atas: 'Mengetahui,', jabatan: 'Orang Tua/Wali', nama: '' }, { atas: (pdf.o.kota || '') + ', ' + tglIndo(todayStr()), jabatan: 'Wali Kelas', nama: p.wali_kelas || '' }]);
    pdf.kaki();
    pdf.doc.save(lapNamaFile('Nilai-Akhir_' + (p.nama_lengkap || 'siswa') + '_' + (p.NIS || '') + '_' + x[0].replace('/', '-') + '-' + x[1]) + '.pdf');
    toast('PDF nilai diunduh.', 'ok');
  } catch (e) { console.error(e); toast(e.message || 'Gagal membuat PDF.', 'bad'); }
  finally { btnBusy(btn, false); }
}
/** Guru / Super Admin: PDF peringkat rata-rata nilai akhir semua mapel per kelas */
async function pdfRataSemuaMapel(kelasId, btn) {
  var b = B(), kk = kkm(), krit = kriteriaPdp(), rek = b.rekapAbsen || {};
  var kelas = (b.kelas || []).filter(function (k) { return !kelasId || k.kelas_id === kelasId; }).sort(function (a, c) { return String(a.nama_kelas).localeCompare(String(c.nama_kelas), 'id', { numeric: true }); });
  var per = {}; (b.nilai || []).forEach(function (n) { if (n.nilai_akhir === '' || n.nilai_akhir == null) return; (per[n.NIS] = per[n.NIS] || []).push(Number(n.nilai_akhir)); });
  var bagian = kelas.map(function (k) {
    var rows = (b.siswa || []).filter(function (s) { return s.kelas_id === k.kelas_id && (s.status || 'Aktif') === 'Aktif'; }).map(function (s) {
      var ak = per[s.NIS] || [], rata = ak.length ? Math.round(ak.reduce(function (a, v) { return a + v; }, 0) / ak.length * 10) / 10 : null, r = rek[s.NIS] || {};
      return { s: s, ak: ak, rata: rata, tuntas: ak.filter(function (v) { return v >= kk; }).length, hadir: r.persen == null ? null : r.persen, pdp: cekPdp({ hadir: r.persen, akhir: rata == null ? '' : rata, ak: ak }, krit).perlu };
    }).sort(function (a, c) { return (c.rata == null ? -1 : c.rata) - (a.rata == null ? -1 : a.rata) || String(a.s.nama_lengkap).localeCompare(String(c.s.nama_lengkap), 'id'); });
    var no = 0, lalu = null, i = 0; rows.forEach(function (r) { i++; if (r.rata == null) { r.rank = '-'; return; } if (r.rata !== lalu) { no = i; lalu = r.rata; } r.rank = no; });
    return { k: k, rows: rows };
  }).filter(function (x) { return x.rows.length; });
  if (!bagian.length) return toast('Tidak ada siswa / nilai untuk dicetak.', 'warn');
  btnBusy(btn, true);
  try {
    var pdf = await pdfV33('Rata-rata Nilai Akhir Semua Mapel', false);
    bagian.forEach(function (bg) {
      var y = pdf.halaman(false), dinilai = bg.rows.filter(function (r) { return r.rata != null; });
      var rataKelas = dinilai.length ? Math.round(dinilai.reduce(function (a, r) { return a + r.rata; }, 0) / dinilai.length * 10) / 10 : null;
      y = pdf.judul(y, 'PERINGKAT RATA-RATA NILAI AKHIR SEMUA MAPEL', ['Kelas ' + bg.k.nama_kelas + '  |  Tahun Pelajaran ' + cfg('TAHUN_AJARAN', '') + '  |  Semester ' + cfg('SEMESTER', '')]);
      y = pdf.tabel(y, [['Rank', 'NIS', 'Nama Siswa', 'Mapel', 'Tuntas', 'Rata-rata', 'Predikat', 'Kehadiran', 'Keterangan']],
        bg.rows.map(function (r) { return [r.rank, r.s.NIS, r.s.nama_lengkap, r.ak.length, r.tuntas + '/' + r.ak.length, r.rata == null ? '-' : fmtN(r.rata, 1), predikatV33(r.rata), lapPersen(r.hadir), r.pdp ? 'Perlu pendampingan' : r.rata == null ? 'Nilai belum ada' : '-']; }),
        { at: { foot: [[{ content: 'RATA-RATA KELAS', colSpan: 5, styles: { halign: 'right' } }, rataKelas == null ? '-' : fmtN(rataKelas, 1), predikatV33(rataKelas), '', dinilai.length + ' siswa dinilai']], columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' }, 6: { halign: 'center' }, 7: { halign: 'center' } },
          didParseCell: function (h) { if (h.section === 'body' && h.column.index === 8 && /pendampingan/.test(h.cell.raw)) h.cell.styles.textColor = [185, 28, 28]; } } });
      y = pdf.catatan(y, 'Rata-rata = rata-rata nilai akhir seluruh mata pelajaran yang sudah dinilai. KKM ' + kk + '. Kriteria perlu pendampingan: ' + teksPdp(krit) + '.');
      pdf.ttd(y, [{ atas: 'Mengetahui,', jabatan: 'Kepala Sekolah', nama: pdf.o.kepala, nomor: pdf.o.nip ? 'NIP. ' + pdf.o.nip : '' }, { atas: (pdf.o.kota || '') + ', ' + tglIndo(todayStr()), jabatan: 'Wali Kelas ' + bg.k.nama_kelas, nama: guruNama(bg.k.wali_kelas_id) === '-' ? '' : guruNama(bg.k.wali_kelas_id) }]);
    });
    pdf.kaki();
    pdf.doc.save(lapNamaFile('Rata-rata-Nilai-Akhir_' + (kelasId ? kelasNama(kelasId) : 'Semua-Kelas') + '_' + String(cfg('TAHUN_AJARAN', '')).replace('/', '-') + '-' + cfg('SEMESTER', '')) + '.pdf');
    toast('PDF rata-rata nilai diunduh (' + bagian.length + ' kelas).', 'ok');
  } catch (e) { console.error(e); toast(e.message || 'Gagal membuat PDF.', 'bad'); }
  finally { btnBusy(btn, false); }
}
(function () {
  var ns = Pages.siswa.nilai; if (ns) {
    var renderNs = ns.render;
    ns.render = function (el) {
      renderNs.call(this, el);
      var self = this, b = $('#nsPdf', el);
      if (b) { b.innerHTML = ic('file-down') + 'Unduh PDF Nilai & Rata-rata'; b.onclick = function () { pdfNilaiSiswa(self.st.per, b); }; }
    };
  }
  var lp = Pages.guru.laporan; if (lp) {
    var initLp = lp.init;
    lp.init = function (el) {
      initLp.call(this, el);
      var self = this, a = $('#lPrint', el);
      if (a && !$('#lRata', el)) { a.insertAdjacentHTML('beforebegin', '<button class="btn btn-outline" id="lRata">' + ic('award') + 'PDF Rata-rata Nilai</button>'); $('#lRata', el).onclick = function () { pdfRataSemuaMapel(self.st.kelas, this); }; }
    };
  }
  var pn = Pages.guru.penilaian; if (pn) {
    var initPn = pn.init;
    pn.init = function (el) {
      initPn.call(this, el);
      var self = this, a = $('#nExport', el);
      if (a && !$('#nRata', el)) { a.insertAdjacentHTML('beforebegin', '<button class="btn btn-outline" id="nRata">' + ic('award') + 'PDF Rata-rata Semua Mapel</button>'); $('#nRata', el).onclick = function () { pdfRataSemuaMapel(self.st.kelas, this); }; }
    };
  }
})();

// =====================================================================
// KELOLA AKUN — hapus akun massal (akun login saja) + pilih semua hasil filter
// =====================================================================
(function () {
  var pg = Pages.guru.akun; if (!pg) return;
  var initL = pg.init, tableL = pg.table, bulkL = pg.bulk;
  pg.init = function (el) {
    initL.call(this, el);
    var self = this, s = $('#akBulk', el);
    if (s && !$('option[value="hapus"]', s)) s.insertAdjacentHTML('beforeend', '<option value="hapus">Hapus akun login…</option>');
    el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-akall]'); if (a) { var on = a.dataset.akall === '1'; self.filtered().forEach(function (u) { if (on) self.st.sel[u.user_id] = 1; else delete self.st.sel[u.user_id]; }); self.table(el); return; }
      if (e.target.closest('[data-akdel]')) self.bulk(el, 'hapus');
    });
  };
  pg.table = function (el) {
    tableL.call(this, el);
    var st = this.st, box = $('#akTable', el); if (!st.d || !box) return;
    var rows = this.filtered(), n = Object.keys(st.sel).length, semua = rows.length && rows.every(function (u) { return st.sel[u.user_id]; });
    if (!rows.length) return;
    box.insertAdjacentHTML('afterbegin', '<div class="ak-massal"><button type="button" class="btn btn-soft btn-sm" data-akall="' + (semua ? '0' : '1') + '">' + ic(semua ? 'square' : 'square-check-big') + (semua ? 'Batalkan pilih semua' : 'Pilih semua ' + fmtN(rows.length) + ' akun hasil filter') + '</button>' +
      (n ? '<span class="small b">' + fmtN(n) + ' dipilih</span><button type="button" class="btn btn-danger btn-sm" data-akdel>' + ic('trash-2') + 'Hapus ' + fmtN(n) + ' akun</button>' : '<span class="xs muted">Centang akun atau pilih semua, lalu gunakan Tindakan Massal.</span>') + '</div>');
  };
  pg.bulk = async function (el, aksi) {
    if (aksi !== 'hapus') return bulkL.call(this, el, aksi);
    var st = this.st, self = this, ids = Object.keys(st.sel), saya = st.d.saya;
    if (!ids.length) return toast('Centang akun terlebih dahulu.', 'warn');
    if (ids.indexOf(saya) > -1) { ids = ids.filter(function (x) { return x !== saya; }); delete st.sel[saya]; toast('Akun Anda sendiri tidak ikut dihapus.', 'warn'); if (!ids.length) return this.table(el); }
    var per = { superadmin: 0, guru: 0, siswa: 0 }; ids.forEach(function (id) { var u = self.byId(id); if (u && per[u.role] !== undefined) per[u.role]++; });
    var ok = await new Promise(function (res) {
      var m = modal({ title: 'Hapus ' + fmtN(ids.length) + ' Akun Login', sub: per.siswa + ' siswa • ' + per.guru + ' guru • ' + per.superadmin + ' Super Admin', size: 'sm', onClose: function (v) { res(!!v); },
        body: '<div class="note warn">' + ic('triangle-alert') + '<div>Hanya <b>akun login</b> yang dihapus — pemiliknya tidak bisa masuk lagi dan sesinya berakhir.</div></div>' +
          '<div class="note ok mt8">' + ic('shield-check') + '<div>Data siswa/guru, nilai, absensi, presensi, LMS, dan tagihan <b>tetap tersimpan</b>. Akun siswa bisa dibuat ulang dari Data Siswa (Aktifkan akun).</div></div>' +
          (per.superadmin ? '<div class="note bad mt8">' + ic('shield-alert') + '<div>' + per.superadmin + ' akun Super Admin ikut terpilih. Minimal satu Super Admin aktif tetap harus ada.</div></div>' : '') +
          '<div class="field mt16"><label for="hpKet">Ketik <b>HAPUS</b> untuk konfirmasi</label><input class="inp" id="hpKet" autocomplete="off"></div>',
        foot: '<button class="btn btn-outline" data-x>Batal</button><button class="btn btn-danger" id="hpOk" disabled>' + ic('trash-2') + 'Hapus Akun</button>' });
      $('#hpKet', m.el).oninput = function () { $('#hpOk', m.el).disabled = this.value.trim().toUpperCase() !== 'HAPUS'; };
      $('#hpOk', m.el).onclick = function () { m.close(true); };
    });
    if (!ok) return;
    var total = 0, pesan = '';
    for (var i = 0; i < ids.length; i += 1000) {
      var r = await api('sa.akun.bulk', { ids: ids.slice(i, i + 1000), aksi: 'hapus' });
      if (!r.success) { pesan = /tidak dikenal|tidak valid/i.test(r.message || '') ? pesanV33('tidak dikenal') : r.message; break; }
      total += r.data.n || 0;
    }
    if (total) toast(fmtN(total) + ' akun login dihapus. Data siswa/guru, nilai, dan absensi tetap tersimpan.', 'ok');
    if (pesan) toast(pesan, 'bad');
    st.sel = {}; self.load(el, true); if (total) afterWrite();
  };
})();

// =====================================================================
// ABSENSI — INPUT MANUAL: unggah surat keterangan (suket) untuk siswa Izin / Sakit
// =====================================================================
(function () {
  var pa = Pages.guru.absensi; if (!pa || !pa.renderManual) return;
  var rmL = pa.renderManual;
  pa.renderManual = async function (el) {
    await rmL.call(this, el);
    var st = this.st, self = this, box = $('#aManual', el), tbl = box && $('table.tbl', box);
    if (!tbl || $('th.suket-th', tbl)) return;
    var tgl = st.mTanggal, antre = {}, ada = {}, aktif = true;
    $('thead tr', tbl).insertAdjacentHTML('beforeend', '<th class="suket-th">Suket</th>');
    $$('tr[data-nis]', tbl).forEach(function (tr) { var on = $('[data-st].on', tr); tr.dataset.simpan = on ? on.dataset.st : ''; tr.insertAdjacentHTML('beforeend', '<td class="suket-td"><span class="xs muted">…</span></td>'); });
    function status(tr) { var on = $('[data-st].on', tr); return on ? on.dataset.st : ''; }
    function sel(tr) {
      var nis = tr.dataset.nis, td = $('.suket-td', tr), s = status(tr), perlu = s === 'Izin' || s === 'Sakit', x = ada[nis];
      if (!td || !aktif) return;
      if (x) td.innerHTML = '<button type="button" class="btn btn-soft btn-xs" data-sklihat="' + esc(x.bukti_id) + '">' + ic('paperclip') + 'Lihat</button>' + (perlu ? '<button type="button" class="btn-ic" data-skup="' + esc(nis) + '" title="Ganti suket">' + ic('upload') + '</button>' : '');
      else if (antre[nis]) td.innerHTML = '<span class="bdg info" title="' + esc(antre[nis].name) + '">' + ic('paperclip') + '1 berkas</span><button type="button" class="btn-ic" data-skx="' + esc(nis) + '" title="Batal">' + ic('x') + '</button>';
      else if (perlu) td.innerHTML = '<button type="button" class="btn btn-outline btn-xs" data-skup="' + esc(nis) + '">' + ic('file-up') + (tr.dataset.simpan === s ? 'Unggah' : 'Lampirkan') + '</button>';
      else td.innerHTML = '<span class="xs muted">-</span>';
    }
    function semua() { $$('tr[data-nis]', tbl).forEach(sel); }
    var pilih = document.createElement('input'); pilih.type = 'file'; pilih.accept = 'image/jpeg,image/png,image/webp,application/pdf'; pilih.hidden = true; box.appendChild(pilih);
    var target = null;
    pilih.onchange = async function () {
      var f = pilih.files[0], tr = target; pilih.value = ''; if (!f || !tr) return;
      var berkas; try { berkas = await siapkanBerkas(f); } catch (e) { return toast(e.message, 'bad'); }
      var nis = tr.dataset.nis, s = status(tr);
      if (tr.dataset.simpan === s && (s === 'Izin' || s === 'Sakit')) {          // status sudah tersimpan → unggah langsung
        var td = $('.suket-td', tr); td.innerHTML = '<span class="xs muted">' + ic('loader-circle', 'spin') + ' mengunggah…</span>';
        var r = await api('absensi.suket', { NIS: nis, tanggal: tgl, berkas: berkas });
        if (!r.success) { toast(pesanV33(r.message), 'bad'); return sel(tr); }
        toast(r.message, 'ok'); ada[nis] = r.data.bukti; sel(tr);
      } else { antre[nis] = berkas; sel(tr); toast('Suket dilampirkan — tersimpan saat Anda menekan Simpan Absensi.', 'ok'); }
    };
    box._suket = {                                                 // satu pendengar per kotak (render ulang hanya mengganti status ini)
      klik: function (e) {
        var up = e.target.closest('[data-skup]'); if (up) { target = up.closest('tr'); pilih.click(); return; }
        var lh = e.target.closest('[data-sklihat]'); if (lh) { var tr = lh.closest('tr'); lihatBukti(lh.dataset.sklihat, 'Suket ' + ($('b', tr) || {}).textContent + ' — ' + tglIndo(tgl)); return; }
        var x = e.target.closest('[data-skx]'); if (x) { delete antre[x.dataset.skx]; sel(x.closest('tr')); return; }
        var b = e.target.closest('[data-st]'); if (b) setTimeout(function () { sel(b.closest('tr')); }, 0);
      }
    };
    if (!box._suketPasang) { box._suketPasang = true; box.addEventListener('click', function (e) { if (box._suket) box._suket.klik(e); }); }
    // Simpan: absensi dulu, lalu suket yang dilampirkan (status Izin/Sakit)
    $('#mSave', box).onclick = async function () {
      var items = Object.keys(st.mEdits || {}).map(function (k) { return st.mEdits[k]; }), nAntre = Object.keys(antre).length;
      if (!items.length && !nAntre) return toast('Belum ada perubahan.', 'warn');
      btnBusy(this, true);
      if (items.length) { var r = await api('absensi.manual', { tanggal: tgl, items: items }); if (!toastRes(r)) { btnBusy(this, false); return; } }
      var ok = 0, gagal = [];
      for (var nis in antre) {
        var tr = $('tr[data-nis="' + nis + '"]', tbl), s = tr ? status(tr) : '';
        if (s !== 'Izin' && s !== 'Sakit') continue;
        var x = await api('absensi.suket', { NIS: nis, tanggal: tgl, berkas: antre[nis] });
        if (x.success) ok++; else gagal.push(($('b', tr) || {}).textContent + ': ' + pesanV33(x.message));
      }
      btnBusy(this, false);
      if (ok) toast(ok + ' surat keterangan tersimpan.', 'ok');
      if (gagal.length) toast(gagal.join(' • '), 'bad');
      st.mData = null; st.rRows = null; await afterWrite(); self.renderManual(el);
    };
    apiLR('absensi.suketList', { tanggal: tgl }, function (r) {
      if (!tbl.isConnected) return;
      if (!r.success) {                                            // backend lama → kolom disembunyikan
        if (backendLama(r)) { aktif = false; $$('.suket-th,.suket-td', tbl).forEach(function (x) { x.remove(); }); }
        return;
      }
      ada = r.data.suket || {}; semua();
    });
    semua();
  };
})();

// =====================================================================
// PENGATURAN — tab "Pendampingan" (Super Admin): kriteria siswa perlu pendampingan
// =====================================================================
(function () {
  var pp = Pages.guru.pengaturan; if (!pp) return;
  var initP = pp.init;
  pp.init = function (el) {
    initP.call(this, el);
    var self = this, ak = $('#pTabs [data-t="akademik"]', el);
    if (isSA() && ak && !$('#pTabs [data-t="pendampingan"]', el)) {
      ak.insertAdjacentHTML('afterend', '<button data-t="pendampingan">' + ic('life-buoy') + 'Pendampingan</button>');
      $('#pTabs [data-t="pendampingan"]', el).onclick = function () { self.st.tab = 'pendampingan'; self.render(el); };
    }
  };
  pp.t_pendampingan = function (box) {
    var k = kriteriaPdp(), c = B().cfg || {};
    box.innerHTML = '<div class="grid g-main"><div class="card"><div class="card-h"><div class="grow"><h3>' + ic('life-buoy') + ' Kriteria Siswa Perlu Pendampingan</h3><p>Dipakai di Laporan & Analitik (kartu "Perlu Pendampingan", segmen Perhatian) dan PDF rata-rata nilai. Sesuaikan dengan pedoman penilaian sekolah.</p></div></div><div class="card-b"><form id="pdF" class="grid-form">' +
      '<div class="field c6"><label>Batas kehadiran (%)</label><input class="inp" type="number" min="0" max="100" step="1" name="BATAS_KEHADIRAN" value="' + esc(k.hadir) + '"><div class="hint">Ditandai bila kehadiran semester di bawah angka ini.</div></div>' +
      '<div class="field c6"><label>Batas nilai akhir</label><input class="inp" type="number" min="0" max="100" step="0.5" name="PDP_BATAS_NILAI" value="' + esc(c.PDP_BATAS_NILAI || '') + '" placeholder="Kosong = KKM (' + kkm() + ')"><div class="hint">Kosongkan untuk mengikuti KKM.</div></div>' +
      '<div class="field"><label>Dasar penilaian nilai</label><div class="pdp-pilih">' +
      '<label class="chk"><input type="radio" name="PDP_DASAR" value="rata"' + (k.dasar === 'rata' ? ' checked' : '') + '> <span><b>Rata-rata nilai akhir</b><small>rata-rata semua mapel di bawah batas</small></span></label>' +
      '<label class="chk"><input type="radio" name="PDP_DASAR" value="mapel"' + (k.dasar === 'mapel' ? ' checked' : '') + '> <span><b>Jumlah mapel di bawah batas</b><small>minimal <input class="inp" type="number" min="1" max="30" name="PDP_MIN_MAPEL" value="' + esc(k.minMapel) + '" style="width:64px;height:30px;display:inline-block"> mapel</small></span></label></div></div>' +
      '<div class="field"><label>Aturan gabungan</label><div class="pdp-pilih">' +
      '<label class="chk"><input type="radio" name="PDP_ATURAN" value="ATAU"' + (k.aturan === 'ATAU' ? ' checked' : '') + '> <span><b>ATAU</b><small>salah satu syarat terpenuhi (kehadiran ATAU nilai)</small></span></label>' +
      '<label class="chk"><input type="radio" name="PDP_ATURAN" value="DAN"' + (k.aturan === 'DAN' ? ' checked' : '') + '> <span><b>DAN</b><small>kedua syarat terpenuhi sekaligus</small></span></label></div></div>' +
      '<div class="field"><div class="note" id="pdTeks">' + ic('info') + '<div></div></div></div>' +
      '<div class="field row between wrap"><span class="small muted" id="pdHit"></span><button class="btn btn-dark" type="submit">' + ic('save') + 'Simpan Kriteria</button></div></form></div></div>' +
      '<div class="card card-p"><h3>' + ic('lightbulb', 'amber') + ' Contoh pengaturan</h3><ul class="small" style="padding-left:18px;line-height:1.8;margin:12px 0 0"><li><b>Bawaan:</b> kehadiran &lt; 75% ATAU rata-rata &lt; KKM.</li><li><b>Ketat:</b> kehadiran &lt; 80% ATAU minimal 2 mapel &lt; KKM.</li><li><b>Fokus kasus berat:</b> kehadiran &lt; 75% DAN minimal 3 mapel &lt; 65.</li></ul><div class="note mt16">' + ic('info') + '<div>Perubahan berlaku untuk semua guru setelah disimpan. Data nilai & absensi tidak berubah.</div></div></div></div>';
    var f = $('#pdF', box);
    var baca = function () { var d = formData(f); return { hadir: Number(d.BATAS_KEHADIRAN), nilai: d.PDP_BATAS_NILAI === '' ? kkm() : Number(d.PDP_BATAS_NILAI), nilaiKkm: d.PDP_BATAS_NILAI === '', dasar: d.PDP_DASAR === 'mapel' ? 'mapel' : 'rata', minMapel: Math.max(1, Number(d.PDP_MIN_MAPEL) || 1), aturan: d.PDP_ATURAN === 'DAN' ? 'DAN' : 'ATAU' }; };
    var pratinjau = function () {
      var kr = baca(), b = B(), rek = b.rekapAbsen || {}, per = {};
      (b.nilai || []).forEach(function (n) { if (n.nilai_akhir !== '' && n.nilai_akhir != null) (per[n.NIS] = per[n.NIS] || []).push(Number(n.nilai_akhir)); });
      var n = 0, n0 = 0, aktif = (b.siswa || []).filter(function (s) { return (s.status || 'Aktif') === 'Aktif'; });
      aktif.forEach(function (s) { var ak = per[s.NIS] || [], r = rek[s.NIS] || {}, rata = ak.length ? ak.reduce(function (a, v) { return a + v; }, 0) / ak.length : ''; var row = { hadir: r.persen, akhir: rata, ak: ak }; if (cekPdp(row, kr).perlu) n++; if (cekPdp(row, k).perlu) n0++; });
      $('#pdTeks div', box).innerHTML = 'Siswa ditandai <b>perlu pendampingan</b> bila ' + esc(teksPdp(kr)) + '.';
      $('#pdHit', box).innerHTML = 'Dengan kriteria ini: <b>' + n + '</b> dari ' + aktif.length + ' siswa ditandai' + (n !== n0 ? ' (sebelumnya ' + n0 + ')' : '') + '.';
    };
    f.addEventListener('input', pratinjau); f.addEventListener('change', pratinjau); pratinjau();
    f.onsubmit = async function (e) {
      e.preventDefault(); var d = formData(f), btn = $('button[type=submit]', f);
      btnBusy(btn, true);
      var r = await api('pdp.atur', { BATAS_KEHADIRAN: d.BATAS_KEHADIRAN, PDP_BATAS_NILAI: d.PDP_BATAS_NILAI, PDP_DASAR: d.PDP_DASAR, PDP_MIN_MAPEL: d.PDP_MIN_MAPEL, PDP_ATURAN: d.PDP_ATURAN });
      btnBusy(btn, false);
      if (!r.success) return toast(pesanV33(r.message), 'bad');
      toast(r.message, 'ok'); B().cfg = Object.assign(B().cfg || {}, r.data); k = kriteriaPdp(); pratinjau(); markAllDirty(false); afterWrite();
    };
  };
})();
