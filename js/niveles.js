/* ============================================================
   niveles.js  —  Niveles incorporados del juego
   Cada nivel es una ilustración hecha con figuras geométricas.
   La unión de todas las figuras (menos los "hole") es la zona
   que el jugador debe rellenar con rectángulos.
   Dificultad creciente: rectángulos -> círculos -> irregulares.
   ============================================================ */
(function (global) {
  'use strict';

  const NIVELES = [
    {
      id: 'caja',
      name: '1 · La Caja',
      hint: 'Calentamiento: un solo rectángulo. ¡Aquí sí se puede el 100%!',
      width: 600, height: 450, penalty: 1,
      shapes: [
        { type: 'rect', x: 180, y: 130, w: 240, h: 190, color: '#7c5cff' }
      ]
    },
    {
      id: 'cruz',
      name: '2 · La Cruz',
      hint: 'Dos rectángulos cruzados. Combina varios para cubrirlo todo.',
      width: 600, height: 450, penalty: 1,
      shapes: [
        { type: 'rect', x: 250, y: 90,  w: 100, h: 270, color: '#3bc9db' },
        { type: 'rect', x: 160, y: 180, w: 280, h: 100, color: '#3bc9db' }
      ]
    },
    {
      id: 'casa',
      name: '3 · La Casa',
      hint: 'El techo es un triángulo: ahí empiezan las esquinas difíciles.',
      width: 600, height: 450, penalty: 1,
      shapes: [
        { type: 'rect', x: 200, y: 200, w: 200, h: 160, color: '#ffd43b' },
        { type: 'triangle', points: [[180, 200], [420, 200], [300, 100]], color: '#ff8787' },
        { type: 'rect', x: 270, y: 270, w: 60, h: 90, color: '#7c5cff', hole: false }
      ]
    },
    {
      id: 'robot',
      name: '4 · El Robot',
      hint: 'Pura geometría recta: cabeza, cuerpo y patas.',
      width: 600, height: 450, penalty: 1,
      shapes: [
        { type: 'rect', x: 240, y: 70,  w: 120, h: 90,  color: '#74c0fc' },
        { type: 'rect', x: 200, y: 170, w: 200, h: 140, color: '#4dabf7' },
        { type: 'rect', x: 220, y: 320, w: 50,  h: 70,  color: '#74c0fc' },
        { type: 'rect', x: 330, y: 320, w: 50,  h: 70,  color: '#74c0fc' },
        { type: 'rect', x: 150, y: 190, w: 50,  h: 100, color: '#74c0fc' },
        { type: 'rect', x: 400, y: 190, w: 50,  h: 100, color: '#74c0fc' }
      ]
    },
    {
      id: 'sol',
      name: '5 · El Sol',
      hint: 'Un círculo: imposible llenarlo perfecto. ¿Hasta dónde llegas?',
      width: 600, height: 450, penalty: 1.2,
      shapes: [
        { type: 'circle', x: 300, y: 225, r: 140, color: '#ffd43b' }
      ]
    },
    {
      id: 'globo',
      name: '6 · El Globo',
      hint: 'Elipse + cuerda. Las curvas castigan si te pasas.',
      width: 600, height: 450, penalty: 1.3,
      shapes: [
        { type: 'ellipse', x: 300, y: 180, rx: 110, ry: 140, color: '#ff6b9d' },
        { type: 'rect', x: 296, y: 320, w: 8, h: 90, color: '#868e96' }
      ]
    },
    {
      id: 'gato',
      name: '7 · El Gato',
      hint: 'Orejas en punta y cabeza redonda: figura irregular.',
      width: 600, height: 450, penalty: 1.4,
      shapes: [
        { type: 'circle', x: 300, y: 250, r: 120, color: '#b197fc' },
        { type: 'triangle', points: [[210, 170], [250, 90], [290, 165]], color: '#b197fc' },
        { type: 'triangle', points: [[310, 165], [350, 90], [390, 170]], color: '#b197fc' }
      ]
    },
    {
      id: 'dona',
      name: '8 · La Dona',
      hint: 'Círculo con agujero en el centro. ¡No rellenes el hueco o pierdes puntos!',
      width: 600, height: 450, penalty: 1.5,
      shapes: [
        { type: 'circle', x: 300, y: 225, r: 150, color: '#f783ac' },
        { type: 'circle', x: 300, y: 225, r: 55, color: '#000', hole: true }
      ]
    },
    {
      id: 'estrella',
      name: '9 · La Estrella',
      hint: 'Cinco puntas afiladas. El récord aquí es difícil de superar.',
      width: 600, height: 450, penalty: 1.6,
      shapes: [
        { type: 'polygon', color: '#ffe066', points: estrella(300, 230, 160, 70, 5, -90) }
      ]
    },
    {
      id: 'luna',
      name: '10 · La Luna',
      hint: 'Nivel final: una luna creciente, pura curva. La pesadilla de Riemann.',
      width: 600, height: 450, penalty: 1.7,
      shapes: [
        { type: 'circle', x: 290, y: 225, r: 150, color: '#dfe4ff' },
        { type: 'circle', x: 365, y: 195, r: 135, color: '#000', hole: true }
      ]
    }
  ];

  /* Genera los puntos de una estrella de N puntas */
  function estrella(cx, cy, rExt, rInt, puntas, anguloIni) {
    const pts = [];
    const paso = Math.PI / puntas;
    let a = (anguloIni * Math.PI) / 180;
    for (let i = 0; i < puntas * 2; i++) {
      const r = i % 2 === 0 ? rExt : rInt;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      a += paso;
    }
    return pts;
  }

  global.NIVELES = NIVELES;
})(window);
