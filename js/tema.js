/* SIAKAD SISWA v3.3 — tema.js : mode terang/gelap, warna tema & tema gradasi (disimpan per perangkat).
   Dimuat paling awal di <head> (tanpa defer, ±1 KB) agar halaman tidak "berkedip" putih saat mode gelap. */
(function () {
  'use strict';
  var KUNCI = 'siakad_tema';
  var WARNA = { sekolah: null, navy: ['#1E3A5F', 'Navy Akademik'], biru: ['#1D4ED8', 'Biru Samudra'], hijau: ['#0F766E', 'Hijau Toska'], ungu: ['#6D28D9', 'Ungu Anggrek'],
    marun: ['#9F1239', 'Merah Marun'], jingga: ['#C2410C', 'Jingga Senja'], grafit: ['#334155', 'Abu Grafit'],
    // v3.3: tema gradasi (perpaduan 2 warna) — [warna 1, nama, warna 2]
    'g-senja': ['#F97316', 'Senja', '#DB2777'], 'g-samudra': ['#0EA5E9', 'Samudra', '#1D4ED8'], 'g-hutan': ['#22C55E', 'Hutan Tropis', '#0F766E'], 'g-aurora': ['#8B5CF6', 'Aurora', '#06B6D4'],
    'g-fajar': ['#F59E0B', 'Fajar', '#DC2626'], 'g-malam': ['#1E3A5F', 'Malam Biru', '#7C3AED'], 'g-mawar': ['#F43F5E', 'Mawar', '#9333EA'], 'g-zamrud': ['#10B981', 'Zamrud', '#0284C7'] };
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function baca() { try { return JSON.parse(localStorage.getItem(KUNCI) || '{}') || {}; } catch (e) { return {}; } }
  function terapkan(t) {
    t = t || baca();
    var mode = t.mode || 'terang', gelap = mode === 'gelap' || (mode === 'sistem' && !!(mq && mq.matches)), el = document.documentElement;
    el.setAttribute('data-mode', gelap ? 'gelap' : 'terang');
    if (t.warna && WARNA[t.warna]) el.setAttribute('data-warna', t.warna); else el.removeAttribute('data-warna');
    el.style.colorScheme = gelap ? 'dark' : 'light';
  }
  window.Tema = {
    WARNA: WARNA,
    get: baca,
    set: function (ubah) { var t = baca(); for (var k in ubah) t[k] = ubah[k]; try { localStorage.setItem(KUNCI, JSON.stringify(t)); } catch (e) {} terapkan(t); return t; },
    terapkan: terapkan,
    gelap: function () { return document.documentElement.getAttribute('data-mode') === 'gelap'; }
  };
  terapkan();
  if (mq) { var ubah = function () { if ((baca().mode || 'terang') === 'sistem') terapkan(); }; if (mq.addEventListener) mq.addEventListener('change', ubah); else if (mq.addListener) mq.addListener(ubah); }
})();
