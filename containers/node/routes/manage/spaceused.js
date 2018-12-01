const express = require('express');
const dirSizes = require('../../utils/dirstats');
const config = require('../../config.json');

const router = express.Router();

router.get('/spaceused',
  async (req, res) => {
    const dirStats = await dirSizes(config.html_path);
    res.render('manage/spaceused', {
      activity: 'manage-page-spaceused',
      dirStats: dirStats,
      title: 'Disk Space Used'
    });
  }
);

module.exports = router;
