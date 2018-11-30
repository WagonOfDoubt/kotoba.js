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

const formRouter = require('./form');
const authRouter = require('./auth');
const manageRouter = require('./manage');
const previewRouter = require('./preview');
const apiRouter = require('./api');

const router = express.Router();

router.use(formRouter);
router.use(authRouter);
router.use(manageRouter);
router.use(previewRouter);
router.use(apiRouter);

/**
 * Express router.
 */
module.exports = router;
