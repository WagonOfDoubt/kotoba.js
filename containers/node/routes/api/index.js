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

const apiBoardRouter = require('./board');
const apiNewsRouter = require('./news');
const apiUserRouter = require('./user');
const apiPostRouter = require('./post');
const apiSettingsRouter = require('./settings');
const apiMaintenanceRouter = require('./maintenance');

const router = express.Router();

router.use(apiBoardRouter);
router.use(apiNewsRouter);
router.use(apiPostRouter);
router.use(apiUserRouter);
router.use(apiSettingsRouter);
router.use(apiMaintenanceRouter);

/**
 * Express router.
 */
module.exports = router;
