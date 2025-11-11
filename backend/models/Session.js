import mongoose from 'mongoose';
const { Schema } = mongoose;
const sessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  date: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['recording', 'processing', 'completed', 'failed'],
    default: 'recording'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  files: {
    audio: {
      filename: String,
      path: String,
      size: Number,
      mimetype: String
    },
    video: {
      filename: String,
      path: String,
      size: Number,
      mimetype: String
    }
  },
  processing: {
  transcript: {
    text: String,
    confidence: Number,
    language: String,
    processedAt: Date
  },
  summary: {
    text: {
      type: Schema.Types.Mixed,  
      default: []
    },
    keyPoints: [String],
    assignments: [String],
    processedAt: Date
  },
  slides: [{
    text: String,
    timestamp: Number,
    confidence: Number,
    extractedAt: Date
  }],
  embeddings: {
    type: [Number],
    index: false
  }
},
  metadata: {
    audioEnabled: {
      type: Boolean,
      default: true
    },
    screenEnabled: {
      type: Boolean,
      default: false
    },
    recordingQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    platform: String,
    browserInfo: String
  },
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    qaQueries: [{
      query: String,
      response: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ 'processing.transcript.text': 'text' });

// Virtual for formatted duration
sessionSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Pre-save middleware
sessionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    this.processing.processedAt = new Date();
  }
  next();
});

export default mongoose.model('Session', sessionSchema);