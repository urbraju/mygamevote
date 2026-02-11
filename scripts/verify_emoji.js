const emoji = '🏐';
const encoded = encodeURIComponent(emoji);
console.log(`Emoji: ${emoji}`);
console.log(`Encoded: ${encoded}`);
console.log(`Expected: %F0%9F%8F%90`);

const text = `🏐 *VolleyBall* 🏐`;
console.log(`Full Text Encoded: ${encodeURIComponent(text)}`);
