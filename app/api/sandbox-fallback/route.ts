import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[sandbox-fallback] Creating fallback development environment...');
    
    // Generate a unique fallback ID
    const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Create a simple HTML-based development environment
    const fallbackHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeBharat.dev - Fallback Environment</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        .code-editor {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        .preview-frame {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto p-4">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h1 class="text-2xl font-bold text-gray-800 mb-4">
                🚀 CodeBharat.dev - Fallback Development Environment
            </h1>
            <p class="text-gray-600 mb-6">
                E2B sandbox is currently unavailable. This is a fallback environment for development.
            </p>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Code Editor -->
                <div class="space-y-4">
                    <h2 class="text-lg font-semibold text-gray-700">Code Editor</h2>
                    <textarea 
                        id="codeEditor"
                        class="w-full h-96 p-4 border border-gray-300 rounded-lg code-editor bg-gray-900 text-green-400"
                        placeholder="// Write your React code here...
// Example:
function App() {
  return (
    <div className='p-8 bg-blue-500 text-white rounded-lg'>
      <h1 className='text-2xl font-bold'>Hello from CodeBharat.dev!</h1>
      <p>This is a fallback development environment.</p>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));"
                    ></textarea>
                    <button 
                        onclick="runCode()"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        ▶️ Run Code
                    </button>
                </div>
                
                <!-- Preview -->
                <div class="space-y-4">
                    <h2 class="text-lg font-semibold text-gray-700">Preview</h2>
                    <div id="preview" class="preview-frame h-96 p-4 overflow-auto">
                        <div class="flex items-center justify-center h-full text-gray-500">
                            <div class="text-center">
                                <div class="text-4xl mb-2">👨‍💻</div>
                                <p>Your code preview will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 class="font-semibold text-yellow-800 mb-2">⚠️ Fallback Mode</h3>
                <p class="text-yellow-700 text-sm">
                    This is a simplified development environment. Some features like npm package installation 
                    and advanced file management are not available. Please try again later when E2B sandboxes are available.
                </p>
            </div>
        </div>
    </div>

    <script type="text/babel">
        function runCode() {
            const code = document.getElementById('codeEditor').value;
            const preview = document.getElementById('preview');
            
            try {
                // Clear previous content
                preview.innerHTML = '<div id="root"></div>';
                
                // Create a new script element with the code
                const script = document.createElement('script');
                script.type = 'text/babel';
                script.textContent = code;
                
                // Remove any existing scripts
                const existingScripts = preview.querySelectorAll('script');
                existingScripts.forEach(s => s.remove());
                
                // Add the new script
                preview.appendChild(script);
                
            } catch (error) {
                preview.innerHTML = \`
                    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h3 class="font-semibold text-red-800 mb-2">❌ Error</h3>
                        <p class="text-red-700 text-sm">\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        // Auto-run example code on load
        window.addEventListener('load', () => {
            const editor = document.getElementById('codeEditor');
            if (editor.value.trim() === '') {
                editor.value = \`function App() {
  return (
    <div className='p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg'>
      <h1 className='text-3xl font-bold mb-4'>🚀 Welcome to CodeBharat.dev!</h1>
      <p className='text-lg mb-4'>This is a fallback development environment.</p>
      <div className='bg-white bg-opacity-20 p-4 rounded-lg'>
        <p className='text-sm'>E2B sandbox is currently unavailable, but you can still experiment with React code here!</p>
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));\`;
                runCode();
            }
        });
    </script>
</body>
</html>`;

    return NextResponse.json({
      success: true,
      fallbackId,
      url: `data:text/html;base64,${Buffer.from(fallbackHTML).toString('base64')}`,
      message: 'Fallback development environment created',
      isFallback: true,
      limitations: [
        'No npm package installation',
        'No file system access',
        'Limited to browser-based development',
        'No server-side functionality'
      ]
    });

  } catch (error) {
    console.error('[sandbox-fallback] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
