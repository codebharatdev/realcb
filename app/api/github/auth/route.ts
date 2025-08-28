import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('[github-auth] Request received for userId:', userId);
    
    if (!userId) {
      console.error('[github-auth] Missing userId');
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`;

    console.log('[github-auth] Environment variables:');
    console.log('- GITHUB_CLIENT_ID:', githubClientId ? 'SET' : 'NOT SET');
    console.log('- NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('- Redirect URI:', redirectUri);

    if (!githubClientId) {
      console.error('[github-auth] GitHub OAuth not configured - missing GITHUB_CLIENT_ID');
      return NextResponse.json({
        success: false,
        error: 'GitHub OAuth not configured'
      }, { status: 500 });
    }

    // Create GitHub OAuth URL with full repository permissions
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,workflow&state=${userId}`;

    console.log('[github-auth] Generated OAuth URL:', githubAuthUrl);

    return NextResponse.json({
      success: true,
      authUrl: githubAuthUrl
    });
    
  } catch (error) {
    console.error('[github-auth] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
