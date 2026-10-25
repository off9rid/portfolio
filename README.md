# Portfolio

My portfolio: **https://amiralizhian.vercel.app**

A single page where one cloud of 14,000 particles reshapes itself as you scroll: my name, then a sphere, Friday's voice ring, a hand for HALO, a clap waveform, a coin, the Cortex HUD rings and a galaxy to finish.

## Built with

- three.js (custom point shaders, shapes generated in code and sampled from text)
- Lenis smooth scrolling and CSS scroll-driven reveals
- Plain HTML, CSS and JavaScript. No build step.

## Run it locally

```bash
python3 -m http.server -d . 8000   # then open http://localhost:8000
```

## Editing

- Words: `index.html`
- Colours, fonts, spacing: the variables at the top of `styles.css`
- Particle shapes, colours and placement: `scene.js` (`buildShapes`, `LOOKS`, `layout`)
- Videos and images: `media/`

Deploy: `vercel deploy --prod` from this folder.
