const express = require('express');
const router = express.Router();

// Minimal gallery router stub to satisfy app.use
router.get('/', (req, res) => {
  res.json({ success: true, images: [] });
});

module.exports = router;


