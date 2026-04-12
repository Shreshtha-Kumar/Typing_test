const passages = [
`The quick brown fox jumps over the lazy dog.
Typing regularly helps build speed and accuracy.`,

`JavaScript is a versatile programming language.
It runs both in the browser and on the server.`,

`Practice makes perfect when learning to type.
Focus on accuracy before increasing speed.`,

`Node.js enables server-side JavaScript execution.
It is widely used for building scalable apps.`,

`Consistency is the key to mastering any skill.
Daily typing practice improves muscle memory.`
];

function getRandomPassage() {
  return passages[Math.floor(Math.random() * passages.length)];
}

module.exports = { getRandomPassage };