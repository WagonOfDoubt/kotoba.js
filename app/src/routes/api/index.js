/**
 * Routes for REST JSON API
 * @module routes/api
 * @see module:routes/api/assets
 * @see module:routes/api/board
 * @see module:routes/api/captcha
 * @see module:routes/api/maintenance
 * @see module:routes/api/news
 * @see module:routes/api/post
 * @see module:routes/api/report
 * @see module:routes/api/settings
 * @see module:routes/api/style
 * @see module:routes/api/user
 */

const express = require('express');
const router = express.Router();

router.use(require('./assets'));
router.use(require('./board'));
router.use(require('./captcha'));
router.use(require('./maintenance'));
router.use(require('./news'));
router.use(require('./post'));
router.use(require('./report'));
router.use(require('./role'));
router.use(require('./settings'));
router.use(require('./style'));
router.use(require('./user'));

/**
 * Express router.
 */
module.exports = router;
