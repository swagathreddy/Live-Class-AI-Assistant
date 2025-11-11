import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, statSync } from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import Session from '../models/Session.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { transcribeAudio } from '../services/whisperService.js';
import { summarizeText } from '../services/deepseekService.js';

ffmpeg.setFfmpegPath(ffmpegStatic);
const router = express.Router();

const authenticateTokenFromQuery = (req, res, next) => {
    if (req.query.token) req.headers.authorization = `Bearer ${req.query.token}`;
    next();
};

const processSeekableVideo = (filePath) => {
  return new Promise((resolve, reject) => {
    const tempPath = `${filePath}-seekable.webm`;
    ffmpeg(filePath).outputOptions('-c', 'copy')
      .on('end', async () => {
        try {
          await fs.unlink(filePath);
          await fs.rename(tempPath, filePath);
          console.log('✅ Video processing successful.');
          resolve();
        } catch (err) { reject(err); }
      }).on('error', (err) => reject(err)).save(tempPath);
  });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', req.user.id);
        fs.mkdir(uploadPath, { recursive: true }).then(() => cb(null, uploadPath));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.post('/video/:sessionId', authenticateToken, upload.single('video'), async (req, res) => {
    const sessionId = req.params.sessionId;
    try {
        if (!req.file) return res.status(400).json({ error: 'No video file provided' });
        await processSeekableVideo(req.file.path);
        
        const session = await Session.findByIdAndUpdate(sessionId, { 
            $set: { 
                'files.video': { filename: req.file.filename, path: req.file.path, size: req.file.size, mimetype: req.file.mimetype }, 
                status: 'processing'
            }}, 
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        req.user.usage.storageUsed += req.file.size;
        await req.user.save();
        
        res.json({ message: 'Video uploaded. AI processing has started.', file: session.files.video });
        
        (async () => {
            try {
                console.log(`🤖 AI Pipeline Started for ${sessionId}`);
                const normalizedFilePath = req.file.path.replace(/\\/g, '/');
                
                const transcriptionResult = await transcribeAudio(normalizedFilePath);
                console.log(`   -> Transcription complete.`);

                const summaryResult = await summarizeText(transcriptionResult.text);
                console.log(`   -> Summarization complete.`);
                
                await Session.findByIdAndUpdate(sessionId, {
                    $set: {
                        'processing.transcript': { text: transcriptionResult.text, processedAt: new Date() },
                        'processing.summary': {
                            text: summaryResult.summary,
                            keyPoints: summaryResult.keyPoints,
                            assignments: summaryResult.assignments,
                            processedAt: new Date()
                        },
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
        await Session.findByIdAndUpdate(sessionId, { $set: { status: 'failed' } });
        if (req.file) { try { await fs.unlink(req.file.path); } catch (e) {} }
    }
});

router.get('/stream/:sessionId/:fileType', authenticateTokenFromQuery, authenticateToken, async (req, res) => {
    try {
        const { sessionId, fileType } = req.params;
        const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
        if (!session || !session.files?.[fileType]) return res.status(404).send('File not found');
        const filePath = session.files[fileType].path;
        const stat = statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const file = createReadStream(filePath, { start, end });
            const head = {'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1, 'Content-Type': 'video/webm'};
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {'Content-Length': fileSize, 'Content-Type': 'video/webm'};
            res.writeHead(200, head);
            createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error("Streaming Error:", error);
        res.status(500).send('Error streaming file');
    }
});

export default router;