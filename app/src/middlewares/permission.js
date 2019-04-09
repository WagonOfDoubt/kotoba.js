const _ = require('lodash');
const { createRegExpFromArray, regExpTester } = require('../utils/regexp');
const Post = require('../models/post');
const { PermissionDeniedError } = require('../errors');


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


const checkPostPermission = async (target, password, updateObj, roles, user) => {
  const passwordMatches = password && await target.checkPassword(password);

  const boardRole = roles ? roles[target.boardUri] : null;
  let roleName = '';
  if (boardRole) {
    roleName = boardRole.roleName;
  } else if (passwordMatches) {
    roleName = '__poster';
  }
  const getRelevantPriority = (field, value) => {
    if (user.authority === 'admin') {
      return 10000;
    }
    if (boardRole && passwordMatches) {
      return Math.max(
        getPriorityForUpdatingPostField(field, value, boardRole),
        getPriorityForUpdatingPostFieldByPassword(field, value));
    }
    if (boardRole) {
      return getPriorityForUpdatingPostField(field, value, boardRole);
    }
    if (passwordMatches) {
      return getPriorityForUpdatingPostFieldByPassword(field, value);
    }
    // not mod, no password => GTFO
    return PRIORITY_NO_PASSWORD;
  };
  const updatesArray = _.toPairs(updateObj);
  const weightedUpdates = updatesArray
    .map(([field, value]) => [
      field,
      value,
      _.get(target, ['changes', field]),
      getRelevantPriority(field, value),
    ]);
  const isHigherPriority = (oldPriority, newPriority) => {
    if (_.isNumber(oldPriority)) {
      return _.isNumber(newPriority) && newPriority >= oldPriority;
    }
    return _.isNumber(newPriority) && newPriority > 0;
  };
  const [ validFields, invalidFields ] =
    _.partition(weightedUpdates, ([f, v, oldPriority, newPriority]) => isHigherPriority(oldPriority, newPriority));

  const update = _.fromPairs(
    validFields.map(([key, value, oldPriority, newPriority]) =>
      [key, { value, priority: newPriority, roleName }]));

  const ref = _.omit(target.toReflink(), 'src');
  const denied = invalidFields
    .map(([key, value, oldPriority, newPriority]) =>
      ({
        ref: ref,
        status: 403,
        update: { [key]: value },
        roleName: roleName,
        userPriority: newPriority,
        currentPriority: oldPriority,
        error:
          (new PermissionDeniedError(getReason(oldPriority, newPriority)))
            .toObject(),
      })
    );
  return { target, update, denied };
};


/** @type {Number} User has no write access */
const PRIORITY_NO_ACCESS        = -1;
/** @type {Number} User has no role assigned for this board */
const PRIORITY_NO_ROLE          = -10;
/** @type {Number} Invalid field name */
const PRIORITY_INVALID_FIELD    = -20;
/** @type {Number} User permissions for this action is undefined */
const PRIORITY_EMPTY_PERMISSION = -30;
/** @type {Number} User has no permission to set field to this value */
const PRIORITY_INVALID_VALUE = -40;
/** @type {Number} User is not logged in and post password is incorrect */
const PRIORITY_NO_PASSWORD  = -50;


/**
 * Decode invalid priority code to human-readable message
 * @param  {Number} priority Invalid priority (negative number)
 * @return {String}          Human-readable error message
 */
const getReason = (oldPriority, newPriority) => {
  if (newPriority === PRIORITY_NO_ACCESS) {
    return `User has no write access for this field`;
  }
  if (newPriority === PRIORITY_NO_ROLE) {
    return `User has no role assigned for this board`;
  }
  if (newPriority === PRIORITY_INVALID_FIELD) {
    return `Field is not editable or invalid`;
  }
  if (newPriority === PRIORITY_EMPTY_PERMISSION) {
    return `User permissions for this action is undefined`;
  }
  if (newPriority === PRIORITY_INVALID_VALUE) {
    return `User has no permission to set field to this value`;
  }
  if (newPriority === PRIORITY_NO_PASSWORD) {
    return `User is not logged in and post password is incorrect`;
  }
  if (newPriority < oldPriority) {
    return `User priority ${newPriority} is less than current priority ${oldPriority}`;
  }
  return '';
};


/**
 * Get priority for modifying specific Post field with new value from User
 * role
 * @param  {String} field     Name of Post field that is being modified
 * @param  {Mixed}  value     New value for Post field
 * @param  {Role}   boardRole Mongoose document or plain object implementing
 * RoleSchema
 * @return {Number}           Priority for modifying Post field. Negative
 * values indicate various cases of invalid priority.
 */
const getPriorityForUpdatingPostField = (field, value, boardRole) => {
  if (!boardRole) {
    // user has no role assigned to this board
    return PRIORITY_NO_ROLE;
  }
  let permission = null;
  if (Post.isPostField(field)) {
    permission = boardRole.postPermissions[field];
  } else if (Post.isAttachmentField(field)) {
    field = field.match(/(?<=\.)\w+$/)[0];
    permission = boardRole.attachmentPermissions[field];
  } else {
    // invalid field
    return PRIORITY_INVALID_FIELD;
  }
  if (!permission) {
    // permission is empty
    return PRIORITY_EMPTY_PERMISSION;
  }
  if (permission.access === 'write-value') {
    const condition = permission.values.find((v) => {
      if (_.has(v, 'eq')) {
        return v.eq === value;
      }
      if (_.has(v, 'regexp')) {
        return v.regexp.test(value);
      }
      if (_.has(v, 'min') && _.has(v, 'max')) {
        return v.min <= value && v.max >= value;
      }
      if (_.has(v, 'min')) {
        return v.min <= value;
      }
      if (_.has(v, 'max')) {
        return v.max >= value;
      }
      return false;
    });
    if (condition) {
      return condition.priority;
    }
    return PRIORITY_INVALID_VALUE;
  }
  if (permission.access === 'write-any') {
    return permission.priority;
  }
  // user has no write permission
  return PRIORITY_NO_ACCESS;
};


const getPriorityForUpdatingPostFieldByPassword = (field, value) => {
  const acceptableAccess = ['write-any', 'write-value'];
  const anonRole = {
    roleName: '__poster',
    hierarchy: 0,
    postPermissions: {
      // anonymous can delete their own post, but can't restore it
      // and only admin can restore it
      isDeleted: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 9999 },
        ]
      },
      // anonymous can close their own thread (but only once)
      // and any staff member with permission can un-close it
      isClosed: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 1 },
        ]
      },
      // anonymous can add sage (but only once)
      // and only admin can un-sage it
      // anonymous can remove sage
      // and any staff member with permission can add sage
      isSage: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 9999 },
          { eq: false, priority: 1 },
        ]
      },
    },
    attachmentPermissions: {
      // anonymous can delete attachments in their own post, but can't restore it
      // and only admin can restore it
      isDeleted: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 9999 },
        ]
      },
      // anonymous can set or unset NSFW (but only once)
      // and any staff member with permission can undo it
      isNSFW: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 2 },
          { eq: false, priority: 1 },
        ]
      },
      // anonymous can set or unset spoiler (but only once)
      // and any staff member with permission can undo it
      isSpoiler: {
        access: 'write-value',
        values: [
          { eq: true,  priority: 2 },
          { eq: false, priority: 1 },
        ]
      },
    },
  };
  return getPriorityForUpdatingPostField(field, value, anonRole);
};


/**
 * Middleware that redirects to login page if user is not authenticated.
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
 * not authenticated.
 */
module.exports.apiAuthRequired = (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res
        .status(401)
        .json({
          'error': {
            'msg': `User must be logged in to perform this action`,
            'type': 'AuthRequired'
          }
        });
    }
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Middleware that returns 401 status if user is not authenticated or has no
 * admin rights
 */
module.exports.adminOnly = (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res
        .status(401)
        .json({
          'error': {
            'msg': `User must be logged in to perform this action`,
            'type': 'AuthRequired'
          }
        });
    }
    if (req.user.authority !== 'admin') {
      return res
        .status(403)
        .json({
          'error': {
            'msg': `User don't have rigths to perform this action`,
            'type': 'PermissionDenied'
          }
        });
    }
    next();
  } catch (err) {
    next(err);
  }
};
