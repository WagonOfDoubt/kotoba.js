/**
 * Module for rendering string into GIF image
 * @module wakabtcha/lib/image-generator
 * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/master/captcha.pl}
 */


const DEFAULT_FONT_HEIGHT = 8;
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


const DEFAULT_CAPTHCA_HEIGHT = 18;
const DEFAULT_CAPTCHA_SCRIBBLE = 0.2;
const DEFAULT_CAPTCHA_SCALING = 0.15;
const DEFAULT_CAPTCHA_ROTATION = 0.3;
const DEFAULT_CAPTCHA_SPACING = 2.5;

/**
 * Render text into 2-dimensional array of pixels
 * @param  {String} str             Text to draw
 * @param  {Number} [captchaHeight=18] Height of image
 * @param  {Number} [captchaScribble=0.2] Random scatter level
 * @param  {Number} [captchaScaling=0.15] Amplitude of random scale change
 * @param  {Number} [captchaRotation=0.3] Amplitude of random rotation
 * @param  {Number} [captchaSpacing=2.5] Distance between letters
 * @param  {Object.<String,Number|Number[]>} [font=DEFAULT_FONT] Captcha font
 *    object, where keys are characters, values are arrays where first value
 *    is character width, other values are strokes where each stroke is
 *    represented by array of coordinates [x1,y1, x2,y2, x3,y3, ..., xN,yN]
 * @param  {Number} [fontHeight=8] Height of characters in font
 * @return {Array.<Array.<Number>>}  pixels Source image as 2-dimensional
 *    array of pixels
 */
const drawString = (str,
  captchaHeight = DEFAULT_CAPTHCA_HEIGHT,
  captchaScribble = DEFAULT_CAPTCHA_SCRIBBLE,
  captchaScaling = DEFAULT_CAPTCHA_SCALING,
  captchaRotation = DEFAULT_CAPTCHA_ROTATION,
  captchaSpacing = DEFAULT_CAPTCHA_SPACING,
  font = DEFAULT_FONT,
  fontHeight = DEFAULT_FONT_HEIGHT) => {

  const pixels = Array(captchaHeight).fill(null).map(() => []);

  /**
   * @typedef {Object} TransformationObject
   * @property {Number} dx X offset
   * @property {Number} dy Y offset
   * @property {Number} scale Scale
   * @property {Number} rotation Rotation angle
   */

  /**
   * This method is ported from captcha.pl
   * @param  {Number} char_w Width of character in pixels
   * @return {TransformationObject} transformation object
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L349}
   */
  const setup_transform = (char_w) => {
    const dx = char_w / 2;
    const dy = fontHeight / 2;
    const scale = captchaHeight / fontHeight * (1 + (captchaScaling) * (Math.random() * 2 - 1));
    const rot = (Math.random() * 2 - 1) * (captchaRotation);
    return { dx, dy, scale, rot };
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number} x             X coordinate
   * @param  {Number} y             Y coordinate
   * @param  {TransformationObject} transform
   * @return {Number[]}             [x, y]
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L359}
   */
  const transform_coords = (x, y, { dx, dy, scale, rot }) => {
    x = Math.floor(scale *
      (Math.cos(rot) * (x - dx) - Math.sin(rot) * (y - dy) + dx + Math.random() * captchaScribble));
    y = Math.floor(scale *
      (Math.sin(rot) * (x - dx) + Math.cos(rot) * (y - dy) + dy + Math.random() * captchaScribble));
    return [x, y];
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number} x1  Line start X coordinate
   * @param  {Number} y1  Line start Y coordinate
   * @param  {Number} x2  Line end X coordinate
   * @param  {Number} y2  Line end Y coordinate
   * @param  {Number} [col=1] Color index (in palette)
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L369}
   */
  const draw_line = (x1, y1, x2, y2, col=1) => {
    let x = x1;
    let y = y1;
    let dx = x2 - x1;
    let dy = y2 - y1;
    let x_inc = (dx < 0) ? -1 : 1;
    let l = dx * x_inc;
    let y_inc = (dy < 0) ? -1 : 1;
    let m = dy * y_inc;
    let dx2 = l * 2;
    let dy2 = m * 2;

    if(l >= m) {
      let err = dy2 - l;
      for (let i = 0; i < l; i++) {
        draw_pixel(x, y, col);
        if (err > 0) {
          y += y_inc;
          err -= dx2;
        }
        err += dy2;
        x += x_inc;      
      }
    } else {
      let err = dx2 - m;
      for (let i = 0; i < m; i++) {
        draw_pixel(x, y, col);
        if(err > 0) {
          x += x_inc;
          err -= dy2;
        }
        err += dx2;
        y += y_inc;
      }
    }
    draw_pixel(x, y, col);
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number} x  Pixel X coordinate
   * @param  {Number} y  Pixel Y coordinate
   * @param  {Number} [col=1] Color index (in palette)
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L413}
   */
  const draw_pixel = (x, y, col=1) => {
    if (x < 0 || y < 0) {
      return;
    }
    if (!pixels[y]) {
      pixels[y] = [];
    }
    pixels[y][x] = col;
    pixels[y][x + 1] = col;
  };

  /**
   * This method is ported from captcha.pl
   * @param  {String} str Text to draw
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L315}
   */
  const draw_string = (str) => {
    const chars = str.split('');
    let x_offs = Math.floor(captchaHeight / fontHeight * 2);

    for (const char of chars) {
      if (!font[char]) {
        continue;
      }
      const char_w = font[char][0];
      const transformation = setup_transform(char_w);

      const strokes = font[char].slice(1);
      for (const stroke of strokes) {
        const coords = Array.from(stroke);
        let [ prev_x, prev_y ] = transform_coords(coords.shift(), coords.shift(), transformation);

        while (coords.length) {
          let [ x, y ] = transform_coords(coords.shift(), coords.shift(), transformation);
          draw_line(prev_x + x_offs, prev_y, x + x_offs, y, 1);
          prev_x = x;
          prev_y = y;
        }
      }
      x_offs += Math.floor((char_w + (captchaSpacing)) * transformation.scale);
    }
  };

  draw_string(str);
  return pixels;
};


/**
 * Create gif file from 2-dimensional array of pixels
 * @param  {Array.<Array.<Number>>}  pixels Source image as 2-dimensional
 *    array of pixels
 * @param  {Number} [foregroundColor=0x000000] Color of text represented by
 *    24-bit integer (in 0xRRGGBB format)
 * @param  {Number} [backgroundColor=0xFFFFFF] Color of background represented
 *    by 24-bit integer (in 0xRRGGBB format)
 * @param  {Boolean} [backgroundTransparent=true] Use transparent background
 *    instead of solid color
 * @return {Buffer}     Image (image/gif)
 */
const generateGif = (pixels, foregroundColor = 0x000000, backgroundColor = 0xFFFFFF, backgroundTransparent = true) => {
  let pixelIndex = 0;
  let offset = 0;
  let block = '';

  const height = pixels.length;
  const width = Math.max(...pixels.map(arr => arr ? arr.length : 0).filter(Boolean));

  let allocSize = 416;  // size of header
  const totalPixels = width * height;
  allocSize += totalPixels;
  const addPix = Math.ceil(totalPixels / 126);
  allocSize += addPix;
  const numBlocks = Math.ceil((totalPixels + addPix) / 256);
  allocSize += numBlocks;
  allocSize += 4;  // size of terminator
  const buffer = Buffer.alloc(allocSize);

  /**
   * This method is ported from captcha.pl
   * @param  {Number} width   Width in pixels
   * @param  {Number} height  Height in pixels
   * @param  {Number[]} palette Array of colors represented by 24-bit integers
   *    in 0xRRGGBB format
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L431}
   */
  const start_128_gif = (width, height, palette) => {
    // GIF file header
    offset += buffer.write('GIF89a', offset, 6, 'ascii');  // Header
    // Logical screen descriptor
    offset = buffer.writeUInt16LE(width, offset);  // Logical screen width in pixels
    offset = buffer.writeUInt16LE(height, offset);  // Logical screen height in pixels
    offset = buffer.writeUInt8(0xa6, offset);  // Global color table flags
    offset = buffer.writeUInt8(0, offset);  // Background color index (#0)
    offset = buffer.writeUInt8(0, offset);  // Default pixel aspect ratio
    // Global color table
    for (let i = 0; i < 128; i++) {
      const color = palette[i] || 0;
      offset = buffer.writeUInt8(color >> 16 & 0xFF, offset);  // R
      offset = buffer.writeUInt8(color >> 8  & 0xFF, offset);  // G
      offset = buffer.writeUInt8(color >> 0  & 0xFF, offset);  // B
    }
    // Graphic Control Extension
    offset = buffer.writeUInt16BE(0x21f9, offset);  // start of GCE block
    offset = buffer.writeUInt8(4, offset);  // 4 bytes of GCE data follow
    const transparentByte = backgroundTransparent ? 0x01 : 0x00;
    offset = buffer.writeUInt8(transparentByte, offset);  // there is a transparent background color
    offset = buffer.writeUInt16LE(0, offset);  // delay for animation in hundredths of a second: not used
    offset = buffer.writeUInt8(0, offset);  // color #0 is transparent
    offset = buffer.writeUInt8(0, offset);  // end of GCE block
    // Image descriptor
    offset = buffer.writeUInt8(0x2c, offset);  // start of image descriptor
    offset = buffer.writeUInt16LE(0, offset);  // Image Left Position
    offset = buffer.writeUInt16LE(0, offset);  // Image Top Position
    offset = buffer.writeUInt16LE(width, offset);  // Image width
    offset = buffer.writeUInt16LE(height, offset);  // Image height
    offset = buffer.writeUInt8(0x00, offset);  // Local color table (no local color table)
    // Start of Image
    offset = buffer.writeUInt8(0x07, offset);  // LZW Minimum Code Size
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number[]} pixels Row of color indexes
   *    indexes
   * @param  {Number} num    How many pixels to draw
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L301}
   */
  const emit_pixel_block = (pixels, num) => {
    for (let i = 0; i < num; i++) {
      if (pixels) {
        emit_gif_pixel(pixels[i]);
      } else {
        emit_gif_pixel(0);
      }
    }
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number} pixel Color index
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L455}
   */
  const emit_gif_pixel = (pixel) => {
    if (pixelIndex % 126 === 0) {
      emit_gif_byte(0x80);
    }
    emit_gif_byte(pixel);
    pixelIndex++;
  };

  /**
   * This method is ported from captcha.pl
   * @param  {Number}  byte      Char to write
   * @param  {Boolean} [terminate=false] If true, write leftover bytes that
   *    didn't form whole block
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L464}
   */
  const emit_gif_byte = (byte, terminate = false) => {
    block += String.fromCharCode(byte || 0);
    if(block.length === 255 || terminate) {
      offset = buffer.writeUInt8(block.length, offset);
      offset += buffer.write(block, offset, block.length, 'binary');
      block = '';
    }
  };

  /**
   * This method is ported from captcha.pl
   * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/captcha.pl#L478}
   */
  const end_gif = () => {
    emit_gif_byte(0x81);
    emit_gif_byte(0, true);
    offset = buffer.writeUInt8(0x3b, offset);  // GIF file terminator
  };

  start_128_gif(width, height, [backgroundColor, foregroundColor]);
  for (let y = 0; y < height; y++) {
    emit_pixel_block(pixels[y], width);
  }
  end_gif();

  return buffer;
};


/**
 * Generate an image with text from string
 * @param  {String} str Captcha answer
 * @param  {Object} [options] Override defaults
 * @param  {Number} [options.captchaHeight=18] Height of image
 * @param  {Number} [options.captchaScribble=0.2] Random scatter level
 * @param  {Number} [options.captchaScaling=0.15] Amplitude of random scale
 *    change
 * @param  {Number} [options.captchaRotation=0.3] Amplitude of random rotation
 * @param  {Number} [options.captchaSpacing=2.5] Distance between letters
 * @param  {Object.<String,Number|Number[]>} [options.font=DEFAULT_FONT]
 *    Captcha font object, where keys are characters, values are arrays where
 *    first value is character width, other values are strokes where each
 *    stroke is represented by array of coordinates [x1,y1, x2,y2, x3,y3, ...,
 *    xN,yN]
 * @param  {Number} [options.fontHeight=8] Height of characters in font
 * @param  {Number} [options.foregroundColor=0x000000] Color of text
 *    represented by 24-bit integer (in 0xRRGGBB format)
 * @param  {Number} [options.backgroundColor=0xFFFFFF] Color of background
 *    represented by 24-bit integer (in 0xRRGGBB format)
 * @param  {Boolean} [options.backgroundTransparent=true] Use transparent
 *    background instead of solid color
 * @return {Buffer}     Image (image/gif)
 * @alias module:wakabtcha.generateImage
 * @see  {@link module:wakabtcha/image-generator~DEFAULT_FONT}
 */
module.exports.generate = (str, options) => {
  const pixels = drawString(str,
    options.captchaHeight,
    options.captchaScribble,
    options.captchaScaling,
    options.captchaRotation,
    options.captchaSpacing,
    options.font,
    options.fontHeight,
  );
  const buffer = generateGif(pixels,
    options.foregroundColor,
    options.backgroundColor,
    options.backgroundTransparent);
  return buffer;
};
