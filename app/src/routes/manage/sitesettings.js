const express = require('express');
const Settings = require('../../models/settings');
const locales = require('../../json/locales');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/sitesettings',
  authRequired,
  async (req, res, next) => {
    try {
      const settings = await Settings.get();
      res.render('manage/sitesettings', {
        activity: 'manage-page-sitesettings',
        sitesettings: settings.toObject({ minimized: false }),
        defaults: Settings.defaults(),
        title: 'Site settings',
        locales: locales,
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
