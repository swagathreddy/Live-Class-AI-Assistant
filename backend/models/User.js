import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  profile: {
    avatar: String,
    institution: String,
    grade: String,
    subjects: [String]
  },
  preferences: {
    defaultRecordingQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    autoTranscribe: {
      type: Boolean,
      default: true
    },
    autoSummarize: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  usage: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0
    },
    lastActive: Date
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    expiresAt: Date,
    features: {
      maxSessionDuration: {
        type: Number,
        default: 7200 // 2 hours for free plan
      },
      maxStorageGB: {
        type: Number,
        default: 1 // 1GB for free plan
      },
      aiQueriesPerMonth: {
        type: Number,
        default: 100
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update last active
userSchema.methods.updateLastActive = function() {
  this.usage.lastActive = new Date();
  this.lastLogin = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);