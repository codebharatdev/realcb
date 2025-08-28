#!/usr/bin/env node

/**
 * Admin script to update the active AI model
 * Usage: node scripts/update-model.js <model-name>
 * 
 * Available models:
 * - moonshotai/kimi-k2-instruct
 * - openai/gpt-5
 * - anthropic/claude-sonnet-4-20250514
 * - google/gemini-2.5-pro
 */

const validModels = [
  'moonshotai/kimi-k2-instruct',
  'openai/gpt-5',
  'anthropic/claude-sonnet-4-20250514',
  'google/gemini-2.5-pro'
];

async function updateModel(modelName) {
  if (!validModels.includes(modelName)) {
    console.error('❌ Invalid model. Must be one of:');
    validModels.forEach(model => console.error(`   - ${model}`));
    process.exit(1);
  }

  try {
    console.log(`🔄 Updating active model to: ${modelName}`);
    
    const response = await fetch('http://localhost:3000/api/model-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activeModel: modelName,
        updatedBy: 'admin-script'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Successfully updated model to: ${data.activeModel}`);
    } else {
      console.error(`❌ Failed to update model: ${data.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error updating model:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:3000');
    process.exit(1);
  }
}

// Get model from command line arguments
const modelName = process.argv[2];

if (!modelName) {
  console.log('📝 Usage: node scripts/update-model.js <model-name>');
  console.log('');
  console.log('Available models:');
  validModels.forEach(model => console.log(`   - ${model}`));
  process.exit(1);
}

updateModel(modelName);
