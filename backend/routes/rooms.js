/**
 * Room Routes
 * Handles room CRUD operations
 */

const express = require('express');
const router = express.Router();
const { createRoom, getRooms, getRoom, joinRoom } = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Room routes
router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);

module.exports = router;
