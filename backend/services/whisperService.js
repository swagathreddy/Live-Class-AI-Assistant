// backend/services/whisperService.js
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ASSEMBLYAI_API_KEY) {
  throw new Error('❌ AssemblyAI API key is missing. Please add it to your .env file.');
}

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function transcribeAudio(audioFilePath) {
  try {
    console.log('   -> Uploading file to AssemblyAI...');

    // Step 1: Upload the file (this returns the upload URL string, not an object)
    const fileStream = fs.createReadStream(audioFilePath);
    const uploadUrl = await client.files.upload(fileStream);

    console.log('   -> File uploaded! Creating transcript...');

    // Step 2: Create transcript using the uploaded file URL
    const transcript = await client.transcripts.create({
      audio_url: uploadUrl,
    });

    // Step 3: Poll until transcript completes
    let completedTranscript;
    while (true) {
      completedTranscript = await client.transcripts.get(transcript.id);

      if (completedTranscript.status === 'completed') {
        console.log('   -> Transcription complete!');
        break;
      } else if (completedTranscript.status === 'error') {
        throw new Error(`❌ AssemblyAI transcription failed: ${completedTranscript.error}`);
      } else {
        console.log(`   -> Transcription in progress... (status: ${completedTranscript.status})`);
        await new Promise((res) => setTimeout(res, 5000)); // wait 5 sec before polling again
      }
    }

    return {
      text: completedTranscript.text || 'No text was transcribed.',
    };
  } catch (error) {
    console.error('❌ AssemblyAI service error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
