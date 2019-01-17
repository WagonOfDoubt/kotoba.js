/**
 * This module handles thumbnails creation and saving of both thumbnail and
 * uploaded file
 * @module controllers/upload
 */

const config = require('../config.json');
const Settings = require('../models/settings');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');


/**
 * Wheter or not file extension belongs to known supported video format
 * @param {string} ext - file extension, starting with dot (".webm", ".mp4")
 * @returns {boolean}
 */
const isVideo = (ext) => {
  const videos = ['.mp4', '.ogv', '.webm'];
  return videos.includes(ext);
};


/**
 * Wheter or not file extension belongs to known supported image format
 * @param {string} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {boolean}
 */
const isImage = (ext) => {
  const images = ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.gif', '.svg'];
  return images.includes(ext);
};


/**
 * Determine kind of file (video, image, audio, unknown) based on extension
 * @todo add support for audio formats
 * @param {string} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {string} "video", "image" or "unknown"
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
 * Get rid of .jpeg instead of .jpg and potentially other inconsistent file
 * extensions
 * @param {string} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {string}
 */
const normalizeExtension = (ext) => {
  if (ext === '.jpeg') {
    return '.jpg';
  }
  return ext;
};


/**
 * Determine optimal format for thumbnail. For formats what support transparency
 * returns .png, otherwise .jpg
 * @param {string} ext - file extension, starting with dot (".jpg", ".png")
 * @returns {string} file extension of thumbnail, starting with dot
 */
const getOptimalThumbnailExtenstion = (ext) => {
  if (['.png', '.svg', '.gif'].includes(ext)) {
    return '.png';
  }
  return '.jpg';
};


/**
 * Generate random name where first part is current Unix time and last 2 digits
 * are random
 * @returns {string}
 */
const getRandomName = () =>
  `${ Date.now() }${ Math.floor(Math.random() * 100) }`;


/**
 * Save file to filesystem and create thumbnail
 * @alias module:controllers/upload.uploadFiles
 * @async
 * @param {string} boardUri - board directory
 * @param {Array.<object>} files - array of file objects from multer package
 * {@link https://www.npmjs.com/package/multer}
 * @param {boolean} keepFilename - whether or not to store original file name,
 * if false, random numbers will be used instead
 * @returns { Array.<Promise> } array of promises resolving to attachment
 * object according to attachment schema
 */
const uploadFiles = (boardUri, files, keepFilename = true) =>
  Promise.all(files.map(file => uploadFile(boardUri, file, keepFilename)));


/**
 * Save file to filesystem and create thumbnail
 * @alias module:controllers/upload.uploadFile
 * @async
 * @param {string} boardUri - board directory
 * @param {object} file - file object from multer package
 * {@link https://www.npmjs.com/package/multer}
 * @param {boolean} keepFilename - whether or not to store original file name,
 * if false, random numbers will be used instead
 * @returns { object } attachment object to be saved to database
 */
const uploadFile = async (boardUri, file, keepFilename = true) => {
  const ext = normalizeExtension(path.extname(file.originalname));
  const type = getAttachmentType(ext);
  if (type === 'unknown') {
    const error = new Error('Unsupported file format: ' + ext);
    error.type = 'input_error';
    error.reason = 'invalid_upload_format';
    throw error;
  }
  const thumbExt = getOptimalThumbnailExtenstion(ext);

  const randomName = getRandomName();
  file.originalname = keepFilename && !/^\s+\.\w+$/.test(file.originalname)
    ? path.basename(file.originalname, ext) + ext
    : randomName + ext;

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
  if (type === 'image') {
    try {
      thumbInfo = await createThumbnail(thumbPath, file);
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
      thumbInfo = await createVideoThumbnail(thumbPath, filePath);
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
 * @param {string} imagePath - path to save image to
 * @param {object} file - multer file
 * @returns {object} image info from sharp package
 * {@link https://www.npmjs.com/package/sharp}
 */
const saveImage = async (imagePath, file) => {
  try {
    await fs.ensureDir(path.dirname(imagePath));
    if (['.gif', '.svg'].includes(path.extname(imagePath))) {
      await fs.writeFile(imagePath, file.buffer);
      // return image info
      return await sharp(file.buffer).metadata();
    } else {
      // this also strips EXIF
      return await sharp(file.buffer)
        .toFile(imagePath);
    }
  } catch (error) {
    throw error;
  }
};


/**
 * Save file to path
 * @async
 * @param {string} imagePath - path to save to
 * @param {object} file - multer file
 * @returns {object} object with field size equal to file size in bytes, and
 * with and height equal to 0
 */
const saveFile = async (filePath, file) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.buffer);
    return {
      size: file.buffer.length,
      width: 0,
      height: 0
    }
  } catch (error) {
    throw error;
  }
};


/**
 * Generate thumbnail for image and save it to path
 * @async
 * @param {string} thumbPath - path to save to
 * @param {object} file - multer file
 * @returns {object} image info from sharp package
 * {@link https://www.npmjs.com/package/sharp}
 */
const createThumbnail = async (thumbPath, file) => {
  try {
    await fs.ensureDir(path.dirname(thumbPath));
    const s = await Settings.get();
    const { width, height } = s.thumbSize;
    return await sharp(file.buffer)
      .resize(width, height)
      .max()
      .withoutEnlargement()
      .toFile(thumbPath);
  } catch (error) {
    throw error;
  }
};


/**
 * Save file to path
 * @async
 * @param {string} imagePath - path to save to
 * @returns {object} object with field size equal to file size in bytes, and
 * with and height equal to 0
 */
const saveVideo = async (filePath, file) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.buffer);
    return {
      size: file.buffer.length
    }
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
      })
  });
};


/**
 * Generate thumbnail for video and save it to path
 * @async
 * @param {string} thumbPath - path to save to
 * @param {object} filePath - path to video file
 * @returns {object} image info from sharp package
 * {@link https://www.npmjs.com/package/sharp}
 */
const createVideoThumbnail = async (thumbPath, filePath) => {
  const sd = 1/0;
  await fs.ensureDir(path.dirname(thumbPath));
  const s = await Settings.get();
  const { width, height } = s.thumbSize;

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
};


module.exports.uploadFile = uploadFile;
module.exports.uploadFiles = uploadFiles;
