import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';
import { Octokit } from '@octokit/rest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId parameter'
      }, { status: 400 });
    }

    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
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
        error: 'GitHub account not connected'
      }, { status: 401 });
    }

    console.log('[test-github] Testing GitHub connectivity for user:', userId);
    console.log('[test-github] Token available:', !!userData.githubAccessToken);
    console.log('[test-github] GitHub username:', userData.githubUsername);

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: userData.githubAccessToken,
    });

    // Test authentication
    try {
      const authTest = await octokit.users.getAuthenticated();
      console.log('[test-github] Authentication successful:', {
        username: authTest.data.login,
        id: authTest.data.id,
        email: authTest.data.email
      });

      // Test repository creation permissions
      try {
        const testRepoName = `test-repo-${Date.now()}`;
        console.log('[test-github] Testing repository creation with name:', testRepoName);
        
        const createTestRepo = await octokit.repos.createForAuthenticatedUser({
          name: testRepoName,
          description: 'Test repository for CodeBharat.dev',
          private: true, // Make it private for testing
          auto_init: true,
        });

        console.log('[test-github] Test repository created successfully:', createTestRepo.data.html_url);

        // Delete the test repository
        await octokit.repos.delete({
          owner: authTest.data.login,
          repo: testRepoName,
        });

        console.log('[test-github] Test repository deleted successfully');

        return NextResponse.json({
          success: true,
          message: 'GitHub connectivity test successful',
          user: {
            username: authTest.data.login,
            id: authTest.data.id,
            email: authTest.data.email
          },
          permissions: {
            canCreateRepos: true,
            canDeleteRepos: true
          }
        });

      } catch (repoError: any) {
        console.error('[test-github] Repository creation test failed:', repoError);
        
        return NextResponse.json({
          success: false,
          error: `Repository creation test failed: ${repoError.message}`,
          auth: {
            username: authTest.data.login,
            id: authTest.data.id,
            email: authTest.data.email
          },
          permissions: {
            canCreateRepos: false,
            error: repoError.message
          }
        }, { status: 500 });
      }

    } catch (authError: any) {
      console.error('[test-github] Authentication failed:', authError);
      
      return NextResponse.json({
        success: false,
        error: `GitHub authentication failed: ${authError.message}`,
        details: {
          status: authError.status,
          message: authError.message
        }
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[test-github] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
