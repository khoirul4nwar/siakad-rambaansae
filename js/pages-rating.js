/* =====================================================================
   SIAKAD SISWA v3.2 — pages-rating.js : Rating guru oleh siswa (anonim)
   Siswa: menilai guru kelasnya (4 aspek + komentar) · Guru: rating sendiri ·
   Super Admin: rekap semua guru + buka/tutup periode penilaian.
   ===================================================================== */
'use strict';

registerPage('siswa', 'ratingguru', {
  title: 'Rating Guru',
  init: function (el) {
    el.innerHTML = pageHead('Portal Siswa <span>/ Rating Guru</span>', 'Rating Guru', 'Beri penilaian untuk guru yang mengajar di kelasmu agar pembelajaran semakin baik.') +
      '<div class="note ok">' + ic('shield-check') + '<div><b>Penilaianmu anonim.</b> Guru dan sekolah hanya melihat rata-rata nilai dan komentar tanpa nama. Kamu bisa mengubah penilaian selama periode dibuka.</div></div>' +
      '<div id="rtBody" class="mt16"><div class="sk" style="height:220px"></div></div>';
  },
  render: function (el) {
    var self = this;
    apiLR('rating.saya', {}, function (r) {
      if (!$('#rtBody', el)) return;
      if (!r.success) { $('#rtBody', el).innerHTML = errorBox(pesanV32(r.message)); return; }
      self.d = r.data; self.gambar(el);
    });
  },
  gambar: function (el) {
    var d = this.d, self = this, sudah = d.guru.filter(function (g) { return g.sudah; }).length;
    $('#rtBody', el).innerHTML = (!d.aktif ? '<div class="note warn mb12">' + ic('lock') + '<div>Periode penilaian guru sedang <b>ditutup</b> oleh sekolah. Kamu tetap bisa melihat penilaian yang sudah kamu berikan.</div></div>' : '') +
      '<div class="row between wrap gap8 mb12"><span class="pill">' + ic('calendar') + 'Semester ' + esc(d.periode.sem) + ' ' + esc(d.periode.ta) + '</span><span class="small muted">' + sudah + ' dari ' + d.guru.length + ' guru sudah kamu nilai</span></div>' +
      (d.guru.length ? '<div class="rt-grid">' + d.guru.map(function (g, i) {
        return '<div class="card rt-card"><div class="row gap12">' + avatar(g.nama, g.foto, 'md') + '<div class="grow" style="min-width:0"><b class="clamp2">' + esc(g.nama) + '</b><small class="muted">' + esc(g.mata_pelajaran) + '</small></div></div>' +
          '<div class="row between wrap gap8 mt12">' + (g.sudah ? '<div>' + bintangHtml(g.nilai) + '<div class="xs muted">Nilaimu ' + fmtN(g.nilai) + ' / 5</div></div>' : '<span class="xs muted">' + ic('star') + ' Belum dinilai</span>') +
          (d.aktif ? '<button class="btn ' + (g.sudah ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-rt="' + i + '">' + ic(g.sudah ? 'pencil' : 'star') + (g.sudah ? 'Ubah' : 'Beri Penilaian') + '</button>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="card">' + emptyHtml('Belum ada guru', 'Jadwal kelasmu belum diatur sekolah.', 'users') + '</div>');
    $$('[data-rt]', el).forEach(function (b) { b.onclick = function () { self.form(el, d.guru[Number(b.dataset.rt)]); }; });
  },
  form: function (el, g) {
    var self = this, d = this.d, a = d.aspek.map(function (x, i) { return Number((g.a || [])[i]) || 0; });   // v3.3: jumlah aspek mengikuti pengaturan sekolah (3–6)
    var m = modal({ title: 'Nilai ' + g.nama, sub: g.mata_pelajaran + ' • anonim', size: 'md',
      body: d.aspek.map(function (lab, i) {
        return '<div class="rt-aspek" data-as="' + i + '"><div class="small b">' + esc(lab) + '</div><div class="rt-pilih" role="radiogroup" aria-label="' + esc(lab) + '">' +
          [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-label="' + n + ' bintang" class="' + (a[i] >= n ? 'on' : '') + '">' + ic('star') + '</button>'; }).join('') + '<span class="xs muted rt-ket">' + (a[i] ? ['', 'Kurang sekali', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'][a[i]] : 'Pilih bintang') + '</span></div></div>';
      }).join('') +
      '<div class="field mt16"><label>Saran / komentar <span class="muted xs">(opsional, sopan & membangun)</span></label><textarea class="inp" id="rtKom" rows="3" maxlength="300" placeholder="Contoh: Penjelasannya jelas, semoga lebih banyak praktik.">' + esc(g.komentar || '') + '</textarea><div class="hint" id="rtCnt"></div></div>',
      foot: '<button class="btn btn-outline" data-x>Batal</button><button class="btn btn-primary" id="rtKirim">' + ic('send') + 'Kirim Penilaian</button>' });
    var KET = ['', 'Kurang sekali', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];
    $$('.rt-aspek', m.el).forEach(function (row) {
      var i = Number(row.dataset.as);
      row.onclick = function (e) { var b = e.target.closest('[data-n]'); if (!b) return; a[i] = Number(b.dataset.n); $$('[data-n]', row).forEach(function (x) { x.classList.toggle('on', Number(x.dataset.n) <= a[i]); }); $('.rt-ket', row).textContent = KET[a[i]]; };
    });
    var cnt = function () { $('#rtCnt', m.el).textContent = $('#rtKom', m.el).value.length + ' / 300'; }; $('#rtKom', m.el).oninput = cnt; cnt();
    $('#rtKirim', m.el).onclick = async function () {
      if (a.some(function (x) { return !x; })) return toast('Beri bintang untuk semua aspek (' + a.length + ' aspek).', 'warn');
      btnBusy(this, true);
      var r = await api('rating.kirim', { guru_id: g.guru_id, mata_pelajaran: g.mata_pelajaran, a: a, komentar: $('#rtKom', m.el).value });
      btnBusy(this, false);
      if (!toastRes(r)) return;
      m.close(); g.sudah = true; g.a = a; g.nilai = r.data.nilai; g.komentar = $('#rtKom', m.el).value.trim(); self.gambar(el);
    };
  }
});

// ---------------------------------------------------------------- Guru & Super Admin
function ratingDetailHtml(d) {
  var maks = Math.max(1, d.sebaran[1], d.sebaran[2], d.sebaran[3], d.sebaran[4], d.sebaran[5]);
  return '<div class="grid g-main-r rt-det"><div class="card card-p rt-skor"><div class="xs b muted">RATA-RATA PENILAIAN</div><div class="rt-besar">' + (d.n ? fmtN(d.rata) : '–') + '<small>/5</small></div>' + bintangHtml(d.rata, true) +
    '<div class="small muted mt8">' + d.n + ' siswa menilai • Semester ' + esc(d.periode.sem) + ' ' + esc(d.periode.ta) + '</div>' +
    '<div class="rt-sebar mt16">' + [5, 4, 3, 2, 1].map(function (b) { return '<div class="row gap8 xs"><span style="width:26px">' + b + ic('star', 'amber') + '</span><div class="grow pbar"><span style="width:' + (d.sebaran[b] / maks * 100) + '%"></span></div><span style="width:22px" class="tr">' + d.sebaran[b] + '</span></div>'; }).join('') + '</div></div>' +
    '<div class="card"><div class="card-h"><h3 class="grow">' + ic('chart-no-axes-column') + ' Nilai per Aspek</h3></div><div class="card-b">' +
    d.aspekLabel.map(function (lab, i) { var v = d.aspek[i] || 0; return '<div class="mb12"><div class="row between small"><span>' + esc(lab) + '</span><b>' + (d.n ? fmtN(v) : '–') + '</b></div>' + persenBar(v / 5 * 100) + '</div>'; }).join('') +
    (d.rincian.length ? '<div class="xs b muted mt16">PER KELAS & MAPEL</div><div class="tbl-wrap mt8"><table class="tbl"><thead><tr><th>Kelas</th><th>Mapel</th><th class="tc">Penilai</th><th class="tc">Rata-rata</th></tr></thead><tbody>' + d.rincian.map(function (r) { return '<tr><td>' + esc(r.kelas) + '</td><td>' + esc(r.mata_pelajaran || '-') + '</td><td class="tc">' + r.n + '</td><td class="tc b">' + fmtN(r.rata) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</div></div></div>' +
    '<div class="card mt16"><div class="card-h"><div class="grow"><h3>' + ic('message-square-quote') + ' Komentar Siswa</h3><p>Ditampilkan tanpa nama & kelas</p></div></div><div class="card-b">' +
    (!d.komentarTampil ? '<div class="note">' + ic('shield') + '<div>Komentar tampil setelah minimal ' + d.minAnonim + ' siswa menilai, agar identitas penilai tetap terlindungi.</div></div>' :
      d.komentar.length ? '<div class="rt-kom">' + d.komentar.map(function (k) { return '<div class="rt-kom-i"><div class="row between">' + bintangHtml(k.nilai) + '<span class="xs muted">' + esc(k.bulan ? BULAN[Number(k.bulan.substring(5, 7)) - 1] + ' ' + k.bulan.substring(0, 4) : '') + '</span></div><p>' + esc(k.teks) + '</p></div>'; }).join('') + '</div>' : emptyHtml('Belum ada komentar', '', 'message-square')) + '</div></div>';
}
registerPage('guru', 'ratingguru', {
  title: 'Rating Guru',
  st: { per: '', guru: '' },
  init: function (el) {
    el.innerHTML = pageHead((isSA() ? 'Super Admin' : 'Panel Guru') + ' <span>// Umpan Balik Siswa</span>', isSA() ? 'Rating Guru' : 'Rating Saya', isSA() ? 'Rekap penilaian guru oleh siswa (anonim). Buka atau tutup periode penilaian kapan saja.' : 'Penilaian anonim dari siswa yang Anda ajar — gunakan sebagai bahan refleksi.',
      isSA() ? '<button class="btn btn-outline" id="rtAspek">' + ic('sliders-horizontal') + 'Aspek Penilaian</button><button class="btn btn-outline" id="rtAtur">' + ic('lock') + 'Periode Penilaian</button>' : '') + '<div id="rgBody"><div class="sk" style="height:260px"></div></div>';
    var self = this;
    if ($('#rtAtur', el)) $('#rtAtur', el).onclick = function () { self.atur(el); };
    if ($('#rtAspek', el)) $('#rtAspek', el).onclick = function () { ratingAspekEditor(self.rekapD && self.rekapD.aspekSemua, function () { self.st.guru = ''; self.rekap(el); }); };   // v3.3
    el.addEventListener('click', function (e) {                    // v3.3: unduh PDF / Excel
      var u = e.target.closest('[data-rtu]'); if (!u) return;
      var j = u.dataset.rtu; if (j === 'rpdf') RatingUnduh.rekapPdf(self.rekapD, u); else if (j === 'rxl') RatingUnduh.rekapXl(self.rekapD, u); else if (j === 'dpdf') RatingUnduh.detailPdf(self.detD, u); else if (j === 'dxl') RatingUnduh.detailXl(self.detD, u);
    });
  },
  render: function (el) { if (isSA() && !this.st.guru) this.rekap(el); else this.detail(el, this.st.guru); },
  rekap: function (el) {
    var self = this;
    apiLR('rating.rekap', {}, function (r) {
      if (!$('#rgBody', el)) return;
      if (!r.success) { $('#rgBody', el).innerHTML = errorBox(pesanV32(r.message)); return; }
      var d = r.data; self.aktif = d.aktif; self.rekapD = d;
      $('#rgBody', el).innerHTML = '<div class="grid g4">' + kpi('Status Penilaian', d.aktif ? 'Dibuka' : 'Ditutup', d.aktif ? 'siswa dapat menilai' : 'siswa tidak dapat menilai', d.aktif ? 'lock-open' : 'lock', d.aktif ? 'ok' : 'warn') +
        kpi('Total Penilaian', fmtN(d.total), 'Semester ' + esc(d.periode.sem) + ' ' + esc(d.periode.ta), 'star') + kpi('Rata-rata Sekolah', d.total ? fmtN(d.rata) + '<small>/5</small>' : '–', 'seluruh guru', 'chart-no-axes-column') + kpi('Guru Dinilai', fmtN(d.dinilai) + '<small>/' + d.guru.length + '</small>', 'memiliki minimal 1 penilaian', 'users') + '</div>' +
        '<div class="card mt16"><div class="card-h"><div class="grow"><h3>' + ic('list-ordered') + ' Peringkat Guru</h3><p>Klik guru untuk melihat rincian aspek & komentar</p></div><button class="btn btn-soft btn-sm" data-rtu="rpdf">' + ic('file-down') + 'PDF</button><button class="btn btn-soft btn-sm" data-rtu="rxl">' + ic('file-spreadsheet') + 'Excel</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:44px">#</th><th>Guru</th><th class="hide-m">Mapel</th><th class="tc">Penilai</th><th class="tc">Rata-rata</th>' +
        d.aspekLabel.map(function (a) { return '<th class="tc hide-m" title="' + esc(a) + '">' + esc(a.split(' ')[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        d.guru.map(function (g, i) { return '<tr class="click" data-g="' + esc(g.guru_id) + '"><td class="tc">' + (g.n ? i + 1 : '-') + '</td><td><div class="who">' + avatar(g.nama, g.foto, 'sm') + '<b class="small">' + esc(g.nama) + '</b></div></td><td class="hide-m small">' + esc(g.mapel) + '</td><td class="tc">' + g.n + '</td><td class="tc">' + (g.n ? '<b>' + fmtN(g.rata) + '</b> ' + bintangHtml(g.rata) : '<span class="muted">–</span>') + '</td>' +
          g.aspek.map(function (v) { return '<td class="tc hide-m">' + (g.n ? fmtN(v) : '–') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      $$('[data-g]', el).forEach(function (tr) { tr.onclick = function () { self.st.guru = tr.dataset.g; self.detail(el, tr.dataset.g); }; });
    });
  },
  detail: function (el, gid) {
    var self = this, body = $('#rgBody', el);
    body.innerHTML = '<div class="sk" style="height:260px"></div>';
    var per = this.st.per ? this.st.per.split('|') : null;
    apiLR('rating.guru', Object.assign(gid ? { guru_id: gid } : {}, per ? { tahun_ajaran: per[0], semester: per[1] } : {}), function (r) {
      if (!$('#rgBody', el)) return;
      if (!r.success) { body.innerHTML = (isSA() ? '<a href="#" class="small b back-link" id="rgBack">' + ic('arrow-left') + ' SEMUA GURU</a>' : '') + errorBox(pesanV32(r.message)); if ($('#rgBack', el)) $('#rgBack', el).onclick = function (e) { e.preventDefault(); self.st.guru = ''; self.st.per = ''; self.rekap(el); }; return; }
      var d = r.data; self.detD = d;
      body.innerHTML = (isSA() ? '<a href="#" class="small b back-link" id="rgBack">' + ic('arrow-left') + ' SEMUA GURU</a>' : '') +
        '<div class="row gap12 mt8 mb12">' + avatar(d.guru.nama, d.guru.foto, 'lg') + '<div><h3 style="font-size:18px">' + esc(d.guru.nama) + '</h3><div class="small muted">' + esc(d.guru.mata_pelajaran || '') + '</div></div>' +
        (d.periodeList.length > 1 ? '<div class="sp"></div><select class="sel" id="rgPer" style="width:auto">' + d.periodeList.map(function (p) { var v = p.ta + '|' + p.sem; return '<option value="' + esc(v) + '"' + (p.ta === d.periode.ta && p.sem === d.periode.sem ? ' selected' : '') + '>' + esc(p.sem + ' ' + p.ta) + '</option>'; }).join('') + '</select>' : '') +
        '<span class="sp"></span><button class="btn btn-soft btn-sm" data-rtu="dpdf">' + ic('file-down') + 'PDF</button><button class="btn btn-soft btn-sm" data-rtu="dxl">' + ic('file-spreadsheet') + 'Excel</button></div>' +
        (!d.aktif && !isSA() ? '<div class="note mb12">' + ic('lock') + '<div>Periode penilaian sedang ditutup oleh sekolah.</div></div>' : '') + ratingDetailHtml(d);
      if ($('#rgBack', el)) $('#rgBack', el).onclick = function (e) { e.preventDefault(); self.st.guru = ''; self.st.per = ''; self.rekap(el); };
      if ($('#rgPer', el)) $('#rgPer', el).onchange = function () { self.st.per = this.value; self.detail(el, gid); };
    });
  },
  atur: function (el) {
    var self = this, aktif = this.aktif !== false;
    var m = modal({ title: 'Periode Penilaian Guru', sub: 'Atur apakah siswa dapat memberi rating guru', size: 'sm',
      body: '<div class="mode-pilih" id="raPilih" style="grid-template-columns:1fr 1fr"><button type="button" data-v="YA" class="' + (aktif ? 'on' : '') + '"><span class="mp-ic">' + ic('lock-open') + '</span><b>Dibuka</b><small>Siswa dapat menilai & mengubah</small></button><button type="button" data-v="TIDAK" class="' + (!aktif ? 'on' : '') + '"><span class="mp-ic">' + ic('lock') + '</span><b>Ditutup</b><small>Siswa hanya melihat</small></button></div><div class="note mt12">' + ic('info') + '<div>Penilaian dikelompokkan per semester (Pengaturan → Akademik). Saat semester berganti, siswa dapat menilai lagi.</div></div>',
      foot: '<button class="btn btn-outline" data-x>Tutup</button>' });
    $$('#raPilih button', m.el).forEach(function (b) { b.onclick = async function () { btnBusy(b, true); var r = await api('rating.atur', { aktif: b.dataset.v }); btnBusy(b, false); if (toastRes(r)) { m.close(); self.rekap(el); } }; });
  }
});

// =====================================================================
// v3.3 — Unduh rating (PDF / Excel) & pengaturan aspek penilaian (Super Admin)
// =====================================================================
async function rtXl(nama, lembar) {
  await loadLib(LAP_LIB.excel);
  if (!window.ExcelJS) throw new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet.');
  var wb = new ExcelJS.Workbook(), warna = lapArgb(Brand.get().warna); wb.creator = Brand.get().nama;
  lembar.forEach(function (sh) {
    var ws = wb.addWorksheet(sh.nama.substring(0, 31));
    ws.addRow([sh.judul]).font = { bold: true, size: 14 };
    if (sh.sub) ws.addRow([sh.sub]).font = { italic: true, color: { argb: 'FF64748B' } };
    ws.addRow([]);
    var hr = ws.addRow(sh.head);
    hr.eachCell(function (c) { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warna } }; c.border = LapXl.garis; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
    sh.rows.forEach(function (r) { var row = ws.addRow(r); row.eachCell({ includeEmpty: true }, function (c) { c.border = LapXl.garis; c.alignment = { vertical: 'top', wrapText: true }; if (typeof c.value === 'number' && !Number.isInteger(c.value)) c.numFmt = '0.00'; }); });
    (sh.lebar || []).forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    ws.views = [{ state: 'frozen', ySplit: hr.number }];
  });
  var buf = await wb.xlsx.writeBuffer();
  downloadBlob(nama + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
var RatingUnduh = {
  jalan: async function (btn, fn) { btnBusy(btn, true); try { await fn(); toast('Berkas diunduh.', 'ok'); } catch (e) { console.error(e); toast(e.message || 'Gagal membuat berkas.', 'bad'); } finally { btnBusy(btn, false); } },
  periode: function (d) { return 'Semester ' + d.periode.sem + ' ' + d.periode.ta; },
  rekapPdf: function (d, btn) {
    if (!d) return;
    return this.jalan(btn, async function () {
      var lanskap = d.aspekLabel.length > 4, pdf = await pdfV33('Rekap Rating Guru', lanskap), y = pdf.halaman(lanskap);
      y = pdf.judul(y, 'REKAP RATING GURU OLEH SISWA', [RatingUnduh.periode(d) + '  |  ' + d.total + ' penilaian anonim  |  rata-rata sekolah ' + (d.total ? fmtN(d.rata, 2) : '-') + ' / 5']);
      var no = 0;
      y = pdf.tabel(y, [['#', 'Guru', 'Mata Pelajaran', 'Penilai', 'Rata-rata'].concat(d.aspekLabel)], d.guru.map(function (g) { return [g.n ? ++no : '-', g.nama, g.mapel || '-', g.n, g.n ? fmtN(g.rata, 2) : '-'].concat(g.aspek.map(function (v) { return g.n ? fmtN(v, 2) : '-'; })); }),
        { kecil: d.aspekLabel.length > 4, at: { columnStyles: { 0: { halign: 'center', cellWidth: 9 }, 3: { halign: 'center' }, 4: { halign: 'center', fontStyle: 'bold' } } } });
      y = pdf.catatan(y, 'Skala 1-5. Penilaian diberikan siswa secara anonim; identitas siswa tidak disimpan. Aspek: ' + d.aspekLabel.join('; ') + '.');
      pdf.kaki(); pdf.doc.save(lapNamaFile('Rekap-Rating-Guru_' + d.periode.ta.replace('/', '-') + '-' + d.periode.sem) + '.pdf');
    });
  },
  rekapXl: function (d, btn) {
    if (!d) return;
    return this.jalan(btn, function () {
      var no = 0;
      return rtXl(lapNamaFile('Rekap-Rating-Guru_' + d.periode.ta.replace('/', '-') + '-' + d.periode.sem), [{ nama: 'Rekap Rating Guru', judul: 'Rekap Rating Guru oleh Siswa — ' + ((d.sekolah || {}).nama || Brand.get().nama), sub: RatingUnduh.periode(d) + ' • ' + d.total + ' penilaian anonim • skala 1–5',
        head: ['Peringkat', 'NUPTK', 'Guru', 'Mata Pelajaran', 'Jumlah Penilai', 'Rata-rata'].concat(d.aspekLabel),
        rows: d.guru.map(function (g) { return [g.n ? ++no : '', g.guru_id, g.nama, g.mapel || '', g.n, g.n ? g.rata : ''].concat(g.aspek.map(function (v) { return g.n ? v : ''; })); }),
        lebar: [10, 18, 30, 26, 12, 11].concat(d.aspekLabel.map(function () { return 16; })) }]);
    });
  },
  detailPdf: function (d, btn) {
    if (!d) return;
    return this.jalan(btn, async function () {
      var pdf = await pdfV33('Rating Guru ' + d.guru.nama, false), y = pdf.halaman(false);
      y = pdf.judul(y, 'LAPORAN RATING GURU OLEH SISWA', [RatingUnduh.periode(d)]);
      y = pdf.identitas(y, [['Nama guru', d.guru.nama], ['Rata-rata', d.n ? fmtN(d.rata, 2) + ' / 5' : '-'], ['NUPTK', d.guru.NUPTK], ['Jumlah penilai', String(d.n)], ['Mata pelajaran', d.guru.mata_pelajaran || '-'], ['Periode', RatingUnduh.periode(d)]]);
      y = pdf.subjudul(y, 'Nilai per aspek');
      y = pdf.tabel(y, [['Aspek', 'Rata-rata (1-5)', 'Persentase']], d.aspekLabel.map(function (a, i) { var v = d.aspek[i] || 0; return [a, d.n ? fmtN(v, 2) : '-', d.n ? fmtN(v / 5 * 100, 1) + '%' : '-']; }), { at: { columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } } } });
      y = pdf.subjudul(y, 'Sebaran nilai');
      y = pdf.tabel(y, [['5 bintang', '4 bintang', '3 bintang', '2 bintang', '1 bintang']], [[d.sebaran[5], d.sebaran[4], d.sebaran[3], d.sebaran[2], d.sebaran[1]]], { at: { styles: { halign: 'center' } } });
      if (d.rincian.length) { y = pdf.subjudul(y, 'Per kelas & mata pelajaran'); y = pdf.tabel(y, [['Kelas', 'Mata Pelajaran', 'Penilai', 'Rata-rata']], d.rincian.map(function (r) { return [r.kelas, r.mata_pelajaran || '-', r.n, fmtN(r.rata, 2)]; }), { at: { columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' } } } }); }
      if (d.komentarTampil && d.komentar.length) { y = pdf.subjudul(y, 'Komentar siswa (anonim)'); y = pdf.tabel(y, [['No', 'Nilai', 'Komentar', 'Bulan']], d.komentar.map(function (k, i) { return [i + 1, fmtN(k.nilai, 1), k.teks, k.bulan || '']; }), { at: { columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 16 }, 3: { cellWidth: 22 } } } }); }
      else y = pdf.catatan(y, 'Komentar tampil bila minimal ' + d.minAnonim + ' siswa menilai (menjaga anonimitas).');
      pdf.catatan(y, 'Penilaian diberikan siswa secara anonim; identitas siswa tidak disimpan oleh sistem.');
      pdf.kaki(); pdf.doc.save(lapNamaFile('Rating-Guru_' + d.guru.nama + '_' + d.periode.ta.replace('/', '-') + '-' + d.periode.sem) + '.pdf');
    });
  },
  detailXl: function (d, btn) {
    if (!d) return;
    return this.jalan(btn, function () {
      var nama = lapNamaFile('Rating-Guru_' + d.guru.nama + '_' + d.periode.ta.replace('/', '-') + '-' + d.periode.sem), sub = d.guru.nama + ' • ' + RatingUnduh.periode(d) + ' • ' + d.n + ' penilai';
      var lembar = [{ nama: 'Ringkasan', judul: 'Rating Guru oleh Siswa', sub: sub, head: ['Aspek', 'Rata-rata (1–5)', 'Persentase'], rows: d.aspekLabel.map(function (a, i) { return [a, d.n ? d.aspek[i] : '', d.n ? Math.round(d.aspek[i] / 5 * 1000) / 10 : '']; }).concat([['RATA-RATA KESELURUHAN', d.n ? d.rata : '', d.n ? Math.round(d.rata / 5 * 1000) / 10 : '']]), lebar: [40, 16, 14] },
        { nama: 'Per Kelas', judul: 'Rating per Kelas & Mapel', sub: sub, head: ['Kelas', 'Mata Pelajaran', 'Penilai', 'Rata-rata'], rows: d.rincian.map(function (r) { return [r.kelas, r.mata_pelajaran || '', r.n, r.rata]; }), lebar: [34, 26, 12, 12] }];
      if (d.komentarTampil) lembar.push({ nama: 'Komentar', judul: 'Komentar Siswa (anonim)', sub: sub, head: ['No', 'Nilai', 'Komentar', 'Bulan'], rows: d.komentar.map(function (k, i) { return [i + 1, k.nilai, k.teks, k.bulan || '']; }), lebar: [6, 8, 80, 12] });
      return rtXl(nama, lembar);
    });
  }
};
/** Pengaturan aspek rating guru (Super Admin): 3–6 aspek aktif, bisa ganti nama / tambah / nonaktifkan */
function ratingAspekEditor(semua, selesai) {
  var SLOT = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], awal = {};
  (semua || [{ id: 'a1', nama: 'Penguasaan materi', aktif: true }, { id: 'a2', nama: 'Teknik mengajar', aktif: true }, { id: 'a3', nama: 'Kedisiplinan & ketepatan waktu', aktif: true }, { id: 'a4', nama: 'Sikap & keteladanan', aktif: true }]).forEach(function (x) { awal[x.id] = x; });
  var m = modal({ title: 'Aspek Penilaian Guru', sub: 'Atur 3–6 aspek yang dinilai siswa (skala bintang 1–5)', size: 'md',
    body: '<div class="rt-aspek-ed">' + SLOT.map(function (id, i) { var x = awal[id] || { nama: '', aktif: false }; return '<div class="row gap8 mb8" data-slot="' + id + '"><label class="chk" title="Aktif"><input type="checkbox" data-ak' + (x.aktif && x.nama ? ' checked' : '') + '></label><span class="bdg mono">' + (i + 1) + '</span><input class="inp" data-nm maxlength="60" value="' + esc(x.nama || '') + '" placeholder="' + (x.nama ? '' : 'Aspek tambahan (opsional), mis. Kreativitas') + '"></div>'; }).join('') + '</div>' +
      '<div class="small muted" id="aeInfo"></div><div class="note mt12">' + ic('info') + '<div>Penilaian lama tetap tersimpan. Aspek yang dinonaktifkan tidak ditanyakan lagi; rata-rata lama tetap dihitung dari aspek aktif. Mengganti nama aspek berarti nilai lama di nomor itu tampil dengan nama baru — untuk aspek yang benar-benar berbeda, nonaktifkan lalu gunakan nomor kosong.</div></div>',
    foot: '<button class="btn btn-outline" data-x>Batal</button><button class="btn btn-primary" id="aeSave">' + ic('save') + 'Simpan Aspek</button>' });
  var hitung = function () { var n = $$('[data-slot]', m.el).filter(function (r) { return $('[data-ak]', r).checked && $('[data-nm]', r).value.trim(); }).length; $('#aeInfo', m.el).innerHTML = '<b class="' + (n < 3 || n > 6 ? 'red' : '') + '">' + n + ' aspek aktif</b> (harus 3–6)'; return n; };
  m.el.addEventListener('input', function (e) { if (e.target.matches('[data-nm]')) { var cb = $('[data-ak]', e.target.closest('[data-slot]')); if (e.target.value.trim() && !cb.checked && !e.target.dataset.sentuh) cb.checked = true; e.target.dataset.sentuh = '1'; } hitung(); });
  m.el.addEventListener('change', hitung); hitung();
  $('#aeSave', m.el).onclick = async function () {
    if (hitung() < 3 || hitung() > 6) return toast('Aspek aktif harus 3–6.', 'warn');
    var aspek = $$('[data-slot]', m.el).map(function (r) { var nm = $('[data-nm]', r).value.trim(); return { id: r.dataset.slot, nama: nm, aktif: $('[data-ak]', r).checked && !!nm }; }).filter(function (x) { return x.nama || awal[x.id]; });
    btnBusy(this, true); var r = await api('rating.aspek.atur', { aspek: aspek }); btnBusy(this, false);
    if (!r.success) return toast(pesanV33(r.message), 'bad');
    toast(r.message, 'ok'); m.close(); if (selesai) selesai(r.data);
  };
}
