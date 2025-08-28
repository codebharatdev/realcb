import { NextResponse } from 'next/server';
import { parseJavaScriptFile, buildComponentTree } from '@/lib/file-parser';
import { FileManifest, FileInfo, RouteInfo } from '@/types/file-manifest';
import type { SandboxState } from '@/types/sandbox';

declare global {
  var activeSandbox: any;
}

export async function GET() {
  try {
    if (!global.activeSandbox) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox'
      }, { status: 404 });
    }

    console.log('[get-sandbox-files] Fetching and analyzing file structure...');
    
    // Get all React/JS/CSS files
    const result = await global.activeSandbox.runCode(`
import os
import json

# Function to get all app files (like a GitHub repo)
def get_all_app_files():
    files_content = {}
    base_dir = '/home/user/app'
    
    # Files and directories to exclude (like .gitignore)
    exclude_dirs = {
        'node_modules', '.git', 'dist', 'build', '.vite', '.cache', 
        '.next', '.nuxt', '.output', 'coverage', '.nyc_output',
        '.env.local', '.env.production', '.env.development'
    }
    
    exclude_files = {
        '.DS_Store', 'Thumbs.db', '.env', '.env.local', '.env.production',
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        '.gitignore', '.gitattributes', '.editorconfig'
    }
    
    # File extensions to include (source code and config files)
    include_extensions = {
        '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass', '.less',
        '.json', '.html', '.htm', '.md', '.txt', '.yml', '.yaml',
        '.xml', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico',
        '.woff', '.woff2', '.ttf', '.eot'
    }
    
    for root, dirs, files in os.walk(base_dir):
        # Remove excluded directories from dirs list
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            # Skip excluded files
            if file in exclude_files:
                continue
                
            # Check if file has an included extension
            file_ext = os.path.splitext(file)[1].lower()
            if file_ext in include_extensions:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, base_dir)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Skip very large files (over 50KB)
                        if len(content) < 50000:
                            files_content[relative_path] = content
                except Exception as e:
                    # Skip files that can't be read (binary files, etc.)
                    pass
    
    return files_content

# Get the files
files = get_all_app_files()

# Get directory structure
structure = []
base_dir = '/home/user/app'  # Hardcoded directory path
if os.path.exists(base_dir):
    for root, dirs, dir_files in os.walk(base_dir):
        level = root.replace(base_dir, '').count(os.sep)
        indent = ' ' * 2 * level
        structure.append(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 2 * (level + 1)
        for file in dir_files:
            if not any(skip in root for skip in ['node_modules', '.git', 'dist', 'build']):
                structure.append(f"{sub_indent}{file}")

result = {
    'files': files,
    'structure': '\\n'.join(structure[:50])
}

print(json.dumps(result))
    `);

    const output = result.logs.stdout.join('');
    console.log('[get-sandbox-files] Raw output:', output);
    
    let parsedResult;
    try {
        parsedResult = JSON.parse(output);
        
        // Debug: Log what files were found
        console.log('[get-sandbox-files] Found files:', Object.keys(parsedResult.files));
        console.log('[get-sandbox-files] File count:', Object.keys(parsedResult.files).length);
        console.log('[get-sandbox-files] All file keys:', Object.keys(parsedResult.files));
        
        // Log a sample of file content to verify it's working
        const fileKeys = Object.keys(parsedResult.files);
        if (fileKeys.length > 0) {
          const sampleFile = fileKeys[0];
          const sampleContent = parsedResult.files[sampleFile];
          console.log(`[get-sandbox-files] Sample file ${sampleFile}:`, sampleContent.substring(0, 100) + '...');
        }
    } catch (error) {
        console.error('[get-sandbox-files] Error parsing JSON:', error);
        console.error('[get-sandbox-files] Raw output that failed to parse:', output);
        return NextResponse.json({
            success: false,
            error: 'Failed to parse sandbox files response'
        }, { status: 500 });
    }
    
    // Build enhanced file manifest
    const fileManifest: FileManifest = {
      files: {},
      routes: [],
      componentTree: {},
      entryPoint: '',
      styleFiles: [],
      timestamp: Date.now(),
    };
    
    // Process each file
    for (const [relativePath, content] of Object.entries(parsedResult.files)) {
      // Use the relative path as is, since we're reading from current working directory
      const fullPath = relativePath;
      
      // Create base file info
      const fileInfo: FileInfo = {
        content: content as string,
        type: 'utility',
        path: fullPath,
        relativePath,
        lastModified: Date.now(),
      };
      
      // Parse JavaScript/JSX files
      if (relativePath.match(/\.(jsx?|tsx?)$/)) {
        const parseResult = parseJavaScriptFile(content as string, fullPath);
        Object.assign(fileInfo, parseResult);
        
        // Identify entry point
        if (relativePath === 'src/main.jsx' || relativePath === 'src/index.jsx') {
          fileManifest.entryPoint = fullPath;
        }
        
        // Identify App.jsx
        if (relativePath === 'src/App.jsx' || relativePath === 'App.jsx') {
          fileManifest.entryPoint = fileManifest.entryPoint || fullPath;
        }
      }
      
      // Track style files
      if (relativePath.endsWith('.css')) {
        fileManifest.styleFiles.push(fullPath);
        fileInfo.type = 'style';
      }
      
      fileManifest.files[fullPath] = fileInfo;
    }
    
    // Build component tree
    fileManifest.componentTree = buildComponentTree(fileManifest.files);
    
    // Extract routes (simplified - looks for Route components or page pattern)
    fileManifest.routes = extractRoutes(fileManifest.files);
    
    // Update global file cache with manifest
    if (global.sandboxState?.fileCache) {
      global.sandboxState.fileCache.manifest = fileManifest;
    }

    return NextResponse.json({
      success: true,
      files: parsedResult.files,
      structure: parsedResult.structure,
      fileCount: Object.keys(parsedResult.files).length,
      manifest: fileManifest,
    });

  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

function extractRoutes(files: Record<string, FileInfo>): RouteInfo[] {
  const routes: RouteInfo[] = [];
  
  // Look for React Router usage
  for (const [path, fileInfo] of Object.entries(files)) {
    if (fileInfo.content.includes('<Route') || fileInfo.content.includes('createBrowserRouter')) {
      // Extract route definitions (simplified)
      const routeMatches = fileInfo.content.matchAll(/path=["']([^"']+)["'].*(?:element|component)={([^}]+)}/g);
      
      for (const match of routeMatches) {
        const [, routePath, componentRef] = match;
        routes.push({
          path: routePath,
          component: path,
        });
      }
    }
    
    // Check for Next.js style pages
    if (fileInfo.relativePath.startsWith('pages/') || fileInfo.relativePath.startsWith('src/pages/')) {
      const routePath = '/' + fileInfo.relativePath
        .replace(/^(src\/)?pages\//, '')
        .replace(/\.(jsx?|tsx?)$/, '')
        .replace(/index$/, '');
        
      routes.push({
        path: routePath,
        component: path,
      });
    }
  }
  
  return routes;
}