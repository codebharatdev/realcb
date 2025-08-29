import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';
import { Octokit } from '@octokit/rest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoName = searchParams.get('repoName');
    const userId = searchParams.get('userId');

    if (!repoName || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: repoName and userId'
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
      // Check if repository exists by trying to get it
      await octokit.repos.get({
        owner: userData.githubUsername,
        repo: repoName,
      });

      // If we get here, the repository exists
      return NextResponse.json({
        success: true,
        exists: true,
        message: `Repository ${repoName} already exists`
      });

    } catch (error: any) {
      if (error.status === 404) {
        // Repository doesn't exist
        return NextResponse.json({
          success: true,
          exists: false,
          message: `Repository ${repoName} does not exist`
        });
      } else {
        // Other error (permissions, network, etc.)
        console.error('[github-check-repo] Error checking repository:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to check repository: ${error.message || 'Unknown error'}`
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('[github-check-repo] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
