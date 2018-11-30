const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const Settings = require('../../models/settings');
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
      const result = await Settings.set(req.body.data);
      const regenerate = req.body.regenerate;
      if (regenerate) {
        await generateMainPage();
      }
      res.json(result);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
