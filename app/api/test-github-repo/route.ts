import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json();
    
    if (!repoUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing repoUrl parameter'
      }, { status: 400 });
    }

    // Extract username and repo name from URL
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const username = urlParts[0];
    const repoName = urlParts[1];

    console.log('[test-github-repo] Testing repository:', { username, repoName, repoUrl });

    // For now, just return basic info
    return NextResponse.json({
      success: true,
      username,
      repoName,
      repoUrl,
      message: 'Repository URL parsed successfully'
    });

  } catch (error) {
    console.error('[test-github-repo] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
