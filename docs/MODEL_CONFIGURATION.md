# AI Model Configuration

This document explains how to configure and manage the active AI model in CodeBharat.dev.

## Overview

CodeBharat.dev now uses a centralized model configuration system where only one AI model is active at a time. The model is managed through the backend and stored in the database.

## Available Models

- `moonshotai/kimi-k2-instruct` (Default)
- `openai/gpt-5`
- `anthropic/claude-sonnet-4-20250514`
- `google/gemini-2.5-pro`

## Configuration Methods

### 1. Environment Variable (Recommended for Production)

Set the default model in your environment variables:

```bash
# .env
DEFAULT_AI_MODEL=moonshotai/kimi-k2-instruct
```

### 2. Database Configuration (Dynamic Updates)

The model configuration is stored in Firestore under the `config/ai-model` document:

```json
{
  "activeModel": "moonshotai/kimi-k2-instruct",
  "updatedAt": "2024-01-15T10:30:00Z",
  "updatedBy": "admin"
}
```

### 3. Admin Panel (Web Interface)

Access the admin panel at `/admin` to manage the model configuration through a web interface.

### 4. Command Line Script

Use the provided script to update the model:

```bash
# Make sure the development server is running
node scripts/update-model.js moonshotai/kimi-k2-instruct
```

## API Endpoints

### GET /api/model-config

Retrieves the current model configuration:

```json
{
  "success": true,
  "activeModel": "moonshotai/kimi-k2-instruct",
  "availableModels": [
    "moonshotai/kimi-k2-instruct",
    "openai/gpt-5",
    "anthropic/claude-sonnet-4-20250514",
    "google/gemini-2.5-pro"
  ]
}
```

### POST /api/model-config

Updates the active model:

```json
{
  "activeModel": "openai/gpt-5",
  "updatedBy": "admin"
}
```

Response:
```json
{
  "success": true,
  "message": "Model updated to openai/gpt-5",
  "activeModel": "openai/gpt-5"
}
```

## Frontend Changes

The frontend has been updated to:

1. **Remove model selection dropdown** - No longer shows in the header
2. **Remove control buttons** - Plus, refresh, and download buttons removed
3. **Fetch model from backend** - Automatically gets the active model on page load
4. **Use single model** - All code generation uses the configured model

## Migration from Old System

The old system with multiple model selection has been replaced with:

- ✅ Single active model
- ✅ Backend configuration
- ✅ Database storage
- ✅ Admin panel
- ✅ Command line tools
- ✅ Environment variable fallback

## Benefits

1. **Simplified UI** - Cleaner interface without model selection
2. **Centralized Control** - Model changes affect all users
3. **Easy Management** - Multiple ways to update the model
4. **Consistent Experience** - All users use the same model
5. **Cost Control** - Easy to switch between models based on usage/cost

## Troubleshooting

### Model not updating

1. Check if the development server is running
2. Verify the API endpoint is accessible
3. Check Firestore permissions
4. Review console logs for errors

### Default model not working

1. Verify the `DEFAULT_AI_MODEL` environment variable
2. Check if the model name is valid
3. Ensure the model is in the `availableModels` list

### Admin panel not accessible

1. Navigate to `/admin` in your browser
2. Check if the route is properly configured
3. Verify component imports are correct
