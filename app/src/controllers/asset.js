/**
 * Functions for file manipulations in Asset documents
 * @module controllers/asset
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');

const upload = require('./upload');
const config = require('../json/config.json');
const Asset = require('../models/asset');
const { FileFormatNotSupportedError, FileAlreadyExistsError, UnknownError } = require('../errors');


/**
 * Upload files listed in asset document
 * @async
 * @param  {File}   file      multer file object
 * @param  {Object} assetDesc Object with asset data
 * @param {?String} assetDesc.name File name. If empty, file.originalname will
 *    be used.
 * @param {Number} assetDesc.thumbWidth Thumbnail image width in pixels
 * @param {Number} assetDesc.thumbHeight Thumbnail image height in pixels
 * @return {Object}           Object with asset data with properties related
 *    to file populated
 * @throws {FileFormatNotSupportedError} If file is not image
 * @throws {FileAlreadyExistsError} If file with same hash already exists
 * @throws {UnknownError} If something else went wrong during saving of file
 */
module.exports.uploadAssetFiles = async (file, assetDesc) => {
  const fileExt = upload.getExtensionByMime(file.mimetype);
  
  if (!upload.isImage(fileExt)) {
    throw new FileFormatNotSupportedError('files[]', fileExt, 'body');
  }

  const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const duplicate = await Asset.findOne({ hash });

  if (duplicate) {
    throw new FileAlreadyExistsError('files[]', hash, 'body');
  }

  const name = assetDesc.name || file.originalname;
  const filename = path.basename(name, path.extname(name));
  const folder = upload.getRandomName();
  const { thumbWidth, thumbHeight } = assetDesc;
  const thumbExt = upload.getOptimalThumbnailExtenstion(fileExt);
  const fileUri   = path.join('.assets', folder, 'full', filename + fileExt);
  const thumbUri  = path.join('.assets', folder, filename + thumbExt);
  const filePath  = path.join(config.html_path, fileUri);
  const thumbPath = path.join(config.html_path, thumbUri);
  try {
    const [origFile, thumbFile] = await Promise.all([
      upload.saveImage(filePath, file),
      upload.createThumbnail(thumbPath, file, thumbWidth, thumbHeight),
    ]);
    const assetDoc = {
      hash: hash,
      name: filename,
      file: '/' + fileUri,
      width: origFile.width,
      height: origFile.height,
      thumb: '/' + thumbUri,
      thumbWidth: thumbFile.width,
      thumbHeight: thumbFile.height,
      type: 'image',
      mimetype: file.mimetype,
      size: origFile.size,
      category: assetDesc.category,
    };
    return assetDoc;
  } catch (err) {
    console.error(err);
    throw new UnknownError('Failed to upload asset file');
  }
};


/**
 * Remove files related to asset
 * @param  {Asset} assetDoc Asset document
 * @async
 */
module.exports.removeAssetFiles = async (assetDoc) => {
  const { thumb } = assetDoc;
  const thumbPath = path.join(config.html_path, thumb);
  await fs.remove(path.dirname(thumbPath));
};


/**
 * Resize asset thumbnail
 * @async
 * @param  {Asset} assetDoc Asset document
 * @return {Object}         { thumbWidth, thumbHeight, _id }
 */
module.exports.resizeAsset = async (assetDoc) => {
  const originalFilePath = path.join(config.html_path, assetDoc.file);
  const originaFileBuffer = await fs.readFile(originalFilePath);
  const originalFile = {
    buffer: originaFileBuffer,
    mimetype: upload.getMimeByExtension(path.extname(originalFilePath)),
  };
  const thumbPath = path.join(config.html_path, assetDoc.thumb);
  const thumbFile = await upload.createThumbnail(thumbPath, originalFile, assetDoc.thumbWidth, assetDoc.thumbHeight);
  const thumbWidth = thumbFile.width;
  const thumbHeight = thumbFile.height;
  const _id = assetDoc._id;
  return { thumbWidth, thumbHeight, _id };
};


/**
 * Rename asset files according to value of assetDoc.name
 * @async
 * @param  {asset} assetDoc Asset document
 * @return {Object}         { name, file, thumb, _id }
 */
module.exports.renameAsset = async (assetDoc) => {
  const { name, file, thumb, _id } = assetDoc;
  const newFileName = name + path.extname(file);
  const newFileUri = path.join(path.dirname(file), newFileName);
  const newFilePath  = path.join(config.html_path, newFileUri);
  const oldFilePath = path.join(config.html_path, file);

  const newThumbName = name + path.extname(thumb);
  const newThumbUri  = path.join(path.dirname(thumb), newThumbName);
  const newThumbPath = path.join(config.html_path, newThumbUri);
  const oldThumbPath = path.join(config.html_path, thumb);

  await Promise.all([
      fs.move(oldThumbPath, newThumbPath),
      fs.move(oldFilePath, newFilePath),
    ]);

  return {
    name: name,
    file: newFileUri,
    thumb: newThumbUri,
    _id: _id
  };
};
