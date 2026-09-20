/**
 * The pool of flashcard-style artwork `WorkflowCards` fans behind the seven
 * step cards. Add or remove entries here — the component never reads the
 * filesystem, it only picks from this array, so it needs no changes when the
 * pool changes.
 *
 * Drop image files into `public/images/cards/` and reference them below as
 * `/images/cards/<file>`.
 */
export type CardImage = {
  src: string;
  alt: string;
};

export const cardImages: CardImage[] = [
  { src: "/images/cards/script.jpg", alt: "Flashcard reading Script, with an open book and quill icon" },
  { src: "/images/cards/type-it.jpg", alt: "Flashcard reading Type It, with a typewriter keyboard and filmstrip icon" },
  { src: "/images/cards/avatar.jpg", alt: "Flashcard reading Avatar, with a facial landmark tracking mesh icon" },
  { src: "/images/cards/clone.jpg", alt: "Flashcard reading Clone, with three overlapping person silhouettes" },
  { src: "/images/cards/record.jpg", alt: "Flashcard reading Record, with a microphone and audio waveform icon" },
  { src: "/images/cards/roll-it.jpg", alt: "Flashcard reading Roll It, with an unspooling film reel icon" },
  { src: "/images/cards/render.jpg", alt: "Flashcard reading Render, with a gear and loading progress bar icon" },
  { src: "/images/cards/clip.jpg", alt: "Flashcard reading Clip, with a filmstrip frame and scissors icon" },
  { src: "/images/cards/cut-it.jpg", alt: "Flashcard reading Cut It, with scissors cutting a filmstrip segment" },
  { src: "/images/cards/caption.jpg", alt: "Flashcard reading Caption, with a video player and caption bubble icon" },
  { src: "/images/cards/hook-it.jpg", alt: "Flashcard reading Hook It, with a play button and fishing hook icon" },
  { src: "/images/cards/post.jpg", alt: "Flashcard reading Post, with a paper airplane and share icon" },
  { src: "/images/cards/drop-it.jpg", alt: "Flashcard reading Drop It, with a folder dropping into a cloud icon" },
  { src: "/images/cards/grow.jpg", alt: "Flashcard reading Grow, with a rising growth chart and plant icon" },
  { src: "/images/cards/blow-up.jpg", alt: "Flashcard reading Blow Up, with a bursting network node icon" },
];

/** Fisher–Yates — unbiased, unlike `array.sort(() => Math.random() - 0.5)`. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks `count` distinct images at random. If the pool is smaller than
 * `count`, repeats images (still shuffled) rather than leaving cards blank,
 * and warns so the gap is visible without crashing the page.
 */
export function pickRandomCardImages(pool: CardImage[], count: number): CardImage[] {
  if (pool.length === 0) return [];
  if (pool.length >= count) return shuffle(pool).slice(0, count);

  console.warn(
    `cardImages pool has ${pool.length} image(s) but ${count} are needed — repeating images to fill the fan.`,
  );
  const filled = Array.from({ length: count }, (_, i) => pool[i % pool.length]);
  return shuffle(filled);
}
