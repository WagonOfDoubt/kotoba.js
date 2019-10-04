const express = require('express');

const Style = require('../../models/style');
const defaultSyles = require('../../json/defaultstyles.json');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();


router.get('/styles/',
  authRequired,
  async (req, res, next) => {
    try {
      const initialValues = Object.assign({},
        defaultSyles.find(o => o.name === 'futaba'));
      initialValues.name = '';
      res.render('manage/styles', {
        activity: 'manage-page-styles',
        initialValues: initialValues,
        title: 'Site styles',
        crud: 'read',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/styles/edit/:stylename',
  authRequired,
  async (req, res, next) => {
    try {
      let style = await Style.findByName(req.params.stylename);
      if (!style) {
        return res.redirect('/manage/styles/');
      }
      const initialValues = Object.assign({},
        defaultSyles.find(o => o.name === 'futaba'));
      initialValues.name = '';
      res.render('manage/styles', {
        activity: 'manage-page-styles',
        style: style,
        initialValues: initialValues,
        title: 'Site styles',
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/styles/create',
  authRequired,
  async (req, res, next) => {
    try {
      const initialValues = Object.assign({},
        defaultSyles.find(o => o.name === 'futaba'));
      initialValues.name = '';
      res.render('manage/styles', {
        activity: 'manage-page-styles',
        initialValues: initialValues,
        title: 'Site styles',
        crud: 'create',
      });
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
