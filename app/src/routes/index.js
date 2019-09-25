/**
 * Main router for the app that contains all routes
 * @module routes
 * @see module:routes/api
 * @see module:routes/auth
 * @see module:routes/form
 * @see module:routes/manage
 * @see module:routes/preview
 */

const express = require('express');
const router = express.Router();
const config = require('../json/config.json');
const { globalTemplateVariables } = require('../middlewares/params');

router.use(globalTemplateVariables);
router.use(require('./api'));
router.use(require('./auth'));
router.use(require('./form'));
router.use(require('./manage'));
router.use(require('./preview'));

// website root should lead to static index.html file, this in general should be
// handled by reverse proxy
router.get('/', (req, res) => res.sendFile('index.html', {
  root: config.html_path,
}));

/**
 * Express router.
 */
module.exports = router;
