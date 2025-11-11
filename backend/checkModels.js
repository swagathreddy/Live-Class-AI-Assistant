import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

async function listAllModels() {
  console.log('Asking OpenRouter for the full list of available models...');
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    const models = response.data.data;
    
    console.log('\n--- ALL Models Available to Your API Key ---');

    if (models && models.length > 0) {
        for (const model of models) {
            console.log(`- ${model.id}`);
        }
    } else {
        console.log('No models were returned by the API.');
    }

    console.log('\n------------------------------------------');
    console.log('Please check this list for a suitable transcription model.');

  } catch (error) {
    console.error('Failed to fetch models from OpenRouter.');
    console.error(error.response?.data?.error?.message || error.message);
  }
}

listAllModels();