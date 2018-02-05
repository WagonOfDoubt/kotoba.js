const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator/check');
const multer = require('multer');
const upload = multer();

const { createThread, createReply } = require('../controllers/posting.js');

router.post('/form/post', [
    upload.single('imagefile'),
    body('board').isAlphanumeric(),
    body('replythread').isInt({ min: 0 }),
    body('replythread').toInt(),
    body('email').isEmpty(),
    body('name').isLength({ max: 75 }),
    body('em').normalizeEmail(),
    body('captcha').trim(),
    body('subject').isLength({ max: 75 }),
    body('message').trim(),
    body('postpassword').trim(),
    body('sage').toBoolean(),
    body('noko').toBoolean()
  ],
  async (req, res) => {
    try {
      validationResult(req).throw();
    } catch (validationErrors) {
      res.status(400);
      res.json(validationErrors.mapped());
      return;
    }

    // TODO check ban
    const ip = req.ip;
    // TODO check capthca
    const capthca = req.body.capthca;
    const file = req.file;
    const boardUri = req.body.board;

    const postData = {
      ip: ip,
      boardUri: boardUri,
      name: req.body.name,
      email: req.body.sage ? 'sage' : req.body.em,
      subject: req.body.subject,
      body: req.body.message,
      password: req.body.postpassword,
      isSage: req.body.sage || req.body.em == 'sage'
    };

    const noko = req.body.postredir || req.body.em == 'noko';

    const replythread = req.body.replythread;
    const isNewThread = replythread == 0;
    let threadId = replythread;
    try {
      if (isNewThread) {
        threadId = await createThread(boardUri, postData, file);
      } else {
        await createReply(boardUri, replythread, postData, file);
      }
    } catch (error) {
      if (error.type === 'input_error') {
        res.status(400);
        res.send(error.message);
      }
      console.log(error);
      res.sendStatus(500);
      return;
    }

    const redirectUri = noko
      ? `/${ boardUri }/res/${ threadId }.html`
      : `/${ boardUri }`;
    res.redirect(302, redirectUri);
});

module.exports = router;
