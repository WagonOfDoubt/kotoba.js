const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const crypto = require('crypto');
const { checkSchema } = require('express-validator/check');

const upload = require('../../controllers/upload');
const config = require('../../config.json');
const Asset = require('../../models/asset');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const sanitizer = require('../../middlewares/sanitizer');

const validCategories = ['banner', 'bg', 'favicon', 'logo', 'misc', 'news', 'placeholder', 'style'];
const validFileNameRegExp = /^(?!\\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)[^\\|\\*\?\\:<>\/$"]*[^\\.\\|\\*\\?\\\:<>\/$"]+$/i;

/**
 * @apiDefine AssetNotFoundError
 * @apiError AssetNotFoundError Asset with specified ObjectId was not found
 *
 * @apiErrorExample AssetNotFoundError
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": {
 *         "type": "AssetNotFoundError",
 *         "msg": "Asset \"<ObjectId>\" doesn't exist.",
 *         "param": "_id",
 *         "value": "<ObjectId>",
 *         "location": "body",
 *       }
 *     }
 */


/**
 * @api {get} /api/assets/:mongoId? Get site assets
 * @apiName GetAssets
 * @apiGroup Assets
 * @apiPermission admin
 *
 * @apiParam {ObjectId} mongoId="" Optional. Mongo ObjectId of specific document
 * to return. If present, one document will be returned, otherwise array of all
 * documents will be returned.
 *
 * @apiSuccessExample GET /api/assets/
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "isDeleted": false,
 *         "_id": "<ObjectId>",
 *         "hash": "...",
 *         "name": "asset",
 *         "file": "/.assets/12345678901234/full/asset.png",
 *         "width": 2400,
 *         "height": 2400,
 *         "thumb": "/.assets/12345678901234/asset.png",
 *         "thumbWidth": 100,
 *         "thumbHeight": 100,
 *         "type": "image",
 *         "mimetype": "image/png",
 *         "size": 14481678,
 *         "user": "<ObjectId>",
 *         "category": "misc",
 *         "timestamp": "2019-04-02T12:40:45.739Z"
 *       },
 *       ...
 *     ]
 *
 * @apiError RequestValidationError
 * @apiError AssetNotFoundError
 * @apiError AuthRequiredError
 * @apiError PermissionDeniedError
 */
router.get(
  '/api/assets/:mongoId?',
  [
    adminOnly,
    checkSchema({
      mongoId: {
        in: 'params',
        optional: true,
        isMongoId: true,
        errorMessage: (value, location, path) => `${value} is not valid ObjectId`,
      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const _id = req.params.mongoId;
      if (_id) {
        const asset = await Asset.findOne({ _id });
        if (asset) {
          return res
            .status(200)
            .json(asset);
        } else {
          return res
            .status(404)
            .json({
              error: {
                'type': 'AssetNotFoundError',
                'msg': `Asset "${_id}" doesn't exist.`,
                'param': '_id',
                'value': _id,
                'location': 'params',
              }
            });
        }
      }
      const assets = await Asset.find({});
      return res
        .status(200)
        .json(assets);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {post} /api/assets/ Upload new assets
 * @apiName UploadAssets
 * @apiGroup Assets
 * @apiPermission admin
 * 
 * @apiDescription Upload new assets files. This endpoint expects content-type
 * `multipart/form-data` for files upload. While uploading, images will be
 * resized to specified dimensions, while keeping the original file.
 * 
 * @apiParam {Binary[]} files[] Binary files
 * @apiParam {Object[]} assets Array with infos for related files
 * @apiParam {String} assets.name File name
 * @apiParam {Number} assets.thumbWidth Width of resized image
 * @apiParam {Number} assets.thumbHeight Height of resized image
 * @apiParam {String} assets.category Asset category, can be one of: "banner",
 * "bg", "favicon", "logo", "misc", "news", "placeholder", "style"
 * 
 * @apiError RequestValidationError Request did not pass validation
 * @apiError PermissionDeniedError  User has no permission for this action
 * @apiError FileAlreadyExists  File was already uploaded
 *
 * @apiSuccess {Object[]} success Array of successfully uploaded Asset documents
 * @apiSuccess {Object[]} fail Array of not completed for various reasons tasks
 * from original request
 * @apiSuccess {Number} fail.status HTTP Status code of error
 * @apiSuccess {Object} fail.error Error object
 * @apiSuccess {Object} fail.error.msg Error message
 * @apiSuccess {Object} fail.error.type Error type
 * @apiSuccess {Object} fail.error.param Name of parameter that did not pass
 * validation
 * @apiSuccess {Object} fail.error.value Invalid value that caused error
 * @apiSuccess {Object} fail.error.location Location of invalid parameter
 *
 * @apiSuccessExample
 *     HTTP/1.1 201 Created
 *     {
 *       success: [
 *         {
 *           category: "misc",
 *           file: "/.assets/155398402658115/full/1541507975834.jpg",
 *           hash: "...",
 *           height: 960,
 *           mimetype: "image/jpeg",
 *           name: "1541507975834",
 *           size: 165015,
 *           thumb: "/.assets/155398402658115/1541507975834.jpg",
 *           thumbHeight: 141,
 *           thumbWidth: 200,
 *           type: "image",
 *           user: "<ObjectId>",
 *           width: 1280
 *         },
 *         ...
 *       ],
 *       fail: [
 *         {
 *           error: {
 *             location: "body",
 *             msg: "File with hash "..." already exists.",
 *             param: "files[]",
 *             type: "FileAlreadyExists",
 *             value: "..."
 *           },
 *           status: 409
 *         },
 *         ...
 *       ]
 *     }
 */
router.post(
  '/api/assets/',
  [
    adminOnly,
    multer()
      .array('files[]'),
    sanitizer
      .filterBody(['assets', 'files[]']),
    sanitizer
      .toArray('assets'),
    sanitizer
      .filterArray(['isDeleted', 'name', 'thumbWidth', 'thumbHeight', 'category'], 'assets'),
    checkSchema({
      assets: {
        in: 'body',
        isArray: true,
        custom: {
          options: (arr) => arr.length > 0,
          errorMessage: 'Array is empty',
        },
        errorMessage: 'Array is missing or not an array',
      },
      'assets.*.name': {
        in: 'body',
        matches: {
          options: [validFileNameRegExp],
          errorMessage: 'File name is empty or contains invalid characters',
        },
      },
      'assets.*.thumbWidth': {
        in: 'body',
        isInt: {
          options: { min: 1, max: 4096 },
        },
        toInt: true,
      },
      'assets.*.thumbHeight': {
        in: 'body',
        isInt: {
          options: { min: 1, max: 4096 },
        },
        toInt: true,
      },
      'assets.*.category': {
        in: 'body',
        isIn: {
          options: [validCategories],
          errorMessage: `Value must me one of: ${ validCategories.join(', ') }`,
        },
      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const processAsset = async ([file, assetDesc]) => {
        const fileExt = upload.getExtensionByMime(file.mimetype);
        
        if (!upload.isImage(fileExt)) {
          return {
            status: 415,
            error: {
              type: 'FileFormatNotSupported',
              msg: `File type ${fileExt} not supported for this upload`,
              value: fileExt,
              param: 'files[]',
              location: 'body',
            }
          };
        }

        const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
        const duplicate = await Asset.findOne({ hash });

        if (duplicate) {
          return {
            status: 409,
            error: {
              type: 'FileAlreadyExists',
              msg: `File with hash "${ hash }" already exists.`,
              param: 'files[]',
              value: hash,
              location: 'body',
            }
          };
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
            user: req.user._id,
            category: assetDesc.category,
          };
          return assetDoc;          
        } catch (err) {
          return {
            status: 500,
            error: err
          };
        }
      };

      const assets = _.zip(req.files, req.body.assets);
      const assetsDocs = await Promise.all(assets.map(processAsset));
      const [validAssets, invalidAssets] = _.partition(assetsDocs, doc => !doc.error);

      if (validAssets.length) {
        await Asset.insertMany(validAssets);
        return res
          .status(201).json({
            success: validAssets,
            fail: invalidAssets,
          });
      }
      return res
        .status(200).json({
          fail: invalidAssets,
        });
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {patch} /api/assets/ Change assets
 * @apiName UpdateAssets
 * @apiGroup Assets
 * @apiPermission admin
 * @apiError RequestValidationError Request did not pass validation
 * @apiError PermissionDeniedError  User has no permission for this action
 */
router.patch(
  '/api/assets/',
  [
    adminOnly,
    sanitizer.filterBody(['assets']),
    sanitizer.toArray('assets'),
    sanitizer.filterArray(['isDeleted', 'name', 'thumbWidth', 'thumbHeight', 'category', '_id'], 'assets'),
    checkSchema({
      assets: {
        in: 'body',
        isArray: true,
        custom: {
          options: (arr) => arr.length > 0,
          errorMessage: 'Array is empty',
        },
        errorMessage: 'Array is missing or not an array',
      },
      'assets.*.isDeleted': {
        in: 'body',
        optional: true,
        isBoolean: true,
        toBooean: true,
      },
      'assets.*.name': {
        in: 'body',
        optional: true,
        matches: {
          options: [validFileNameRegExp],
          errorMessage: 'File name is empty or contains invalid characters',
        },
      },
      'assets.*.thumbWidth': {
        in: 'body',
        optional: true,
        isInt: {
          options: { min: 1, max: 4096 },
          errorMessage: 'Image size is too big or invalid',
        },
        toInt: true,
      },
      'assets.*.thumbHeight': {
        in: 'body',
        optional: true,
        isInt: {
          options: { min: 1, max: 4096 },
          errorMessage: 'Image size is too big or invalid',
        },
        toInt: true,
      },
      'assets.*.category': {
        in: 'body',
        optional: true,
        isIn: {
          options: [validCategories],
          errorMessage: `Value must me one of: ${ validCategories.join(', ') }`,
        },
      },
      'assets.*._id': {
        in: 'body',
        isMongoId: true,
      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const assets = req.body.assets;
      if (!assets.length) {
        return res.status(400).json({
          error: {
            msg: `Array is empty`,
            type: 'RequestValidationError',
            param: 'assets',
            value: assets,
            location: 'body',
          }
        });
      }

      const assetIds = _.map(assets, '_id');
      const foundAssets = await Asset.find({ _id: { $in: assetIds } });
      const foundAssetsById = _.mapValues(_.groupBy(foundAssets, '_id'), (arr) => arr[0].toObject());
      const notFoundAssets = assetIds
        .filter(id => !_.has(foundAssetsById, id))
        .map(id => ({
          id: id,
          status: 404,
          error: {
            msg: `Assets not found`,
            type: 'DocumentNotFound',
            value: id,
            param: 'assets',
            location: 'body',
          }
        }));

      if (!foundAssets.length) {
        return res.status(404).json(notFoundAssets);
      }

      const assetTasks = assets.filter((asset) => _.has(foundAssetsById, asset._id));
      const resizeTasks = assetTasks
        .filter((cmd) => cmd.thumbWidth || cmd.thumbHeight)
        .map((cmd) => {
          const asset = foundAssetsById[cmd._id];
          asset.thumbWidth = cmd.thumbWidth || asset.thumbWidth;
          asset.thumbHeight = cmd.thumbHeight || asset.thumbHeight;
          return asset;
        });

      const resizeAsset = async (assetDoc) => {
        console.log(config.html_path, assetDoc);
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

      assetTasks.forEach((asset) =>
        _.assign(foundAssetsById[asset._id],
          _.pick(asset, ['isDeleted', 'category'])));

      if (resizeTasks.length) {
        const resized = await Promise.all(resizeTasks.map(resizeAsset));
        resized.forEach((asset) => _.assign(foundAssetsById[asset._id], asset));
      }

      const renameAsset = async (assetDoc) => {
        const { name, file, thumb, _id } = assetDoc;
        const newFileName = name + path.extname(file);
        const newFileUri = path.join(path.dirname(file), newFileName);
        const newFilePath  = path.join(config.html_path, newFileUri);
        const oldFilePath = path.join(config.html_path, file);

        const newThumbName = name + path.extname(thumb);
        const newThumbUri  = path.join(path.dirname(thumb), newThumbName);
        const newThumbPath = path.join(config.html_path, newThumbUri);
        const oldThumbPath = path.join(config.html_path, thumb);

        console.log(`rename ${oldThumbPath} => ${newThumbPath}`);
        console.log(`rename ${oldFilePath} => ${newFilePath}`);

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

      const renameTasks = assetTasks
        .filter((asset) => asset.name && foundAssetsById[asset._id].name !== asset.name)
        .map((cmd) => _.assign(foundAssetsById[cmd._id], _.pick(cmd, ['name'])));

      if (renameTasks.length) {
        const renamed = await Promise.all(renameTasks.map(renameAsset));
        renamed.forEach((asset) => _.assign(foundAssetsById[asset._id], asset));
      }

      const query = Array.from(Object.values(foundAssetsById)).map((asset) => {
          return {
            updateOne: {
              filter: { _id: asset._id },
              update: _.omit(asset, '_id'),
            }
          };
        });

      console.log(query);
      
      const result = await Asset.bulkWrite(query);
      console.log(result);
      return res.status(200).json({
        success: Object.values(foundAssetsById),
        fail: [
          ...notFoundAssets.map((notfound) => ({
              status: 404,
              error: {
                'type': 'AssetNotFoundError',
                'msg': `Asset "${notfound._id}" doesn't exist.`,
                'param': '_id',
                'value': notfound._id,
                'location': 'body',
              },
            })),
        ],
      });
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {delete} /api/assets/ Delete assets
 * @apiName DeleteAssets
 * @apiGroup Assets
 * @apiPermission admin
 * @apiParam {Object[]} assets Array of objects with asset id
 * @apiParam {ObjectId} assets._id Mongo ObjectId of asset to delete
 * @apiSuccessExample
 *     HTTP/1.1 200 OK
 *     {
 *       success: [
 *         { _id: <ObjectId> },
 *         ...
 *       ],
 *       fail: [
 *         {
 *           status: 404,
 *           error: {
 *             ...
 *           }
 *         },
 *         ...
 *       ]
 *     }
 * @apiError AuthRequiredError
 * @apiError AssetNotFoundError
 * @apiError RequestValidationError
 * @apiError PermissionDeniedError
 */
router.delete(
  '/api/assets/',
  [
    adminOnly,
    checkSchema({
      assets: {
        in: 'body',
        isArray: true,
        custom: {
          options: (arr) => arr.length > 0,
          errorMessage: 'Array is empty',
        },
        errorMessage: 'Array is missing or not an array',
      },
      'assets.*._id': {
        in: 'body',
        isMongoId: true,
      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const ids = req.body.assets.map(asset => asset._id);
      const assets = await Asset.find({ _id: { $in: ids } });
      const foundIds = assets.map(asset => asset._id.toString());
      const notFoundAssets = ids.filter(id => !foundIds.includes(id));
      let fail = [];
      if (notFoundAssets.length) {
        fail = [
          ...fail,
          ...notFoundAssets.map(_id => ({
            status: 404,
            error: {
              'type': 'AssetNotFoundError',
              'msg': `Asset "${_id}" doesn't exist.`,
              'param': 'assets._id',
              'value': _id,
              'location': 'body',
            }
          }))
        ];
      }
      if (!foundIds.length) {
        return res
          .status(404)
          .json(fail);
      }
      const removeFiles = async (assetDoc) => {
        const { thumb } = assetDoc;
        const thumbPath = path.join(config.html_path, thumb);
        await fs.remove(path.dirname(thumbPath));
      };
      await Promise.all(assets.map(removeFiles));
      await Asset.deleteMany({ _id: { $in: foundIds }});
      return res
        .status(200)
        .json({
          success: foundIds.map(_id => ({_id})),
          fail: fail,
        });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
