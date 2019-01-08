const express = require('express');

const { createPostHandler, deletePostHandler } = require('./handlers/post');

const router = express.Router();
router.post('/form/post', createPostHandler);
router.post('/form/delpost', deletePostHandler);

module.exports = router;
