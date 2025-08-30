import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sandboxId } = await request.json();

    if (!sandboxId) {
      return NextResponse.json({
        success: false,
        error: 'Missing sandboxId parameter'
      }, { status: 400 });
    }

    console.log(`[check-vite-server] Checking Vite server for sandbox: ${sandboxId}`);

    // Check if we have an active sandbox
    if (!global.activeSandbox) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox found',
        sandboxId
      }, { status: 404 });
    }

    try {
      // Check if Vite server is running by checking the port
      const result = await global.activeSandbox.runCode(`
import subprocess
import time

try:
    # Check if port 5173 is listening
    result = subprocess.run(['netstat', '-tlnp'], capture_output=True, text=True)
    
    if '5173' in result.stdout:
        print('✓ Port 5173 is listening')
        print('Vite server is running')
        exit(0)
    else:
        print('✗ Port 5173 is not listening')
        print('Vite server is not running')
        
        # Try to restart Vite server
        print('Attempting to restart Vite server...')
        subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
        subprocess.run(['pkill', '-f', 'node'], capture_output=True)
        time.sleep(2)
        
        # Start Vite server
        import os
        os.chdir('/home/user/app')
        subprocess.Popen([
            'nohup', 'npm', 'run', 'dev', '>', '/tmp/vite.log', '2>&1', '&'
        ], shell=True)
        
        # Wait and check again
        time.sleep(5)
        result2 = subprocess.run(['netstat', '-tlnp'], capture_output=True, text=True)
        if '5173' in result2.stdout:
            print('✓ Vite server restarted successfully')
            exit(0)
        else:
            print('✗ Failed to restart Vite server')
            exit(1)
            
except Exception as e:
    print(f'Error checking Vite server: {e}')
    exit(1)
      `);

      if (result.exitCode === 0) {
        return NextResponse.json({
          success: true,
          message: 'Vite server is running',
          sandboxId
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Vite server is not running',
          sandboxId,
          logs: result.stdout + result.stderr
        }, { status: 500 });
      }

    } catch (error) {
      console.error('[check-vite-server] Error checking Vite server:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to check Vite server: ${(error as Error).message}`,
        sandboxId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[check-vite-server] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
