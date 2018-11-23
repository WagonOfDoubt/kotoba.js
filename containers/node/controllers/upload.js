/**
 * This module handles thumbnails creation and saving of both thumbnail and
 * uploaded file
 * @module controllers/upload
 */

const config = require('../config.json');
const Settings = require('../models/settings');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const avconv = require('avconv');
const crypto = require('crypto');


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
  createDirIfNotExist(path.dirname(imagePath));
  try {
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
  createDirIfNotExist(path.dirname(filePath));
  try {
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
  createDirIfNotExist(path.dirname(thumbPath));
  try {
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
  createDirIfNotExist(path.dirname(filePath));
  try {
    await fs.writeFile(filePath, file.buffer);
    return {
      size: file.buffer.length
    }
  } catch (error) {
    throw error;
  }
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
  createDirIfNotExist(path.dirname(thumbPath));
  const s = await Settings.get();
  const { width, height } = s.thumbSize;
  const params = [
    '-i', filePath,
    '-frames:v', '1',
    '-f', 'image2',
    // scale="w=trunc(min(200/iw,200/ih)*iw):h=trunc(min(200/iw,200/ih)*ih)"
    '-vf', `scale=w=trunc('min(${width}/iw,${height}/ih)'*iw):h=trunc('min(${width}/iw,${height}/ih)'*ih)`,
    // '-s', `${ w }x${ h }`,
    thumbPath
  ];
  console.log('avconv', params.join(' '));
  const avconvStream = avconv(params);
  return await new Promise((resolve, reject) => {
    avconvStream.on('error', data => console.log('error', data));
    avconvStream.on('message', data => console.log(data));
    avconvStream.once('exit', (exitCode, signal, metadata) => {
      console.log('metadata', JSON.stringify(metadata));
      const {input, output} = metadata;
      const inputStream = input.stream[0] || [];
      const outputStream = output.stream[0] || [];
      const inputVideoMeta = inputStream.find(
        (track) => track.type === 'video');
      const [w, h] = inputVideoMeta.resolution;
      const outputVideoMeta = outputStream.find(
        (track) => track.type === 'video');
      const [tw, th] = outputVideoMeta.resolution;
      console.log(input, output);
      if (exitCode === 0) {
        resolve({
          width: w,
          height: h,
          thumbWidth: tw,
          thumbHeight: th,
          duration: input.duration
        });
      } else {
        console.log(exitCode, signal, metadata);
        reject(exitCode);
      }
    });
  });
};


/**
 * Creates direcory recursively
 * @param {string} targetDir - directory to create
 * @returns {string} absolute path of created directory
 */
const createDirIfNotExist = (targetDir) => {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(parentDir, childDir);
    if (!fs.existsSync(curDir)) {
      fs.mkdirSync(curDir);
    }

    return curDir;
  }, initDir);
};


module.exports.uploadFile = uploadFile;
module.exports.uploadFiles = uploadFiles;
