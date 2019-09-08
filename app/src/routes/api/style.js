/**
 * Style api endpoint
 * @module routes/api/style
 */

const express = require('express');
const _ = require('lodash');
const router = express.Router();
const { checkSchema } = require('express-validator');

const Style = require('../../models/style');

const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const sanitizer = require('../../middlewares/sanitizer');

const { DocumentNotFoundError, DocumentAlreadyExistsError } = require('../../errors');

const validStyleNameRegexp = /^[a-z0-9_]*$/;


/**
 * @api {get} /api/style/ Get styles
 * @apiName GetStyle
 * @apiGroup Style
 * @apiParam {String} name Name of style to get. If not present, array of all styles
 *    will be returned.
 * @apiSuccess {String} name Name of style.
 * @apiSuccess {Date} updatedDate When style was last updated.
 * @apiSuccess {rawCSS} CSS to insert on page.
 * @apiUse RequestValidationError
 * @apiUse DocumentNotFoundError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.get(
  '/api/style/',
  [
    checkSchema({
      name: {
        in: 'query',
        matches: {
          options: [validStyleNameRegexp],
          errorMessage: 'Style name can contain only lowercase letters and numbers'
        },
        trim: true,
      }
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const styleName = req.query.name;
      if (styleName) {
        const style = await Style.findByName(styleName);
        if (!style) {
          const err = new DocumentNotFoundError('Style', 'name', styleName, 'query');
          return err.respond(res);
        }
        const styleObj = _.pick(style, ['name', 'updatedDate', 'rawCSS']);
        return res
          .status(200)
          .json(styleObj);
      }
      const styles = await Style.findAll();
      const stylesObj = styles.map(s => _.pick(s, ['name', 'updatedDate']));
      return res
        .status(200)
        .json(stylesObj);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @apiDefine StyleParams
 * @apiParam {String} name Name of style also serving as unique id of style
 * @apiParam {Object} colors CSS color variables
 * @apiParam {Object} strings CSS text variables
 * @apiParam {String} css Additional plain CSS
 */

/**
 * @api {post} /api/style/ Upload new style
 * @apiName CreateStyle
 * @apiGroup Style
 * @apiPermission admin
 * @apiUse StyleParams
 * @apiSuccess {Object[]} success
 * @apiSuccess {String} success.name
 * @apiSuccess {Date} success.createdDate
 * @apiUse RequestValidationError
 * @apiUse DocumentAlreadyExistsError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.post(
  '/api/style/',
  [
    adminOnly,
    sanitizer
      .filterBody(['name', 'colors', 'variables', 'strings', 'css']),
    checkSchema({
      'name': {
        matches: {
          options: [validStyleNameRegexp],
          errorMessage: 'Style name can contain only lowercase letters and numbers'
        },
        trim: true,
      },
      'colors.*': {
        isHexColor: true,
        trim: true,
      },
      'variables.*': {
        isAscii: true,
        trim: true,
      },
      'strings.*': {

      },
      'css': {

      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const styleWithSameName = await Style.findByName(req.body.name);
      if (styleWithSameName) {
        const err = new DocumentAlreadyExistsError('Style', 'name', req.body.name, 'body');
        return err.respond(res);
      }
      const style = new Style({
        name: req.body.name,
        colors: req.body.colors,
        strings: req.body.strings,
        variables: req.body.variables,
        css: req.body.css,
        addedBy: req.user._id,
      });
      await style.save();
      return res
        .status(201)
        .json({
          success: [
            {
              name: style.name,
              createdDate: style.createdDate,
            }
          ],
          fail: (res.locals.fail || []),
        });
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {patch} /api/style/ Change style
 * @apiName UpdateStyle
 * @apiGroup Style
 * @apiPermission admin
 * @apiUse StyleParams
 * @apiSuccess {Object[]} success
 * @apiSuccess {String} success.name
 * @apiSuccess {Date} success.updatedDate
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse DocumentNotFoundError
 */
router.patch(
  '/api/style/',
  [
    adminOnly,
    sanitizer
      .filterBody(['name', 'colors', 'variables', 'strings', 'css']),
    checkSchema({
      'name': {
        matches: {
          options: [validStyleNameRegexp],
          errorMessage: 'Style name can contain only letters and numbers'
        },
        trim: true,
      },
      'colors.*': {
        isHexColor: true,
        trim: true,
      },
      'variables.*': {
        isAscii: true,
        trim: true,
      },
      'strings.*': {

      },
      'css': {

      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const styleName = req.body.name;
      const style = await Style.findOne({name: styleName}).exec();
      if (!style) {
        const notFoundError =
          new DocumentNotFoundError('Style', 'name', styleName, 'body');
        return notFoundError.respond();
      }
      const updateQuery = _.pick(req.body,
        ['colors', 'variables', 'strings', 'css']);
      updateQuery.updatedDate = new Date();
      style.set(updateQuery);
      await style.save();

      res.locals.fail = [];
      res.locals.success = [{
        name: style.name,
        updatedDate: style.updatedDate,
      }];
      const { success, fail } = res.locals;
      return res.status(200).json({ success, fail });
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {delete} /api/style/ Delete style
 * @apiName DeleteStyle
 * @apiGroup Style
 * @apiPermission admin
 * @apiParam {String}   name Name of style
 * @apiSuccess {Object[]} success
 * @apiSuccess {String} success.name
 * @apiUse AuthRequiredError
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 * @apiUse PermissionDeniedError
 */
router.delete(
  '/api/style/',
  [
    adminOnly,
    checkSchema({
      'name': {
        matches: {
          options: [validStyleNameRegexp],
          errorMessage: 'Style name can contain only letters and numbers'
        },
        trim: true,
      },
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const styleName = req.body.name;
      const style = await Style.findOne({name: styleName}).exec();
      if (!style) {
        const notFoundError =
          new DocumentNotFoundError('Style', 'name', styleName, 'body');
        return notFoundError.respond();
      }
      await style.remove();

      res.locals.fail = [];
      res.locals.success = [{
        name: style.name,
      }];
      const { success, fail } = res.locals;
      return res.status(200).json({ success, fail });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
