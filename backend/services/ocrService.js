import Tesseract from 'tesseract.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export async function extractTextFromVideo(videoFilePath, options = {}) {
  const {
    frameInterval = 30, // Extract frame every 30 seconds
    outputDir = './temp_frames',
    confidence = 0.7
  } = options;

  try {
    // Create temporary directory for frames
    await fs.mkdir(outputDir, { recursive: true });

    // Get video duration
    const duration = await getVideoDuration(videoFilePath);
    const frameCount = Math.floor(duration / frameInterval);
    
    const ocrResults = [];

    // Extract frames at intervals
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * frameInterval;
      const framePath = path.join(outputDir, `frame_${timestamp}.png`);

      try {
        // Extract frame at timestamp
        await extractFrame(videoFilePath, timestamp, framePath);

        // Perform OCR on the frame
        const ocrResult = await performOCR(framePath);

        if (ocrResult.confidence > confidence && ocrResult.text.trim().length > 10) {
          ocrResults.push({
            text: ocrResult.text.trim(),
            timestamp,
            confidence: ocrResult.confidence,
            extractedAt: new Date()
          });
        }

        // Clean up frame file
        await fs.unlink(framePath).catch(() => {});
      } catch (frameError) {
        console.error(`Error processing frame at ${timestamp}s:`, frameError.message);
        continue;
      }
    }

    // Clean up temporary directory
    await fs.rmdir(outputDir, { recursive: true }).catch(() => {});

    // Remove duplicate or very similar text
    const uniqueResults = removeDuplicateText(ocrResults);

    return uniqueResults;
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Clean up on error
    await fs.rmdir(outputDir, { recursive: true }).catch(() => {});
    
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

async function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function performOCR(imagePath) {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    return {
      text: cleanOCRText(text),
      confidence: confidence / 100 // Convert to 0-1 scale
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return {
      text: '',
      confidence: 0
    };
  }
}

function cleanOCRText(text) {
  return text
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s.,!?;:()\-]/g, '') // Remove special characters except common punctuation
    .trim();
}

function removeDuplicateText(ocrResults) {
  const unique = [];
  const seenTexts = new Set();

  for (const result of ocrResults) {
    const normalizedText = result.text.toLowerCase().replace(/\s+/g, ' ');
    
    // Check if we've seen very similar text
    let isDuplicate = false;
    for (const seenText of seenTexts) {
      if (calculateSimilarity(normalizedText, seenText) > 0.8) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(result);
      seenTexts.add(normalizedText);
    }
  }

  return unique;
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Alternative: Extract text from image file directly
export async function extractTextFromImage(imagePath) {
  try {
    const result = await performOCR(imagePath);
    return result;
  } catch (error) {
    throw new Error(`Image OCR failed: ${error.message}`);
  }
}