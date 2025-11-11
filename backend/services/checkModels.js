import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

async function findWhisperModel() {
  console.log('Asking OpenRouter for a list of available models...');
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    const models = response.data.data;

    console.log('\n--- Found Whisper Models ---');
    let found = false;

    for (const model of models) {
      if (model.id.includes('whisper')) {
        console.log(`Model Name: ${model.name}, Model ID: ${model.id}`);
        found = true;
      }
    }

    if (!found) {
        console.log('No models with "whisper" in the ID were found.');
    }
    console.log('\n----------------------------');
    console.log('Please use one of the "Model ID" values above in your whisperService.js file.');

  } catch (error) {
    console.error('Failed to fetch models from OpenRouter.');
    console.error(error.response?.data?.error?.message || error.message);
  }
}

findWhisperModel();