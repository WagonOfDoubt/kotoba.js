/**
 * Just some rudimentary testing. Creates 10 random images and saves them in
 *    out/ directory.
 * @module wakabtcha/test
 */

const generateImage = require('./lib/image-generator').generate;
const generateAnswer = require('./lib/answer-generator').generate;


const fs = require('fs');

const cb = (err) => {
  if (err) {
    console.error(err);
  }
};


const tries = 10;
for (let i = 0; i < tries; i++) {
  const word = generateAnswer();
  const buf = generateImage(word, {});
  fs.writeFile(`out/${word}.gif`, buf, cb);
}
