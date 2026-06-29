# ▦ Rellena la Figura

Juego web de niveles: aparecen ilustraciones hechas con figuras geométricas y
el jugador solo puede dibujar **rectángulos** con el mouse para rellenarlas lo
mejor posible. Si se pasa de los bordes, **pierde puntos**.

## Cómo jugar
1. Abre `index.html` en el navegador (doble clic) **o** usa un servidor local.
2. Arrastra con el mouse para crear rectángulos sobre la figura.
   - 🟢 Verde = zona bien cubierta.
   - 🔴 Rojo = te pasaste (resta puntos).
3. Métricas:
   - **Relleno** = % de la figura que cubriste.
   - **Desborde** = % que se salió (penaliza según el nivel).
   - **Puntaje neto** = relleno − desborde × penalización.
4. Tu **récord** por nivel se guarda automáticamente.
5. Atajos: `Ctrl+Z` deshacer · `←/→` cambiar de nivel.

> En los niveles con **círculos, elipses, estrellas y agujeros** es imposible
> llegar al 100%: ahí el reto es **superar tu propio récord**.

## Editor de niveles (`editor.html`)
- Añade rectángulos, círculos, elipses, triángulos y polígonos.
- Arrastra para mover; usa las **asas** para escalar; `Supr` para borrar.
- Marca una figura como **agujero** para que reste área (efecto dona).
- Ajusta la **penalización de desborde** (más alta = castiga más pasarse).
- **Guardar y jugar**: deja el nivel en este navegador y aparece en el juego con ★.
- **Descargar/Copiar JSON**: para incluirlo de forma permanente, pega ese JSON
  dentro del arreglo `NIVELES` en `js/niveles.js`.

## Ejecutar con servidor local (opcional)
Funciona abriendo el HTML directo, pero si prefieres servidor:
```
cd juego-figuras
python -m http.server 8123
```
Luego abre http://localhost:8123

## Estructura
```
juego-figuras/
├── index.html      · el juego
├── editor.html     · editor de niveles
├── css/estilos.css
└── js/
    ├── figuras.js  · motor: dibujo, máscara y puntaje por píxeles
    ├── niveles.js  · niveles incorporados
    ├── juego.js    · lógica del juego
    └── editor.js   · lógica del editor
```
