import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

declare global {
  var activeSandbox: any;
  var sandboxData: any;
}

export async function POST(request: NextRequest) {
  try {
    const { repoName, repoUrl, sandboxId, userId } = await request.json();
    
    if (!repoName || !repoUrl || !sandboxId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: repoName, repoUrl, sandboxId, userId'
      }, { status: 400 });
    }

    // Check if sandbox exists
    if (!global.activeSandbox) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox found'
      }, { status: 400 });
    }

    // Get user's GitHub access token
    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }

    const userRef = firestore.doc(db, 'users', userId);
    const userDoc = await firestore.getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub not connected'
      }, { status: 400 });
    }

    console.log('[clone-github-repo] Cloning repository:', repoName);
    console.log('[clone-github-repo] Repository URL:', repoUrl);
    console.log('[clone-github-repo] Sandbox ID:', sandboxId);

    // Create Python script to clone the repository using string concatenation with authentication
    const pythonScript = `
import os
import subprocess
import sys

print("Starting repository clone...")

try:
    # Change to the app directory
    os.chdir('/home/user/app')
    print("Changed to /home/user/app directory")
    
    # Remove existing files if any
    if os.path.exists('.git'):
        print("Removing existing git repository...")
        subprocess.run(['rm', '-rf', '.git'], check=True, capture_output=True, text=True)
    
    # Remove all files and directories except node_modules
    print("Cleaning directory for cloning...")
    items_to_remove = []
    for item in os.listdir('.'):
        if item != 'node_modules':
            items_to_remove.append(item)
    
    print(f"Items to remove: {items_to_remove}")
    
    for item in items_to_remove:
        item_path = os.path.join('.', item)
        try:
            if os.path.isfile(item_path):
                os.remove(item_path)
                print(f"Removed file: {item}")
            elif os.path.isdir(item_path):
                subprocess.run(['rm', '-rf', item_path], check=True, capture_output=True, text=True)
                print(f"Removed directory: {item}")
        except Exception as e:
            print(f"Error removing {item}: {str(e)}")
    
    # Double-check that directory is clean
    remaining_items = os.listdir('.')
    print(f"Remaining items after cleaning: {remaining_items}")
    
    if len(remaining_items) > 0 and not (len(remaining_items) == 1 and 'node_modules' in remaining_items):
        print("Warning: Directory not completely clean, but proceeding...")
    
    print("Cleaned directory for cloning")
    
    # Clone the repository with authentication
    repo_url = "` + repoUrl + `"
    github_token = "` + userData.githubAccessToken + `"
    github_username = "` + userData.githubUsername + `"
    
    # Create authenticated URL
    if repo_url.startswith('https://github.com/'):
        auth_url = repo_url.replace('https://github.com/', f'https://{github_token}@github.com/')
    else:
        auth_url = repo_url
    
    print(f"Cloning repository with authentication: {auth_url.replace(github_token, '***')}")
    
    # Try to clone with better error handling
    try:
        clone_result = subprocess.run([
            'git', 'clone', auth_url, '.'
        ], capture_output=True, text=True, timeout=60)
        
        if clone_result.returncode == 0:
            print("Repository cloned successfully")
            print("Clone output:", clone_result.stdout)
        else:
            print(f"Git clone failed with return code: {clone_result.returncode}")
            print("Git clone stderr:", clone_result.stderr)
            print("Git clone stdout:", clone_result.stdout)
            
            # If it's a directory not empty error, try cloning to temp directory first
            if "already exists and is not an empty directory" in clone_result.stderr:
                print("Directory not empty, trying alternative approach...")
                
                # Clone to a temporary directory
                temp_dir = "/tmp/repo_clone"
                if os.path.exists(temp_dir):
                    subprocess.run(['rm', '-rf', temp_dir], check=True, capture_output=True, text=True)
                
                print(f"Cloning to temporary directory: {temp_dir}")
                temp_clone_result = subprocess.run([
                    'git', 'clone', auth_url, temp_dir
                ], capture_output=True, text=True, timeout=60)
                
                if temp_clone_result.returncode == 0:
                    print("Repository cloned to temp directory successfully")
                    
                    # Copy files from temp directory to current directory
                    print("Copying files from temp directory...")
                    copy_result = subprocess.run([
                        'cp', '-r', f'{temp_dir}/.', '.'
                    ], capture_output=True, text=True)
                    
                    if copy_result.returncode == 0:
                        print("Files copied successfully")
                        # Clean up temp directory
                        subprocess.run(['rm', '-rf', temp_dir], check=True, capture_output=True, text=True)
                    else:
                        print(f"Copy failed: {copy_result.stderr}")
                        raise Exception(f"Copy failed: {copy_result.stderr}")
                else:
                    print(f"Temp clone failed: {temp_clone_result.stderr}")
                    raise Exception(f"Temp clone failed: {temp_clone_result.stderr}")
            else:
                # Try to get more information about the error
                print("Testing repository access...")
                test_result = subprocess.run([
                    'curl', '-I', '-H', f'Authorization: token {github_token}', 
                    f'https://api.github.com/repos/{github_username}/{repo_url.split("/")[-1]}'
                ], capture_output=True, text=True, timeout=30)
                
                print("GitHub API test result:", test_result.stdout)
                print("GitHub API test error:", test_result.stderr)
                
                raise Exception(f"Git clone failed: {clone_result.stderr}")
            
    except subprocess.TimeoutExpired:
        print("Git clone timed out")
        raise Exception("Git clone timed out")
    except Exception as e:
        print(f"Git clone exception: {str(e)}")
        raise e
    
    # List files to verify
    files = os.listdir('.')
    print(f"Files in repository: {files}")
    
    # Check if package.json exists and install dependencies
    if os.path.exists('package.json'):
        print("Installing npm dependencies...")
        install_result = subprocess.run(['npm', 'install'], check=True, capture_output=True, text=True)
        print("Dependencies installed successfully")
        print("Install output:", install_result.stdout)
    
    print("Repository setup completed successfully")
    
except Exception as e:
    print(f"Error during repository setup: {str(e)}")
    sys.exit(1)
`;
    
    console.log('[clone-github-repo] Python script variables:');
    console.log('- repoUrl:', repoUrl);
    console.log('[clone-github-repo] Python script preview (first 200 chars):', pythonScript.substring(0, 200));
    console.log('[clone-github-repo] Full Python script:');
    console.log(pythonScript);

    // Execute the Python script in the sandbox
    const result = await global.activeSandbox.runCode(pythonScript);
    
    console.log('[clone-github-repo] Sandbox execution result:', result);

    if (result.error) {
      console.error('[clone-github-repo] Error cloning repository:', result.error);
      return NextResponse.json({
        success: false,
        error: `Failed to clone repository: ${result.error}`
      }, { status: 500 });
    }

    console.log('[clone-github-repo] Repository cloned successfully');
    
    return NextResponse.json({
      success: true,
      message: `Repository ${repoName} cloned successfully`,
      sandboxId
    });

  } catch (error) {
    console.error('[clone-github-repo] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
