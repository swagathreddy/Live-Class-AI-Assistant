import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { transcribeAudio } from '../services/whisperService.js';
import { summarizeText } from '../services/deepseekService.js';
import Session from '../models/Session.js';

const router = express.Router();

router.post('/process/:sessionId', authenticateToken, async (req, res) => {
    const { sessionId } = req.params;
    try {
        const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        const filePath = session.files?.audio?.path || session.files?.video?.path;
        if (!filePath) return res.status(400).json({ error: 'No file found for this session to process.' });

        if (session.status === 'processing') return res.status(400).json({ error: 'Session is already being processed.' });

        session.status = 'processing';
        await session.save();
        
        res.json({ message: 'AI processing has started in the background.' });

        (async () => {
            try {
                console.log(`🤖 Manual AI Pipeline Started for ${sessionId}`);
                const normalizedFilePath = filePath.replace(/\\/g, '/');
                
                const transcriptionResult = await transcribeAudio(normalizedFilePath);
                const summaryResult = await summarizeText(transcriptionResult.text);
                
                await Session.findByIdAndUpdate(sessionId, {
                    $set: {
                        'processing.transcript': { text: transcriptionResult.text, processedAt: new Date() },
                        'processing.summary': { text: summaryResult.summary, keyPoints: summaryResult.keyPoints, assignments: summaryResult.assignments, processedAt: new Date() },
                        status: 'completed'
                    }
                });
                console.log(`✅ AI processing for session ${sessionId} is complete.`);
            } catch (aiError) {
                console.error(`❌ AI Pipeline Failed for session ${sessionId}:`, aiError);
                await Session.findByIdAndUpdate(sessionId, { $set: { status: 'failed' } });
            }
        })();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Q&A route is unchanged
router.post('/qa/:sessionId', authenticateToken, async (req, res) => {
    // ... your existing Q&A logic
});

export default router;