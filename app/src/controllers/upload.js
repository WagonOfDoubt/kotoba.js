/**
 * This module handles thumbnails creation and saving of both thumbnail and
 * uploaded file
 * @module controllers/upload
 */

const config = require('../json/config.json');
const Settings = require('../models/settings');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');


/**
 * Whether or not file extension belongs to known supported video format
 * @param {String} ext - file extension, starting with dot (".webm", ".mp4")
 * @returns {boolean}
 */
const isVideo = (ext) => {
  const videos = ['.mp4', '.ogv', '.webm'];
  return videos.includes(ext);
};


/**
 * Whether or not file extension belongs to known supported image format
 * @param {String} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {boolean}
 */
const isImage = (ext) => {
  const images = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.gif', '.svg'];
  return images.includes(ext);
};


/**
 * Determine kind of file (video, image, audio, unknown) based on extension
 * @todo add support for audio formats
 * @param {String} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {String} "video", "image" or "unknown"
 */
const getAttachmentType = (ext) => {
  if (isImage(ext)) {
    return 'image';
  }
  if (isVideo(ext)) {
    return 'video';
  }
  return 'unknown';
};


/**
 * Determine optimal format for thumbnail. For formats what support
 * transparency returns .png, otherwise .jpg
 * @param {String} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {String} file extension of thumbnail, starting with dot
 */
const getOptimalThumbnailExtenstion = (ext) => {
  if (['.png', '.svg', '.gif'].includes(ext)) {
    return '.png';
  }
  return '.jpg';
};

const mimes = {
  // images
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/tiff': '.tif',
  'image/x-tiff': '.tif',
  // video
  'video/ogg': '.ogv',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const extensions = _.invert(mimes);

/**
 * Determine file extension by mime type.
 * @param  {String} mime MIME type
 * @return {String}      File extension with leading dot, or empty string if
 * file type not supported
 * @example getExtensionByMime('image/png');  // => '.png'
 */
const getExtensionByMime = (mime) => {
  return mimes[mime] || '';
};


/**
 * Determine mime type by file extension.
 * @param  {String} ext File extension with leading dot
 * @return {String}     MIME type, or empty string if file type not supported
 * @example getMimeByExtension('.png');  // => 'image/png'
 */
const getMimeByExtension = (ext) => {
  return extensions[ext] || '';
};


/**
 * Generate random name where first part is current Unix time and last 2 digits
 * are random
 * @returns {String}
 */
const getRandomName = () =>
  `${ Date.now() }${ Math.floor(Math.random() * 100) }`;


/**
 * Save file to file system and create thumbnail
 * @alias module:controllers/upload.uploadFiles
 * @async
 * @param {String} boardUri - board directory
 * @param {Array.<object>} files - array of file objects from multer package
 * {@link https://www.npmjs.com/package/multer}
 * @param {boolean} keepFilename - whether or not to store original file name,
 * if false, random numbers will be used instead
 * @returns { Array.<Promise> } array of promises resolving to attachment
 * object according to attachment schema
 * @static
 */
const uploadFiles = (boardUri, files, keepFilename = true) =>
  Promise.all(files.map(file => uploadFile(boardUri, file, keepFilename)));


/**
 * Save file to file system and create thumbnail
 * @alias module:controllers/upload.uploadFile
 * @async
 * @param {String} boardUri - board directory
 * @param {Object} file - file object from multer package
 * {@link https://www.npmjs.com/package/multer}
 * @param {boolean} keepFilename - whether or not to store original file name,
 * if false, random numbers will be used instead
 * @returns { object } attachment object to be saved to database
 * @static
 */
const uploadFile = async (boardUri, file, keepFilename = true) => {
  const ext = getExtensionByMime(file.mimetype);
  const type = getAttachmentType(ext);
  if (type === 'unknown') {
    const error = new Error('Unsupported file format: ' + ext);
    error.type = 'input_error';
    error.reason = 'invalid_upload_format';
    throw error;
  }
  const thumbExt = getOptimalThumbnailExtenstion(ext);

  const randomName = getRandomName();
  file.originalname = (keepFilename && !/^\s+\.\w+$/.test(file.originalname)) ?
    (path.basename(file.originalname, path.extname(file.originalname)) + ext) :
    (randomName + ext);

  const filePath = path
    .join(config.html_path, boardUri, 'src', randomName, file.originalname);
  const thumbPath = path
    .join(config.html_path, boardUri, 'thumb', randomName + 's' + thumbExt);
  const url = `/${ boardUri }/src/${ randomName }/${ file.originalname }`;
  const thumbUrl = `/${ boardUri }/thumb/${ randomName }s${ thumbExt }`;
  const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

  const attachment = {
    file: url,
    hash: hash,
    name: file.originalname,
    type: type
  };

  let fileInfo;
  let thumbInfo;
  const s = await Settings.get();
  if (type === 'image') {
    try {
      thumbInfo = await createThumbnail(thumbPath, file, s.thumbSize.width, s.thumbSize.height);
      attachment.thumbWidth = thumbInfo.width;
      attachment.thumbHeight = thumbInfo.height;
    } catch (err) {
      await Promise.all([
        fs.remove(path.dirname(filePath)),
        fs.remove(thumbPath),
      ]);
      const error = new Error('Cannot create thumbnail');
      error.type = 'input_error';
      error.reason = 'thumbnail_generation_fail';
      throw error;
    }
    fileInfo = await saveImage(filePath, file);
  } else if (type === 'video') {
    fileInfo = await saveVideo(filePath, file);
    try {
      thumbInfo = await createVideoThumbnail(thumbPath, filePath, s.thumbSize.width, s.thumbSize.height);
      for (const key in thumbInfo) {
        attachment[key] = thumbInfo[key];
      }
    } catch (err) {
      await Promise.all([
        fs.remove(path.dirname(filePath)),
        fs.remove(thumbPath),
      ]);
      const error = new Error('Cannot create thumbnail');
      error.type = 'input_error';
      error.reason = 'thumbnail_generation_fail';
      console.log(err);
      throw error;
    }
  } else {
    fileInfo = await saveFile(filePath, file);
  }

  for (const key in fileInfo) {
    attachment[key] = fileInfo[key];
  }
  if (thumbInfo) {
    attachment.thumb = thumbUrl;
  }
  attachment.size = attachment.size || file.buffer.length;

  return attachment;
};


/**
 * Save image file to path and also delete image metadata if possible
 * @async
 * @param {String} imagePath - path to save image to
 * @param {Object} file - multer file
 * @returns {Object} image info from sharp package
 * @see  {@link https://www.npmjs.com/package/sharp}
 * @static
 */
const saveImage = async (imagePath, file) => {
  const ext = getExtensionByMime(file.mimetype);
  if (!isImage(ext)) {
    const err = new Error(`Invalid image format: ${ext}`);
    err.type = 'InvalidImageFormatError';
    throw err;
  }
  try {
    await fs.ensureDir(path.dirname(imagePath));
    let s;
    if (['.gif', '.svg'].includes(path.extname(imagePath))) {
      await fs.writeFile(imagePath, file.buffer);
      s = await sharp(file.buffer).metadata();
    } else {
      // this also strips EXIF
      s = await sharp(file.buffer).toFile(imagePath);
    }
    // return image info
    return s;
  } catch (error) {
    throw error;
  }
};


/**
 * Save file to path
 * @async
 * @param {String} imagePath - path to save to
 * @param {Object} file - multer file
 * @returns {Object} object with field size equal to file size in bytes, and
 * with and height equal to 0
 * @static
 */
const saveFile = async (filePath, file) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.buffer);
    return {
      size: file.buffer.length,
      width: 0,
      height: 0
    };
  } catch (error) {
    throw error;
  }
};


/**
 * Generate thumbnail for image and save it to path
 * @async
 * @param {String} thumbPath - path to save to
 * @param {Object} file - multer file
 * @returns {Object} image info from sharp package
 * @see  {@link https://www.npmjs.com/package/sharp}
 * @static
 */
const createThumbnail = async (thumbPath, file, width, height) => {
  const ext = getExtensionByMime(file.mimetype);
  if (!isImage(ext)) {
    const err = new Error(`Invalid image format: ${ext}`);
    err.type = 'InvalidImageFormatError';
    throw err;
  }
  try {
    await fs.ensureDir(path.dirname(thumbPath));
    return await sharp(file.buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbPath);
  } catch (error) {
    throw error;
  }
};


/**
 * Save file to path
 * @async
 * @param {String} imagePath - path to save to
 * @returns {Object} object with field size equal to file size in bytes, and
 * with and height equal to 0
 * @static
 */
const saveVideo = async (filePath, file) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.buffer);
    return {
      size: file.buffer.length
    };
  } catch (error) {
    throw error;
  }
};


const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .ffprobe((err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        if (!(metadata && metadata.streams && metadata.format && metadata.format.duration)) {
          reject(new Error(`Fail to parse metadata`));
          return;
        }
        const video = metadata.streams.find((s) => s.codec_type === 'video');
        if (!video) {
          reject(new Error(`No video stream found`));
          return;
        }
        const audio = metadata.streams.find((s) => s.codec_type === 'audio');
        const duration = metadata.format.duration;
        resolve({ audio, video, duration });
      });
  });
};


/**
 * Generate thumbnail for video and save it to path
 * @async
 * @param {String} thumbPath - path to save to
 * @param {Object} filePath - path to video file
 * @param {Number} width Maximum thumbnail width
 * @param {Number} height Maximum thumbnail height
 * @returns {Object} image info from sharp package
 * @see  {@link https://www.npmjs.com/package/sharp}
 * @static
 */
const createVideoThumbnail = async (thumbPath, filePath, width, height) => {
  try {
    await fs.ensureDir(path.dirname(thumbPath));

    const metadata = await getVideoMetadata(filePath);
    const inputWidth = metadata.video.width;
    const inputHeight = metadata.video.height;
    const aspect = Math.min(width / inputWidth, height / inputHeight);
    const tw = Math.floor(aspect * inputWidth);
    const th = Math.floor(aspect * inputHeight);

    const stdout = await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .on('error', (err) => reject(err))
        .on('end', function(stdout, stderr) {
          console.log('Transcoding succeeded !', 'stdout:', stdout, 'stderr', stderr);
          resolve();
        })
        .screenshots({
          count: 1,
          folder: path.dirname(thumbPath),
          filename: path.basename(thumbPath),
          timemarks: [1],
          size: `${tw}x${th}`,
        });
    });

    console.log('METADATA', metadata);

    return {
      width: inputWidth,
      height: inputHeight,
      thumbWidth: tw,
      thumbHeight: th,
      duration: metadata.duration,
    };
  } catch (err) {
    throw err;
  }
};


module.exports.uploadFile = uploadFile;
module.exports.uploadFiles = uploadFiles;
module.exports.saveImage = saveImage;
module.exports.createThumbnail = createThumbnail;
module.exports.getRandomName = getRandomName;
module.exports.getOptimalThumbnailExtenstion = getOptimalThumbnailExtenstion;
module.exports.getExtensionByMime = getExtensionByMime;
module.exports.isVideo = isVideo;
module.exports.isImage = isImage;
module.exports.getAttachmentType = getAttachmentType;
module.exports.getMimeByExtension = getMimeByExtension;
