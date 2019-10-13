/**
 * Routes for admin interface
 * @module routes/manage
 * @see module:routes/manage/assets
 * @see module:routes/manage/boards
 * @see module:routes/manage/maintenance
 * @see module:routes/manage/modlog
 * @see module:routes/manage/news
 * @see module:routes/manage/posts
 * @see module:routes/manage/profile
 * @see module:routes/manage/reports
 * @see module:routes/manage/sitesettings
 * @see module:routes/manage/spaceused
 * @see module:routes/manage/staff
 * @see module:routes/manage/styles
 * @see module:routes/manage/trash
 * @see module:routes/manage/uploads
 */

const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();
const {Post} = require('../../models/post');
const Board = require('../../models/board');
const du = require('du');
const config = require('../../json/config.json');
const { authRequired } = require('../../middlewares/permission');


router.use('/manage/', require('./assets'));
router.use('/manage/', require('./boards'));
router.use('/manage/', require('./maintenance'));
router.use('/manage/', require('./modlog'));
router.use('/manage/', require('./news'));
router.use('/manage/', require('./posts'));
router.use('/manage/', require('./profile'));
router.use('/manage/', require('./reports'));
router.use('/manage/', require('./roles'));
router.use('/manage/', require('./sitesettings'));
router.use('/manage/', require('./spaceused'));
router.use('/manage/', require('./staff'));
router.use('/manage/', require('./styles'));
router.use('/manage/', require('./trash'));
router.use('/manage/', require('./uploads'));

router.get('/manage/',
  authRequired,
  async (req, res, next) => {
    try {
      const promisify = (fn) =>
        new Promise((resolve, reject) =>
          fn((err, data) => err ? reject(err) : resolve(data)));

      const [
        formats, codecs, encoders, filters, postcount, boardcount, spaceused
        ] = await Promise.all([
          promisify(ffmpeg.getAvailableFormats),
          promisify(ffmpeg.getAvailableCodecs),
          promisify(ffmpeg.getAvailableEncoders),
          promisify(ffmpeg.getAvailableFilters),
          Post.estimatedDocumentCount(),
          Board.estimatedDocumentCount(),
          new Promise((resolve, reject) => {
            du(config.html_path, (err, size) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(size);
            });
          }),
        ]);

      const ffmpegPath = process.env.FFMPEG_PATH;
      const ffprobePath = process.env.FFPROBE_PATH;
      const ffmpegData = {formats, codecs, encoders, filters, ffmpegPath, ffprobePath};

      res.render('manage/managepage', {
        kot_routes: req.app.get('kot_routes'),
        kot_mongo_version: req.app.get('kot_mongo_version'),
        kot_mongoose_version: req.app.get('kot_mongoose_version'),
        kot_sharp_versions: req.app.get('kot_sharp_versions'),
        postcount: postcount,
        boardcount: boardcount,
        spaceused: spaceused,
        ffmpegData: ffmpegData,
      });
    } catch (err) {
      next(err);
    }
  }
);


/**
 * Express router.
 */
module.exports = router;
