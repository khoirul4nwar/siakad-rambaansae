/* =====================================================================
   SIAKAD SISWA v3.3 — pages-pegawai.js : Presensi Pegawai (guru & staf)
   Menu pop-up 9 pilihan: WFO · Dinas Luar · Dinas Dalam · Diklat · Apel ·
   Riwayat · Aktifitas · Tidak Hadir · Pegawai.
   - WFO & Dinas Dalam wajib di area sekolah (geofence); Dinas Luar, Diklat, Apel
     boleh di mana saja (GPS tetap dicatat + selfie + keterangan, surat tugas opsional)
   - Tidak Hadir (Sakit/Izin/Cuti) wajib unggah surat keterangan → disetujui Super Admin
   - Super Admin: menu Kepegawaian & Izin (persetujuan, absen manual guru, aktivitas, rekap)
   Backend lama (v3.2) → halaman Presensi Saya lama tetap dipakai otomatis.
   ===================================================================== */
'use strict';

var PEG_KAT = {
  WFO: { label: 'WFO', judul: 'Work From Office', sub: 'Kerja dari kantor', ic: 'building-2', warna: '#1E3A5F', geo: true, ket: false, ph: '', info: 'Bekerja langsung dari kantor / sekolah resmi.' },
  DINAS_LUAR: { label: 'Dinas Luar', judul: 'Dinas Luar', sub: 'Tugas di luar kantor', ic: 'car-front', warna: '#C2410C', geo: false, ket: true, ph: 'Tujuan / instansi / kota, mis. Rapat koordinasi di Dinas Pendidikan Kabupaten', info: 'Bertugas di luar lingkungan kantor: kunjungan lapangan, rapat instansi luar, tugas luar kota.' },
  DINAS_DALAM: { label: 'Dinas Dalam', judul: 'Dinas Dalam', sub: 'Tugas di area instansi', ic: 'landmark', warna: '#0F766E', geo: true, ket: true, ph: 'Uraian tugas kedinasan, mis. Panitia asesmen di ruang laboratorium', info: 'Menjalankan tugas kedinasan di dalam area internal instansi / unit kerja.' },
  DIKLAT: { label: 'Diklat', judul: 'Pendidikan & Pelatihan', sub: 'Pendidikan & pelatihan', ic: 'graduation-cap', warna: '#6D28D9', geo: false, ket: true, ph: 'Nama diklat / workshop & penyelenggara, mis. Workshop Kurikulum Merdeka LPMP', info: 'Mengikuti Diklat, kursus, atau workshop kedinasan.' },
  APEL: { label: 'Apel', judul: 'Apel & Kegiatan Kedinasan', sub: 'Apel & kegiatan dinas', ic: 'flag', warna: '#B91C1C', geo: false, ket: true, ph: 'Nama kegiatan & tempat, mis. Apel HUT Kabupaten di Alun-alun', info: 'Kegiatan kedinasan seperti apel, upacara, atau festival kabupaten.' }
};
var PEG_KODE = ['WFO', 'DINAS_LUAR', 'DINAS_DALAM', 'DIKLAT', 'APEL'];
var PEG_STATUS_KAT = { 'Hadir': 'WFO', 'Dinas Dalam': 'DINAS_DALAM', 'Dinas Luar': 'DINAS_LUAR', 'Diklat': 'DIKLAT', 'Apel': 'APEL' };
var PEG_ABSEN = { Sakit: { ic: 'thermometer', warna: '#BE123C', info: 'Surat keterangan dokter / fasilitas kesehatan' }, Izin: { ic: 'hand', warna: '#B45309', info: 'Surat izin / keterangan resmi bertanda tangan' }, Cuti: { ic: 'palmtree', warna: '#0369A1', info: 'Surat cuti yang disetujui atasan / dinas' } };
var PEG_MENU = [
  { k: 'WFO' }, { k: 'DINAS_LUAR' }, { k: 'DINAS_DALAM' }, { k: 'DIKLAT' }, { k: 'APEL' },
  { k: 'riwayat', label: 'Riwayat', ic: 'history', warna: '#475569', info: 'Rekam jejak kehadiran' },
  { k: 'aktivitas', label: 'Aktifitas', ic: 'clipboard-list', warna: '#15803D', info: 'Laporan kegiatan harian' },
  { k: 'izin', label: 'Tidak Hadir', ic: 'calendar-x-2', warna: '#BE123C', info: 'Izin, sakit, atau cuti' },
  { k: 'pegawai', label: 'Pegawai', ic: 'id-card', warna: '#1D4ED8', info: 'Profil & pengaturan akun' }
];
var PresensiLama = Pages.guru.presensi;                 // halaman v3.2 (dipakai bila backend belum v3.3)

function pegKatDari(status) { return PEG_STATUS_KAT[status || 'Hadir'] || ''; }
function katBadge(status, kecil) {
  var k = pegKatDari(status);
  if (k) return '<span class="kat-bdg' + (kecil ? ' sm' : '') + '" style="--k:' + PEG_KAT[k].warna + '">' + ic(PEG_KAT[k].ic) + esc(PEG_KAT[k].label) + '</span>';
  var t = PEG_ABSEN[status];
  if (t) return '<span class="kat-bdg' + (kecil ? ' sm' : '') + '" style="--k:' + t.warna + '">' + ic(t.ic) + esc(status) + '</span>';
  return '<span class="bdg">' + esc(status || '-') + '</span>';
}
function izinBadge(s) { return '<span class="bdg dot ' + ({ Menunggu: 'amber', Disetujui: 'ok', Ditolak: 'bad', Dibatalkan: '' }[s] || '') + '">' + esc(s) + '</span>'; }
function tglTambah(t, n) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(new Date(t + 'T12:00:00+07:00').getTime() + n * 864e5)); }
function rentangTgl(a, b) { return a === b || !b ? tglIndo(a, true) : tglIndo(a, true) + ' – ' + tglIndo(b, true); }
/** Status hari ini dari baris presensi ringkas */
function statusHari(hi) {
  if (!hi) return 'belum';
  if (hi.jam_masuk && hi.jam_pulang) return 'lengkap';
  if (hi.jam_masuk) return 'masuk';
  if (PEG_ABSEN[hi.status]) return 'tidakhadir';
  return 'belum';
}
function pegKepala(el, judul, sub, acts) {
  return '<a href="#/presensi" class="small b back-link">' + ic('arrow-left') + ' PRESENSI PEGAWAI</a>' + pageHead((isSA() ? 'Super Admin' : 'Panel Guru') + ' <span>/ Presensi Pegawai</span>', judul, sub, acts);
}

/** Widget GPS untuk kategori di luar kantor: posisi tetap dicatat, tanpa syarat radius */
function gpsWidget(el, opt) {
  opt = opt || {};
  var st = { pos: null, err: '', simulasi: DEMO };
  el.innerHTML = '<div class="geo"><div class="radar"><span class="pulse" data-g="p">' + ic('locate') + '</span><div class="grow"><b data-g="t">Membaca lokasi…</b><div class="small" data-g="s">Izinkan akses lokasi saat diminta browser.</div></div>' +
    '<button class="btn btn-soft btn-sm" type="button" data-g="re">' + ic('refresh-cw') + '<span class="hide-m">Cek ulang</span></button></div>' +
    (DEMO ? '<label class="chk small mt8"><input type="checkbox" data-g="sim" checked> Mode demo: simulasikan lokasi tugas (±2 km dari sekolah)</label>' : '') + '</div>';
  var q = function (k) { return el.querySelector('[data-g="' + k + '"]'); };
  async function cek() {
    var p = q('p'); if (!p) return;
    p.className = 'pulse'; p.innerHTML = ic('locate'); q('t').textContent = 'Membaca lokasi…'; q('s').textContent = 'Mohon tunggu, akurasi terbaik di area terbuka.';
    try {
      var l = Geo.lokasi()[0];
      st.pos = st.simulasi && DEMO && l ? { lat: Number(l.latitude) + 0.018, lng: Number(l.longitude) + 0.006, acc: 15, sim: true } : await getPosition(20000);
      st.err = '';
      var dekat = Geo.hitung(st.pos)[0];
      p.className = 'pulse ok'; p.innerHTML = ic('map-pin-check');
      q('t').innerHTML = 'Lokasi terbaca <span class="xs muted mono">' + st.pos.lat.toFixed(5) + ', ' + st.pos.lng.toFixed(5) + '</span>';
      q('s').textContent = 'Akurasi ±' + st.pos.acc + ' m' + (dekat ? ' • ' + fmtJarak(dekat.jarak) + ' dari ' + dekat.nama : '') + (st.pos.sim ? ' • simulasi' : '') + ' — tercatat sebagai lokasi tugas.';
    } catch (e) { st.pos = null; st.err = e.message; p.className = 'pulse bad'; p.innerHTML = ic('map-pin-off'); q('t').textContent = 'Lokasi tidak terbaca'; q('s').textContent = e.message; }
    opt.onChange && opt.onChange(st);
  }
  q('re').onclick = cek;
  if (q('sim')) q('sim').onchange = function () { st.simulasi = this.checked; cek(); };
  cek();
  return { state: st, refresh: cek };
}

// =====================================================================
// HALAMAN PRESENSI PEGAWAI (guru & Super Admin yang terhubung data guru)
// =====================================================================
registerPage('guru', 'presensi', {
  title: 'Presensi Pegawai', gurux: true, alwaysRender: true,
  st: { riwKat: '', bulan: '' },
  render: function (el, param) {
    var self = this;
    if (this.lama) return PresensiLama.render.call(PresensiLama, el);
    param = param || '';
    var sub = { riwayat: 1, aktivitas: 1, izin: 1, pegawai: 1 }[param] ? param : '';
    this.view = sub;
    if (sub === 'riwayat') return this.riwayat(el);
    if (sub === 'aktivitas') return this.aktivitas(el);
    if (sub === 'izin') return this.izin(el);
    if (sub === 'pegawai') return this.pegawai(el);
    el.innerHTML = '<div class="sk" style="height:60px;max-width:420px"></div><div class="grid g-main-r mt24"><div class="sk" style="height:300px"></div><div class="sk" style="height:300px"></div></div>';
    var buka = param === 'menu', sudah = false;
    this.muat(el, function () {
      if (self.view !== '' || currentRoute().name !== 'presensi') return;
      self.beranda(el);
      if (buka && !sudah) {                                        // #/presensi/menu → buka pop-up sekali, lalu alamat kembali ke #/presensi
        sudah = true;
        try { history.replaceState(null, '', '#/presensi'); } catch (e) {}
        if (!_modals.length) self.menu(el);
      }
    });
  },
  muat: function (el, cb, paksa) {
    var self = this;
    return swr('a:pegawai.ringkas', 'pegawai.ringkas', {}, function (d) { self.d = d; cb(d); }, { fresh: 15000, force: !!paksa, onError: function (r) {
      if (backendLama(r)) { self.lama = true; PresensiLama.render.call(PresensiLama, el); return; }
      el.innerHTML = pegKepala(el, 'Presensi Pegawai', '') + errorBox(r.message);
    } });
  },
  segarkan: function (el) { Store.del(userKey('a:pegawai.ringkas')); Store.del(userKey('a:presensi.saya')); this.render(el, this.view); },
  // ------------------------------------------------------------ beranda
  beranda: function (el) {
    var self = this, d = this.d || {}, hi = d.hariIni, s = statusHari(hi), k = hi ? pegKatDari(hi.status) : '', K = k ? PEG_KAT[k] : null, bi = d.bulanIni || {};
    var tombol = s === 'belum' ? ['fingerprint', 'PRESENSI MASUK', 'btn-dark', 'Pilih kategori: WFO, Dinas Luar, Dinas Dalam, Diklat, atau Apel'] :
      s === 'masuk' ? ['log-out', 'PRESENSI PULANG', 'btn-accent', 'Pulang mulai pukul ' + (d.jamPulang || '15:00') + ' • ' + (K ? K.label : '')] :
      s === 'tidakhadir' ? ['fingerprint', 'TETAP PRESENSI MASUK', 'btn-outline', 'Hari ini tercatat ' + hi.status + ' — tekan bila ternyata hadir'] : null;
    el.innerHTML = pageHead((isSA() ? 'Super Admin' : 'Panel Guru') + ' <span>/ Presensi Pegawai</span>', 'Presensi Pegawai', 'Pilih kategori lokasi kerja saat presensi. Jam masuk ' + (d.jamMasuk || '07:00') + ' • pulang ' + (d.jamPulang || '15:00') + ' WIB.',
      '<button class="btn btn-outline" id="pgRef">' + ic('refresh-cw') + 'Segarkan</button><button class="btn btn-primary" id="pgMenu">' + ic('layout-grid') + 'Menu Presensi</button>') +
      '<div class="grid g-main-r"><div class="card peg-hari"><div class="card-h"><div class="grow"><h3>Presensi Hari Ini</h3><p>' + esc(tglHari(todayStr())) + '</p></div>' +
      (s === 'lengkap' ? '<span class="bdg ok">' + ic('circle-check') + 'Lengkap</span>' : s === 'masuk' ? '<span class="bdg info">Sudah masuk</span>' : s === 'tidakhadir' ? katBadge(hi.status) : '<span class="bdg warn">Belum presensi</span>') + '</div><div class="card-b">' +
      '<div class="grid g2" style="gap:10px"><div class="list-i"><span class="ic">' + ic('log-in') + '</span><div class="grow"><small>Masuk</small><b class="peg-jam">' + (hi && hi.jam_masuk ? esc(jam5(hi.jam_masuk)) : '--:--') + '</b>' + (hi && hi.terlambat === 'YA' ? '<span class="bdg warn">Terlambat</span>' : '') + '</div></div>' +
      '<div class="list-i"><span class="ic">' + ic('log-out') + '</span><div class="grow"><small>Pulang</small><b class="peg-jam">' + (hi && hi.jam_pulang ? esc(jam5(hi.jam_pulang)) : '--:--') + '</b></div></div></div>' +
      (hi && (hi.jam_masuk || PEG_ABSEN[hi.status]) ? '<div class="row wrap gap8 mt12">' + katBadge(hi.status) + (hi.lokasi_id === 'MANUAL' ? '<span class="bdg">' + ic('user-cog') + 'Dicatat Super Admin</span>' : '') + (hi.keterangan ? '<span class="small muted">' + esc(hi.keterangan) + '</span>' : '') + '</div>' : '') +
      (tombol ? '<button class="btn ' + tombol[2] + ' btn-lg btn-block mt16" id="pgGo">' + ic(tombol[0]) + tombol[1] + '</button><div class="xs muted tc mt8">' + esc(tombol[3]) + '</div>' : '<div class="note ok mt16">' + ic('circle-check') + '<div>Presensi hari ini sudah lengkap. Terima kasih!</div></div>') +
      (d.izinMenunggu ? '<a class="note warn mt12" href="#/presensi/izin" style="text-decoration:none">' + ic('hourglass') + '<div>' + d.izinMenunggu + ' pengajuan tidak hadir menunggu persetujuan Super Admin.</div></a>' : '') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><div class="grow"><h3>Menu Pegawai</h3><p>Ketuk salah satu menu</p></div></div><div class="card-b">' + this.grid(s, k, true) + '</div></div></div>' +
      '<div class="card mt24"><div class="card-h"><div class="grow"><h3>Rekap Bulan Ini</h3><p>' + esc(BULAN[Number(todayStr().slice(5, 7)) - 1] + ' ' + todayStr().slice(0, 4)) + ' • ' + (d.hariKerjaBulanIni || 0) + ' hari hadir</p></div><a class="small b" href="#/presensi/riwayat">Riwayat lengkap ›</a></div><div class="card-b"><div class="peg-rekap">' +
      PEG_KODE.map(function (x) { return '<button type="button" class="peg-rk" data-rk="' + x + '" style="--k:' + PEG_KAT[x].warna + '">' + ic(PEG_KAT[x].ic) + '<b>' + (bi[x] || 0) + '</b><small>' + esc(PEG_KAT[x].label) + '</small></button>'; }).join('') +
      Object.keys(PEG_ABSEN).map(function (x) { return '<button type="button" class="peg-rk" data-rk="' + x + '" style="--k:' + PEG_ABSEN[x].warna + '">' + ic(PEG_ABSEN[x].ic) + '<b>' + (bi[x] || 0) + '</b><small>' + x + '</small></button>'; }).join('') + '</div>' +
      ((d.izinTerakhir || []).length ? '<div class="xs b muted mt16">PENGAJUAN TIDAK HADIR TERAKHIR</div>' + d.izinTerakhir.map(function (x) { return '<div class="list-i mt8">' + katBadge(x.jenis, true) + '<div class="grow small"><b>' + esc(rentangTgl(x.tanggal_mulai, x.tanggal_selesai)) + '</b> <span class="muted">(' + x.jumlah_hari + ' hari)</span></div>' + izinBadge(x.status) + '</div>'; }).join('') : '') +
      '</div></div>';
    $('#pgRef', el).onclick = function () { self.segarkan(el); };
    $('#pgMenu', el).onclick = function () { self.menu(el); };
    if ($('#pgGo', el)) $('#pgGo', el).onclick = function () { if (s === 'masuk') self.alur(el, k || 'WFO', 'pulang'); else self.menu(el); };
    this.pasangGrid(el, el, null);
    $$('[data-rk]', el).forEach(function (b) { b.onclick = function () { self.st.riwKat = b.dataset.rk; go('presensi', 'riwayat'); }; });
    if (!this._pre) {                                              // turbo: saat senggang, isi cache Aktifitas & Tidak Hadir (1 eksekusi gabungan)
      this._pre = 1;
      (window.requestIdleCallback || function (f) { return setTimeout(f, 1200); })(function () {
        var nop = function () {};
        apiLR('aktivitas.saya', { bulan: self.st.bulan || todayStr().slice(0, 7) }, nop); apiLR('izin.saya', {}, nop);
      });
    }
  },
  /** Grid 9 menu (dipakai di pop-up & beranda) */
  grid: function (s, k, ringkas) {
    return '<div class="peg-menu' + (ringkas ? ' ringkas' : '') + '">' + PEG_MENU.map(function (m) {
      var K = PEG_KAT[m.k], kat = !!K, label = kat ? K.label : m.label, warna = kat ? K.warna : m.warna, icon = kat ? K.ic : m.ic, info = kat ? K.sub : m.info;
      var dipakai = kat && k === m.k && (s === 'masuk' || s === 'lengkap'), kunci = kat && !dipakai && (s === 'masuk' || s === 'lengkap');
      return '<button type="button" class="peg-tile' + (dipakai ? ' dipakai' : '') + (kunci ? ' kunci' : '') + '" data-menu="' + m.k + '" style="--k:' + warna + '"' + (kunci ? ' aria-disabled="true"' : '') + '>' +
        '<span class="pt-ic">' + ic(icon) + (dipakai ? '<i class="pt-ok">' + ic('check') + '</i>' : '') + '</span><b>' + esc(label) + '</b><small>' + esc(dipakai ? (s === 'lengkap' ? 'Tercatat' : 'Aktif hari ini') : info) + '</small></button>';
    }).join('') + '</div>';
  },
  pasangGrid: function (el, root, m) {
    var self = this;
    $$('[data-menu]', root).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.menu, d = self.d || {}, s = statusHari(d.hariIni);
        if (PEG_KAT[k]) {
          if (s === 'masuk') { var kk = pegKatDari(d.hariIni.status); if (kk === k) { if (m) m.close(); return self.alur(el, k, 'pulang'); } return toast('Anda sudah presensi masuk (' + PEG_KAT[kk].label + ') pukul ' + jam5(d.hariIni.jam_masuk) + '. Gunakan tombol Presensi Pulang.', 'warn'); }
          if (s === 'lengkap') return toast('Presensi hari ini sudah lengkap.', 'ok');
          if (m) m.close();
          return self.alur(el, k, 'masuk');
        }
        if (m) m.close();
        go('presensi', k);
      };
    });
  },
  /** Pop-up menu presensi */
  menu: function (el) {
    var self = this, d = this.d || {}, hi = d.hariIni, s = statusHari(hi), k = hi ? pegKatDari(hi.status) : '';
    var m = modal({ title: 'Menu Presensi', sub: tglHari(todayStr()) + ' • pukul ' + nowHM() + ' WIB', size: 'md',
      body: '<div class="peg-strip ' + s + '">' + ic(s === 'lengkap' ? 'circle-check' : s === 'masuk' ? 'log-in' : s === 'tidakhadir' ? 'calendar-x-2' : 'clock') + '<div class="grow"><b>' +
        (s === 'belum' ? 'Belum presensi hari ini' : s === 'masuk' ? 'Masuk ' + esc(jam5(hi.jam_masuk)) + ' • ' + esc(PEG_KAT[k || 'WFO'].label) : s === 'lengkap' ? 'Presensi lengkap (' + esc(jam5(hi.jam_masuk)) + '–' + esc(jam5(hi.jam_pulang)) + ')' : 'Tercatat ' + esc(hi.status)) + '</b><small>' +
        (s === 'belum' || s === 'tidakhadir' ? 'Pilih kategori lokasi kerja Anda di bawah.' : s === 'masuk' ? 'Presensi pulang mulai ' + esc(d.jamPulang || '15:00') + ' WIB.' : 'Terima kasih atas kehadiran Anda.') + '</small></div>' +
        (s === 'masuk' ? '<button class="btn btn-accent btn-sm" type="button" id="pmPulang">' + ic('log-out') + 'Pulang</button>' : '') + '</div>' +
        '<div class="xs b muted mt16 mb8">KATEGORI PRESENSI</div>' + this.grid(s, k, false),
      foot: '<button class="btn btn-outline" data-x>Tutup</button>' });
    this.pasangGrid(el, m.el, m);
    if ($('#pmPulang', m.el)) $('#pmPulang', m.el).onclick = function () { m.close(); self.alur(el, k || 'WFO', 'pulang'); };
  },
  /** Alur presensi masuk / pulang untuk satu kategori */
  alur: function (el, kode, jenis) {
    var self = this, K = PEG_KAT[kode] || PEG_KAT.WFO, d = this.d || {}, masuk = jenis === 'masuk';
    var selfie = masuk && (!K.geo || !!d.selfie), awal = !masuk && nowHM() < (d.jamPulang || '15:00'), perluKet = masuk ? K.ket : awal, pos = null, siapLok = false;
    var m = modal({ title: (masuk ? 'Presensi Masuk' : 'Presensi Pulang') + ' — ' + K.label, sub: K.info, size: 'md',
      body: '<div class="kat-head" style="--k:' + K.warna + '"><span class="pt-ic">' + ic(K.ic) + '</span><div class="grow"><b>' + esc(K.judul) + '</b><small>' + (K.geo ? 'Wajib berada di area sekolah / kantor (geofence).' : 'Boleh di luar kantor — lokasi GPS tetap dicatat' + (masuk ? ', wajib selfie & keterangan.' : '.')) + '</small></div></div>' +
        '<div id="paLok" class="mt12"></div>' +
        (perluKet ? '<div class="field mt16"><label for="paKet">' + (masuk ? 'Keterangan ' + esc(K.label) : 'Alasan pulang lebih awal') + ' <span class="req">*</span></label><textarea class="inp" id="paKet" rows="2" maxlength="200" placeholder="' + esc(masuk ? K.ph : 'Contoh: izin keperluan keluarga / dipanggil dinas') + '"></textarea><div class="hint">Minimal 5 karakter.</div></div>' : '') +
        (masuk && kode !== 'WFO' ? '<div class="mt12">' + berkasHtml({ id: 'paSurat', label: 'Surat tugas / undangan', hint: 'Opsional • foto atau PDF, maks 3 MB' }) + '</div>' : '') +
        (selfie ? '<div class="note mt12">' + ic('camera') + '<div>Presensi ' + esc(K.label) + ' wajib foto selfie — kamera depan terbuka setelah Anda menekan tombol presensi.</div></div>' : ''),
      foot: '<button class="btn btn-outline" data-x>Batal</button><button class="btn btn-dark" id="paGo" disabled>' + ic('fingerprint') + (masuk ? 'Presensi Masuk' : 'Presensi Pulang') + '</button>' });
    var go2 = $('#paGo', m.el), surat = $('[data-berkas="paSurat"]', m.el) ? berkasPasang(m.el, 'paSurat') : null;
    var atur = function (ok, p) { pos = p; siapLok = ok; go2.disabled = !ok; };
    if (K.geo) Geo.widget($('#paLok', m.el), { onChange: function (st) { atur(!!(st.best && st.best.ok), st.pos); } });
    else gpsWidget($('#paLok', m.el), { onChange: function (st) { atur(!!st.pos, st.pos); } });
    go2.onclick = async function () {
      var ket = $('#paKet', m.el) ? $('#paKet', m.el).value.trim() : '';
      if (perluKet && ket.length < 5) { toast(masuk ? 'Isi keterangan ' + K.label + ' (tujuan / nama kegiatan / tempat).' : 'Isi alasan pulang lebih awal.', 'warn'); $('#paKet', m.el).focus(); return; }
      if (!siapLok || !pos) return toast('Lokasi belum terbaca.', 'warn');
      var data = { kategori: kode, jenis: jenis, lat: pos.lat, lng: pos.lng, acc: pos.acc, keterangan: ket, device_info: Device.info() };
      if (surat && surat.ada()) data.surat = await surat.ambil();
      if (selfie) { data.foto = await ambilSelfie('Selfie Presensi ' + K.label); if (!data.foto) return; }
      btnBusy(go2, true);
      var r = await api('presensi.pegawai', data);
      btnBusy(go2, false);
      if (!r.success) return toast(pesanV33(r.message), 'bad');
      toast(r.message, 'ok');
      m.close();
      akunInfo().presensiHariIni = r.data.row;
      if (self.d) self.d.hariIni = r.data.row;
      self.segarkan(el);
      afterWrite();
    };
  },
  // ------------------------------------------------------------ riwayat
  riwayat: function (el) {
    var self = this, st = this.st;
    el.innerHTML = pegKepala(el, 'Riwayat Kehadiran', 'Rekam jejak presensi 60 hari terakhir beserta kategori lokasi kerja.', '<button class="btn btn-outline" id="rwCsv">' + ic('download') + 'Unduh CSV</button>') +
      '<div class="grid g4" id="rwKpi">' + '<div class="sk" style="height:120px"></div>'.repeat(4) + '</div><div class="card mt16"><div class="chips" id="rwChips" style="padding:16px 20px"></div><div id="rwTbl"><div class="sk" style="height:200px;margin:0 20px 20px"></div></div></div>';
    var gambar = function (d) {
      var rows = d.rows || [], kat = (d.ringkas || {}).kategori || {}, r = d.ringkas || {};
      var dinas = (kat.DINAS_LUAR || 0) + (kat.DINAS_DALAM || 0), lain = (kat.DIKLAT || 0) + (kat.APEL || 0), tidak = (kat.Sakit || 0) + (kat.Izin || 0) + (kat.Cuti || 0);
      $('#rwKpi', el).innerHTML = kpi('Hadir Bulan Ini', fmtN(r.hadir || 0) + '<small>hari</small>', (kat.WFO || 0) + ' WFO • ' + (r.terlambat || 0) + ' terlambat', 'user-round-check') +
        kpi('Dinas Dalam & Luar', fmtN(dinas) + '<small>hari</small>', (kat.DINAS_DALAM || 0) + ' dalam • ' + (kat.DINAS_LUAR || 0) + ' luar', 'car-front', 'amber') +
        kpi('Diklat & Apel', fmtN(lain) + '<small>hari</small>', (kat.DIKLAT || 0) + ' diklat • ' + (kat.APEL || 0) + ' apel', 'graduation-cap') +
        kpi('Tidak Hadir', fmtN(tidak) + '<small>hari</small>', (kat.Sakit || 0) + ' sakit • ' + (kat.Izin || 0) + ' izin • ' + (kat.Cuti || 0) + ' cuti', 'calendar-x-2', 'red');
      var ada = {}; rows.forEach(function (p) { ada[pegKatDari(p.status) || p.status] = (ada[pegKatDari(p.status) || p.status] || 0) + 1; });
      $('#rwChips', el).innerHTML = '<button class="chip ' + (!st.riwKat ? 'on' : '') + '" data-ck="">Semua <i>' + rows.length + '</i></button>' + PEG_KODE.concat(Object.keys(PEG_ABSEN)).filter(function (x) { return ada[x]; }).map(function (x) {
        return '<button class="chip ' + (st.riwKat === x ? 'on' : '') + '" data-ck="' + x + '">' + esc(PEG_KAT[x] ? PEG_KAT[x].label : x) + ' <i>' + ada[x] + '</i></button>'; }).join('');
      var tampil = rows.filter(function (p) { return !st.riwKat || (pegKatDari(p.status) || p.status) === st.riwKat; });
      $('#rwTbl', el).innerHTML = tampil.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Masuk</th><th>Pulang</th><th class="hide-m">Lokasi</th><th>Keterangan</th></tr></thead><tbody>' + tampil.map(function (p) {
        return '<tr><td class="nowrap">' + esc(hariDari(p.tanggal).slice(0, 3)) + ', ' + esc(tglIndo(p.tanggal, true)) + '</td><td>' + katBadge(p.status, true) + '</td><td class="mono">' + esc(jam5(p.jam_masuk) || '-') + (p.terlambat === 'YA' ? ' <span class="bdg warn">Terlambat</span>' : '') + '</td><td class="mono">' + esc(jam5(p.jam_pulang) || '-') + '</td>' +
          '<td class="hide-m small">' + (p.lokasi_id === 'MANUAL' ? 'Manual (Super Admin)' : p.lokasi_id === 'LUAR' ? 'Luar kantor' : p.jarak_m !== '' && p.jarak_m != null ? p.jarak_m + ' m' : '-') + '</td><td class="small muted">' + esc(p.keterangan || '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : emptyHtml('Belum ada riwayat', st.riwKat ? 'Tidak ada data untuk kategori ini.' : '', 'calendar');
      $$('[data-ck]', el).forEach(function (b) { b.onclick = function () { st.riwKat = b.dataset.ck; gambar(d); }; });
      $('#rwCsv', el).onclick = function () { downloadCSV('riwayat-presensi-' + todayStr() + '.csv', ['Tanggal', 'Kategori', 'Masuk', 'Pulang', 'Terlambat', 'Jarak (m)', 'Keterangan'], rows.map(function (p) { return [p.tanggal, PEG_KAT[pegKatDari(p.status)] ? PEG_KAT[pegKatDari(p.status)].label : p.status, jam5(p.jam_masuk), jam5(p.jam_pulang), p.terlambat, p.jarak_m, p.keterangan]; })); };
    };
    swr('a:presensi.saya', 'presensi.saya', {}, gambar, { fresh: 20000, onError: function (r) { $('#rwTbl', el).innerHTML = errorBox(r.message); } });
  },
  // ------------------------------------------------------------ aktivitas harian
  aktivitas: function (el) {
    var self = this, st = this.st;
    if (!st.bulan) st.bulan = todayStr().slice(0, 7);
    el.innerHTML = pegKepala(el, 'Aktifitas Harian', 'Catat kegiatan & kinerja harian (maks. 30 hari ke belakang). Bisa melampirkan foto / dokumen bukti.', '<button class="btn btn-dark" id="akBaru">' + ic('plus') + 'Catat Aktivitas</button>') +
      '<div class="card"><div class="toolbar"><div class="field"><label class="lbl">Bulan</label><input class="inp" type="month" id="akBln" value="' + esc(st.bulan) + '" max="' + todayStr().slice(0, 7) + '"></div><span class="grow"></span><span class="small muted" id="akInfo"></span></div><div id="akList" class="card-b"><div class="sk" style="height:200px"></div></div></div>';
    $('#akBaru', el).onclick = function () { self.formAktivitas(el, null); };
    $('#akBln', el).onchange = function () { st.bulan = this.value || todayStr().slice(0, 7); self.aktivitas(el); };
    apiLR('aktivitas.saya', { bulan: st.bulan }, function (r) {
      var box = $('#akList', el); if (!box) return;
      if (!r.success) { box.innerHTML = errorBox(pesanV33(r.message)); return; }
      var rows = r.data.rows || [], per = {}; self.akRows = rows;
      rows.forEach(function (a) { (per[a.tanggal] = per[a.tanggal] || []).push(a); });
      $('#akInfo', el).textContent = rows.length + ' aktivitas • ' + Object.keys(per).length + ' hari';
      var batas = tglTambah(todayStr(), -30);
      box.innerHTML = rows.length ? Object.keys(per).sort().reverse().map(function (t) {
        return '<div class="ak-hari"><div class="xs b muted">' + esc(tglHari(t).toUpperCase()) + '</div>' + per[t].map(function (a) {
          return '<div class="ak-item"><div class="ak-jam mono">' + esc(a.jam_mulai || '--:--') + (a.jam_selesai ? '<br>' + esc(a.jam_selesai) : '') + '</div><div class="grow"><b>' + esc(a.kegiatan) + '</b>' + (a.uraian ? '<p class="small">' + esc(a.uraian) + '</p>' : '') + (a.hasil ? '<div class="small"><span class="muted">Hasil:</span> ' + esc(a.hasil) + '</div>' : '') +
            '<div class="row wrap gap4 mt8">' + (a.lampiran_id ? '<button class="btn btn-soft btn-xs" data-lamp="' + esc(a.lampiran_id) + '">' + ic('paperclip') + 'Lampiran</button>' : '') + (String(a.tanggal) >= batas ? '<button class="btn btn-ghost btn-xs" data-ake="' + esc(a.aktivitas_id) + '">' + ic('pencil') + 'Ubah</button><button class="btn btn-ghost btn-xs red" data-akh="' + esc(a.aktivitas_id) + '">' + ic('trash-2') + 'Hapus</button>' : '') + '</div></div></div>';
        }).join('') + '</div>';
      }).join('') : emptyHtml('Belum ada aktivitas bulan ini', 'Catat kegiatan harian Anda: mengajar, rapat, piket, pembinaan, dll.', 'clipboard-list');
      $$('[data-lamp]', box).forEach(function (b) { b.onclick = function () { lihatBukti(b.dataset.lamp, 'Lampiran Aktivitas'); }; });
      $$('[data-ake]', box).forEach(function (b) { b.onclick = function () { self.formAktivitas(el, rows.filter(function (a) { return a.aktivitas_id === b.dataset.ake; })[0]); }; });
      $$('[data-akh]', box).forEach(function (b) { b.onclick = async function () {
        if (!await confirmBox('Hapus aktivitas ini?', { danger: true, ok: 'Hapus' })) return;
        btnBusy(b, true); var x = await api('aktivitas.hapus', { aktivitas_id: b.dataset.akh }); btnBusy(b, false);
        if (toastRes(x)) self.aktivitas(el);
      }; });
    });
  },
  formAktivitas: function (el, a) {
    var self = this; a = a || {};
    var m = modal({ title: a.aktivitas_id ? 'Ubah Aktivitas' : 'Catat Aktivitas Harian', sub: 'Laporan kinerja harian pegawai', size: 'md',
      body: '<div class="grid-form"><div class="field c4"><label>Tanggal</label><input class="inp" type="date" name="tanggal" value="' + esc(a.tanggal || todayStr()) + '" min="' + tglTambah(todayStr(), -30) + '" max="' + todayStr() + '"></div>' +
        '<div class="field c4"><label>Jam mulai</label><input class="inp" type="time" name="jam_mulai" value="' + esc(a.jam_mulai || '') + '"></div><div class="field c4"><label>Jam selesai</label><input class="inp" type="time" name="jam_selesai" value="' + esc(a.jam_selesai || '') + '"></div>' +
        '<div class="field"><label>Kegiatan <span class="req">*</span></label><input class="inp" name="kegiatan" maxlength="120" value="' + esc(a.kegiatan || '') + '" placeholder="Mengajar Matematika X-A, rapat MGMP, piket, pembinaan siswa…"></div>' +
        '<div class="field"><label>Uraian</label><textarea class="inp" name="uraian" rows="3" maxlength="1000" placeholder="Rincian kegiatan yang dilakukan">' + esc(a.uraian || '') + '</textarea></div>' +
        '<div class="field"><label>Hasil / output</label><input class="inp" name="hasil" maxlength="300" value="' + esc(a.hasil || '') + '" placeholder="Mis. 32 siswa tuntas KD 3.1, notulen rapat"></div>' +
        '<div class="field">' + berkasHtml({ id: 'akLamp', label: a.lampiran_id ? 'Ganti lampiran' : 'Lampiran bukti', hint: 'Foto kegiatan / dokumen • maks 3 MB' }) + '</div></div>',
      foot: '<button class="btn btn-outline" data-x>Batal</button><button class="btn btn-primary" id="akSave">' + ic('save') + 'Simpan</button>' });
    var lamp = berkasPasang(m.el, 'akLamp');
    $('#akSave', m.el).onclick = async function () {
      var f = formData(m.el);
      if (f.kegiatan.length < 3) return toast('Isi nama kegiatan.', 'warn');
      var data = { aktivitas_id: a.aktivitas_id || '', tanggal: f.tanggal, jam_mulai: f.jam_mulai, jam_selesai: f.jam_selesai, kegiatan: f.kegiatan, uraian: f.uraian, hasil: f.hasil };
      if (lamp.ada()) data.lampiran = await lamp.ambil();
      btnBusy(this, true); var r = await api('aktivitas.simpan', data); btnBusy(this, false);
      if (!r.success) return toast(pesanV33(r.message), 'bad');
      toast(r.message, 'ok'); m.close(); self.st.bulan = String(f.tanggal).slice(0, 7); Store.del(userKey('a:pegawai.ringkas')); self.aktivitas(el);
    };
  },
  // ------------------------------------------------------------ tidak hadir (izin / sakit / cuti)
  izin: function (el) {
    var self = this, jenis = 'Sakit';
    el.innerHTML = pegKepala(el, 'Tidak Hadir', 'Ajukan izin, sakit, atau cuti dengan surat keterangan. Setelah disetujui Super Admin, tanggal tersebut otomatis tercatat di presensi.') +
      '<div class="grid g-main-r"><div class="card"><div class="card-h"><div class="grow"><h3>' + ic('file-up') + ' Ajukan Tidak Hadir</h3><p>Wajib melampirkan bukti</p></div></div><div class="card-b">' +
      '<div class="izn-jenis" id="izJenis">' + Object.keys(PEG_ABSEN).map(function (k) { return '<button type="button" data-j="' + k + '" class="' + (k === jenis ? 'on' : '') + '" style="--k:' + PEG_ABSEN[k].warna + '">' + ic(PEG_ABSEN[k].ic) + '<b>' + k + '</b></button>'; }).join('') + '</div>' +
      '<div class="small muted mt8" id="izInfo">' + esc(PEG_ABSEN[jenis].info) + '</div>' +
      '<div class="grid-form mt12"><div class="field c6"><label>Dari tanggal</label><input class="inp" type="date" id="izDari" value="' + todayStr() + '" min="' + tglTambah(todayStr(), -30) + '"></div><div class="field c6"><label>Sampai tanggal</label><input class="inp" type="date" id="izSampai" value="' + todayStr() + '" min="' + tglTambah(todayStr(), -30) + '"></div>' +
      '<div class="field"><label>Alasan / keterangan <span class="req">*</span></label><textarea class="inp" id="izAlasan" rows="2" maxlength="300" placeholder="Mis. demam, rawat jalan di Puskesmas"></textarea></div>' +
      '<div class="field">' + berkasHtml({ id: 'izBukti', label: 'Surat keterangan (suket)', wajib: true, kamera: false, hint: 'Foto / scan surat • JPG, PNG, PDF maks 3 MB' }) + '</div></div>' +
      '<div class="xs muted mt8" id="izHari"></div><button class="btn btn-dark btn-block mt16" id="izKirim">' + ic('send') + 'Kirim Pengajuan</button></div></div>' +
      '<div class="card"><div class="card-h"><div class="grow"><h3>' + ic('history') + ' Pengajuan Saya</h3><p>Status persetujuan Super Admin</p></div></div><div class="card-b" id="izList"><div class="sk" style="height:200px"></div></div></div></div>';
    var bukti = berkasPasang(el, 'izBukti');
    var hitung = function () {
      var a = $('#izDari', el).value, b = $('#izSampai', el).value, n = 0, t = a;
      if (!a || !b || b < a) { $('#izHari', el).textContent = ''; return; }
      for (var i = 0; t <= b && i < 70; i++) { if (hariDari(t) !== 'Minggu') n++; t = tglTambah(t, 1); }
      $('#izHari', el).textContent = n + ' hari kerja (Minggu tidak dihitung).';
    };
    $('#izJenis', el).onclick = function (e) { var b = e.target.closest('[data-j]'); if (!b) return; jenis = b.dataset.j; $$('#izJenis button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); $('#izInfo', el).textContent = PEG_ABSEN[jenis].info; };
    $('#izDari', el).onchange = function () { if ($('#izSampai', el).value < this.value) $('#izSampai', el).value = this.value; hitung(); };
    $('#izSampai', el).onchange = hitung; hitung();
    $('#izKirim', el).onclick = async function () {
      var alasan = $('#izAlasan', el).value.trim();
      if (alasan.length < 5) return toast('Tuliskan alasan / keterangan.', 'warn');
      if (!bukti.ada()) return toast('Wajib unggah surat keterangan (suket).', 'warn');
      btnBusy(this, true);
      var r = await api('izin.ajukan', { jenis: jenis, dari: $('#izDari', el).value, sampai: $('#izSampai', el).value, alasan: alasan, bukti: await bukti.ambil() });
      btnBusy(this, false);
      if (!r.success) return toast(pesanV33(r.message), 'bad');
      toast(r.message, 'ok'); bukti.reset(); $('#izAlasan', el).value = ''; Store.del(userKey('a:pegawai.ringkas')); self.daftarIzin(el);
    };
    this.daftarIzin(el);
  },
  daftarIzin: function (el) {
    var self = this;
    apiLR('izin.saya', {}, function (r) {
      var box = $('#izList', el); if (!box) return;
      if (!r.success) { box.innerHTML = errorBox(pesanV33(r.message)); return; }
      var rows = r.data.rows || [];
      box.innerHTML = rows.length ? rows.map(function (x) {
        return '<div class="izn-item"><div class="row between gap8 wrap">' + katBadge(x.jenis) + izinBadge(x.status) + '</div><b class="mt8" style="display:block">' + esc(rentangTgl(x.tanggal_mulai, x.tanggal_selesai)) + ' <span class="small muted">(' + x.jumlah_hari + ' hari)</span></b>' +
          '<p class="small muted" style="margin:4px 0 0">' + esc(x.alasan) + '</p>' + (x.catatan_putusan ? '<div class="note ' + (x.status === 'Ditolak' ? 'bad' : '') + ' mt8 small">' + ic('message-square') + '<div>' + esc(x.catatan_putusan) + '</div></div>' : '') +
          '<div class="row wrap gap4 mt8"><button class="btn btn-soft btn-xs" data-bk="' + esc(x.bukti_id) + '">' + ic('paperclip') + 'Suket</button>' + (x.status === 'Menunggu' ? '<button class="btn btn-ghost btn-xs red" data-bt="' + esc(x.izin_id) + '">' + ic('x') + 'Batalkan</button>' : '') + '<span class="xs muted" style="margin-left:auto">' + esc(relTime(x.dibuat_pada)) + '</span></div></div>';
      }).join('') : emptyHtml('Belum ada pengajuan', 'Pengajuan izin, sakit, dan cuti tampil di sini.', 'calendar-x-2');
      $$('[data-bk]', box).forEach(function (b) { b.onclick = function () { lihatBukti(b.dataset.bk, 'Surat Keterangan'); }; });
      $$('[data-bt]', box).forEach(function (b) { b.onclick = async function () {
        if (!await confirmBox('Batalkan pengajuan ini?', { danger: true, ok: 'Batalkan' })) return;
        btnBusy(b, true); var x = await api('izin.batal', { izin_id: b.dataset.bt }); btnBusy(b, false);
        if (toastRes(x)) self.daftarIzin(el);
      }; });
    });
  },
  // ------------------------------------------------------------ profil pegawai & pengaturan akun
  pegawai: function (el) {
    var self = this;
    el.innerHTML = pegKepala(el, 'Pegawai', 'Profil pegawai, data diri, dan pengaturan akun.') + '<div id="pgBody"><div class="sk" style="height:260px"></div></div>';
    this.muat(el, function (d) {
      if (self.view !== 'pegawai' || !$('#pgBody', el)) return;
      var p = d.profil || {};
      $('#pgBody', el).innerHTML = '<div class="grid g2"><div class="card card-p"><div class="row gap16">' + avatar(p.nama || AppState.nama, p.foto, 'xl') + '<div><h3 style="font-size:20px">' + esc(p.nama || AppState.nama) + '</h3><div class="muted">' + esc(AppState.email) + '</div><div class="row gap4 mt8 wrap"><span class="bdg info">' + esc(p.jabatan || 'Guru') + '</span><span class="bdg ' + (p.status === 'Aktif' ? 'ok' : '') + '">' + esc(p.status || 'Aktif') + '</span>' + (isSA() ? '<span class="bdg navy">Super Admin</span>' : '') + '</div></div></div>' +
        '<dl class="kv-list mt24"><dt>NUPTK</dt><dd class="mono">' + esc(p.NUPTK || '-') + '</dd><dt>Mata pelajaran</dt><dd>' + esc(p.mata_pelajaran || '-') + '</dd><dt>Email data</dt><dd>' + esc(p.email || '-') + '</dd><dt>Jam kerja</dt><dd>' + esc(d.jamMasuk + ' – ' + d.jamPulang) + ' WIB</dd></dl>' +
        '<div class="field mt16"><label for="pgWa">No. WhatsApp</label><div class="row gap8"><input class="inp" id="pgWa" inputmode="tel" value="' + esc(p.no_wa || '') + '" placeholder="08xxxxxxxxxx"><button class="btn btn-primary" id="pgWaS">' + ic('save') + 'Simpan</button></div><div class="hint">Dipakai untuk notifikasi sekolah. Data lain diubah oleh Super Admin.</div></div>' +
        '<div class="row gap12 mt16 wrap"><button class="btn btn-outline" id="pgPw">' + ic('key-round') + 'Ganti Password</button><button class="btn btn-danger" id="pgOut">' + ic('log-out') + 'Keluar</button></div></div>' +
        '<div><div id="pgGeo"></div><div class="card card-p mt16" id="pgTema"></div></div></div>';
      $('#pgWaS', el).onclick = async function () { btnBusy(this, true); var r = await api('pegawai.profil.simpan', { no_wa: $('#pgWa', el).value }); btnBusy(this, false); if (toastRes(r)) { $('#pgWa', el).value = r.data.no_wa; Store.del(userKey('a:pegawai.ringkas')); afterWrite(); } };
      $('#pgPw', el).onclick = function () { gantiPassword(false); };
      $('#pgOut', el).onclick = async function () { if (await confirmBox('Keluar dari SIAKAD?', { ok: 'Keluar' })) logout(); };
      geoAkunCard($('#pgGeo', el), akunInfo());
      if (window.tampilanPanel) tampilanPanel($('#pgTema', el), true);
    });
  }
});
// Banner presensi di Dashboard guru → langsung buka pop-up menu presensi
document.addEventListener('click', function (e) {
  var a = e.target.closest('a.presensi-banner'); if (!a || Pages.guru.presensi.lama) return;
  if (a.classList.contains('done')) return;
  e.preventDefault(); go('presensi', 'menu');
});

// =====================================================================
// SUPER ADMIN — KEPEGAWAIAN & IZIN
// =====================================================================
registerPage('guru', 'kepegawaian', {
  title: 'Kepegawaian & Izin', sa: true, _keepScroll: true,
  st: { tab: 'izin', fStatus: 'Menunggu', q: '', akDari: '', akSampai: '', akGuru: '', rkDari: '', rkSampai: '' },
  init: function (el) {
    var self = this, st = this.st;
    el.innerHTML = pageHead('Super Admin <span>/ Kepegawaian</span>', 'Kepegawaian & Izin', 'Persetujuan izin, sakit & cuti beserta surat keterangan, absen manual guru yang lupa presensi, aktivitas harian, dan rekap kategori kehadiran.',
      '<button class="btn btn-outline" id="kpRef">' + ic('refresh-cw') + 'Segarkan</button>') +
      '<div class="grid g4" id="kpKpi">' + '<div class="sk" style="height:130px"></div>'.repeat(4) + '</div>' +
      '<div class="tabs mt24" id="kpTabs"><button data-t="izin">' + ic('file-check') + 'Persetujuan Izin <span class="bdg amber" id="kpN" hidden>0</span></button><button data-t="manual">' + ic('user-cog') + 'Absen Manual Guru</button><button data-t="aktivitas">' + ic('clipboard-list') + 'Aktivitas Pegawai</button><button data-t="rekap">' + ic('calendar-range') + 'Rekap Kategori</button></div>' +
      '<div id="kpBody" class="mt16"></div>';
    $$('#kpTabs button', el).forEach(function (b) { b.onclick = function () { st.tab = b.dataset.t; self.draw(el); }; });
    $('#kpRef', el).onclick = function () { if (window.LC) LC.hapus(function (k) { return /^lc:(izin|aktivitas)\./.test(k); }); Store.del(userKey('a:sa.monitor')); self._paksa = true; self.render(el, st.tab); };
  },
  render: function (el, param) {
    var self = this, paksa = !!this._paksa; this._paksa = false;   // segarkan paksa hanya dari tombol/aksi di halaman ini
    if (param && { izin: 1, manual: 1, aktivitas: 1, rekap: 1 }[param]) this.st.tab = param;
    swr('a:sa.monitor', 'sa.monitor', paksa ? { _fresh: true } : {}, function (d) { self.mon = d; self.kpi(el); if (self.st.tab === 'manual') self.draw(el); }, { fresh: 30000, force: !!paksa });
    this.muatIzin(el, paksa);
    apiLR('aktivitas.list', {}, function (r) { if (r.success) { self.akN = (r.data.rows || []).length; self.kpi(el); } });   // laporan 7 hari terakhir
    this.draw(el);
  },
  muatIzin: function (el) {
    var self = this;
    apiLR('izin.list', {}, function (r) {
      if (!r.success) { self.izinErr = pesanV33(r.message); if (self.st.tab === 'izin') self.draw(el); return; }
      self.izinErr = ''; self.izin = r.data; self.kpi(el);
      var n = (r.data.hitung || {}).Menunggu || 0, b = $('#kpN', el); if (b) { b.hidden = !n; b.textContent = n; }
      if (self.st.tab === 'izin') self.draw(el);
    });
  },
  kpi: function (el) {
    var m = this.mon || {}, r = m.ringkas || {}, h = (this.izin || {}).hitung || {}, guru = m.guru || [];
    var hadir = guru.filter(function (g) { return g.masuk; }), tidak = guru.filter(function (g) { return !g.masuk && PEG_ABSEN[g.status]; }).length, belum = guru.filter(function (g) { return !g.masuk && !PEG_ABSEN[g.status]; }).length;
    var luar = hadir.filter(function (g) { return g.status && g.status !== 'Hadir'; }).length;
    $('#kpKpi', el).innerHTML = kpi('Izin Menunggu', '<span class="' + (h.Menunggu ? 'amber' : '') + '">' + (h.Menunggu || 0) + '</span><small>pengajuan</small>', (h.Disetujui || 0) + ' disetujui • ' + (h.Ditolak || 0) + ' ditolak', 'hourglass', h.Menunggu ? 'amber' : '') +
      kpi('Hadir Hari Ini', (r.guruHadir || 0) + '<small>/ ' + (r.guruTotal || guru.length) + '</small>', luar + ' dinas / diklat / apel • ' + (r.guruTerlambat || 0) + ' terlambat', 'user-round-check') +
      kpi('Belum Presensi', '<span class="' + (belum ? 'red' : '') + '">' + belum + '</span><small>guru</small>', tidak + ' tercatat sakit / izin / cuti', 'user-x', belum ? 'red' : '') +
      kpi('Aktivitas Pegawai', this.akN == null ? '–' : fmtN(this.akN), 'laporan 7 hari terakhir', 'clipboard-list');
  },
  draw: function (el) {
    var st = this.st;
    $$('#kpTabs button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.tab); });
    var box = $('#kpBody', el);
    if (st.tab === 'izin') this.tabIzin(el, box);
    else if (st.tab === 'manual') this.tabManual(el, box);
    else if (st.tab === 'aktivitas') this.tabAktivitas(el, box);
    else this.tabRekap(el, box);
  },
  // ---- persetujuan izin
  tabIzin: function (el, box) {
    var self = this, st = this.st, d = this.izin;
    if (this.izinErr) { box.innerHTML = errorBox(this.izinErr); return; }
    if (!d) { box.innerHTML = '<div class="card card-p"><div class="sk" style="height:220px"></div></div>'; return; }
    var h = d.hitung || {}, q = st.q.toLowerCase();
    var rows = (d.rows || []).filter(function (x) { return (!st.fStatus || x.status === st.fStatus) && (!q || (x.nama + ' ' + x.NUPTK + ' ' + x.alasan).toLowerCase().indexOf(q) > -1); });
    box.innerHTML = '<div class="card"><div class="toolbar"><div class="seg plain" id="kpSeg">' + [['Menunggu', 'Menunggu'], ['Disetujui', 'Disetujui'], ['Ditolak', 'Ditolak'], ['Dibatalkan', 'Dibatalkan'], ['', 'Semua']].map(function (s) {
      return '<button type="button" data-s="' + s[0] + '" class="' + (st.fStatus === s[0] ? 'on' : '') + '">' + s[1] + (s[0] && h[s[0]] ? ' (' + h[s[0]] + ')' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="field search"><div class="inp-ic">' + ic('search') + '<input class="inp" id="kpQ" placeholder="Cari nama / NUPTK / alasan" value="' + esc(st.q) + '"></div></div></div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pegawai</th><th>Jenis</th><th>Tanggal</th><th class="hide-m">Alasan</th><th>Suket</th><th>Status</th><th class="tr">Aksi</th></tr></thead><tbody>' + rows.map(function (x) {
        return '<tr><td><div class="who">' + avatar(x.nama, '', 'sm') + '<div><b>' + esc(x.nama) + '</b><small>' + esc(x.NUPTK) + ' • ' + esc(relTime(x.dibuat_pada)) + '</small></div></div></td><td>' + katBadge(x.jenis, true) + '</td>' +
          '<td class="nowrap small"><b>' + esc(rentangTgl(x.tanggal_mulai, x.tanggal_selesai)) + '</b><div class="xs muted">' + x.jumlah_hari + ' hari kerja</div></td><td class="hide-m small" style="max-width:240px">' + esc(x.alasan) + '</td>' +
          '<td><button class="btn btn-soft btn-xs" data-bk="' + esc(x.bukti_id) + '" data-nm="' + esc(x.nama) + '">' + ic('paperclip') + 'Lihat</button></td>' +
          '<td>' + izinBadge(x.status) + (x.catatan_putusan ? '<div class="xs muted mt4" style="max-width:180px">' + esc(x.catatan_putusan) + '</div>' : '') + '</td><td class="tr nowrap">' +
          (x.status === 'Menunggu' ? '<button class="btn btn-primary btn-xs" data-ip="setujui" data-id="' + esc(x.izin_id) + '">' + ic('check') + 'Setujui</button> <button class="btn btn-outline btn-xs" data-ip="tolak" data-id="' + esc(x.izin_id) + '">' + ic('x') + 'Tolak</button>' :
            x.status === 'Disetujui' ? '<button class="btn btn-ghost btn-xs" data-ip="batalkan" data-id="' + esc(x.izin_id) + '">' + ic('rotate-ccw') + 'Batalkan</button>' : '<span class="xs muted">' + esc(x.diputuskan_oleh || '') + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : emptyHtml(st.fStatus === 'Menunggu' ? 'Tidak ada pengajuan menunggu' : 'Tidak ada data', '', 'file-check')) + '</div>';
    $$('#kpSeg button', box).forEach(function (b) { b.onclick = function () { st.fStatus = b.dataset.s; self.tabIzin(el, box); }; });
    $('#kpQ', box).oninput = debounce(function () { st.q = this.value; self.tabIzin(el, box); var i = $('#kpQ', box); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
    $$('[data-bk]', box).forEach(function (b) { b.onclick = function () { lihatBukti(b.dataset.bk, 'Suket — ' + b.dataset.nm); }; });
    $$('[data-ip]', box).forEach(function (b) { b.onclick = function () { self.putus(el, b.dataset.id, b.dataset.ip, b); }; });
  },
  putus: async function (el, id, k, btn) {
    var x = ((this.izin || {}).rows || []).filter(function (r) { return r.izin_id === id; })[0]; if (!x) return;
    var catatan = '';
    if (k === 'tolak') { catatan = await promptBox('Tolak Pengajuan ' + x.jenis, 'Alasan penolakan (dikirim ke ' + x.nama + '):', ''); if (!catatan) return; }
    else if (k === 'setujui') { if (!await confirmBox('Setujui ' + x.jenis + ' ' + x.nama + '?\n' + rentangTgl(x.tanggal_mulai, x.tanggal_selesai) + ' (' + x.jumlah_hari + ' hari)\n\nTanggal tersebut otomatis tercatat "' + x.jenis + '" di presensi (hari yang sudah hadir tidak ditimpa).', { ok: 'Setujui' })) return; }
    else if (!await confirmBox('Batalkan persetujuan ' + x.jenis + ' ' + x.nama + '?\nCatatan presensi ' + x.jenis + ' dari pengajuan ini akan dihapus.', { danger: true, ok: 'Batalkan persetujuan' })) return;
    btnBusy(btn, true); var r = await api('izin.putus', { izin_id: id, keputusan: k, catatan: catatan }); btnBusy(btn, false);
    if (!toastRes(r)) return;
    if (window.LC) LC.hapus(function (kk) { return /^lc:izin\./.test(kk); });
    Store.del(userKey('a:sa.monitor'));
    this._paksa = true; this.render(el, 'izin');
  },
  // ---- absen manual guru
  tabManual: function (el, box) {
    var self = this, m = this.mon || {}, guru = (m.guru || []).slice().sort(function (a, b) { return (!!a.masuk - !!b.masuk) || String(a.nama).localeCompare(String(b.nama)); }), c = (AppState.boot || {}).cfg || {};
    var belum = guru.filter(function (g) { return !g.masuk; });
    box.innerHTML = '<div class="grid g-main-r"><div class="card"><div class="card-h"><div class="grow"><h3>' + ic('user-cog') + ' Catat Presensi Manual</h3><p>Untuk guru yang lupa presensi namun hadir tepat waktu di sekolah</p></div></div><div class="card-b"><form id="pmF" class="grid-form">' +
      '<div class="field c6"><label>Guru / pegawai <span class="req">*</span></label><select class="sel" name="NUPTK">' + guruOpts('', 'Pilih guru…') + '</select></div><div class="field c6"><label>Tanggal</label><input class="inp" type="date" name="tanggal" value="' + todayStr() + '" max="' + todayStr() + '"></div>' +
      '<div class="field c4"><label>Kategori</label><select class="sel" name="kategori">' + PEG_KODE.map(function (k) { return '<option value="' + k + '">' + esc(PEG_KAT[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field c4"><label>Jam masuk</label><input class="inp" type="time" name="jam_masuk" value="' + esc(c.JAM_MASUK_GURU || '07:00') + '"></div><div class="field c4"><label>Jam pulang <span class="muted xs">(opsional)</span></label><input class="inp" type="time" name="jam_pulang"></div>' +
      '<div class="field"><label>Alasan <span class="req">*</span></label><input class="inp" name="alasan" maxlength="160" placeholder="Mis. lupa presensi, HP rusak, GPS tidak terbaca — hadir pukul 06.50 (saksi: piket)"></div>' +
      '<div class="field"><label class="chk small"><input type="checkbox" name="timpa"> Timpa bila sudah ada presensi di tanggal tersebut (koreksi)</label></div>' +
      '<div class="field row between wrap gap8"><span class="xs muted">Tercatat dengan tanda "Manual oleh Super Admin" & masuk log audit. Guru menerima notifikasi.</span><button class="btn btn-dark" type="submit">' + ic('save') + 'Simpan Presensi</button></div></form></div></div>' +
      '<div class="card"><div class="card-h"><div class="grow"><h3>Belum Presensi Hari Ini</h3><p>' + belum.length + ' dari ' + guru.length + ' guru</p></div></div><div class="card-b">' +
      (!this.mon ? '<div class="sk" style="height:160px"></div>' : belum.length ? belum.slice(0, 40).map(function (g) { return '<div class="list-i">' + avatar(g.nama, g.foto, 'sm') + '<div class="grow"><b class="small">' + esc(g.nama) + '</b><small>' + (PEG_ABSEN[g.status] ? katBadge(g.status, true) : esc(g.mapel || '-')) + '</small></div><button class="btn btn-soft btn-xs" data-pm="' + esc(g.NUPTK) + '">' + ic('pencil') + 'Catat</button></div>'; }).join('') : emptyHtml('Semua guru sudah presensi', '', 'party-popper')) + '</div></div></div>';
    var f = $('#pmF', box);
    $$('[data-pm]', box).forEach(function (b) { b.onclick = function () { f.NUPTK.value = b.dataset.pm; f.tanggal.value = todayStr(); f.alasan.focus(); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    f.onsubmit = async function (e) {
      e.preventDefault();
      var d = formData(f);
      if (!d.NUPTK) return toast('Pilih guru.', 'warn');
      if (d.alasan.length < 5) return toast('Isi alasan absen manual.', 'warn');
      var btn = $('button[type=submit]', f); btnBusy(btn, true);
      var r = await api('presensi.manual', { NUPTK: d.NUPTK, tanggal: d.tanggal, kategori: d.kategori, jam_masuk: d.jam_masuk, jam_pulang: d.jam_pulang, alasan: d.alasan, timpa: !!d.timpa });
      btnBusy(btn, false);
      if (!r.success) return toast(pesanV33(r.message), 'bad');
      toast(r.message, 'ok'); f.alasan.value = ''; f.timpa.checked = false;
      Store.del(userKey('a:sa.monitor')); self._paksa = true; self.render(el, 'manual'); afterWrite();
    };
  },
  // ---- aktivitas pegawai
  tabAktivitas: function (el, box) {
    var self = this, st = this.st;
    if (!st.akDari) { st.akDari = tglTambah(todayStr(), -6); st.akSampai = todayStr(); }
    box.innerHTML = '<div class="card"><div class="toolbar"><div class="field"><label class="lbl">Dari</label><input class="inp" type="date" id="kaDari" value="' + esc(st.akDari) + '"></div><div class="field"><label class="lbl">Sampai</label><input class="inp" type="date" id="kaSampai" value="' + esc(st.akSampai) + '"></div>' +
      '<div class="field"><label class="lbl">Pegawai</label><select class="sel" id="kaGuru">' + guruOpts(st.akGuru, 'Semua pegawai') + '</select></div><button class="btn btn-dark" id="kaGo">' + ic('search') + 'Tampilkan</button><button class="btn btn-outline" id="kaCsv">' + ic('download') + 'CSV</button></div><div id="kaBody"><div class="sk" style="height:200px;margin:0 20px 20px"></div></div></div>';
    var muat = function () {
      st.akDari = $('#kaDari', box).value; st.akSampai = $('#kaSampai', box).value; st.akGuru = $('#kaGuru', box).value;
      apiLR('aktivitas.list', { dari: st.akDari, sampai: st.akSampai, NUPTK: st.akGuru }, function (r) {
        var b = $('#kaBody', box); if (!b) return;
        if (!r.success) { b.innerHTML = errorBox(pesanV33(r.message)); return; }
        var rows = r.data.rows || []; self.akRows = rows;
        if (!st.akGuru && st.akDari === tglTambah(todayStr(), -6) && st.akSampai === todayStr()) { self.akN = rows.length; self.kpi(el); }
        b.innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Pegawai</th><th class="hide-m">Jam</th><th>Kegiatan</th><th class="hide-m">Hasil</th><th></th></tr></thead><tbody>' + rows.map(function (a) {
          return '<tr><td class="nowrap small">' + esc(tglIndo(a.tanggal, true)) + '</td><td><b class="small">' + esc(a.nama) + '</b></td><td class="hide-m mono xs">' + esc((a.jam_mulai || '') + (a.jam_selesai ? '–' + a.jam_selesai : '')) + '</td><td><b class="small">' + esc(a.kegiatan) + '</b>' + (a.uraian ? '<div class="xs muted clamp2">' + esc(a.uraian) + '</div>' : '') + '</td><td class="hide-m small">' + esc(a.hasil || '-') + '</td><td class="tr">' + (a.lampiran_id ? '<button class="btn-ic" data-lamp="' + esc(a.lampiran_id) + '" title="Lampiran">' + ic('paperclip') + '</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : emptyHtml('Belum ada aktivitas', 'Tidak ada laporan aktivitas pada rentang ini.', 'clipboard-list');
        $$('[data-lamp]', b).forEach(function (x) { x.onclick = function () { lihatBukti(x.dataset.lamp, 'Lampiran Aktivitas'); }; });
      });
    };
    $('#kaGo', box).onclick = muat;
    $('#kaCsv', box).onclick = function () { var rows = self.akRows || []; if (!rows.length) return toast('Tampilkan data dulu.', 'warn'); downloadCSV('aktivitas-pegawai-' + st.akDari + '_' + st.akSampai + '.csv', ['Tanggal', 'NUPTK', 'Nama', 'Jam Mulai', 'Jam Selesai', 'Kegiatan', 'Uraian', 'Hasil', 'Lampiran'], rows.map(function (a) { return [a.tanggal, a.NUPTK, a.nama, a.jam_mulai, a.jam_selesai, a.kegiatan, a.uraian, a.hasil, a.lampiran_id ? 'Ada' : '']; })); };
    muat();
  },
  // ---- rekap kategori kehadiran
  tabRekap: function (el, box) {
    var self = this, st = this.st;
    if (!st.rkDari) { st.rkDari = todayStr().slice(0, 7) + '-01'; st.rkSampai = todayStr(); }
    var kolom = PEG_KODE.concat(Object.keys(PEG_ABSEN));
    box.innerHTML = '<div class="card"><div class="toolbar"><div class="field"><label class="lbl">Dari</label><input class="inp" type="date" id="krDari" value="' + esc(st.rkDari) + '"></div><div class="field"><label class="lbl">Sampai</label><input class="inp" type="date" id="krSampai" value="' + esc(st.rkSampai) + '"></div><button class="btn btn-dark" id="krGo">' + ic('search') + 'Tampilkan</button><button class="btn btn-outline" id="krCsv">' + ic('download') + 'CSV</button></div><div id="krBody"><div class="sk" style="height:200px;margin:0 20px 20px"></div></div></div>';
    var muat = async function () {
      st.rkDari = $('#krDari', box).value; st.rkSampai = $('#krSampai', box).value;
      if (st.rkDari > st.rkSampai) return toast('Tanggal awal harus sebelum tanggal akhir.', 'warn');
      var r = await apiQ('presensi.list', { dari: st.rkDari, sampai: st.rkSampai }), b = $('#krBody', box); if (!b) return;
      if (!r.success) { b.innerHTML = errorBox(r.message); return; }
      var per = {};
      (B().guru || []).filter(function (g) { return (g.status || 'Aktif') === 'Aktif'; }).forEach(function (g) { per[g.NUPTK] = { NUPTK: g.NUPTK, nama: g.nama_lengkap, n: {}, telat: 0, manual: 0 }; });
      (r.data.rows || []).forEach(function (p) {
        var x = per[p.NUPTK] = per[p.NUPTK] || { NUPTK: p.NUPTK, nama: p.nama, n: {}, telat: 0, manual: 0 };
        var k = p.jam_masuk ? pegKatDari(p.status) || 'WFO' : (PEG_ABSEN[p.status] ? p.status : ''); if (!k) return;
        x.n[k] = (x.n[k] || 0) + 1; if (p.terlambat === 'YA') x.telat++; if (p.lokasi_id === 'MANUAL') x.manual++;
      });
      self.rekap = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, c) { return String(a.nama).localeCompare(String(c.nama)); });
      b.innerHTML = self.rekap.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pegawai</th>' + kolom.map(function (k) { return '<th class="tc">' + esc(PEG_KAT[k] ? PEG_KAT[k].label : k) + '</th>'; }).join('') + '<th class="tc">Terlambat</th><th class="tc">Manual</th></tr></thead><tbody>' + self.rekap.map(function (x) {
        return '<tr><td><b class="small">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.NUPTK) + '</div></td>' + kolom.map(function (k) { return '<td class="tc' + (x.n[k] ? ' b' : ' muted') + '">' + (x.n[k] || 0) + '</td>'; }).join('') + '<td class="tc ' + (x.telat ? 'amber b' : 'muted') + '">' + x.telat + '</td><td class="tc muted">' + x.manual + '</td></tr>';
      }).join('') + '</tbody></table></div>' : emptyHtml('Tidak ada data', '', 'calendar-x');
    };
    $('#krGo', box).onclick = muat;
    $('#krCsv', box).onclick = function () { if (!self.rekap) return toast('Tampilkan data dulu.', 'warn'); downloadCSV('rekap-kategori-presensi-' + st.rkDari + '_' + st.rkSampai + '.csv', ['NUPTK', 'Nama'].concat(kolom.map(function (k) { return PEG_KAT[k] ? PEG_KAT[k].label : k; })).concat(['Terlambat', 'Manual']), self.rekap.map(function (x) { return [x.NUPTK, x.nama].concat(kolom.map(function (k) { return x.n[k] || 0; })).concat([x.telat, x.manual]); })); };
    muat();
  }
});

// ---------------------------------------------------------------- Monitoring: kategori presensi guru & izin menunggu
/** Dipanggil dari drawGuru (pages-superadmin.js) — status sel menjadi kategori (WFO/Dinas/Diklat/Apel/Sakit…) */
function statusGuruV33(g, lama) {
  if (!g.status) return lama;
  if (!g.masuk && PEG_ABSEN[g.status]) return katBadge(g.status, true);
  if (!g.masuk) return lama;
  return (g.terlambat === 'YA' ? '<span class="bdg warn">Terlambat</span> ' : '') + katBadge(g.status, true) + (g.manual ? ' <span class="bdg" title="Dicatat manual oleh Super Admin">' + ic('user-cog') + '</span>' : '');
}
(function () {
  var mon = Pages.guru.monitoring; if (!mon) return;
  var drawLama = mon.draw;
  mon.draw = function (el) {
    drawLama.call(this, el);
    var d = this.st.d, box = $('#monBody', el);
    if (d && d.izinMenunggu && this.st.tab === 'guru' && box && !$('.izin-tunggu', box)) box.insertAdjacentHTML('afterbegin', '<a class="note warn izin-tunggu mb12" href="#/kepegawaian/izin" style="text-decoration:none">' + ic('hourglass') + '<div><b>' + d.izinMenunggu + ' pengajuan izin / sakit / cuti</b> menunggu persetujuan — buka Kepegawaian & Izin ›</div></a>');
  };
})();
