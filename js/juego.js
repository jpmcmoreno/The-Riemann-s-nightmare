/* ============================================================
   juego.js  —  The Riemann's Nightmare
   Campaña: menú -> niveles 1..N seguidos (15 s cada uno) ->
   pantalla de resultados con el puntaje de cada nivel y el total.
   Pantallas: menú, juego, resultado, puntuaciones.
   ============================================================ */
(function () {
  'use strict';

  const TIEMPO_NIVEL = 15;   // segundos por nivel

  // --- Estado ---
  let niveles = [];
  let orden = [];            // índices que forman la campaña
  let pos = 0;               // posición dentro de la campaña
  let nivel = null;
  let mascara = null;
  let rects = [];
  let resultado = null;
  let mostrarFigura = true;
  let puntajes = [];         // {name, neto} por nivel jugado

  // temporizador
  let tFin = 0;              // timestamp de fin
  let rafId = null;
  let jugando = false;

  // arrastre
  let dibujando = false, inicio = null, actual = null;

  const cv = document.getElementById('lienzo');
  const ctx = cv.getContext('2d');
  const $ = (id) => document.getElementById(id);

  /* ---------- Niveles ---------- */
  function cargarNiveles() {
    niveles = window.NIVELES.slice();
    try {
      const extra = JSON.parse(localStorage.getItem('figuras_niveles') || '[]');
      if (Array.isArray(extra)) extra.forEach((n) => { n.name = n.name + ' ★'; niveles.push(n); });
    } catch (e) { /* json inválido */ }
  }

  /* ---------- Pantallas ---------- */
  function mostrar(pantalla) {
    ['pantallaMenu', 'pantallaJuego', 'pantallaResultado', 'pantallaPuntuaciones']
      .forEach((p) => $(p).classList.add('oculto'));
    $(pantalla).classList.remove('oculto');
  }

  /* ---------- Récords (localStorage) ---------- */
  const claveRecord = (n) => 'figuras_record_' + n.id;
  function leerRecord(n) { const v = parseFloat(localStorage.getItem(claveRecord(n))); return isNaN(v) ? 0 : v; }
  function guardarRecord(n, v) { if (v > leerRecord(n)) { localStorage.setItem(claveRecord(n), String(v)); return true; } return false; }
  function leerMejorTotal() { const v = parseFloat(localStorage.getItem('figuras_mejor_total')); return isNaN(v) ? 0 : v; }
  function guardarMejorTotal(v) { if (v > leerMejorTotal()) { localStorage.setItem('figuras_mejor_total', String(v)); return true; } return false; }

  /* ---------- Iniciar campaña ---------- */
  function empezarCampana() {
    cargarNiveles();
    orden = niveles.map((_, i) => i);
    pos = 0;
    puntajes = [];
    $('numTotal').textContent = orden.length;
    mostrar('pantallaJuego');
    cargarNivelActual();
  }

  function cargarNivelActual() {
    nivel = niveles[orden[pos]];
    cv.width = nivel.width;
    cv.height = nivel.height;
    mascara = window.Figuras.crearMascara(nivel);
    rects = [];
    resultado = null;
    inicio = actual = null;
    dibujando = false;

    $('numNivel').textContent = pos + 1;
    $('tituloNivel').textContent = nivel.name;
    $('hint').textContent = nivel.hint || '';
    evaluarYpintar();
    actualizarBotones();
    iniciarReloj();
  }

  /* ---------- Reloj ---------- */
  function iniciarReloj() {
    jugando = true;
    tFin = performance.now() + TIEMPO_NIVEL * 1000;
    if (rafId) cancelAnimationFrame(rafId);
    tick();
  }

  function tick() {
    const restante = Math.max(0, (tFin - performance.now()) / 1000);
    $('reloj').textContent = restante.toFixed(1) + 's';
    $('tiempoBarra').style.width = (restante / TIEMPO_NIVEL * 100) + '%';
    $('reloj').classList.toggle('urgente', restante <= 5);
    if (restante <= 0) { terminarNivel(); return; }
    rafId = requestAnimationFrame(tick);
  }

  function terminarNivel() {
    if (!jugando) return;
    jugando = false;
    if (rafId) cancelAnimationFrame(rafId);

    // asegura evaluación final
    resultado = window.Figuras.evaluar(nivel, mascara, rects);
    puntajes.push({ name: nivel.name, neto: resultado.neto });
    if (guardarRecord(nivel, resultado.neto)) toast('🏆 ¡Récord en este nivel!');

    pos++;
    if (pos >= orden.length) {
      mostrarResultados();
    } else {
      cargarNivelActual();
    }
  }

  /* ---------- Resultados ---------- */
  function mostrarResultados() {
    const total = puntajes.reduce((a, p) => a + p.neto, 0);
    const tabla = $('tablaResultado');
    tabla.innerHTML = puntajes.map((p) =>
      '<div class="fila-tabla"><span>' + p.name + '</span><b>' + p.neto.toFixed(1) + '%</b></div>'
    ).join('');
    $('resTotal').textContent = Math.round(total);

    const nuevoRecord = guardarMejorTotal(total);
    $('resRecord').textContent = nuevoRecord
      ? '🏆 ¡Nuevo mejor puntaje total!'
      : 'Tu mejor total sigue siendo ' + Math.round(leerMejorTotal());
    $('resRecord').className = 'record-msg' + (nuevoRecord ? ' destacado' : '');
    mostrar('pantallaResultado');
  }

  /* ---------- Puntuaciones ---------- */
  function mostrarPuntuaciones() {
    cargarNiveles();
    $('mejorTotal').textContent = Math.round(leerMejorTotal());
    $('tablaRecords').innerHTML = niveles.map((n) =>
      '<div class="fila-tabla"><span>' + n.name + '</span><b>' + leerRecord(n).toFixed(1) + '%</b></div>'
    ).join('');
    mostrar('pantallaPuntuaciones');
  }

  /* ---------- Evaluar / pintar ---------- */
  function evaluarYpintar() {
    resultado = window.Figuras.evaluar(nivel, mascara, rects);
    actualizarPanel();
    pintar();
  }

  function pintar() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= cv.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke(); }
    for (let y = 0; y <= cv.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke(); }
    ctx.restore();

    if (mostrarFigura) window.Figuras.dibujarNivel(ctx, nivel, { alpha: 0.32 });

    if (resultado && resultado.overlay) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(resultado.overlay, 0, 0);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    rects.forEach((r) => ctx.strokeRect(Math.min(r.x, r.x + r.w), Math.min(r.y, r.y + r.h), Math.abs(r.w), Math.abs(r.h)));

    if (dibujando && inicio && actual) {
      const x = Math.min(inicio.x, actual.x), y = Math.min(inicio.y, actual.y);
      const w = Math.abs(actual.x - inicio.x), h = Math.abs(actual.y - inicio.y);
      ctx.fillStyle = 'rgba(124,92,255,0.35)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  function actualizarPanel() {
    const r = resultado;
    $('mRelleno').textContent = r.relleno.toFixed(1) + '%';
    $('mDesborde').textContent = r.sobra.toFixed(1) + '%';
    $('mNeto').textContent = r.neto.toFixed(1) + '%';
    $('barraNeto').style.width = r.neto + '%';
    $('mPiezas').textContent = rects.length;
    $('mRecord').textContent = leerRecord(nivel).toFixed(1) + '%';
  }

  function actualizarBotones() {
    $('btnDeshacer').disabled = rects.length === 0;
    $('btnLimpiar').disabled = rects.length === 0;
  }

  /* ---------- Dibujo con mouse ---------- */
  function posXY(e) {
    const rect = cv.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return {
      x: Math.max(0, Math.min(cv.width, px * (cv.width / rect.width))),
      y: Math.max(0, Math.min(cv.height, py * (cv.height / rect.height)))
    };
  }
  function iniciar(e) { if (!jugando) return; e.preventDefault(); dibujando = true; inicio = posXY(e); actual = inicio; }
  function mover(e) { if (!dibujando) return; e.preventDefault(); actual = posXY(e); pintar(); }
  function soltar(e) {
    if (!dibujando) return;
    e.preventDefault();
    dibujando = false;
    const w = actual.x - inicio.x, h = actual.y - inicio.y;
    if (Math.abs(w) > 3 && Math.abs(h) > 3) {
      rects.push({ x: inicio.x, y: inicio.y, w, h });
      evaluarYpintar();
      actualizarBotones();
    } else pintar();
    inicio = actual = null;
  }

  function toast(txt) {
    const t = $('toast'); t.textContent = txt; t.classList.add('ver');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('ver'), 1800);
  }

  function salirAlMenu() {
    jugando = false;
    if (rafId) cancelAnimationFrame(rafId);
    mostrar('pantallaMenu');
  }

  /* ---------- Eventos ---------- */
  cv.addEventListener('mousedown', iniciar);
  window.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', soltar);
  cv.addEventListener('touchstart', iniciar, { passive: false });
  cv.addEventListener('touchmove', mover, { passive: false });
  cv.addEventListener('touchend', soltar, { passive: false });

  $('btnDeshacer').addEventListener('click', () => { rects.pop(); evaluarYpintar(); actualizarBotones(); });
  $('btnLimpiar').addEventListener('click', () => { rects = []; evaluarYpintar(); actualizarBotones(); });
  $('btnSiguiente').addEventListener('click', terminarNivel);
  $('btnSalir').addEventListener('click', salirAlMenu);
  $('chkFigura').addEventListener('change', (e) => { mostrarFigura = e.target.checked; pintar(); });

  $('btnJugar').addEventListener('click', empezarCampana);
  $('btnPuntuaciones').addEventListener('click', mostrarPuntuaciones);
  $('btnVolverMenu').addEventListener('click', () => mostrar('pantallaMenu'));
  $('btnReintentar').addEventListener('click', empezarCampana);
  $('btnMenu').addEventListener('click', () => mostrar('pantallaMenu'));
  $('btnBorrarRecords').addEventListener('click', () => {
    if (!confirm('¿Borrar todos los récords y el mejor total?')) return;
    Object.keys(localStorage).filter((k) => k.startsWith('figuras_record_')).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('figuras_mejor_total');
    mostrarPuntuaciones();
  });

  window.addEventListener('keydown', (e) => {
    if (!jugando) return;
    if (e.ctrlKey && e.key === 'z') { rects.pop(); evaluarYpintar(); actualizarBotones(); }
    if (e.key === 'Enter') terminarNivel();
  });

  // --- Inicio: mostrar menú ---
  mostrar('pantallaMenu');
})();
