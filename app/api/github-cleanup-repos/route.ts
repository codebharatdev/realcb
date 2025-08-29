import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const { userId, maxAge = 60 * 60 * 1000 } = await request.json(); // Default 1 hour

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: userId'
      }, { status: 400 });
    }

    const { db, firestore } = await getFirebaseForAPI();
    
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

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: userData.githubAccessToken,
    });

    try {
      // Get all repositories for the user
      const reposResponse = await octokit.repos.listForAuthenticatedUser({
        type: 'owner',
        sort: 'created',
        direction: 'desc',
        per_page: 100
      });

      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;

      for (const repo of reposResponse.data) {
        // Only clean up repositories that match our naming pattern and are old enough
        if (repo.name.startsWith('codebharat-dev-app-') && 
            new Date(repo.created_at).getTime() < cutoffTime) {
          
          try {
            console.log(`[github-cleanup-repos] Deleting old repository: ${repo.name}`);
            await octokit.repos.delete({
              owner: userData.githubUsername,
              repo: repo.name,
            });
            cleanedCount++;
            console.log(`[github-cleanup-repos] Successfully deleted: ${repo.name}`);
          } catch (deleteError: any) {
            console.error(`[github-cleanup-repos] Failed to delete ${repo.name}:`, deleteError.message);
          }
        }
      }

      return NextResponse.json({
        success: true,
        cleanedCount,
        message: `Cleaned up ${cleanedCount} old repositories`
      });

    } catch (error: any) {
      console.error('[github-cleanup-repos] Error listing repositories:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to list repositories: ${error.message || 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[github-cleanup-repos] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
