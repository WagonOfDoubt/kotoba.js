const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const Settings = require('../../models/settings');
const ModlogEntry = require('../../models/modlog');
const middlewares = require('../../utils/middlewares');
const { generateMainPage } = require('../../controllers/generate');

// get settings
router.get('/api/settings',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const settings = await Settings.get();
      res.json(settings);
    } catch (err) {
      return next(err);
    }
  }
);


// modify settings
router.patch(
  '/api/settings',
  [
    body('data', 'Request body is empty').exists(),
    body('regenerate').toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const { data, regenerate } = req.body;
      const settings = await Settings.get();

      const changes = ModlogEntry.diff('Settings', settings._id, settings.toObject(), data);
      if (!changes.length) {
        throw new Error('Nothing to change');
      }
      const status = await Settings.set(data);
      await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: regenerate,
      });

      if (regenerate) {
        await generateMainPage();
      }
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
