const express = require('express');
const dirSizes = require('../../utils/dirstats');
const config = require('../../config.json');

const router = express.Router();

router.get('/spaceused',
  async (req, res, next) => {
    try {
      const dirStats = await dirSizes(config.html_path);
      const dirTotals = dirStats.reduce((acc, dir) => {
        dir.children.forEach((val, i) => {
          acc[i] = acc[i] || { files: 0, size: 0 };
          acc[i].files += val.files;
          acc[i].size += val.size;
        });
        return acc;
      }, []);
      res.render('manage/spaceused', {
        activity: 'manage-page-spaceused',
        dirStats: dirStats,
        dirTotals: dirTotals,
        title: 'Disk Space Used'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
