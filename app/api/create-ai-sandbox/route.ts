import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxState } from '@/types/sandbox';
import { appConfig } from '@/config/app.config';

// Store active sandbox globally
declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST() {
  let sandbox: any = null;
  let attempts = 0;
  const maxAttempts = 3;
  const baseTimeout = 4 * 60 * 1000; // 4 minutes base timeout
  
  // Enhanced timeout with exponential backoff
  const getTimeoutForAttempt = (attempt: number) => {
    return Math.min(baseTimeout * Math.pow(1.5, attempt), 10 * 60 * 1000); // Max 10 minutes
  };

  const createSandboxWithFallback = async (attempt: number): Promise<any> => {
    const timeout = getTimeoutForAttempt(attempt);
    console.log(`[create-ai-sandbox] Attempt ${attempt}/${maxAttempts} with timeout: ${timeout/1000}s`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Sandbox creation timed out after ${timeout/1000}s`)), timeout);
    });

    try {
      // Kill existing sandbox if any
      if (global.activeSandbox) {
        console.log('[create-ai-sandbox] Killing existing sandbox...');
        try {
          await global.activeSandbox.kill();
        } catch (e) {
          console.error('Failed to close existing sandbox:', e);
        }
        global.activeSandbox = null;
      }
    
      // Clear existing files tracking
      if (global.existingFiles) {
        global.existingFiles.clear();
      } else {
        global.existingFiles = new Set<string>();
      }

      // Create base sandbox with retry mechanism
      console.log(`[create-ai-sandbox] Creating base E2B sandbox (attempt ${attempt})...`);
      
      // Try different sandbox configurations for fallback
      const sandboxConfigs = [
        { 
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: Math.min(appConfig.e2b.timeoutMs, 5 * 60 * 1000)
        },
        { 
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: Math.min(appConfig.e2b.timeoutMs, 3 * 60 * 1000), // Shorter timeout
          template: 'base' // Try with base template
        },
        { 
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: Math.min(appConfig.e2b.timeoutMs, 2 * 60 * 1000), // Even shorter timeout
          template: 'base',
          cpus: 1, // Reduce resources
          memory: 512
        }
      ];
      
      const configIndex = Math.min(attempt - 1, sandboxConfigs.length - 1);
      const config = sandboxConfigs[configIndex];
      
      console.log(`[create-ai-sandbox] Using config ${configIndex + 1}:`, config);
      
      sandbox = await Promise.race([
        Sandbox.create(config),
        timeoutPromise
      ]);
    
      const sandboxId = (sandbox as any).sandboxId || Date.now().toString();
      const host = (sandbox as any).getHost(appConfig.e2b.vitePort);
      
      console.log(`[create-ai-sandbox] Sandbox created: ${sandboxId}`);
      console.log(`[create-ai-sandbox] Sandbox host: ${host}`);

      // Set up a basic Vite React app using Python to write files
      console.log('[create-ai-sandbox] Setting up Vite React app...');
      
      // Write all files in a single Python script to avoid multiple executions
      const setupScript = `
import os
import json

# Create app directory
os.makedirs('/home/user/app', exist_ok=True)
os.chdir('/home/user/app')

# Create package.json
package_json = {
    "name": "codebharat-app",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "@types/react": "^18.2.43",
        "@types/react-dom": "^18.2.17",
        "@vitejs/plugin-react": "^4.2.1",
        "autoprefixer": "^10.4.16",
        "postcss": "^8.4.32",
        "tailwindcss": "^3.3.6",
        "vite": "^5.0.8"
    }
}

with open('package.json', 'w') as f:
    json.dump(package_json, f, indent=2)

# Create index.html
index_html = '''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeBharat.dev App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>'''

with open('index.html', 'w') as f:
    f.write(index_html)

# Create src directory
os.makedirs('src', exist_ok=True)

# Create main.jsx
main_jsx = '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)'''

with open('src/main.jsx', 'w') as f:
    f.write(main_jsx)

# Create App.jsx
app_jsx = '''import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          🚀 Welcome to CodeBharat.dev!
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <p className="text-gray-600 mb-6">
            Your AI-powered development environment is ready!
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App'''

with open('src/App.jsx', 'w') as f:
    f.write(app_jsx)

# Create index.css with Tailwind
index_css = '''@tailwind base;
@tailwind components;
@tailwind utilities;'''

with open('src/index.css', 'w') as f:
    f.write(index_css)

# Create vite.config.js
vite_config = '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})'''

with open('vite.config.js', 'w') as f:
    f.write(vite_config)

# Create tailwind.config.js
tailwind_config = '''/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}'''

with open('tailwind.config.js', 'w') as f:
    f.write(tailwind_config)

# Create postcss.config.js
postcss_config = '''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}'''

with open('postcss.config.js', 'w') as f:
    f.write(postcss_config)

print("✓ All files created successfully")
`;

      await sandbox.runCode(setupScript);
      
      // Install dependencies
      console.log('[create-ai-sandbox] Installing dependencies...');
      await sandbox.runCode('cd /home/user/app && npm install');
      
      // Start Vite development server with more reliable approach
      console.log('[create-ai-sandbox] Starting Vite development server...');
      await sandbox.runCode(`
import subprocess
import os
import time
import requests
import threading

os.chdir('/home/user/app')

# Kill any existing Vite processes
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
subprocess.run(['pkill', '-f', 'node'], capture_output=True)
time.sleep(2)

# Start Vite dev server in background with nohup
env = os.environ.copy()
env['FORCE_COLOR'] = '0'
env['NODE_ENV'] = 'development'

# Use nohup to ensure the process stays running
process = subprocess.Popen([
    'nohup', 'npm', 'run', 'dev', '>', '/tmp/vite.log', '2>&1', '&'
], shell=True, env=env)

print(f'✓ Vite dev server started with PID: {process.pid}')

# Wait and check if server is actually running
max_attempts = 10
for attempt in range(max_attempts):
    time.sleep(2)
    try:
        # Check if port 5173 is listening
        result = subprocess.run(['netstat', '-tlnp'], capture_output=True, text=True)
        if '5173' in result.stdout:
            print(f'✓ Port 5173 is listening (attempt {attempt + 1})')
            break
    except:
        pass
    
    # Also try to check if the process is still running
    if process.poll() is not None:
        print('⚠ Vite process died, restarting...')
        process = subprocess.Popen([
            'nohup', 'npm', 'run', 'dev', '>', '/tmp/vite.log', '2>&1', '&'
        ], shell=True, env=env)

print('✓ Vite server should be ready')
      `);
      
      // Wait for Vite to be ready
      await new Promise(resolve => setTimeout(resolve, 12000)); // Increased wait time further
      
      // Force Tailwind CSS to rebuild by touching the CSS file
      await sandbox.runCode(`
import os
import time

# Touch the CSS file to trigger rebuild
css_file = '/home/user/app/src/index.css'
if os.path.exists(css_file):
    os.utime(css_file, None)
    print('✓ Triggered CSS rebuild')
    
# Also ensure PostCSS processes it
time.sleep(2)
print('✓ Tailwind CSS should be loaded')
      `);

      // Store sandbox globally
      global.activeSandbox = sandbox;
      global.sandboxData = {
        sandboxId,
        url: `https://${host}`
      };
      
      // Set extended timeout on the sandbox instance if method available
      if (typeof sandbox.setTimeout === 'function') {
        sandbox.setTimeout(appConfig.e2b.timeoutMs);
        console.log(`[create-ai-sandbox] Set sandbox timeout to ${appConfig.e2b.timeoutMinutes} minutes`);
      }
      
      // Initialize sandbox state
      global.sandboxState = {
        fileCache: {
          files: {},
          lastSync: Date.now(),
          sandboxId
        },
        sandbox,
        sandboxData: {
          sandboxId,
          url: `https://${host}`
        }
      };
      
      // Track initial files
      global.existingFiles.add('src/App.jsx');
      global.existingFiles.add('src/main.jsx');
      global.existingFiles.add('src/index.css');
      global.existingFiles.add('index.html');
      global.existingFiles.add('package.json');
      global.existingFiles.add('vite.config.js');
      global.existingFiles.add('tailwind.config.js');
      global.existingFiles.add('postcss.config.js');
      
      console.log('[create-ai-sandbox] Sandbox ready at:', `https://${host}`);
      
      return {
        success: true,
        sandboxId,
        url: `https://${host}`,
        message: 'Sandbox created and Vite React app initialized'
      };
      
    } catch (error) {
      console.error(`[create-ai-sandbox] Attempt ${attempt} failed:`, error);
      
      // Clean up any partial sandbox
      if (sandbox) {
        try {
          await sandbox.kill();
        } catch (killError) {
          console.error('Failed to kill partial sandbox:', killError);
        }
      }
      
      throw error;
    }
  };

  // Main retry loop
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      console.log(`[create-ai-sandbox] Starting attempt ${attempts}/${maxAttempts}...`);
      const result = await createSandboxWithFallback(attempts);
      return NextResponse.json(result);
      
    } catch (error) {
      console.error(`[create-ai-sandbox] Attempt ${attempts} failed:`, error);
      
      if (attempts < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000); // Exponential backoff, max 10s
        console.log(`[create-ai-sandbox] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // All attempts failed
        console.error('[create-ai-sandbox] All attempts failed, returning error');
        return NextResponse.json({
          success: false,
          error: `Failed to create sandbox after ${maxAttempts} attempts. Last error: ${(error as Error).message}`,
          attempts: attempts,
          suggestions: [
            'Check your E2B API key configuration',
            'Verify your internet connection',
            'Try again in a few minutes',
            'Contact support if the issue persists'
          ]
        }, { status: 500 });
      }
    }
  }
}
