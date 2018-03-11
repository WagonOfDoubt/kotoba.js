const express = require('express');
const router = express.Router();

const filters = require('../utils/filters');
const config = require('../config.json');
const pkg = require('../package.json');
const Settings = require('../models/settings');
const { validationResult } = require('express-validator/check');


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


module.exports.authRequired = (req, res, next) => {
  const isLoginned = req.isAuthenticated();
  if (!isLoginned) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect('/manage/login');
  }
  next();
};


module.exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.mapped() });
  }
  next();
};


module.exports.validateRedirect = (redirect) =>
  (req, res, next) => {
    if (validationResult(req).isEmpty()) {
      next();
    } else {
      return res.redirect(redirect);
    }
  };


module.exports.adminOnly = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user || req.user.authority !== 'admin') {
    return res
      .status(401)  // 401 Unauthorized
      .json({
        ok: 0,
        errors: {
          'staff_rights_required': {
            msg: `You don't have rights to perform this action`
          }
        }
      });
  }
  next();
};

