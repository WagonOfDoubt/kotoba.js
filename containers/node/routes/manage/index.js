/**
 * Routes for admin interface
 * @module routes/manage
 * @see module:routes/manage/addboard
 * @see module:routes/manage/boardopts
 * @see module:routes/manage/delboard
 * @see module:routes/manage/maintenance
 * @see module:routes/manage/modlog
 * @see module:routes/manage/news
 * @see module:routes/manage/profile
 * @see module:routes/manage/sitesettings
 * @see module:routes/manage/spaceused
 * @see module:routes/manage/staff
 * @see module:routes/manage/uploads
 */

const express = require('express');
const router = express.Router();
const middlewares = require('../../utils/middlewares');

router.use(middlewares.authRequired);
router.use(middlewares.globalTemplateVariables);
router.use('/manage/', require('./addboard'));
router.use('/manage/', require('./boardopts'));
router.use('/manage/', require('./delboard'));
router.use('/manage/', require('./maintenance'));
router.use('/manage/', require('./modlog'));
router.use('/manage/', require('./news'));
router.use('/manage/', require('./profile'));
router.use('/manage/', require('./roles'));
router.use('/manage/', require('./sitesettings'));
router.use('/manage/', require('./spaceused'));
router.use('/manage/', require('./staff'));
router.use('/manage/', require('./uploads'));

router.get('/manage/',
  async (req, res) => {
    res.render('manage/managepage');
  }
);


/**
 * Express router.
 */
module.exports = router;
