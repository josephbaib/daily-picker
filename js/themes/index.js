import pixel16 from './pixel16.js';
export const THEMES = [pixel16];
export function themeById(id) { return THEMES.find((t) => t.id === id) || THEMES[0]; }
