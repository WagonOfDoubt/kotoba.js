const filters = require('../utils/filters');
const config = require('../config.json');
const pkg = require('../package.json');
const Settings = require('../models/settings');
const { validationResult } = require('express-validator/check');
const Post = require('../models/post');


/**
 * Middleware that populates res.locals with variables which are used in most
 * templates.
 */
module.exports.globalTemplateVariables = async (req, res, next) => {
  const s = await Settings.get();
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.site = s;
  res.locals.lang = s.locale;
  res.locals.pkg = pkg;
  res.locals.basedir = config.html_path;
  res.locals.filters = filters;
  res.locals.config = config;
  res.locals.user = req.user && {
    authority: req.user.authority,
    login: req.user.login
  };
  next();
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
 * Middleware that returns 422 status and JSON response with express-validator
 * errors object, if there are any errors.
 */
module.exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};


/**
 * Create middleware that redirects to specific url if express-validator results
 * is not empty.
 * @param {string} redirect - uri to redirect to
 * @returns Middleware function that redirects to said url if validationResult
 * is not empty
 */
module.exports.validateRedirect = (redirect) =>
  (req, res, next) => {
    if (validationResult(req).isEmpty()) {
      next();
    } else {
      return res.redirect(redirect);
    }
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
