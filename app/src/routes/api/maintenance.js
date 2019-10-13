const express = require('express');
const router = express.Router();
const _ = require('lodash');
const { checkSchema } = require('express-validator');

const { regenerateAll, clearTemplateCache } = require('../../controllers/generate');
const {Post} = require('../../models/post');
const Parser = require('../../controllers/parser');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');


/**
 * @api {post} /api/regenerate/ Regenerate static pages
 * @apiName Regenerate
 * @apiGroup Maintenance
 * @apiPermission admin
 * @apiParam {Boolean} nocache If true, template cache will be cleared
 * @apiParam {Boolean} mainpage Whether or not to regenerate main page
 * @apiParam {String[]} boards List of boards to regenerate. If empty array,
 *    all boards will be regenerated. If null, no boards will be regenerated.
 * @apiSuccessExample
 *     HTTP/1.1 200 OK
 *     {
 *       "took": 1.073
 *     }
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.post('/api/regenerate',
  adminOnly,
  checkSchema({
    mainpage: {
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    boards: {
      isArray: true,
      optional: { options: { nullable: true } },
    },
    'boards.*': {
      matches: /[a-zA-Z0-9_]*$/,
    },
    nocache: {
      isBoolean: true,
      toBoolean: true,
      optional: true,
    }
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const start = new Date();

      if (req.body.nocache) {
        clearTemplateCache();
      }
      const options = _.pick(req.body, ['boards', 'mainpage']);
      await regenerateAll(options);

      const end = new Date();
      const seconds = (end.getTime() - start.getTime()) / 1000;
      res.status(200).json({ took: seconds });
    } catch (error) {
      next(error);
    }
  }
);


router.post('/api/parseposts',
  adminOnly,
  async (req, res, next) => {
    try {
      const start = new Date();
      
      const posts = await Post.find().select('body boardUri').exec();
      const promises = posts.map(
        (post) => Parser.parsePost(post)
          .then(parsedPost => post.save()));
      await Promise.all(promises);

      const end = new Date();
      const seconds = (end.getTime() - start.getTime()) / 1000;
      res.status(200).json({ took: seconds });
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;
