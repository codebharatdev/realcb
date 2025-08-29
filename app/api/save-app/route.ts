import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function POST(request: NextRequest) {
  try {
    const { action, appData } = await request.json();
    
    if (action === 'save') {
      const { 
        userId, 
        name, 
        description, 
        files, 
        sandboxId, 
        previewUrl, 
        tags = [],
        githubRepo,
        githubRepoUrl,
        prompt,
        chatHistory,
        creditsConsumed
      } = appData;
      
      if (!userId || !name) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: userId and name are required'
        }, { status: 400 });
      }
      
             const { db, firestore } = getFirebaseForAPI();
       
       if (!db || !firestore) {
         return NextResponse.json({
           success: false,
           error: 'Firebase not configured'
         }, { status: 500 });
       }
       
       // Save app to Firestore
       const appDoc = await firestore.addDoc(firestore.collection(db, 'apps'), {
        userId,
        name,
        description: description || '',
        files: files || {},
        sandboxId: sandboxId || '',
        previewUrl: previewUrl || '',
        tags,
        githubRepo: githubRepo || '',
        githubRepoUrl: githubRepoUrl || '',
        prompt: prompt || '',
        chatHistory: chatHistory || [],
        creditsConsumed: creditsConsumed || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: false
      });
      
      return NextResponse.json({
        success: true,
        appId: appDoc.id,
        message: 'App saved successfully'
      });
      
    } else if (action === 'update') {
      const { appId, updates } = appData;
      
      if (!appId) {
        return NextResponse.json({
          success: false,
          error: 'App ID is required for updates'
        }, { status: 400 });
      }
      
             const { db, firestore } = getFirebaseForAPI();
       
       if (!db || !firestore) {
         return NextResponse.json({
           success: false,
           error: 'Firebase not configured'
         }, { status: 500 });
       }
       
       // Update app in Firestore
       const appRef = firestore.doc(db, 'apps', appId);
       await firestore.updateDoc(appRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return NextResponse.json({
        success: true,
        message: 'App updated successfully'
      });
      
    } else if (action === 'delete') {
      const { appId } = appData;
      
      if (!appId) {
        return NextResponse.json({
          success: false,
          error: 'App ID is required for deletion'
        }, { status: 400 });
      }
      
             const { db, firestore } = getFirebaseForAPI();
       
       if (!db || !firestore) {
         return NextResponse.json({
           success: false,
           error: 'Firebase not configured'
         }, { status: 500 });
       }
       
       // Delete app from Firestore
       const appRef = firestore.doc(db, 'apps', appId);
       await firestore.deleteDoc(appRef);
      
      return NextResponse.json({
        success: true,
        message: 'App deleted successfully'
      });
      
    } else if (action === 'disconnect-github') {
      const { userId } = appData;
      
      if (!userId) {
        return NextResponse.json({
          success: false,
          error: 'User ID is required for GitHub disconnection'
        }, { status: 400 });
      }
      
             try {
         const { db, firestore } = getFirebaseForAPI();
         
         if (!db || !firestore) {
           return NextResponse.json({
             success: false,
             error: 'Firebase not configured'
           }, { status: 500 });
         }
         
         // Remove GitHub connection from user's document
         const userRef = firestore.doc(db, 'users', userId);
         const userDoc = await firestore.getDoc(userRef);
        
                 if (!userDoc.exists()) {
           // If user document doesn't exist, create it with disconnected state
           await firestore.setDoc(userRef, {
            githubAccessToken: null,
            githubUsername: null,
            githubUserId: null,
            githubConnected: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
                 } else {
           // Update existing user document
           await firestore.updateDoc(userRef, {
            githubAccessToken: null,
            githubUsername: null,
            githubUserId: null,
            githubConnected: false,
            updatedAt: new Date()
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'GitHub disconnected successfully'
        });
      } catch (error) {
        console.error('[disconnect-github] Error:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to disconnect GitHub: ' + (error as Error).message
        }, { status: 500 });
      }
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: save, update, delete, or disconnect-github'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[save-app] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const appId = searchParams.get('appId');
    
         const { db, firestore } = getFirebaseForAPI();
     
     if (!db || !firestore) {
       return NextResponse.json({
         success: true,
         apps: []
       });
     }
     
     if (appId) {
       // Get specific app
       const appRef = firestore.doc(db, 'apps', appId);
       const appSnap = await firestore.getDoc(appRef);
      
      if (!appSnap.exists()) {
        return NextResponse.json({
          success: false,
          error: 'App not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        app: { id: appSnap.id, ...appSnap.data() }
      });
      
                   } else if (userId) {
        // Get user's apps (without orderBy to avoid index requirement)
        const appsQuery = firestore.query(
          firestore.collection(db, 'apps'),
          firestore.where('userId', '==', userId)
        );
        
        const querySnapshot = await firestore.getDocs(appsQuery);
       const apps = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
       }));
       
       // Sort in memory instead of using orderBy
       apps.sort((a, b) => {
         const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt);
         const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt);
         return dateB.getTime() - dateA.getTime();
       });
       
       return NextResponse.json({
         success: true,
         apps
       });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'userId or appId parameter is required'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[save-app] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
