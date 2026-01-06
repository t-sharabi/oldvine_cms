const express = require('express');
const router = express.Router();

// Minimal payments router stub to satisfy app.use
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'payments', status: 'ok' });
});

module.exports = router;


