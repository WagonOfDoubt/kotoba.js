const _ = require('lodash');
const { createRegExpFromArray, regExpTester } = require('../utils/regexp');


module.exports.postEditPermission = async (req, res, next) => {
  try {
    const { items, postpassword } = req.body;

    // check each operation for permission
    const checkPost = (item) =>
      checkPostPermission(item.target, postpassword, req.user, item.update);
    const checkedPostsResults = await Promise.all(items.map(checkPost));

    const permissionGranted = [];
    const permissionDenied = [];
    const updateItems = [];
    checkedPostsResults.forEach((item) => {
      const ref = item.target.toReflink();
      if (!_.isEmpty(item.denied)) {
        permissionDenied.push({ ref: ref, denied: item.denied });
      }
      if (!_.isEmpty(item.granted)) {
        permissionGranted.push({ ref: ref, granted: item.granted });
      }
      if (!_.isEmpty(item.update)) {
        updateItems.push(_.pick(item, [ 'target', 'update' ]));
      }
    });

    res.locals.permissionGranted = permissionGranted;
    res.locals.permissionDenied = permissionDenied;

    // req.body.items will contain only items that are allowed for updating
    req.body.items = updateItems;

    next();
  } catch (err) {
    next(err);
  }
};


const flags = [
  // threads
  'isSticky', 'isClosed',
  // posts
  'isSage', 'isApproved', 'isDeleted',
  // attachments
  'attachments.$[n].isDeleted', 'attachments.$[n].isNSFW', 'attachments.$[n].isSpoiler'
];


const isEditablePostField = regExpTester(createRegExpFromArray(flags))

const checkPostPermission = async (target, password, user, updateObj) => {
  const updatesArray = _.toPairs(updateObj);
  // TODO: temporary code, allows to do anything for logged in users
  // make proper staff permissions system
  if (user) {
    const [ validFields, invalidFields ] = _.partition(updatesArray, (kv) => isEditablePostField(kv[0]));

    const update = _.fromPairs(validFields);
    const granted = validFields
      .map(([key, value]) => ({ key: key, value: value }));
    const denied = invalidFields
      .map(([key, value]) => ({ key: key, value: value, reason: 'Invalid field name' }));
    return { target, update, granted, denied };
  }

  const passwordMatches = await target.checkPassword(password);

  // user wrote this post and can edit some fields
  if (passwordMatches) {
    // [ key, value ] pairs that can be changed by unauthorized user if
    // they have correct password
    // TODO: make this customisable
    // TODO: currently broken
    const guestPriviliges = [
      // anonymous can delete their own post, but can't restore it
      [ 'isDeleted', true ],
      // anonymous can close their own thread, but once and for all
      [ 'isClosed', true ],
      // anonymous can add or remove sage, if they had mistaken
      [ 'isSage', true ], [ 'isSage', false ],
      // anonymous can delete attachments in their own post, but can't restore it
      [ 'attachments.$[n].isDeleted', true ],
      // anonymous can set or unset NSFW, if they had mistaken
      [ 'attachments.$[n].isNSFW', true ], [ 'attachments.$[n].isNSFW', false ],
      // anonymous can set or unset spoiler, if they had mistaken
      [ 'attachments.$[n].isSpoiler', true ], [ 'attachments.$[n].isSpoiler', false ],
    ];

    const diff = _.differenceWith(updatesArray, guestPriviliges, _.isEqual);
    const grantedArray = _.differenceWith(updatesArray, diff);

    const update = _.fromPairs(grantedUpdate);
    const granted = validFields
      .map(([key, value]) => ({ key: key, value: value }));
    const denied = diff
      .map(([key, value]) => ({ key: key, value: value, reason: `You have no rights to set ${ key } to ${ value }`}));

    return { target, update, granted, denied };
  }

  // not mod, no password => GTFO
  const deniedUpdate = _.toPairs(update)
    .map(([key, value]) => ({ key: key, value: value, reason: 'Incorrect password'}));
  return { target: target, update: {}, granted: {}, denied: deniedUpdate };
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
  const isLoginned = req.isAuthenticated();
  if (!isLoginned) {
    return res
      .status(401)  // 401 Unauthorized
      .json({
        ok: 0,
        errors: [
          {
            name: 'auth_required',
            msg: `You must be logged in to perform this action`
          }
        ]
      });
  }
  next();
};


/**
 * Middleware that returns 401 status if user is not authenticated or has no
 * admin rights
 */
module.exports.adminOnly = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user || req.user.authority !== 'admin') {
    return res
      .status(401)  // 401 Unauthorized
      .json({
        ok: 0,
        errors: [
          {
            name: 'staff_rights_required',
            msg: `You don't have rights to perform this action`
          }
        ]
      });
  }
  next();
};
