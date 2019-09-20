# ![wakabtcha](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/wakabtcha.gif)

![wakabtcha](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/wakabtcha.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![is](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/is.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![an](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/an.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![oldschool](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/oldschool.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![captcha](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/captcha.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![generator](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/generator.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![ported](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/ported.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![from](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/from.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![original](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/original.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![wakaba](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/wakaba.gif)
![_space](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/_space.gif)
![source](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/source.gif)

Wakabtcha consists of two independend modules: for generating random text (captcha answers) and for generating images from text (captcha questions). It doesn't have any database handling and verification logic, just challenge itself. It is an accurate port of [captcha.pl](https://github.com/some1suspicious/wakaba-original/blob/master/captcha.pl) from original Wakaba written by Dag Ågren (!WAHa.06x36) and produces 100% identical result on binary level. Customisation capabilities include user-defined fonts, grammar, level of randomization and styling.

## ![usage](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/usage.gif)

### Basic usage
```js
const wakabtcha = require('wakabtcha');
const fs = require('fs');

const answer = wakabtcha.generateAnswer();
const image = wakabtcha.generateImage(answer);
// save buffer to file system
fs.writeFile(`${answer}.gif`, image, console.log);
```

### generateAnswer options

```js
wakabtcha.generateAnswer(start = '%W%', grammar = DEFAULT_GRAMMAR)
```
|name|type|default|descrition|
|----|----|-------|----------|
|start|String|"%W%"|Starting template|
|grammar|Object.<String,Array.\<String>>|DEFAULT_GRAMMAR|Grammar object (see below)|

### generateImage options

```js
wakabtcha.generateImage(str, options)
```

|name|type|default|descrition|
|----|----|-------|----------|
|str|String| |Captcha answer|
|options|Object|{}|Override defaults|
|options.captchaHeight|Number|18|Height of image|
|options.captchaScribble|Number|0.2|Random scatter level|
|options.captchaScaling|Number|0.15|Amplitude of random scale|
|options.captchaRotation|Number|0.3|Amplitude of random rotation|
|options.captchaSpacing|Number|2.5|Distance between letters|
|options.font|Object.<String,Number\|Number[]>|DEFAULT_FONT|Captcha font object, where keys are characters, values are arrays where first value is character width, other values are strokes where each stroke is represented by array of coordinates \[x1,y1, x2,y2, x3,y3, xN,yN\]|
|options.fontHeight|Number|8|Height of characters in font|
|options.foregroundColor|Number|0x000000|Color of text|
|options.backgroundColor|Number|0xFFFFFF|Color of background|
|options.backgroundTransparent|Boolean|true|Use transparent background|

## ![dictionary](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/dictionary.gif)

Answers generation can be changed, for example, to generate answers with different writing systems or character sets.
Generation of answers based on [L-system](https://en.wikipedia.org/wiki/L-system). L-system starts with axiom string, that acts as a template.
Grammar object describes rules of L-system. All substrings in initial axiom enclosed in % symbols (e.g. "%W%") are recursively replaced by random string from array from grammar object's field where key matches substring. Example: `"%W%" => "%C%%T%" => "l%V%%F%" => "lock"`

 #### Example 1: Default configuration
```js
const DEFAULT_GRAMMAR = {
  'W': ['%C%%T%', '%C%%T%', '%C%%X%', '%C%%D%%F%', '%C%%V%%F%%T%', '%C%%D%%F%%U%', '%C%%T%%U%', '%I%%T%', '%I%%C%%T%', '%A%'],
  'A': ['%K%%V%%K%%V%tion'],
  'K': ['b', 'c', 'd', 'f', 'g', 'j', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 's%P%'],
  'I': ['ex', 'in', 'un', 're', 'de'],
  'T': ['%V%%F%', '%V%%E%e'],
  'U': ['er', 'ish', 'ly', 'en', 'ing', 'ness', 'ment', 'able', 'ive'],
  'C': ['b', 'c', 'ch', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 'sh', 't', 'th', 'v', 'w', 'y', 's%P%', '%R%r', '%L%l'],
  'E': ['b', 'c', 'ch', 'd', 'f', 'g', 'dg', 'l', 'm', 'n', 'p', 'r', 's', 't', 'th', 'v', 'z'],
  'F': ['b', 'tch', 'd', 'ff', 'g', 'gh', 'ck', 'll', 'm', 'n', 'n', 'ng', 'p', 'r', 'ss', 'sh', 't', 'tt', 'th', 'x', 'y', 'zz', 'r%R%', 's%P%', 'l%L%'],
  'P': ['p', 't', 'k', 'c'],
  'Q': ['b', 'd', 'g'],
  'L': ['b', 'f', 'k', 'p', 's'],
  'R': ['%P%', '%Q%', 'f', 'th', 'sh'],
  'V': ['a', 'e', 'i', 'o', 'u'],
  'D': ['aw', 'ei', 'ow', 'ou', 'ie', 'ea', 'ai', 'oy'],
  'X': ['e', 'i', 'o', 'aw', 'ow', 'oy']
};
```

 #### Example 2: Simple numeric code
```js
const numbersGrammar = {
  'N': [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
};

// will generate 6-digit code
wakabtcha.generateAnswer('%N%%N%%N%%N%%N%%N%', numbersGrammar)
```

## ![fonts](https://raw.githubusercontent.com/WagonOfDoubt/wakabtcha.js/assets/words/fonts.gif)

Appearance of every letter is described by font object. Keys of this object are characters, characters that are missing in font will not be rendered. Values are array where first element is character width, and subseuqet elements are strokes. Stroke is 1-dimensional array of coordinates that form path of series of straight lines in form \[x0,y0, x1,y1, x2,y2, ..., xN,yN\]. Coordinate system origin is top left corner.

#### Example 1: Default font

```js
const DEFAULT_FONT = {
  'a': [4, [0, 2, 1, 1, 2, 1, 3, 2, 3, 5, 4, 6], [3, 3, 1, 3, 0, 4, 0, 5, 1, 6, 2, 6, 3, 5]],
  'b': [3, [0, 0, 0, 6, 2, 6, 3, 5, 3, 4, 2, 3, 0, 3]],
  'c': [3, [3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3]],
  'd': [3, [3, 0, 3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3]],
  'e': [3, [3, 6, 1, 6, 0, 5, 0, 3, 1, 2, 3, 2, 3, 3, 2, 4, 0, 4]],
  'f': [3, [1, 6, 1, 1, 2, 0, 3, 0], [0, 3, 2, 3]],
  'g': [3, [3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3, 3, 7, 2, 8, 0, 8]],
  'h': [3, [0, 0, 0, 6], [0, 3, 2, 3, 3, 4, 3, 6]],
  'i': [2, [1, 3, 1, 6], [1, 1, 1.5, 1.5, 1, 2, 0.5, 1.5]],
  'j': [3, [2, 3, 2, 7, 1, 8, 0, 7], [2, 1, 2.5, 1.5, 2, 2, 1.5, 1.5]],
  'k': [3, [0, 0, 0, 6], [0, 4, 1, 4, 2, 2], [0, 4, 1, 4, 3, 6]],
  'l': [2, [0.5, 0, 0.5, 5, 1.5, 6]],
  'm': [4, [0, 6, 0, 3, 1, 3, 2, 4], [2, 6, 2, 3, 3, 3, 4, 4, 4, 6]],
  'n': [3, [0, 3, 0, 6], [0, 4, 1, 3, 2, 3, 3, 4, 3, 6]],
  'o': [3, [0, 4, 1, 3, 2, 3, 3, 4, 3, 5, 2, 6, 1, 6, 0, 5, 0, 4]],
  'p': [3, [0, 8, 0, 3, 2, 3, 3, 4, 3, 5, 2, 6, 0, 6]],
  'q': [3, [3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3, 3, 8], [2, 7, 4, 7]],
  'r': [3, [0, 3, 0, 6], [0, 4, 1, 3, 2, 3]],
  's': [3, [0, 6, 2, 6, 3, 5, 0, 4, 1, 3, 3, 3]],
  't': [3, [1, 1, 1, 5, 2, 6], [0, 3, 2, 3]],
  'u': [3, [0, 3, 0, 6, 2, 6, 3, 5, 3, 3]],
  'v': [3, [0, 3, 1.5, 6, 3, 3]],
  'w': [4, [0, 3, 0, 5, 1, 6, 2, 5, 3, 6, 4, 5, 4, 3]],
  'x': [3, [0, 3, 3, 6], [0, 6, 3, 3]],
  'y': [3, [0, 3, 0, 5, 1, 6, 3, 6], [3, 3, 3, 7, 2, 8, 0, 8]],
  'z': [3, [0, 3, 3, 3, 0, 6, 3, 6], [0.5, 4.5, 2.5, 4.5]],
  ' ': [3],
};
```

#### Example 2: Font with numbers

Font by [@OMOTO-TK](https://github.com/OMOTO-TK/mod-captcha-for-wakaba)

```js
const myFont = {
	'1': [2,[1,1,1,6],[-1,2,1,1]],
	'0': [3,[0,4,1,2,2,2,3,3,3,5,2,6,1,6,0,5,0,4]],
	'2': [3,[-1,3,1,1,3,1],[3,1,0,5],[0,5,5,5]],
	'3': [3,[-1,3,1,1,3,1],[3,1,1,4],[1,4,3,5],[3,5,-1,7]],
	'4': [3,[0,0,0,3],[0,3,4,3],[4,3,4,0],[4,3,4,8]],
	'5': [3,[5,0,0,0],[0,0,0,2],[0,2,3,2],[3,2,3,6],[3,6,0,6]],
	'6': [3,[5,0,4,1,3,2,2,3,1,4],[1,4,0,5,0,6,3,6,3,5,1,4]],
	'7': [3,[0,0,6,0],[6,0,0,6]],
	'8': [3,[0,4,1,3,2,3,3,4,3,5,2,6,1,6,0,5,0,4],[1,3,2,3,3,3,3,2,2,0,1,0,0,2,0,3,1,3]],
	'9': [3,[1,3,2,3,3,3,3,2,2,0,1,0,0,2,0,3,1,3],[3,3,0,7]],
	' ': [3],
};

wakabtcha.generateImage('123456', { font: myFont });
```
