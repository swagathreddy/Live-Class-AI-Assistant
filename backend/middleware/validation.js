import { body, validationResult } from 'express-validator';

// Helper function to handle validation errors
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// User registration validation
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  handleValidationErrors
];

// User login validation
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Session creation validation
export const validateSession = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Session name must be between 1 and 200 characters'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer'),
  body('metadata.audioEnabled')
    .optional()
    .isBoolean()
    .withMessage('audioEnabled must be a boolean'),
  body('metadata.screenEnabled')
    .optional()
    .isBoolean()
    .withMessage('screenEnabled must be a boolean'),
  body('metadata.recordingQuality')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('recordingQuality must be low, medium, or high'),
  handleValidationErrors
];

// Q&A validation
export const validateQA = [
  body('question')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question must be between 1 and 500 characters'),
  handleValidationErrors
];

// File upload validation
export function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const allowedMimeTypes = [
    'audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg',
    'video/webm', 'video/mp4', 'video/avi', 'video/mov'
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowedTypes: allowedMimeTypes
    });
  }

  // Check file size (500MB limit)
  const maxSize = 500 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSize: '500MB'
    });
  }

  next();
}