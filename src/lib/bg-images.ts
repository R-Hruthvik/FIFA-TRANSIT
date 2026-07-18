const BG_IMAGES = [
  "/images/bg/Australia-players-and-fans-celebrate-together.webp",
  "/images/bg/Austria-versus-Jordan.webp",
  "/images/bg/Canada-v-Bosnia-and-Herzegovina-Group-B-FIFA-World-Cup-2026.webp",
  "/images/bg/Cote-D-Ivoire-v-Ecuador-Group-E-FIFA-World-Cup-2026.webp",
  "/images/bg/Spain-v-Cabo-Verde-Group-H-FIFA-World-Cup-2026.webp",
  "/images/bg/USA-fans-watch-the-game-against-Paraguay-in-Los-Angeles.webp",
];

export function getRandomBgImage(): string {
  return BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)];
}

export function getAllBgImages(): string[] {
  return [...BG_IMAGES];
}
