# Live Class AI Assistant - Backend

A comprehensive MERN stack backend for the Live Class AI Assistant that provides audio transcription, AI summarization, OCR processing, and Q&A functionality.

## Features

- 🎙️ **Audio Processing**: Upload and transcribe audio files using Whisper
- 📝 **AI Summarization**: Generate summaries and extract key points using DeepSeek
- 🖼️ **OCR Processing**: Extract text from video frames using Tesseract
- 💬 **Q&A System**: Answer questions about class content using AI
- 👤 **User Management**: Complete authentication and user profiles
- 📊 **Session Management**: Track and manage class recording sessions
- 🔒 **Security**: JWT authentication, rate limiting, input validation

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens
- **File Upload**: Multer with GridFS
- **AI Services**: 
  - OpenRouter (DeepSeek) for summarization and Q&A
  - Hugging Face (Whisper) for transcription
  - Tesseract.js for OCR
- **Media Processing**: FFmpeg for video frame extraction

## Installation

1. **Clone and install dependencies**:
```bash
cd backend
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/live-class-ai
OPENROUTER_API_KEY=your_openrouter_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
JWT_SECRET=your_super_secret_jwt_key
```

3. **Start MongoDB** (if running locally):
```bash
mongod
```

4. **Run the server**:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user
- `DELETE /api/auth/account` - Delete account

### Sessions
- `GET /api/sessions` - Get user's sessions
- `GET /api/sessions/:id` - Get specific session
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/qa` - Add Q&A to session

### File Upload
- `POST /api/upload/audio/:sessionId` - Upload audio file
- `POST /api/upload/video/:sessionId` - Upload video file
- `GET /api/upload/download/:sessionId/:fileType` - Download file
- `DELETE /api/upload/:sessionId/:fileType` - Delete file

### AI Processing
- `POST /api/ai/transcribe/:sessionId` - Transcribe audio
- `POST /api/ai/summarize/:sessionId` - Generate summary
- `POST /api/ai/ocr/:sessionId` - Extract text from video
- `POST /api/ai/process/:sessionId` - Process complete session
- `POST /api/ai/qa/:sessionId` - Ask question about session

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key for DeepSeek | Yes |
| `HUGGINGFACE_API_KEY` | Hugging Face API key for Whisper | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `MAX_FILE_SIZE` | Max upload file size in bytes | No (default: 500MB) |
| `UPLOAD_PATH` | File upload directory | No (default: ./uploads) |

## Getting API Keys

### OpenRouter (DeepSeek)
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up and get your API key
3. Add credits to your account
4. Use model: `deepseek/deepseek-chat`

### Hugging Face (Whisper)
1. Visit [Hugging Face](https://huggingface.co/)
2. Create account and get API token
3. Go to Settings → Access Tokens
4. Create new token with read permissions

## File Structure

```
backend/
├── models/           # MongoDB schemas
├── routes/           # API route handlers
├── services/         # External service integrations
├── middleware/       # Custom middleware
├── utils/           # Utility functions
├── uploads/         # File upload directory
├── server.js        # Main server file
└── package.json     # Dependencies
```

## Usage Examples

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123",
    "name": "John Doe"
  }'
```

### 2. Create Session
```bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Physics - Newton Laws",
    "metadata": {
      "audioEnabled": true,
      "screenEnabled": true
    }
  }'
```

### 3. Upload Audio
```bash
curl -X POST http://localhost:5000/api/upload/audio/SESSION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.webm"
```

### 4. Process Session
```bash
curl -X POST http://localhost:5000/api/ai/process/SESSION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Ask Question
```bash
curl -X POST http://localhost:5000/api/ai/qa/SESSION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What did the teacher say about Newton'\''s third law?"
  }'
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Additional error details"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- AI Processing: 20 requests per hour
- File Upload: 10 uploads per hour

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- File type and size validation
- CORS configuration
- Error message sanitization

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Database Seeding
```bash
npm run seed
```

## Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "live-class-ai"
```

### Using Docker
```bash
docker build -t live-class-ai-backend .
docker run -p 5000:5000 live-class-ai-backend
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details