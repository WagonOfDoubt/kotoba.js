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

router.use(require('./form'));
router.use(require('./auth'));
router.use(require('./manage'));
router.use(require('./preview'));
router.use(require('./api'));

/**
 * Express router.
 */
module.exports = router;
