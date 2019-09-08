const Settings = require('../models/settings');
const Style = require('../models/style');
const pkg = require('../package.json');
const config = require('../json/config.json');
const filters = require('../utils/filters');

/**
 * Middleware that populates res.locals with variables which are used in most
 * templates.
 */
module.exports.globalTemplateVariables = async (req, res, next) => {
  const s = await Settings.get();
  const styles = await Style.findAll();
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.site = s;
  res.locals.styles = styles;
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
