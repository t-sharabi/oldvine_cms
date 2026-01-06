const express = require('express');
const router = express.Router();

// Minimal guests router stub to satisfy app.use
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'guests', status: 'ok' });
});

module.exports = router;


