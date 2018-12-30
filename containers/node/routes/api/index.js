/**
 * Routes for REST JSON API
 * @module routes/api
 * @see module:routes/api/board
 * @see module:routes/api/news
 * @see module:routes/api/user
 * @see module:routes/api/post
 * @see module:routes/api/settings
 * @see module:routes/api/maintenance
 */

const express = require('express');
const router = express.Router();

router.use(require('./board'));
router.use(require('./maintenance'));
router.use(require('./news'));
router.use(require('./post'));
router.use(require('./role'));
router.use(require('./settings'));
router.use(require('./user'));

/**
 * Express router.
 */
module.exports = router;
