import './style.css';   // must be before Match3Game import if fonts/styles matter
/* Entry script: bootstrap only */
import { Match3Game } from './game.js';

window.addEventListener('load', () => {
    new Match3Game();
});


window.addEventListener('load', () => new Match3Game());