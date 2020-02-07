/**
 * Middlewares for checking user's permissions
 * @module middlewares/permission
 */

const _ = require('lodash');
const { Post } = require('../models/post');
const Role = require('../models/role');
const { PermissionDeniedError, AuthRequiredError } = require('../errors');


/**
 * Check if user has permission to change post field. Checks req.body.items
 *    and filters them, leaving only allowed items, populates res.locals.fail
 *    with rejected items.
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
module.exports.postEditPermission = async (req, res, next) => {
  try {
    const { items, postpassword } = req.body;

    // check each operation for permission
    const checkPost = (item) =>
      checkPostPermission(item.target, postpassword, item.update, req.userRoles, req.user);
    const checkedPostsResults = await Promise.all(items.map(checkPost));

    // req.body.items will contain only items that are allowed for updating
    req.body.items = [];
    res.locals.fail = res.locals.fail || [];
    checkedPostsResults.forEach((item) => {
      if (!_.isEmpty(item.denied)) {
        res.locals.fail.push(...item.denied);
      }
      if (!_.isEmpty(item.update)) {
        req.body.items.push(_.pick(item, [ 'target', 'update' ]));
      }
    });

    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Helper function for checking permission of changing values of particular
 *    post fields
 * @param  {Object} target    Target post
 * @param  {String} password  User's post deletion password (not login password)
 * @param  {Object} updateObj Fields to update
 * @param  {Object} roles     User's roles
 * @param  {module:models/user~User} user      Logged in user
 * @return {Object}           { target, update, denied }
 * @async
 */
const checkPostPermission = async (target, password, updateObj, roles, user) => {
  const passwordMatches = password && await target.checkPassword(password);

  const relevantRoles = [];
  if (user && user.authority === 'admin') {
    relevantRoles.push(Role.getSpecialRole('admin'));
  }
  if (passwordMatches) {
    relevantRoles.push(Role.getSpecialRole('poster'));
  }
  if (roles && roles[target.boardUri]) {
    relevantRoles.push(roles[target.boardUri]);
  }
  const checkedUpdates = _.mapValues(updateObj, (value, field) => {
    const permissionName =
      Post.isPostField(field) ?
        'postPermissions' : 
      Post.isAttachmentField(field) ?
        'attachmentPermissions' :
        null;
    const {roleName, priority} = Role.getMaxWritePriority(relevantRoles, permissionName, field, value);
    const oldPriority = _.get(target, ['changes', field]);
    try {
      Role.checkPriorities(priority, oldPriority);
    } catch (err) {
      const ref = _.omit(target.toReflink(), 'src');
      return {
        ref: ref,
        status: 403,
        update: { [field]: value },
        roleName: roleName,
        userPriority: priority,
        currentPriority: oldPriority,
        error: err.toObject(),
      };
    }
    return { value, priority, roleName };
  });

  const update = _.pickBy(checkedUpdates, (u) => !_.has(u, 'error'));
  const denied = _.values(_.pickBy(checkedUpdates, (u) => _.has(u, 'error')));
  return { target, update, denied };
};


/**
 * Middleware that redirects to login page if user is not authenticated
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.authRequired = (req, res, next) => {
  const isLoginned = req.isAuthenticated();
  if (!isLoginned) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect('/manage/login');
  }
  next();
};


/**
 * Middleware that returns 401 status and JSON response with error if user is
 * not authenticated
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.apiAuthRequired = (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      const err = new AuthRequiredError();
      return err.respond(res);
    }
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Middleware that returns 401 status if user is not authenticated or has no
 * admin rights
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.adminOnly = (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      const err = new AuthRequiredError();
      return err.respond(res);
    }
    if (req.user.authority !== 'admin') {
      const err = new PermissionDeniedError();
      return err.respond(res);
    }
    next();
  } catch (err) {
    next(err);
  }
};
