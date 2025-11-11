import express from 'express';
import Session from '../models/Session.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateSession } from '../middleware/validation.js';

const router = express.Router();

// Get all sessions for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = { userId: req.user.id };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'processing.transcript.text': { $regex: search, $options: 'i' } }
      ];
    }

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-processing.embeddings -analytics.qaQueries');

    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific session
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update view count and last viewed
    session.analytics.viewCount += 1;
    session.analytics.lastViewed = new Date();
    await session.save();

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/', authenticateToken, validateSession, async (req, res) => {
  try {
    const sessionData = {
      ...req.body,
      userId: req.user.id,
      status: 'recording'
    };

    const session = new Session(sessionData);
    await session.save();

    // Update user usage stats
    req.user.usage.totalSessions += 1;
    await req.user.save();

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // TODO: Delete associated files from storage
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Q&A query to session
router.post('/:id/qa', authenticateToken, async (req, res) => {
  try {
    const { query, response } = req.body;
    
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.analytics.qaQueries.push({
      query,
      response,
      timestamp: new Date()
    });

    await session.save();
    res.json({ message: 'Q&A saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;