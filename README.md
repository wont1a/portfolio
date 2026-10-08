# Ctrl+S — портфолио

Сайты и Telegram-боты для малого бизнеса: https://wont1a.github.io/portfolio/

Примеры сайтов (от самого эффектного):
- [Фитнес-клуб «NØVA FITNESS»](fitness/)
- [Турагентство «Орбита»](travel/)
- [Пекарня «Опара»](bakery/)
- [Скалодром «Зацеп»](climbing/)
- [Ногтевая студия «Velvet»](nails/)

Главная страница: `index.html`, картинки в `assets/img/`, 3D-аватар `assets/js/hero3d.js`
собирается из `src/` (three.js 0.169):

```bash
npm i three@0.169.0 esbuild@0.24.0
npx esbuild src/hero3d.js --bundle --minify --format=iife --target=es2018 --loader:.json=json --outfile=assets/js/hero3d.js
```
