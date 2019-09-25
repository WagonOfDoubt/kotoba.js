const express = require('express');

const Style = require('../../models/style');
const defaultSyles = require('../../json/defaultstyles.json');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/styles/:stylename?',
  authRequired,
  async (req, res, next) => {
    try {
      const styles = await Style.findAll();
      let style = null;
      if (req.params.stylename) {
        style = await Style.findByName(req.params.stylename);
        if (!style) {
          return res.redirect('/manage/styles/');
        }
      }
      const initialValues = Object.assign({},
        defaultSyles.find(o => o.name === 'futaba'));
      initialValues.name = '';
      res.render('manage/styles', {
        activity: 'manage-page-styles',
        styles: styles,
        style: style,
        initialValues: initialValues,
        title: 'Site styles',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
