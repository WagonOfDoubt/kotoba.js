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
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { restGetQuerySchema } = require('../../middlewares/reqparser');
const { createGetRequestHandler } = require('../../middlewares/restapi');

const { DocumentNotFoundError, DocumentAlreadyExistsError } = require('../../errors');


/**
 * @apiDefine StyleParams
 * @apiParam {String} name Name of style also serving as unique id of style
 * @apiParam {Object} colors CSS color variables
 * @apiParam {Object} strings CSS text variables
 * @apiParam {String} css Additional plain CSS
 */

const validStyleNameRegexp = /^[a-z0-9_]+$/;
const styleParamsValidator = {
  'name': {
    in: 'body',
    matches: {
      options: [validStyleNameRegexp],
      errorMessage: 'Style name can contain only lowercase letters and numbers'
    },
    trim: true,
  },
  'colors.*': {
    in: 'body',
    isHexColor: true,
    trim: true,
  },
  'variables.*': {
    in: 'body',
    isAscii: true,
    trim: true,
  },
  'strings.*': {
    in: 'body',
    optional: true,
  },
  'css': {
    in: 'body',
    optional: true,
    trim: true,
  },
};


/**
 * @api {get} /api/style/:name.css Get CSS
 * @apiName GetStyleCSS
 * @apiGroup Style
 * @apiPermission anyone
 * @apiDescription Returns raw CSS file of style without any json
 *
 * @apiParam (params) {Sting} name Style name (lowercase)
 *
 * @apiSuccessExample {css} Style found:
 *     HTTP/1.1 200 OK
 *     :root {--background-color: #ffffee;...
 *     }
 *     
 *     .post__header__name {
 *       font-weight: bold;
 *     }
 *     
 *     .form-label {
 *       font-weight: bold;
 *     }
 * 
 * @apiErrorExample Style not found:
 *     HTTP/1.1 404 Not Found
 */
router.get(
  '/api/style/:name.css',
  checkSchema({
    name: {
      in: 'params',
      matches: {
        options: [validStyleNameRegexp],
        errorMessage: 'Style name can contain only lowercase letters and numbers'
      },
      trim: true,
    }
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const styleName = req.params.name;
      const style = await Style.findByName(styleName);
      if (!style) {
        return res.status(404).end();
      }
      const css = style.rawCSS;
      return res
        .status(200).type('css').send(css).end();
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {get} /api/style/ Get Styles
 * @apiName GetStyle
 * @apiGroup Style
 * @apiPermission anyone
 * @apiDescription Find one or more style based on query.
 *
 * Search is ignored.
 * 
 * Filter can be applied by: `name`, `createdAt`, `updatedAt`.
 *
 * Selectable fields are: `name`, `createdBy`, `name`, `login`, `authority`,
 *    `createdAt`, `updatedAt`, `colors`, `strings`, `variables`, `css`,
 *    `rawCSS`, `capitalizedName`.
 * 
 * @apiUse GenericGetApi
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 */
router.get(
  '/api/style/',
  checkSchema(restGetQuerySchema),
  validateRequest,
  filterMatched,
  createGetRequestHandler('Style', false),
);


/**
 * @api {post} /api/style/ Create style
 * @apiName CreateStyle
 * @apiGroup Style
 * @apiPermission admin
 * @apiUse StyleParams
 * @apiSuccess {Object[]} success
 * @apiSuccess {String} success.name
 * @apiSuccess {Date} success.createdAt
 * @apiUse RequestValidationError
 * @apiUse DocumentAlreadyExistsError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.post(
  '/api/style/',
  adminOnly,
  checkSchema({
    ...styleParamsValidator,
  }),
  validateRequest,
  filterMatched,
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
        createdBy: req.user._id,
      });
      await style.save();
      return res
        .status(201)
        .json({
          success: [
            {
              name: style.name,
              createdAt: style.createdAt,
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
 * @api {patch} /api/style/ Modify style
 * @apiName UpdateStyle
 * @apiGroup Style
 * @apiPermission admin
 * @apiUse StyleParams
 * @apiSuccess {Object[]} success
 * @apiSuccess {String} success.name
 * @apiSuccess {Date} success.updatedAt
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse DocumentNotFoundError
 */
router.patch(
  '/api/style/',
  adminOnly,
  checkSchema({
    ...styleParamsValidator,
  }),
  validateRequest,
  filterMatched,
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
      updateQuery.updatedAt = new Date();
      style.set(updateQuery);
      await style.save();

      res.locals.fail = [];
      res.locals.success = [{
        name: style.name,
        updatedAt: style.updatedAt,
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
  adminOnly,
  checkSchema({
    'name': {
      in: 'body',
      matches: {
        options: [validStyleNameRegexp],
        errorMessage: 'Style name can contain only letters and numbers'
      },
      trim: true,
    },
  }),
  validateRequest,
  filterMatched,
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
