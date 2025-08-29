import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the userId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=missing_params`);
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!githubClientId || !githubClientSecret) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=not_configured`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[GitHub OAuth Error]:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    if (userResponse.status !== 200) {
      console.error('[GitHub User API Error]:', userData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=user_fetch_failed`);
    }

         const { db, firestore } = await getFirebaseForAPI();
     
     if (!db || !firestore) {
       return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=not_configured`);
     }
     
     // Store the GitHub access token and user info in Firestore
     const userRef = firestore.doc(db, 'users', state);
     await firestore.setDoc(userRef, {
      githubAccessToken: accessToken,
      githubUsername: userData.login,
      githubUserId: userData.id,
      githubConnected: true,
      githubConnectedAt: new Date(),
    }, { merge: true });

    // Redirect back to the app with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_connected=true&username=${userData.login}`);
    
  } catch (error) {
    console.error('[github-callback] Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?github_error=callback_failed`);
  }
}
