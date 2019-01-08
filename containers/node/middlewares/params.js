const Settings = require('../models/settings');
const pkg = require('../package.json');
const config = require('../config.json');
const filters = require('../utils/filters');

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
