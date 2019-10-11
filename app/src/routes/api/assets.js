/**
 * Assets api endpoint
 * @module routes/api/assets
 */


const express = require('express');
const router = express.Router();
const multer = require('multer');
const _ = require('lodash');
const fp = require('lodash/fp');
const { checkSchema } = require('express-validator');

const Asset = require('../../models/asset');

const { adminOnly } = require('../../middlewares/permission');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { populateDocumentsByIds,
  removeDuplicates,
  compareRequestWithDocuments,
  applyAndValidateDocuments } = require('../../middlewares/restapi');

const { BaseError, UnknownError, DocumentNotFoundError } = require('../../errors');
const { uploadAssetFiles,
  removeAssetFiles,
  resizeAsset,
  renameAsset } = require('../../controllers/asset');


/**
 * Valid values for Asset.category
 * @type {Array}
 */
const validCategories = ['banner', 'bg', 'favicon', 'logo', 'misc', 'news', 'placeholder', 'style'];

/**
 * Regular expression to test if file name is safe to use
 * @type {RegExp}
 */
const validFileNameRegExp = /^(?!\\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)[^\\|\\*\?\\:<>\/$"]*[^\\.\\|\\*\\?\\\:<>\/$"]+$/i;


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
 *         "createdBy": "<ObjectId>",
 *         "category": "misc",
 *         "createdAt": "2019-04-02T12:40:45.739Z"
 *       },
 *       ...
 *     ]
 *
 * @apiUse RequestValidationError
 * @apiUse DocumentNotFoundError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
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
          const notFound = new DocumentNotFoundError('Asset', '_id', _id, 'params');
          return notFound.respond(res);
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
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse FileAlreadyExistsError
 * @apiUse FileFormatNotSupportedError
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
 *           createdBy: "<ObjectId>",
 *           width: 1280
 *         },
 *         ...
 *       ],
 *       fail: [
 *         {
 *           error: {
 *             location: "body",
 *             message: "File with hash "..." already exists.",
 *             param: "files[]",
 *             code: "FileAlreadyExists",
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
    filterMatched,
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const assets = _.zip(req.files, req.body.assets);

      const tryToUpload = ([file, assetDesc]) =>
        uploadAssetFiles(file, assetDesc)
          .catch(err => {
            if (!(err instanceof BaseError)) {
              err = new UnknownError();
            }
            _.assign(assetDesc, err.toResponse());
            return assetDesc;
          });

      const assetsDocs = await Promise.all(
        assets.map(tryToUpload));
      const [validAssets, invalidAssets] = _.partition(assetsDocs, doc => !_.has(doc, 'error'));

      if (invalidAssets.length) {
        res.locals.fail = [
          ...(res.locals.fail || []),
          ...invalidAssets,
        ];
      }

      if (validAssets.length) {
        validAssets.forEach((ad) => {
          ad.createdBy = req.user._id;
        });
        await Asset.insertMany(validAssets);
        return res
          .status(201).json({
            success: validAssets,
            fail: res.locals.fail,
          });
      }
      return res
        .status(200).json({
          fail: res.locals.fail,
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
 * @apiParam {Object[]} assets Array with infos for related files
 * @apiParam {String} assets.name File name
 * @apiParam {Number} assets.thumbWidth Width of resized image
 * @apiParam {Number} assets.thumbHeight Height of resized image
 * @apiParam {String} assets.category Asset category, can be one of: "banner",
 *    "bg", "favicon", "logo", "misc", "news", "placeholder", "style"
 * @apiSuccess {Object[]} success List of successful updates
 * @apiSuccess {Object}  success._id MongoDB ObjectId
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * @apiSuccess {Object}  fail.target Original target object that was in
 *    request
 * @apiSuccess {Number}   fail.status HTTP status for this action
 * @apiSuccess {Object}   fail.error  Error object (if only one error)
 * @apiSuccess {Object[]} fail.errors Errors objects (if multiple errors)
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse DocumentNotFoundError
 */
router.patch(
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
      'assets.*.isDeleted': {
        in: 'body',
        optional: true,
        isBoolean: true,
        toBoolean: true,
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
    filterMatched,
    populateDocumentsByIds(Asset, 'assets'),
    removeDuplicates('assets',
      ['isDeleted', 'name', 'thumbWidth', 'thumbHeight', 'category']),
    compareRequestWithDocuments('assets'),
    applyAndValidateDocuments('assets'),
  ],
  async (req, res, next) => {
    try {
      const assets = req.body.assets;
      const documents = res.locals.documents;
      const assetsGrouped = _.mapValues(
        _.groupBy(assets, '_id'),
        _.head);

      const resizeTasks = assets
        .filter((cmd) => cmd.thumbWidth || cmd.thumbHeight)
        .map(cmd => documents[cmd._id]);
      const renameTasks = assets
        .filter((cmd) => cmd.name)
        .map(cmd => documents[cmd._id]);

      if (resizeTasks.length) {
        const resized = await Promise.all(resizeTasks.map(resizeAsset));
        resized.forEach((asset) => _.assign(assetsGrouped[asset._id], asset));
      }

      if (renameTasks.length) {
        const renamed = await Promise.all(renameTasks.map(renameAsset));
        renamed.forEach((asset) => _.assign(assetsGrouped[asset._id], asset));
      }

      const query = Array.from(Object.values(assetsGrouped)).map((asset) => {
          return {
            updateOne: {
              filter: { _id: asset._id },
              update: _.omit(asset, '_id'),
            }
          };
        });
      
      await Asset.bulkWrite(query);
      res.locals.success = Object.values(assetsGrouped);
      const { success, fail } = res.locals;
      return res.status(200).json({ success, fail });
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
 * @apiUse AuthRequiredError
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 * @apiUse PermissionDeniedError
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
    filterMatched,
    populateDocumentsByIds(Asset, 'assets', ''),
  ],
  async (req, res, next) => {
    try {
      const documents = res.locals.documents;
      await Promise.all(_.map(documents, removeAssetFiles));
      const ids = _.map(documents, '_id');
      await Asset.deleteMany({ _id: { $in: ids }});
      return res
        .status(200)
        .json({
          success: _.map(documents, fp.pick(['_id'])),
          fail: res.locals.fail,
        });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
