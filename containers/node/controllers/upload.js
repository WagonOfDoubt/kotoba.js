const config = require('../config.json');
const Settings = require('../models/settings');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const avconv = require('avconv');
const crypto = require('crypto');


const isVideo = (ext) => {
  const videos = ['.mp4', '.ogv', '.webm'];
  return videos.includes(ext);
};


const isImage = (ext) => {
  const images = ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.gif', '.svg'];
  return images.includes(ext);
};


const getAttachmentType = (ext) => {
  if (isImage(ext)) {
    return 'image';
  }
  if (isVideo(ext)) {
    return 'video';
  }
  return 'unknown';
};


const normalizeExxtension = (ext) => {
  if (ext === '.jpeg') {
    return '.jpg';
  }
  return ext;
};


const getOptimalThumbnailExtenstion = (ext) => {
  if (['.png', '.svg', '.gif'].includes(ext)) {
    return '.png';
  }
  return '.jpg';
};


const uploadFile = async (boardUri, file, keepFilename = true) => {
  const ext = normalizeExxtension(path.extname(file.originalname));
  const type = getAttachmentType(ext);
  if (type === 'unknown') {
    const error = new Error('Unsupported file format: ' + ext);
    error.type = 'input_error';
    error.reason = 'invalid_upload_format';
    throw error;
  }
  const thumbExt = getOptimalThumbnailExtenstion(ext);

  const randomName = `${ Date.now() }${ Math.floor(Math.random() * 100) }`;
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
