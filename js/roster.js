// Состав команды: персонажи по фото из частей набора LPC. Ключ — имя в списке участников.
// body: male | teen (стройное тело, голова по head). Пути одежды и причёсок относительно assets/lpc.
export const ROSTER = {
  'Женя': { body: 'teen', head: 'female', skin: 'light', eyes: 'brown', hair: 'long_straight/male/black', torso: 'shortsleeve/tshirt/teen/black', legs: 'black', feet: 'black', earrings: 'gold' },
  'Макс': { body: 'male', skin: 'light', eyes: 'blue', hair: 'parted/male/blonde', glasses: 'round/adult/gold', torso: 'longsleeve/longsleeve/male/forest', legs: 'charcoal', feet: 'brown' },
  'Миша': { body: 'male', skin: 'light', eyes: 'brown', hair: 'plain/male/black', beard: 'basic/black', glasses: 'sunglasses/adult/black', torso: 'longsleeve/longsleeve/male/white', legs: 'navy', feet: 'white' },
  'Нина': { body: 'teen', head: 'female', skin: 'light', eyes: 'brown', hair: 'long_center_part/male/raven', torso: 'longsleeve/longsleeve/teen/tan', legs: 'black', feet: 'black' },
  'Юля': { body: 'teen', head: 'female', skin: 'light', eyes: 'green', hair: 'lob/male/light_brown', torso: 'longsleeve/longsleeve2_polo/teen/white', legs: 'slate', feet: 'white', earrings: 'gold' },
  // Наруто: свои слои поверх набора — куртка с синими плечами и молнией, усы на щеках, пластина на повязке (assets/lpc/custom)
  'Юсуф': { body: 'male', skin: 'light', eyes: 'blue', hair: 'spiked_liberty/male/blonde', headband: 'navy', legs: 'orange', feet: 'navy', layers: [[35, 'custom/naruto_jacket.png'], [106, 'custom/naruto_whiskers.png'], [126, 'custom/naruto_plate.png']] },
};
