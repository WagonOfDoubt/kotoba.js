const { body } = require('express-validator');
const _ = require('lodash');

const { updatePosts } = require('../../controllers/posting');

const { validateRequest } = require('../../middlewares/validation');
const { postEditPermission } = require('../../middlewares/permission');
const { filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles } = require('../../middlewares/post');


/**
 * @todo delete this module and implement everything in controller
 */
module.exports.modifyPostHandler = [
  body('items').exists().isArray(),
  body('regenerate').toBoolean(),
  body('postpassword').trim(),
  validateRequest,
  // filters req.body.items so only posts that can be changed by current user
  // are present
  filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles,
  postEditPermission,
  async (req, res, next) => {
    try {
      const { items, regenerate } = req.body;
      if (_.isEmpty(items)) {
        if (_.isEmpty(res.locals.fail)) {
          return res.status(418);
        }
        const { status, error } = _.pick(res.locals.fail[0], 'status');
        return res
          .status(status)
          .json({
            fail: res.locals.fail
          });
      }

      const modlogData = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
      };

      const { success, fail } = await updatePosts(items, modlogData, regenerate);
      return res
        .status(200)
        .json({
          fail: [...res.locals.fail, ...fail],
          success: success,
        });
    } catch (err) {
      return next(err);
    }
  }
];
