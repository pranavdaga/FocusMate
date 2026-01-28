/**
 * Room Model
 * Defines the schema for collaboration rooms with timer state
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true,
        maxlength: [50, 'Room name cannot exceed 50 characters']
    },
    roomId: {
        type: String,
        required: true,
        unique: true,
        // Short, readable room codes (e.g., "ABC123")
        default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Track current participants (updated via Socket.io)
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Timer state - synchronized across all users
    timerState: {
        isRunning: { type: Boolean, default: false },
        timeRemaining: { type: Number, default: 25 * 60 }, // 25 minutes in seconds
        isBreak: { type: Boolean, default: false },
        startedAt: { type: Date, default: null },
        // Work/break durations in seconds
        workDuration: { type: Number, default: 25 * 60 },
        breakDuration: { type: Number, default: 5 * 60 }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster lookups
roomSchema.index({ roomId: 1 });
roomSchema.index({ host: 1 });

module.exports = mongoose.model('Room', roomSchema);
