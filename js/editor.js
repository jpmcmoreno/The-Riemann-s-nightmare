/* ============================================================
   editor.js  —  Editor visual de niveles
   Permite componer una ilustración con figuras geométricas,
   moverlas/redimensionarlas, marcarlas como "agujero", y
   exportar el nivel en JSON o guardarlo para jugarlo.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const cv = $('lienzo');
  const ctx = cv.getContext('2d');

  // --- Estado del nivel en edición ---
  let nivel = {
    id: 'nivel_' + Date.now(),
    name: 'Mi nivel',
    hint: '',
    width: 600,
    height: 450,
    penalty: 1,
    shapes: []
  };
  let selId = null;          // índice de figura seleccionada
  let colorActual = '#7c5cff';

  // interacción
  let modo = 'select';       // select | poligono
  let arrastrando = false;
  let asaActiva = null;      // null | 'mover' | 'nw','ne','sw','se'
  let offset = { x: 0, y: 0 };
  let polTemp = [];          // puntos del polígono en construcción

  cv.width = nivel.width;
  cv.height = nivel.height;

  /* ---------------- Dibujo ---------------- */
  function pintar() {
    ctx.clearRect(0, 0, cv.width, cv.height);

    // cuadrícula
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x <= cv.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke(); }
    for (let y = 0; y <= cv.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke(); }
    ctx.restore();

    // ilustración
    window.Figuras.dibujarNivel(ctx, nivel, { alpha: 1 });

    // marcar agujeros con borde punteado
    ctx.save();
    nivel.shapes.forEach((s) => {
      if (!s.hole) return;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#ff5656';
      ctx.lineWidth = 2;
      window.Figuras.trazar(ctx, s);
      ctx.stroke();
    });
    ctx.restore();

    // selección + asas
    if (selId != null && nivel.shapes[selId]) {
      const b = window.Figuras.caja(nivel.shapes[selId]);
      ctx.save();
      ctx.strokeStyle = '#3bc9db';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#3bc9db';
      asas(b).forEach((a) => ctx.fillRect(a.x - 5, a.y - 5, 10, 10));
      ctx.restore();
    }

    // polígono en construcción
    if (modo === 'poligono' && polTemp.length) {
      ctx.save();
      ctx.strokeStyle = '#ffd43b';
      ctx.fillStyle = 'rgba(255,212,59,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(polTemp[0][0], polTemp[0][1]);
      polTemp.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.stroke();
      polTemp.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
      ctx.restore();
    }
  }

  function asas(b) {
    return [
      { id: 'nw', x: b.x, y: b.y },
      { id: 'ne', x: b.x + b.w, y: b.y },
      { id: 'sw', x: b.x, y: b.y + b.h },
      { id: 'se', x: b.x + b.w, y: b.y + b.h }
    ];
  }

  /* ---------------- Lista de figuras ---------------- */
  function refrescarLista() {
    const cont = $('listaFiguras');
    cont.innerHTML = '';
    nivel.shapes.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'item-figura' + (i === selId ? ' sel' : '');
      d.innerHTML =
        '<span class="punto" style="background:' + (s.color || '#fff') + '"></span>' +
        '<span class="crece">' + nombreTipo(s.type) + '</span>' +
        (s.hole ? '<span class="tag">agujero</span>' : '');
      d.addEventListener('click', () => { seleccionar(i); });
      cont.appendChild(d);
    });
    refrescarProps();
  }

  function nombreTipo(t) {
    return { rect: 'Rectángulo', circle: 'Círculo', ellipse: 'Elipse', triangle: 'Triángulo', polygon: 'Polígono' }[t] || t;
  }

  function seleccionar(i) {
    selId = i;
    modo = 'select';
    refrescarLista();
    pintar();
  }

  /* ---------------- Panel de propiedades ---------------- */
  function refrescarProps() {
    const cont = $('props');
    if (selId == null || !nivel.shapes[selId]) {
      cont.innerHTML = '<p class="aviso">Selecciona una figura para editar sus propiedades.</p>';
      return;
    }
    const s = nivel.shapes[selId];
    let html = '';
    const num = (lbl, key, val) =>
      '<div class="campo"><label>' + lbl + '</label><input type="number" data-k="' + key + '" value="' + Math.round(val) + '"></div>';

    if (s.type === 'rect') {
      html += num('X', 'x', s.x) + num('Y', 'y', s.y) + num('Ancho', 'w', s.w) + num('Alto', 'h', s.h);
    } else if (s.type === 'circle') {
      html += num('Centro X', 'x', s.x) + num('Centro Y', 'y', s.y) + num('Radio', 'r', s.r);
    } else if (s.type === 'ellipse') {
      html += num('Centro X', 'x', s.x) + num('Centro Y', 'y', s.y) + num('Radio X', 'rx', s.rx) + num('Radio Y', 'ry', s.ry);
    } else {
      html += '<p class="aviso">Polígono/triángulo: arrástralo o usa las asas para escalar.</p>';
    }
    html += '<div class="campo"><label>Color</label><input type="color" data-k="color" value="' + (s.color || '#7c5cff') + '"></div>';
    html += '<label class="fila-chk"><input type="checkbox" data-k="hole" ' + (s.hole ? 'checked' : '') + '> Es un agujero (se resta)</label>';
    cont.innerHTML = html;

    cont.querySelectorAll('[data-k]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.getAttribute('data-k');
        if (k === 'color') s.color = inp.value;
        else if (k === 'hole') s.hole = inp.checked;
        else s[k] = parseFloat(inp.value) || 0;
        pintar();
        refrescarLista();
      });
    });
  }

  /* ---------------- Añadir figuras ---------------- */
  function nuevaFigura(tipo) {
    const cx = nivel.width / 2, cy = nivel.height / 2;
    let s;
    if (tipo === 'rect') s = { type: 'rect', x: cx - 80, y: cy - 60, w: 160, h: 120, color: colorActual };
    else if (tipo === 'circle') s = { type: 'circle', x: cx, y: cy, r: 80, color: colorActual };
    else if (tipo === 'ellipse') s = { type: 'ellipse', x: cx, y: cy, rx: 100, ry: 60, color: colorActual };
    else if (tipo === 'triangle') s = { type: 'triangle', color: colorActual, points: [[cx - 90, cy + 70], [cx + 90, cy + 70], [cx, cy - 80]] };
    nivel.shapes.push(s);
    seleccionar(nivel.shapes.length - 1);
  }

  /* ---------------- Coordenadas ---------------- */
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (cv.width / r.width),
      y: (e.clientY - r.top) * (cv.height / r.height)
    };
  }

  function figuraEn(p) {
    // de arriba hacia abajo (la última dibujada está encima)
    for (let i = nivel.shapes.length - 1; i >= 0; i--) {
      const b = window.Figuras.caja(nivel.shapes[i]);
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return i;
    }
    return null;
  }

  function asaEn(p) {
    if (selId == null) return null;
    const b = window.Figuras.caja(nivel.shapes[selId]);
    for (const a of asas(b)) {
      if (Math.abs(p.x - a.x) <= 8 && Math.abs(p.y - a.y) <= 8) return a.id;
    }
    return null;
  }

  /* ---------------- Mouse ---------------- */
  cv.addEventListener('mousedown', (e) => {
    const p = pos(e);

    if (modo === 'poligono') {
      polTemp.push([p.x, p.y]);
      pintar();
      return;
    }

    asaActiva = asaEn(p);
    if (asaActiva) { arrastrando = true; return; }

    const i = figuraEn(p);
    if (i != null) {
      seleccionar(i);
      asaActiva = 'mover';
      arrastrando = true;
      const b = window.Figuras.caja(nivel.shapes[i]);
      offset = { x: p.x - b.x, y: p.y - b.y };
    } else {
      selId = null;
      refrescarLista();
      pintar();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!arrastrando || selId == null) return;
    const p = pos(e);
    const s = nivel.shapes[selId];
    const b = window.Figuras.caja(s);

    if (asaActiva === 'mover') {
      mover(s, p.x - offset.x - b.x, p.y - offset.y - b.y);
    } else {
      escalar(s, asaActiva, p);
    }
    pintar();
    refrescarProps();
  });

  window.addEventListener('mouseup', () => { arrastrando = false; asaActiva = null; });

  // doble clic cierra el polígono
  cv.addEventListener('dblclick', () => {
    if (modo === 'poligono' && polTemp.length >= 3) {
      nivel.shapes.push({ type: 'polygon', color: colorActual, points: polTemp.slice() });
      polTemp = [];
      modo = 'select';
      seleccionar(nivel.shapes.length - 1);
    }
  });

  function mover(s, dx, dy) {
    if (s.type === 'rect') { s.x += dx; s.y += dy; }
    else if (s.type === 'circle' || s.type === 'ellipse') { s.x += dx; s.y += dy; }
    else if (s.points) { s.points = s.points.map(([x, y]) => [x + dx, y + dy]); }
  }

  function escalar(s, asa, p) {
    const b = window.Figuras.caja(s);
    // nuevo rectángulo objetivo según el asa
    let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
    if (asa.includes('w')) x1 = p.x; if (asa.includes('e')) x2 = p.x;
    if (asa.includes('n')) y1 = p.y; if (asa.includes('s')) y2 = p.y;
    const nx = Math.min(x1, x2), ny = Math.min(y1, y2);
    const nw = Math.max(8, Math.abs(x2 - x1)), nh = Math.max(8, Math.abs(y2 - y1));

    if (s.type === 'rect') { s.x = nx; s.y = ny; s.w = nw; s.h = nh; }
    else if (s.type === 'circle') { s.r = Math.max(4, Math.min(nw, nh) / 2); s.x = nx + nw / 2; s.y = ny + nh / 2; }
    else if (s.type === 'ellipse') { s.rx = nw / 2; s.ry = nh / 2; s.x = nx + nw / 2; s.y = ny + nh / 2; }
    else if (s.points) {
      // escala los puntos proporcionalmente respecto a la caja anterior
      const sx = nw / (b.w || 1), sy = nh / (b.h || 1);
      s.points = s.points.map(([x, y]) => [nx + (x - b.x) * sx, ny + (y - b.y) * sy]);
    }
  }

  /* ---------------- Exportar / Guardar ---------------- */
  function sincronizarMeta() {
    nivel.name = $('mName').value || 'Mi nivel';
    nivel.hint = $('mHint').value || '';
    nivel.width = parseInt($('mW').value, 10) || 600;
    nivel.height = parseInt($('mH').value, 10) || 450;
    nivel.penalty = parseFloat($('mPenal').value) || 1;
    nivel.id = (nivel.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'nivel') + '_' + (nivel.id.split('_').pop());
    if (cv.width !== nivel.width || cv.height !== nivel.height) {
      cv.width = nivel.width; cv.height = nivel.height; pintar();
    }
  }

  function json() {
    sincronizarMeta();
    return JSON.stringify(nivel, null, 2);
  }

  $('btnRect').addEventListener('click', () => nuevaFigura('rect'));
  $('btnCirc').addEventListener('click', () => nuevaFigura('circle'));
  $('btnElip').addEventListener('click', () => nuevaFigura('ellipse'));
  $('btnTri').addEventListener('click', () => nuevaFigura('triangle'));
  $('btnPoli').addEventListener('click', () => {
    modo = 'poligono'; polTemp = []; selId = null;
    toast('Modo polígono: clic para puntos, doble clic para cerrar');
    pintar();
  });

  $('btnBorrar').addEventListener('click', () => {
    if (selId == null) return toast('No hay figura seleccionada');
    nivel.shapes.splice(selId, 1);
    selId = null;
    refrescarLista(); pintar();
  });
  $('btnSubir').addEventListener('click', () => {
    if (selId == null || selId >= nivel.shapes.length - 1) return;
    [nivel.shapes[selId], nivel.shapes[selId + 1]] = [nivel.shapes[selId + 1], nivel.shapes[selId]];
    seleccionar(selId + 1);
  });
  $('btnBajar').addEventListener('click', () => {
    if (selId == null || selId <= 0) return;
    [nivel.shapes[selId], nivel.shapes[selId - 1]] = [nivel.shapes[selId - 1], nivel.shapes[selId]];
    seleccionar(selId - 1);
  });

  $('colorBase').addEventListener('input', (e) => { colorActual = e.target.value; });

  $('btnExportar').addEventListener('click', () => { $('salidaJson').value = json(); toast('JSON generado abajo'); });
  $('btnCopiar').addEventListener('click', async () => {
    const t = json(); $('salidaJson').value = t;
    try { await navigator.clipboard.writeText(t); toast('Copiado al portapapeles'); }
    catch (e) { toast('Selecciona y copia manualmente'); }
  });
  $('btnDescargar').addEventListener('click', () => {
    const t = json();
    const blob = new Blob([t], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nivel.id + '.json';
    a.click();
    toast('Descargado ' + a.download);
  });

  $('btnImportar').addEventListener('click', () => {
    try {
      const obj = JSON.parse($('salidaJson').value);
      if (!obj.shapes) throw new Error('falta shapes');
      nivel = obj;
      cv.width = nivel.width; cv.height = nivel.height;
      $('mName').value = nivel.name; $('mHint').value = nivel.hint || '';
      $('mW').value = nivel.width; $('mH').value = nivel.height; $('mPenal').value = nivel.penalty || 1;
      selId = null; refrescarLista(); pintar();
      toast('Nivel importado');
    } catch (e) { toast('JSON inválido'); }
  });

  $('btnGuardarJugar').addEventListener('click', () => {
    sincronizarMeta();
    if (!nivel.shapes.length) return toast('Agrega al menos una figura');
    const lista = JSON.parse(localStorage.getItem('figuras_niveles') || '[]');
    // reemplaza si ya existe un id igual
    const i = lista.findIndex((n) => n.id === nivel.id);
    if (i >= 0) lista[i] = nivel; else lista.push(nivel);
    localStorage.setItem('figuras_niveles', JSON.stringify(lista));
    toast('Guardado. Aparece en el juego con ★');
  });

  $('btnLimpiarGuardados').addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los niveles personalizados guardados?')) {
      localStorage.removeItem('figuras_niveles');
      toast('Niveles personalizados borrados');
    }
  });

  $('btnNuevo').addEventListener('click', () => {
    nivel = { id: 'nivel_' + Date.now(), name: 'Mi nivel', hint: '', width: 600, height: 450, penalty: 1, shapes: [] };
    $('mName').value = nivel.name; $('mHint').value = '';
    $('mW').value = 600; $('mH').value = 450; $('mPenal').value = 1;
    selId = null; cv.width = 600; cv.height = 450;
    refrescarLista(); pintar();
  });

  // teclado
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selId != null && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      nivel.shapes.splice(selId, 1); selId = null; refrescarLista(); pintar();
    }
  });

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('ver');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('ver'), 1800);
  }

  // --- init ---
  $('mName').value = nivel.name;
  $('mW').value = nivel.width;
  $('mH').value = nivel.height;
  $('mPenal').value = nivel.penalty;
  $('colorBase').value = colorActual;
  refrescarLista();
  pintar();
})();
