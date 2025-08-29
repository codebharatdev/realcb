import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const { appId, repoName, commitMessage, userId, files, autoCommit, createOnly, updateExisting, repoDescription } = await request.json();
    
    if (!repoName || !commitMessage || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: repoName, commitMessage, and userId are required'
      }, { status: 400 });
    }

    // For auto-commit, files are provided directly
    // For manual commit, appId is required to fetch files from Firestore
    if (!autoCommit && !appId) {
      return NextResponse.json({
        success: false,
        error: 'appId is required for manual commits'
      }, { status: 400 });
    }

    const { db, firestore } = await getFirebaseForAPI();
    
         if (!db || !firestore) {
       return NextResponse.json({
         success: false,
         error: 'GitHub not connected. Please connect your GitHub account first.'
       }, { status: 401 });
     }
    
    // Get user's GitHub access token from Firestore
    const userRef = firestore.doc(db, 'users', userId);
    const userSnap = await firestore.getDoc(userRef);
    
    if (!userSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userData = userSnap.data();
    
    if (!userData.githubConnected || !userData.githubAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub account not connected. Please connect your GitHub account first.'
      }, { status: 401 });
    }

    let fileEntries: Array<{ path: string; content: string }> = [];
    let appDescription = '';

    if (createOnly) {
      // Just create the repository, don't commit files yet
      fileEntries = [];
      appDescription = repoDescription || `Auto-generated app: ${repoName}`;
    } else if (autoCommit) {
      // For auto-commit, use files provided directly
      if (!files || Object.keys(files).length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No files provided for auto-commit'
        }, { status: 400 });
      }
      
      fileEntries = Object.entries(files).map(([path, content]) => ({
        path,
        content: content as string
      }));
      appDescription = `Auto-generated app: ${repoName}`;
    } else {
             // For manual commit, get the app data from Firestore
       const appRef = firestore.doc(db, 'apps', appId);
       const appSnap = await firestore.getDoc(appRef);
      
      if (!appSnap.exists()) {
        return NextResponse.json({
          success: false,
          error: 'App not found'
        }, { status: 404 });
      }

      const appData = appSnap.data();
      
      // Verify the app belongs to the user
      if (appData.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to app'
        }, { status: 403 });
      }

      const appFiles = appData.files;
      fileEntries = Object.entries(appFiles).map(([path, content]) => ({
        path,
        content: content as string
      }));
      appDescription = appData.description || `Generated app: ${appData.name}`;
    }

    // Initialize GitHub API client with user's access token
    console.log('[github-commit] Initializing Octokit with token:', userData.githubAccessToken ? '***' + userData.githubAccessToken.slice(-4) : 'NO_TOKEN');
    
    const octokit = new Octokit({
      auth: userData.githubAccessToken,
    });

    // Test GitHub authentication first
    try {
      console.log('[github-commit] Testing GitHub authentication...');
      const authTest = await octokit.users.getAuthenticated();
      console.log('[github-commit] GitHub authentication successful:', {
        username: authTest.data.login,
        id: authTest.data.id,
        email: authTest.data.email
      });
    } catch (authError: any) {
      console.error('[github-commit] GitHub authentication failed:', authError);
      return NextResponse.json({
        success: false,
        error: `GitHub authentication failed: ${authError.message || 'Invalid or expired access token'}`
      }, { status: 401 });
    }

    console.log('[github-commit] Starting GitHub operation:', {
      userId,
      repoName,
      createOnly,
      updateExisting,
      autoCommit,
      hasFiles: files ? Object.keys(files).length : 0,
      githubUsername: userData.githubUsername
    });

    try {
      let repoUrl: string;
      let owner: string;
      let repo: string;
      let defaultBranch: string;

      if (updateExisting) {
        // Update existing repository - get user info to construct repo URL
        const userResponse = await octokit.users.getAuthenticated();
        owner = userResponse.data.login;
        repo = repoName;
        
        // Check if repository exists
        try {
          const repoResponse = await octokit.repos.get({ owner, repo });
          repoUrl = repoResponse.data.html_url;
          defaultBranch = repoResponse.data.default_branch;
        } catch (error: any) {
          if (error.status === 404) {
            return NextResponse.json({
              success: false,
              error: 'Repository not found. Please create it first.'
            }, { status: 404 });
          }
          throw error;
        }
      } else {
        // Create new repository
        console.log('[github-commit] Creating new repository:', { repoName, appDescription });
        
        try {
          const createRepoResponse = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            description: appDescription,
            private: false,
            auto_init: false,
          });

          repoUrl = createRepoResponse.data.html_url;
          owner = createRepoResponse.data.owner.login;
          repo = createRepoResponse.data.name;
          defaultBranch = createRepoResponse.data.default_branch;
          
          console.log('[github-commit] Repository created successfully:', { repoUrl, owner, repo, defaultBranch });
        } catch (createError: any) {
          console.error('[github-commit] Repository creation failed:', createError);
          
          if (createError.status === 422) {
            return NextResponse.json({
              success: false,
              error: 'Repository already exists. Please choose a different name.'
            }, { status: 400 });
          }
          
          if (createError.status === 403) {
            return NextResponse.json({
              success: false,
              error: 'Insufficient permissions. Please check your GitHub token has repo permissions.'
            }, { status: 403 });
          }
          
          return NextResponse.json({
            success: false,
            error: `Failed to create repository: ${createError.message || 'Unknown error'}`
          }, { status: 500 });
        }
      }

      // If createOnly flag is set, just return the repository info without committing files
      if (createOnly) {
        return NextResponse.json({
          success: true,
          repoUrl,
          message: 'Repository created successfully',
          filesCount: 0,
          commitMessage,
          owner,
          repo
        });
      }

      // Create files in the repository
      const filePromises = fileEntries.map(async (file) => {
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: file.path,
            message: `Add ${file.path}`,
            content: Buffer.from(file.content).toString('base64'),
            branch: defaultBranch,
          });
        } catch (error) {
          console.error(`Error creating file ${file.path}:`, error);
          throw error;
        }
      });

      // Wait for all files to be created
      await Promise.all(filePromises);

      return NextResponse.json({
        success: true,
        repoUrl,
        message: updateExisting ? 'Files committed successfully' : 'Repository created and files committed successfully',
        filesCount: fileEntries.length,
        commitMessage,
        owner,
        repo
      });
      
    } catch (githubError: any) {
      console.error('[GitHub API Error]:', githubError);
      
      // Handle specific GitHub errors
      if (githubError.status === 422) {
        return NextResponse.json({
          success: false,
          error: 'Repository already exists. Please choose a different name.'
        }, { status: 400 });
      }
      
      if (githubError.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'GitHub authentication failed. Please reconnect your GitHub account.'
        }, { status: 401 });
      }

      return NextResponse.json({
        success: false,
        error: `GitHub API error: ${githubError.message || 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[github-commit] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
