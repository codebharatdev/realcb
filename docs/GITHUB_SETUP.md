# GitHub Integration Setup Guide

This guide will help you set up GitHub integration for committing generated apps to GitHub repositories.

## Prerequisites

1. A GitHub account
2. A GitHub Personal Access Token with repository permissions

## Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "CodeBharat.dev App Generator")
4. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again!

## Step 2: Configure Environment Variables

1. Open your `.env` file in the project root
2. Add the following variables:

```env
# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username_here
```

Replace:
- `your_github_token_here` with the token you copied in Step 1
- `your_github_username_here` with your GitHub username

## Step 3: Restart Your Development Server

After updating the `.env` file, restart your development server:

```bash
npm run dev
```

## Step 4: Verify Connection

1. Open your app in the browser
2. Log in to your account
3. Go to "My Apps" and try to commit an app to GitHub
4. You should see "✓ GitHub Connected" in the commit modal

## How It Works

### Repository Creation
- Creates a new public repository under your GitHub account
- Uses the app name and description for the repository
- Sets up the default branch (usually `main`)

### File Upload
- Converts all app files to base64 encoding
- Uploads each file individually to the repository
- Creates a commit with all the files

### Error Handling
- Handles repository name conflicts
- Validates GitHub authentication
- Provides clear error messages

## Security Notes

- **Never commit your `.env` file** to version control
- **Keep your token secure** - it has full repository access
- **Rotate tokens regularly** for better security
- **Use environment-specific tokens** for production

## Troubleshooting

### "GitHub credentials not configured"
- Check that both `GITHUB_PERSONAL_ACCESS_TOKEN` and `GITHUB_USERNAME` are set in `.env`
- Restart your development server after updating `.env`

### "GitHub authentication failed"
- Verify your token is correct and not expired
- Ensure the token has the required `repo` scope
- Check that your GitHub username is correct

### "Repository already exists"
- Choose a different repository name
- GitHub repository names must be unique within your account

### "GitHub API error"
- Check your internet connection
- Verify GitHub's API status at https://www.githubstatus.com/
- Try again in a few minutes

## API Endpoints

### `/api/github-status`
- **GET**: Check GitHub connection status
- Returns: `{ connected: boolean, username?: string, error?: string }`

### `/api/github-commit`
- **POST**: Commit app to GitHub
- Body: `{ appId: string, repoName: string, commitMessage: string, userId: string }`
- Returns: `{ success: boolean, repoUrl?: string, error?: string }`

## Example Usage

```javascript
// Check GitHub connection
const statusResponse = await fetch('/api/github-status');
const status = await statusResponse.json();

if (status.connected) {
  // Commit app to GitHub
  const commitResponse = await fetch('/api/github-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: 'app123',
      repoName: 'my-awesome-app',
      commitMessage: 'Initial commit: My awesome app',
      userId: 'user123'
    })
  });
  
  const result = await commitResponse.json();
  console.log('Repository URL:', result.repoUrl);
}
```

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your GitHub token permissions
3. Ensure your `.env` file is properly configured
4. Restart your development server

For additional help, check the GitHub API documentation: https://docs.github.com/en/rest
