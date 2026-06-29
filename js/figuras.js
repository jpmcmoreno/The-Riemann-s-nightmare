/* ============================================================
   figuras.js  —  Motor compartido (juego + editor)
   Define las primitivas geométricas, su dibujo, la creación de
   la "máscara objetivo" y el cálculo de puntaje por píxeles.
   Todo se cuelga de window para funcionar abriendo el HTML
   directamente (file://) sin necesidad de servidor ni módulos.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Dibujo de una primitiva ----------
     Crea el trazo (path) de la figura sin rellenar.
     El que llama decide si hace fill() o stroke().      */
  function trazar(ctx, s) {
    ctx.beginPath();
    switch (s.type) {
      case 'rect':
        ctx.rect(s.x, s.y, s.w, s.h);
        break;
      case 'circle':
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        break;
      case 'ellipse':
        ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
      case 'polygon': {
        const p = s.points;
        if (!p || p.length === 0) break;
        ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
        ctx.closePath();
        break;
      }
    }
  }

  /* ---------- Caja contenedora de una figura (para el editor) ---------- */
  function caja(s) {
    switch (s.type) {
      case 'rect':
        return { x: s.x, y: s.y, w: s.w, h: s.h };
      case 'circle':
        return { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
      case 'ellipse':
        return { x: s.x - s.rx, y: s.y - s.ry, w: s.rx * 2, h: s.ry * 2 };
      case 'triangle':
      case 'polygon': {
        const p = s.points || [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        p.forEach(([x, y]) => {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  /* ---------- Dibuja la ilustración completa de un nivel ----------
     Las figuras "hole:true" se restan (recortan) del dibujo.   */
  function dibujarNivel(ctx, nivel, opciones) {
    opciones = opciones || {};
    ctx.save();
    ctx.clearRect(0, 0, nivel.width, nivel.height);

    // Capa de relleno (figuras sólidas menos los agujeros)
    const capa = document.createElement('canvas');
    capa.width = nivel.width;
    capa.height = nivel.height;
    const cctx = capa.getContext('2d');

    nivel.shapes.forEach((s) => {
      if (s.hole) return;
      cctx.globalCompositeOperation = 'source-over';
      cctx.fillStyle = s.color || '#7c5cff';
      trazar(cctx, s);
      cctx.fill();
    });
    nivel.shapes.forEach((s) => {
      if (!s.hole) return;
      cctx.globalCompositeOperation = 'destination-out';
      trazar(cctx, s);
      cctx.fill();
    });

    ctx.globalAlpha = opciones.alpha != null ? opciones.alpha : 1;
    ctx.drawImage(capa, 0, 0);
    ctx.restore();
  }

  /* ---------- Máscara objetivo ----------
     Devuelve un ImageData donde alpha>0 indica zona a rellenar. */
  function crearMascara(nivel) {
    const c = document.createElement('canvas');
    c.width = nivel.width;
    c.height = nivel.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    nivel.shapes.forEach((s) => {
      if (s.hole) return;
      ctx.globalCompositeOperation = 'source-over';
      trazar(ctx, s);
      ctx.fill();
    });
    nivel.shapes.forEach((s) => {
      if (!s.hole) return;
      ctx.globalCompositeOperation = 'destination-out';
      trazar(ctx, s);
      ctx.fill();
    });
    return ctx.getImageData(0, 0, c.width, c.height);
  }

  /* ---------- Evaluación ----------
     Dado el nivel, su máscara y la lista de rectángulos del jugador:
     - cuenta píxeles cubiertos (dentro) y desbordados (fuera)
     - calcula relleno %, desborde % y puntaje neto
     - genera un canvas "overlay" coloreado (verde = bien, rojo = se pasó)
  */
  function evaluar(nivel, mascara, rects) {
    const W = nivel.width, H = nivel.height;

    // Pinta los rectángulos del jugador en un canvas auxiliar
    const pc = document.createElement('canvas');
    pc.width = W; pc.height = H;
    const pctx = pc.getContext('2d');
    pctx.fillStyle = '#fff';
    rects.forEach((r) => {
      const x = Math.min(r.x, r.x + r.w);
      const y = Math.min(r.y, r.y + r.h);
      pctx.fillRect(x, y, Math.abs(r.w), Math.abs(r.h));
    });
    const pData = pctx.getImageData(0, 0, W, H).data;
    const mData = mascara.data;

    // Overlay coloreado
    const overlay = document.createElement('canvas');
    overlay.width = W; overlay.height = H;
    const octx = overlay.getContext('2d');
    const oImg = octx.createImageData(W, H);
    const o = oImg.data;

    let objetivo = 0, cubierto = 0, desborde = 0;
    const n = W * H;
    for (let i = 0; i < n; i++) {
      const a = i * 4 + 3;
      const enObjetivo = mData[a] > 10;
      const enJugador = pData[a] > 10;
      if (enObjetivo) objetivo++;
      if (enJugador) {
        if (enObjetivo) {
          cubierto++;
          o[i * 4] = 64; o[i * 4 + 1] = 220; o[i * 4 + 2] = 140; o[a] = 235; // verde
        } else {
          desborde++;
          o[i * 4] = 255; o[i * 4 + 1] = 86; o[i * 4 + 2] = 86; o[a] = 220;  // rojo
        }
      }
    }
    octx.putImageData(oImg, 0, 0);

    const penal = nivel.penalty != null ? nivel.penalty : 1;
    const relleno = objetivo ? (cubierto / objetivo) * 100 : 0;
    const sobra = objetivo ? (desborde / objetivo) * 100 : 0;
    let neto = relleno - sobra * penal;
    if (neto < 0) neto = 0;
    if (neto > 100) neto = 100;

    return {
      objetivo, cubierto, desborde,
      relleno, sobra, neto,
      overlay
    };
  }

  global.Figuras = { trazar, caja, dibujarNivel, crearMascara, evaluar };
})(window);
