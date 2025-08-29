'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import icons from centralized module to avoid Turbopack chunk issues
import { 
  FiFile, 
  FiChevronRight, 
  FiChevronDown,
  FiGithub,
  BsFolderFill, 
  BsFolder2Open,
  SiJavascript, 
  SiReact, 
  SiCss3, 
  SiJson 
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import CodeApplicationProgress, { type CodeApplicationState } from '@/components/CodeApplicationProgress';
import { useAuth } from '@/lib/auth-context';
import { LoginModal } from '@/components/LoginModal';
import { UserProfile } from '@/components/UserProfile';
import { ClientOnly } from '@/components/ClientOnly';
import PaymentModal from '@/components/PaymentModal';
import AccountMenu from '@/components/AccountMenu';
import { tokenManager } from '@/lib/token-manager';


interface SandboxData {
  sandboxId: string;
  url: string;
  [key: string]: any;
}

interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    scrapedUrl?: string;
    scrapedContent?: any;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
  };
}

// Force dynamic rendering to avoid useSearchParams issues
export const dynamic = 'force-dynamic';

export default function AISandboxPage() {
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: 'Not connected', active: false });
  const [responseArea, setResponseArea] = useState<string[]>([]);
  const [structureContent, setStructureContent] = useState('No sandbox created yet');
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      content: 'Welcome! I can help you generate code with full context of your sandbox files and structure. Just start chatting - I\'ll automatically create a sandbox for you if needed!\n\n🚀 **New Feature**: When you connect your GitHub account, I\'ll automatically create a repository for each app you generate and commit all changes automatically!\n\nTip: If you see package errors like "react-router-dom not found", just type "npm install" or "check packages" to automatically install missing packages.',
      type: 'system',
      timestamp: new Date()
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiEnabled] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [aiModel, setAiModel] = useState<string>('moonshotai/kimi-k2-instruct'); // Default, will be updated from backend

  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app', 'src', 'src/components']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [homeScreenFading, setHomeScreenFading] = useState(false);

  const [activeTab, setActiveTab] = useState<'generation' | 'preview'>('generation');
  const [currentSandboxFiles, setCurrentSandboxFiles] = useState<Record<string, string>>({});

  const [showMyApps, setShowMyApps] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [creditHistory, setCreditHistory] = useState<Array<any>>([]);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [myAppsSearchTerm, setMyAppsSearchTerm] = useState('');
  const [myAppsFilter, setMyAppsFilter] = useState<'all' | 'recent' | 'github'>('all');
  const [selectedAppForGitHub, setSelectedAppForGitHub] = useState<string | null>(null);
  const [loadingAppId, setLoadingAppId] = useState<string | null>(null);
  const [loadingAppName, setLoadingAppName] = useState<string>('');
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [githubConnected, setGitHubConnected] = useState(false);
  const [showGitHubConnectionModal, setShowGitHubConnectionModal] = useState(false);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [customAlertData, setCustomAlertData] = useState<{
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
    action?: string;
    onAction?: () => void;
  } | null>(null);
  const [currentGitHubRepo, setCurrentGitHubRepo] = useState<{name: string, url: string} | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  
  // Token management state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null); // Start as null to prevent hydration issues
  const [isTokenCheckEnabled, setIsTokenCheckEnabled] = useState(true); // Enable token system
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [currentGenerationCredits, setCurrentGenerationCredits] = useState<number>(0);
  
  // Function to check if user can generate apps (GitHub connected + sufficient credits)
  const canGenerateApp = () => {
    if (!user) {
      return { canGenerate: false, reason: 'User not logged in' };
    }
    
    if (!githubConnected) {
      return { canGenerate: false, reason: 'GitHub account not connected' };
    }
    
    if (tokenBalance === null) {
      return { canGenerate: false, reason: 'Loading credit balance...' };
    }
    
    if (tokenBalance <= 0) {
      return { canGenerate: false, reason: 'Insufficient credits' };
    }
    
    return { canGenerate: true, reason: 'Ready to generate' };
  };

  // Function to show credit consumption transparency
  const showCreditTransparency = (creditsConsumed: number, operation: string) => {
    const transparencyMessage = `
💳 **Credit Consumption Transparency**

**Operation:** ${operation}
**Credits Consumed:** ${creditsConsumed.toLocaleString()}
**Previous Balance:** ${(tokenBalance + creditsConsumed).toLocaleString()}
**New Balance:** ${tokenBalance?.toLocaleString() || 'Loading...'}

**What was consumed:**
• AI model processing: ~${Math.round(creditsConsumed * 0.7).toLocaleString()} credits
• Code generation: ~${Math.round(creditsConsumed * 0.2).toLocaleString()} credits  
• GitHub integration: ~${Math.round(creditsConsumed * 0.1).toLocaleString()} credits

**Your credits are used transparently for:**
✅ AI-powered code generation
✅ GitHub repository creation
✅ File management and deployment
✅ Real-time development server

*All credit consumption is logged and can be reviewed in your account.*
    `;
    
    addChatMessage(transparencyMessage, 'system');
  };
  const [savedApps, setSavedApps] = useState<Array<{
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    previewUrl?: string;
    sandboxId?: string;
    githubRepo?: string;
    githubRepoUrl?: string;
    prompt?: string;
    files?: Record<string, string>;
    chatHistory?: ChatMessage[];
    creditsConsumed?: number;
  }>>([]);

  const [mounted, setMounted] = useState(false);
  






  // Function to handle payment success
  const handlePaymentSuccess = async (paymentData: any) => {
    console.log('[payment-success] Payment successful:', paymentData);
    
    try {
      // Refresh token balance after payment
      await refreshTokenBalance();
      
      // Show payment success message with credit details
      const creditsAdded = paymentData.credits || 0;
      addChatMessage(`✅ **Payment Successful!**`, 'system');
      addChatMessage(`💳 **${creditsAdded.toLocaleString()} credits added to your account**`, 'system');
      addChatMessage(`💰 **Payment ID:** ${paymentData.paymentId}`, 'system');
      addChatMessage(`📅 **Date:** ${new Date().toLocaleString()}`, 'system');
      
      // Show new balance
      if (tokenBalance !== null) {
        addChatMessage(`💳 **New Balance:** ${tokenBalance.toLocaleString()} credits`, 'system');
      }
      
      // Close payment modal
      setShowPaymentModal(false);
      
    } catch (error) {
      console.error('[payment-success] Error handling payment success:', error);
      addChatMessage('⚠️ Payment successful but error updating balance', 'error');
    }
  };

  // Function to handle payment failure
  const handlePaymentFailure = async (errorData: any) => {
    console.error('[payment-failure] Payment failed:', errorData);
    
    addChatMessage(`❌ **Payment Failed**`, 'error');
    addChatMessage(`💳 **Reason:** ${errorData.reason || 'Unknown error'}`, 'error');
    addChatMessage(`💰 **Payment ID:** ${errorData.paymentId || 'N/A'}`, 'error');
    addChatMessage(`📅 **Date:** ${new Date().toLocaleString()}`, 'error');
    
    // Keep payment modal open for retry
    // setShowPaymentModal(false); // Don't close, let user retry
  };



  // Function to fetch credit consumption history
  const fetchCreditHistory = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/tokens/track-consumption?userId=${user.uid}&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setCreditHistory(data.history || []);
      } else {
        console.error('[credit-history] Failed to fetch history:', data.error);
      }
    } catch (error) {
      console.error('[credit-history] Error fetching history:', error);
    }
  };

  // Function to track credit consumption history
  const trackCreditConsumption = async (operation: string, creditsConsumed: number, details: any = {}) => {
    if (!user) return;
    
    try {
      const consumptionRecord = {
        userId: user.uid,
        operation,
        creditsConsumed,
        details,
        timestamp: new Date(),
        balanceBefore: (tokenBalance || 0) + creditsConsumed,
        balanceAfter: tokenBalance || 0
      };
      
      // Store consumption record in database
      const response = await fetch('/api/tokens/track-consumption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consumptionRecord)
      });
      
      if (response.ok) {
        console.log('[credit-tracking] Consumption tracked successfully');
      } else {
        console.error('[credit-tracking] Failed to track consumption');
      }
    } catch (error) {
      console.error('[credit-tracking] Error tracking consumption:', error);
    }
  };

  // Function to refresh token balance
  const refreshTokenBalance = async () => {
    if (user && isTokenCheckEnabled) {
      try {
        const response = await fetch(`/api/tokens/balance?userId=${user.uid}`);
        const data = await response.json();
        if (data.success) {
          setTokenBalance(data.balance.tokens);
        } else {
          setTokenBalance(0); // Set to 0 if API fails
        }
      } catch (error) {
        console.error('Failed to refresh token balance:', error);
        setTokenBalance(0); // Set to 0 if API fails
      }
    }
  };
  
  // New state for prompt-based generation
  const [generationMode, setGenerationMode] = useState<'prompt'>('prompt');
  const [showPromptInput, setShowPromptInput] = useState(true);
  const [showLoadingBackground, setShowLoadingBackground] = useState(false);

  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [fileStructure, setFileStructure] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [conversationContext, setConversationContext] = useState<{
    generatedComponents: Array<{ name: string; path: string; content: string }>;
    appliedCode: Array<{ files: string[]; timestamp: Date }>;
    currentProject: string;
    lastGeneratedCode?: string;
  }>({
    generatedComponents: [],
    appliedCode: [],
    currentProject: '',
    lastGeneratedCode: undefined
  });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  
  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({
    stage: null
  });
  
  // Authentication state
  const { user, loading: authLoading, signOut } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    status: string;
    components: Array<{ name: string; path: string; completed: boolean }>;
    currentComponent: number;
    streamedCode: string;
    isStreaming: boolean;
    isThinking: boolean;
    thinkingText?: string;
    thinkingDuration?: number;
    currentFile?: { path: string; content: string; type: string };
    files: Array<{ path: string; content: string; type: string; completed: boolean }>;
    lastProcessedPosition: number;
    isEdit?: boolean;
  }>({
    isGenerating: false,
    status: '',
    components: [],
    currentComponent: 0,
    streamedCode: '',
    isStreaming: false,
    isThinking: false,
    files: [],
    lastProcessedPosition: 0
  });

  // Add debounce for iframe refreshes to prevent rapid successive refreshes
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_DEBOUNCE_MS = 3000; // 3 seconds between refreshes

  // Clear old conversation data on component mount and create/restore sandbox
  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      // Clear old conversation
      try {
        await fetch('/api/conversation-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-old' })
        });
        console.log('[home] Cleared old conversation data on mount');
      } catch (error) {
        console.error('[ai-sandbox] Failed to clear old conversation:', error);
        if (isMounted) {
          addChatMessage('Failed to clear old conversation data.', 'error');
        }
      }
      
      if (!isMounted) return;

      // Check if sandbox ID is in URL - only restore if explicitly provided
      const sandboxIdParam = searchParams.get('sandbox');
      
      if (sandboxIdParam) {
        console.log('[home] Sandbox ID in URL, but not creating automatically. User must initiate generation.');
        // Don't create sandbox automatically - let user start generation when ready
      } else {
        console.log('[home] No sandbox in URL. Sandbox will be created when user starts generation.');
        // Don't create sandbox automatically - let user start generation when ready
      }
    };
    
    initializePage();

    return () => {
      isMounted = false;
    };
  }, []); // Run only on mount
  
  useEffect(() => {
    // Handle Escape key for home screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHomeScreen) {
        setHomeScreenFading(true);
        setTimeout(() => {
          setShowHomeScreen(false);
          setHomeScreenFading(false);
        }, 500);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHomeScreen]);
  
  // Refresh token balance when user changes and periodically
  useEffect(() => {
    if (user && isTokenCheckEnabled) {
      // Initial refresh
      refreshTokenBalance();
      
      // Refresh every 30 seconds
      const interval = setInterval(refreshTokenBalance, 30000);
      
      return () => clearInterval(interval);
    } else if (!user) {
      // Reset token balance when user logs out
      setTokenBalance(null);
    }
  }, [user, isTokenCheckEnabled]);



  useEffect(() => {
    // Only check sandbox status if there's a sandbox ID in the URL
    const sandboxIdParam = searchParams.get('sandbox');
    
    if (sandboxIdParam) {
      checkSandboxStatus();
    }
    
    // Optional: Check status when window regains focus (only if we have a sandbox)
    const handleFocus = () => {
      if (sandboxData || searchParams.get('sandbox')) {
        checkSandboxStatus();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [searchParams, sandboxData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-show preview on mobile when generation completes
  useEffect(() => {
    if (!generationProgress.isGenerating && generationProgress.files.length > 0) {
      // On mobile, automatically show preview when generation completes
      if (window.innerWidth < 1024) { // lg breakpoint
        setShowPreview(true);
      }
    }
  }, [generationProgress.isGenerating, generationProgress.files.length]);

  // Fetch current sandbox files when Code Generation tab is selected and user has an active sandbox
  useEffect(() => {
    if (activeTab === 'generation' && sandboxData && Object.keys(currentSandboxFiles).length === 0 && sandboxData.sandboxId) {
      fetchCurrentSandboxFiles();
    }
  }, [activeTab, sandboxData, currentSandboxFiles]);

  // Fetch saved apps when user logs in
  useEffect(() => {
    if (user) {
      fetchSavedApps();
    }
  }, [user]);

  // Test function for debugging app loading
  const testLoadApp = async (appId: string) => {
    console.log('[testLoadApp] Testing app loading for:', appId);
    try {
      const response = await fetch(`/api/save-app?appId=${appId}`);
      const data = await response.json();
      console.log('[testLoadApp] API response:', data);
      
      if (data.success && data.app) {
        console.log('[testLoadApp] App data:', {
          name: data.app.name,
          hasFiles: !!data.app.files,
          fileCount: data.app.files ? Object.keys(data.app.files).length : 0,
          hasChatHistory: !!data.app.chatHistory,
          chatHistoryLength: data.app.chatHistory ? data.app.chatHistory.length : 0
        });
        
        // Test the actual loading function
        console.log('[testLoadApp] Calling loadSavedApp function...');
        await loadSavedApp(appId);
      }
    } catch (error) {
      console.error('[testLoadApp] Error:', error);
    }
  };

  // Function to create sandbox and clone GitHub repository
  const createSandboxAndCloneRepo = async (repoName: string, repoUrl: string) => {
    console.log('[createSandboxAndCloneRepo] Creating sandbox and cloning repo:', repoName);
    
    if (!user) {
      console.log('[createSandboxAndCloneRepo] No user available');
      return null;
    }

    try {
      // Set loading states
      setLoading(true);
      setShowLoadingBackground(true);
      updateStatus('Creating sandbox and cloning repository...', false);
      
      // First, create a sandbox using the existing createSandbox logic
      console.log('[createSandboxAndCloneRepo] Creating sandbox...');
      const sandboxResponse = await fetch('/api/create-ai-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const sandboxData = await sandboxResponse.json();
      console.log('[createSandboxAndCloneRepo] Sandbox creation response:', sandboxData);
      
      if (!sandboxData.success) {
        console.error('[createSandboxAndCloneRepo] Failed to create sandbox');
        setLoading(false);
        setShowLoadingBackground(false);
        return null;
      }

      // Update frontend state with the new sandbox
      setSandboxData(sandboxData);
      updateStatus('Sandbox created, cloning repository...', false);
      
      // Update URL with sandbox ID (optional - for debugging and session persistence)
      // const newParams = new URLSearchParams(searchParams.toString());
      // newParams.set('sandbox', sandboxData.sandboxId);
      // router.push(`/?${newParams.toString()}`, { scroll: false });

      // Wait a moment for sandbox to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then clone the repository into the sandbox
      console.log('[createSandboxAndCloneRepo] Cloning repository...');
      updateStatus('Cloning GitHub repository...', false);
      
      const cloneResponse = await fetch('/api/clone-github-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          repoUrl,
          sandboxId: sandboxData.sandboxId,
          userId: user.uid
        })
      });

      if (cloneResponse.ok) {
        const cloneData = await cloneResponse.json();
        if (cloneData.success) {
          console.log('[createSandboxAndCloneRepo] Successfully cloned repository');
          updateStatus('Repository cloned, fetching files...', false);
          
          // Wait for files to be available
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Fetch files from the sandbox
          const filesResponse = await fetch('/api/get-sandbox-files');
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            if (filesData.success && filesData.files) {
              console.log('[createSandboxAndCloneRepo] Successfully fetched files from sandbox:', Object.keys(filesData.files).length);
              
              // Update frontend state
              setCurrentSandboxFiles(filesData.files);
              
              // Start Vite server to run the app
              console.log('[createSandboxAndCloneRepo] Starting Vite server...');
              updateStatus('Starting development server...', false);
              
              try {
                const restartResponse = await fetch('/api/restart-vite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (restartResponse.ok) {
                  console.log('[createSandboxAndCloneRepo] Vite server started successfully');
                  updateStatus('App running successfully!', true);
                  addChatMessage('🚀 Development server started - your app is now running!', 'system');
                } else {
                  console.error('[createSandboxAndCloneRepo] Failed to start Vite server');
                  updateStatus('App loaded but server failed to start', false);
                  addChatMessage('⚠️ App loaded but development server failed to start', 'system');
                }
              } catch (viteError) {
                console.error('[createSandboxAndCloneRepo] Error starting Vite server:', viteError);
                updateStatus('App loaded but server failed to start', false);
                addChatMessage('⚠️ App loaded but development server failed to start', 'system');
              }
              
              setLoading(false);
              setShowLoadingBackground(false);
              
              return {
                sandboxData,
                files: filesData.files
              };
            }
          }
        } else {
          console.error('[createSandboxAndCloneRepo] Failed to clone repository:', cloneData.error);
          setLoading(false);
          setShowLoadingBackground(false);
          updateStatus('Failed to clone repository', false);
        }
      } else {
        console.error('[createSandboxAndCloneRepo] HTTP error cloning repository:', cloneResponse.status);
        setLoading(false);
        setShowLoadingBackground(false);
        updateStatus('Failed to clone repository', false);
      }
      
      return null;
    } catch (error) {
      console.error('[createSandboxAndCloneRepo] Error:', error);
      setLoading(false);
      setShowLoadingBackground(false);
      updateStatus('Error creating sandbox', false);
      return null;
    }
  };

  // Function to list all available apps
  const listAllApps = async () => {
    if (!user) {
      console.log('[listAllApps] No user available');
      return;
    }
    
    try {
      const response = await fetch(`/api/save-app?userId=${user.uid}`);
      const data = await response.json();
      
      if (data.success && data.apps) {
        console.log('[listAllApps] Available apps:');
        data.apps.forEach((app: any, index: number) => {
          console.log(`${index + 1}. ID: ${app.id}`);
          console.log(`   Name: ${app.name}`);
          console.log(`   Files: ${app.files ? Object.keys(app.files).length : 0}`);
          console.log(`   GitHub: ${app.githubRepo || 'None'}`);
          console.log(`   Created: ${new Date(app.createdAt?.seconds * 1000).toLocaleString()}`);
          console.log('---');
        });
      } else {
        console.log('[listAllApps] No apps found or API error:', data);
      }
    } catch (error) {
      console.error('[listAllApps] Error:', error);
    }
  };

  // Make functions available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testLoadApp = testLoadApp;
    (window as any).listAllApps = listAllApps;
    (window as any).createSandboxAndCloneRepo = createSandboxAndCloneRepo;
    (window as any).testSandboxCreation = async () => {
      console.log('[testSandboxCreation] Testing sandbox creation...');
      const result = await createSandboxAndCloneRepo(
        'codebharat-dev-app-1755969583565', 
        'https://github.com/yourusername/codebharat-dev-app-1755969583565'
      );
      console.log('[testSandboxCreation] Result:', result);
    };
    (window as any).testAutoLoad = async () => {
      console.log('[testAutoLoad] Testing automatic app loading...');
      await testLoadApp('g44DmN70GgtRbt4BuTFc');
    };
    (window as any).monitorProcess = () => {
      console.log('[monitorProcess] Current state:');
      console.log('- User:', !!user);
      console.log('- GitHub Connected:', githubConnected);
      console.log('- Sandbox Data:', sandboxData);
      console.log('- Current Files:', Object.keys(currentSandboxFiles).length);
      console.log('- Saved Apps:', savedApps.length);
      console.log('- Generation Progress:', generationProgress);
    };
    (window as any).listAllApps = listAllApps;
    (window as any).debugAppData = async (appId: string) => {
      console.log('[debugAppData] Debugging app data for:', appId);
      try {
        const response = await fetch(`/api/save-app?appId=${appId}`);
        const data = await response.json();
        console.log('[debugAppData] Full app data:', data);
        
        if (data.success && data.app) {
          const app = data.app;
          console.log('[debugAppData] App details:');
          console.log('- Name:', app.name);
          console.log('- GitHub Repo:', app.githubRepo);
          console.log('- GitHub Repo URL:', app.githubRepoUrl);
          console.log('- Has Files:', !!app.files);
          console.log('- File Count:', app.files ? Object.keys(app.files).length : 0);
          console.log('- Sandbox ID:', app.sandboxId);
          console.log('- Created At:', app.createdAt);
          console.log('- Updated At:', app.updatedAt);
          
          // Check if GitHub fields exist
          console.log('[debugAppData] GitHub field check:');
          console.log('- app.githubRepo exists:', 'githubRepo' in app);
          console.log('- app.githubRepoUrl exists:', 'githubRepoUrl' in app);
          console.log('- app.githubRepo value:', app.githubRepo);
          console.log('- app.githubRepoUrl value:', app.githubRepoUrl);
          console.log('- app.githubRepo type:', typeof app.githubRepo);
          console.log('- app.githubRepoUrl type:', typeof app.githubRepoUrl);
        } else {
          console.log('[debugAppData] Failed to get app data:', data.error);
        }
      } catch (error) {
        console.error('[debugAppData] Error:', error);
      }
    };
    (window as any).testGitHubRepo = async (repoUrl: string) => {
      console.log('[testGitHubRepo] Testing GitHub repository access:', repoUrl);
      try {
        const response = await fetch('/api/test-github-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl })
        });
        const data = await response.json();
        console.log('[testGitHubRepo] Result:', data);
      } catch (error) {
        console.error('[testGitHubRepo] Error:', error);
      }
    };
  }

  // Fetch active AI model from backend
  const fetchActiveModel = async () => {
    try {
      console.log('[fetchActiveModel] Fetching active model from backend');
      const response = await fetch('/api/model-config');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('[fetchActiveModel] Active model:', data.activeModel);
          setAiModel(data.activeModel);
        } else {
          console.error('[fetchActiveModel] API error:', data.error);
        }
      } else {
        console.error('[fetchActiveModel] HTTP error:', response.status);
      }
    } catch (error) {
      console.error('[fetchActiveModel] Error:', error);
    }
  };

  // Check GitHub connection on mount
  useEffect(() => {
    if (user && mounted) {
      console.log('[useEffect] Checking GitHub connection for user:', user.uid);
      checkGitHubConnection();
    } else {
      console.log('[useEffect] GitHub connection check skipped:', { user: !!user, mounted });
    }
  }, [user, mounted]);

  // Show GitHub connection prompt when user is logged in but GitHub is not connected
  useEffect(() => {
    if (user && !githubConnected && mounted) {
      // Add a small delay to ensure the welcome message is shown first
      setTimeout(() => {
        addChatMessage('🔗 Connect your GitHub account to automatically save your generated apps as repositories!', 'system');
        addChatMessage('💡 Click the "Connect GitHub" button in the sidebar to get started.', 'system');
      }, 2000);
    }
  }, [user, githubConnected, mounted]);

  // Fetch active model on mount
  useEffect(() => {
    if (mounted) {
      fetchActiveModel();
    }
  }, [mounted]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubConnected = urlParams.get('github_connected');
    const githubError = urlParams.get('github_error');
    const username = urlParams.get('username');

    if (githubConnected === 'true' && username) {
      addChatMessage(`✓ Successfully connected to GitHub as @${username}!`, 'system');
      checkGitHubConnection();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (githubError) {
      addChatMessage(`GitHub connection failed: ${githubError}`, 'error');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle responsive behavior on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        // On desktop, reset mobile-specific states
        setShowPreview(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);


  const updateStatus = (text: string, active: boolean) => {
    setStatus({ text, active });
  };

  const log = (message: string, type: 'info' | 'error' | 'command' = 'info') => {
    setResponseArea(prev => [...prev, `[${type}] ${message}`]);
  };

  const showCustomAlertModal = (title: string, message: string, type: 'warning' | 'error' | 'info' = 'warning', action?: string, onAction?: () => void) => {
    setCustomAlertData({
      title,
      message,
      type,
      action,
      onAction
    });
    setShowCustomAlert(true);
  };

  // Helper function to safely convert Firestore timestamps to readable dates
  const formatDate = (dateValue: any): string => {
    try {
      if (!dateValue) return 'No date';
      
      let date: Date;
      
      // Handle Firestore timestamp
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // Handle regular Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle timestamp number
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      // Handle string date
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      // Handle object with seconds/nanoseconds (Firestore timestamp)
      else if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      }
      else {
        date = new Date(dateValue);
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'Invalid date';
    }
  };

  const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
    setChatMessages(prev => {
      // Skip duplicate consecutive system messages
      if (type === 'system' && prev.length > 0) {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === 'system' && lastMessage.content === content) {
          return prev; // Skip duplicate
        }
      }
      return [...prev, { content, type, timestamp: new Date(), metadata }];
    });
  };

  // Authentication helper function
  const requireAuth = (action: () => void) => {
    if (authLoading) {
      // Wait for auth to load before checking
      return;
    }
    
    if (!user) {
      setPendingAction(() => action);
      setShowLoginModal(true);
    } else {
      action();
    }
  };
  
  const checkAndInstallPackages = async () => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }
    
    // Vite error checking removed - handled by template setup
    addChatMessage('Sandbox is ready. Vite configuration is handled by the template.', 'system');
  };
  
  const handleSurfaceError = (errors: any[]) => {
    // Function kept for compatibility but Vite errors are now handled by template
    
    // Focus the input
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };
  
  const installPackages = async (packages: string[]) => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }
    
    try {
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to install packages: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (!data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                case 'output':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'error':
                  if (data.message && data.message !== 'undefined') {
                    addChatMessage(data.message, 'command', { commandType: 'error' });
                  }
                  break;
                case 'warning':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'success':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                case 'status':
                  addChatMessage(data.message, 'system');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      addChatMessage(`Failed to install packages: ${error.message}`, 'system');
    }
  };

  const checkSandboxStatus = async () => {
    try {
      const response = await fetch('/api/sandbox-status');
      const data = await response.json();
      
      if (data.active && data.healthy && data.sandboxData) {
        setSandboxData(data.sandboxData);
        updateStatus('Sandbox active', true);
      } else if (data.active && !data.healthy) {
        // Sandbox exists but not responding
        updateStatus('Sandbox not responding', false);
        // Optionally try to create a new one
      } else {
        setSandboxData(null);
        updateStatus('No sandbox', false);
      }
    } catch (error) {
      console.error('Failed to check sandbox status:', error);
      setSandboxData(null);
      updateStatus('Error', false);
    }
  };

  const createSandbox = async (fromHomeScreen = false) => {
    try {
      console.log('[createSandbox] Starting sandbox creation...');
      setLoading(true);
      setShowLoadingBackground(true);
      updateStatus('Creating sandbox...', false);
      setResponseArea([]);
      setScreenshotError(null);
    
    try {
      const response = await fetch('/api/create-ai-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      console.log('[createSandbox] Response data:', data);
      
      if (data.success) {
        setSandboxData(data);
        updateStatus('Sandbox active', true);
        log('Sandbox created successfully!');
        log(`Sandbox ID: ${data.sandboxId}`);
        log(`URL: ${data.url}`);
        
        // Update URL with sandbox ID (optional - for debugging and session persistence)
        // const newParams = new URLSearchParams(searchParams.toString());
        // newParams.set('sandbox', data.sandboxId);
        // newParams.set('model', aiModel);
        // router.push(`/?${newParams.toString()}`, { scroll: false });
        
        // Fade out loading background after sandbox loads
        setTimeout(() => {
          setShowLoadingBackground(false);
        }, 3000);
        
        if (data.structure) {
          displayStructure(data.structure);
        }
        
        // Fetch sandbox files after creation
        setTimeout(fetchSandboxFiles, 1000);
        
        // If we have loaded files, apply them to the new sandbox
        if (currentSandboxFiles && Object.keys(currentSandboxFiles).length > 0) {
          setTimeout(async () => {
            try {
              console.log('[createSandbox] Applying loaded files to new sandbox');
              const applyResponse = await fetch('/api/apply-ai-code', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  files: currentSandboxFiles,
                  sandboxId: data.sandboxId
                })
              });

              if (applyResponse.ok) {
                const applyData = await applyResponse.json();
                if (applyData.success) {
                  console.log('[createSandbox] Loaded files applied successfully');
                  addChatMessage(`✓ Applied ${Object.keys(currentSandboxFiles).length} files to new sandbox`, 'system');
                } else {
                  console.error('[createSandbox] Failed to apply loaded files:', applyData.error);
                  addChatMessage('⚠️ Sandbox created but files could not be applied', 'system');
                }
              } else {
                console.error('[createSandbox] HTTP error applying loaded files:', applyResponse.status);
                addChatMessage('⚠️ Sandbox created but files could not be applied', 'system');
              }
            } catch (error) {
              console.error('[createSandbox] Error applying loaded files:', error);
              addChatMessage('⚠️ Sandbox created but files could not be applied', 'system');
            }
          }, 3000); // Wait for sandbox to be fully ready
        }
        
        // Restart Vite server to ensure it's running
        setTimeout(async () => {
          try {
            console.log('[createSandbox] Ensuring Vite server is running...');
            const restartResponse = await fetch('/api/restart-vite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            // Create GitHub repository regardless of Vite server status
            setTimeout(async () => {
              console.log('[createSandbox] Checking for GitHub integration');
              console.log('[createSandbox] Debug info:', {
                githubConnected,
                appliedCodeLength: conversationContext.appliedCode.length,
                user: !!user,
                promptInput: promptInput.substring(0, 50) + '...'
              });
              
              // Check if this is a new generation and GitHub is connected
              if (githubConnected && conversationContext.appliedCode.length === 0) {
                console.log('[createSandbox] Creating GitHub repository for new generation');
                
                try {
                  // Create GitHub repository
                  const repoUrl = await createGitHubRepoForGeneration(promptInput);
                  if (repoUrl) {
                    console.log('[createSandbox] GitHub repository created successfully:', repoUrl);
                    addChatMessage(`🚀 Created GitHub repository: ${repoUrl}`, 'system');
                    
                    // Note: Credits will be consumed during code generation, not here
                    console.log('[createSandbox] GitHub repo created - credits will be consumed during code generation');
                    
                    // Extract repo name from URL
                    const repoName = repoUrl.split('/').pop() || 'unknown-repo';
                    console.log('[createSandbox] Extracted repo name:', repoName);
                    
                    // Store repo info
                    (window as any).currentGitHubRepoInfo = {
                      name: repoName,
                      url: repoUrl
                    };
                    
                                            // Wait a bit more for files to be fully written, then commit
                        setTimeout(async () => {
                          console.log('[createSandbox] Committing code to GitHub repository:', repoName);
                          const commitMessage = `CodeBharat.dev: Initial commit - ${promptInput}`;
                          const commitResult = await commitSandboxToGitHub(commitMessage);
                          console.log('[createSandbox] Git commit result:', commitResult);
                          
                          // After successful commit, save app to database
                          if (commitResult && commitResult.success) {
                            console.log('[createSandbox] Saving app to database after successful commit');
                            
                            // Get current files from sandbox
                            const currentFiles = await fetchCurrentSandboxFiles();
                            
                            // Get GitHub repository URL from the stored info
                            const githubRepoInfo = (window as any).currentGitHubRepoInfo;
                            const githubRepoUrl = githubRepoInfo?.url || data.repoUrl;
                            
                            console.log('[createSandbox] GitHub repo info for database save:', {
                              repoName,
                              githubRepoUrl,
                              githubRepoInfo
                            });
                            
                            // Save app data
                            const appId = await saveAppToDatabase({
                              name: promptInput.substring(0, 50) + (promptInput.length > 50 ? '...' : ''),
                              description: promptInput,
                              sandboxId: sandboxData?.sandboxId || '',
                              githubRepo: repoName,
                              githubRepoUrl: githubRepoUrl,
                              prompt: promptInput,
                              files: currentFiles,
                              chatHistory: chatMessages,
                              creditsConsumed: currentGenerationCredits
                            });
                            
                            if (appId) {
                              console.log('[createSandbox] App saved successfully with ID:', appId);
                              addChatMessage(`✅ App saved to your collection!`, 'system');
                            } else {
                              console.error('[createSandbox] Failed to save app to database');
                              addChatMessage(`⚠️ App created but failed to save to database`, 'system');
                            }
                          }
                        }, 2000); // Wait 2 more seconds for files to be written
                  } else {
                    console.log('[createSandbox] GitHub repository creation failed');
                    addChatMessage('⚠️ Failed to create GitHub repository', 'system');
                    
                    // Don't consume credits if GitHub repo creation failed
                    addChatMessage('💳 No credits consumed - GitHub repository creation failed', 'system');
                  }
                } catch (error) {
                  console.error('[createSandbox] GitHub repository creation error:', error);
                  addChatMessage('⚠️ GitHub repository creation failed', 'system');
                  
                  // Don't consume credits if GitHub repo creation failed
                  addChatMessage('💳 No credits consumed - GitHub repository creation failed', 'system');
                }
              } else {
                console.log('[createSandbox] GitHub integration skipped:', {
                  githubConnected,
                  appliedCodeLength: conversationContext.appliedCode.length,
                  reason: githubConnected ? 'Not a new generation (edit mode)' : 'GitHub not connected'
                });
                
                // Add more detailed debugging
                if (!githubConnected) {
                  console.log('[createSandbox] GitHub not connected - checking why...');
                  console.log('[createSandbox] User state:', { user: !!user, userId: user?.uid });
                  console.log('[createSandbox] GitHub connection state:', { githubConnected, githubUsername });
                  
                  // If GitHub is not connected, still consume credits since app generation is successful
                  if (isTokenCheckEnabled) {
                    try {
                      const estimatedTokens = Math.ceil(promptInput.length / 4) + 800 + 2500 + Math.ceil((Math.ceil(promptInput.length / 4) + 800 + 2500) * 0.2);
                      
                      const consumeResponse = await fetch('/api/tokens/consume', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          userId: user.uid,
                          prompt: promptInput,
                        }),
                      });

                      const consumeData = await consumeResponse.json();

                      if (consumeData.success) {
                        // Update token balance
                        setTokenBalance(consumeData.remainingBalance);
                        addChatMessage(`💳 AI Credits consumed: ${consumeData.tokensConsumed.toLocaleString()}. Remaining: ${consumeData.remainingBalance.toLocaleString()}`, 'system');
                      } else {
                        console.error('Failed to consume tokens (GitHub not connected):', consumeData.error);
                        addChatMessage(`⚠️ Warning: Failed to consume credits`, 'system');
                      }
                    } catch (error) {
                      console.error('Error consuming tokens (GitHub not connected):', error);
                      addChatMessage(`⚠️ Warning: Failed to consume credits`, 'system');
                    }
                  }
                }
                
                if (conversationContext.appliedCode.length > 0) {
                  console.log('[createSandbox] Not a new generation - applied code exists:', conversationContext.appliedCode.length, 'items');
                }
              }
            }, 3000); // Wait 3 seconds for sandbox to be ready
            
            // Try to restart Vite server (but don't depend on it for GitHub)
            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log('[createSandbox] Vite server started successfully');
              } else {
                console.log('[createSandbox] Vite server restart failed, but continuing with GitHub integration');
              }
            } else {
              console.log('[createSandbox] Vite server restart failed, but continuing with GitHub integration');
            }
          } catch (error) {
            console.error('[createSandbox] Error starting Vite server:', error);
          }
        }, 2000);
        
        // Only add welcome message if not coming from home screen
        if (!fromHomeScreen) {
          addChatMessage(`Sandbox created! ID: ${data.sandboxId}. I now have context of your sandbox and can help you build your app. Just ask me to create components and I'll automatically apply them!

Tip: I automatically detect and install npm packages from your code imports (like react-router-dom, axios, etc.)`, 'system');
        }
        
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = data.url;
          }
        }, 100);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[createSandbox] Error:', error);
      updateStatus('Error', false);
      log(`Failed to create sandbox: ${error.message}`, 'error');
      addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
    } finally {
      setLoading(false);
    }
  } catch (error: any) {
    console.error('[createSandbox] Outer error:', error);
    updateStatus('Error', false);
    log(`Failed to create sandbox: ${error.message}`, 'error');
    addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
    setLoading(false);
  }
};

  const displayStructure = (structure: any) => {
    if (typeof structure === 'object') {
      setStructureContent(JSON.stringify(structure, null, 2));
    } else {
      setStructureContent(structure || 'No structure available');
    }
  };

  const applyGeneratedCode = async (code: string, isEdit: boolean = false) => {
    setLoading(true);
    log('Applying AI-generated code...');
    
    try {
      // Show progress component instead of individual messages
      setCodeApplicationState({ stage: 'analyzing' });
      
      // Get pending packages from tool calls
      const pendingPackages = ((window as any).pendingPackages || []).filter((pkg: any) => pkg && typeof pkg === 'string');
      if (pendingPackages.length > 0) {
        console.log('[applyGeneratedCode] Sending packages from tool calls:', pendingPackages);
        // Clear pending packages after use
        (window as any).pendingPackages = [];
      }
      
      // Use streaming endpoint for real-time feedback
      const response = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          response: code,
          isEdit: isEdit,
          packages: pendingPackages,
          sandboxId: sandboxData?.sandboxId // Pass the sandbox ID to ensure proper connection
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply code: ${response.statusText}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalData: any = null;
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'start':
                  // Don't add as chat message, just update state
                  setCodeApplicationState({ stage: 'analyzing' });
                  break;
                  
                case 'step':
                  // Update progress state based on step
                  if (data.message.includes('Installing') && data.packages) {
                    setCodeApplicationState({ 
                      stage: 'installing', 
                      packages: data.packages 
                    });
                  } else if (data.message.includes('Creating files') || data.message.includes('Applying')) {
                    setCodeApplicationState({ 
                      stage: 'applying',
                      filesGenerated: data.filesCreated || 0
                    });
                  }
                  break;
                  
                case 'package-progress':
                  // Handle package installation progress
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({ 
                      ...prev,
                      installedPackages: data.installedPackages 
                    }));
                  }
                  break;
                  
                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (data.command && !data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                  
                case 'success':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({ 
                      ...prev,
                      installedPackages: data.installedPackages 
                    }));
                  }
                  break;
                  
                case 'file-progress':
                  // Skip file progress messages, they're noisy
                  break;
                  
                case 'file-complete':
                  // Could add individual file completion messages if desired
                  break;
                  
                case 'command-progress':
                  addChatMessage(`${data.action} command: ${data.command}`, 'command', { commandType: 'input' });
                  break;
                  
                case 'command-output':
                  addChatMessage(data.output, 'command', { 
                    commandType: data.stream === 'stderr' ? 'error' : 'output' 
                  });
                  break;
                  
                case 'command-complete':
                  if (data.success) {
                    addChatMessage(`Command completed successfully`, 'system');
                  } else {
                    addChatMessage(`Command failed with exit code ${data.exitCode}`, 'system');
                  }
                  break;
                  
                case 'complete':
                  finalData = data;
                  setCodeApplicationState({ stage: 'complete' });
                  // Clear the state after a delay
                  setTimeout(() => {
                    setCodeApplicationState({ stage: null });
                  }, 3000);
                  break;
                  
                case 'error':
                  addChatMessage(`Error: ${data.message || data.error || 'Unknown error'}`, 'system');
                  break;
                  
                case 'warning':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                  
                case 'info':
                  // Show info messages, especially for package installation
                  if (data.message) {
                    addChatMessage(data.message, 'system');
                  }
                  break;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Process final data
      if (finalData && finalData.type === 'complete') {
        const data = {
          success: true,
          results: finalData.results,
          explanation: finalData.explanation,
          structure: finalData.structure,
          message: finalData.message
        };
        
        if (data.success) {
          const { results } = data;
        
        // Log package installation results without duplicate messages
        if (results.packagesInstalled?.length > 0) {
          log(`Packages installed: ${results.packagesInstalled.join(', ')}`);
        }
        
        if (results.filesCreated?.length > 0) {
          log('Files created:');
          results.filesCreated.forEach((file: string) => {
            log(`  ${file}`, 'command');
          });
          
          // Verify files were actually created by refreshing the sandbox if needed
          if (sandboxData?.sandboxId && results.filesCreated.length > 0) {
            // Small delay to ensure files are written
            setTimeout(() => {
              // Force refresh the iframe to show new files
              if (iframeRef.current) {
                iframeRef.current.src = iframeRef.current.src;
              }
              
              // After files are applied and iframe is refreshed, check for pending edit commit
              setTimeout(async () => {
                const pendingEditCommit = (window as any).pendingEditCommit;
                if (pendingEditCommit) {
                  console.log('[applyGeneratedCode] Executing pending edit commit after file application:', pendingEditCommit);
                  const commitResult = await commitSandboxToGitHub(pendingEditCommit.commitMessage);
                  console.log('[applyGeneratedCode] Edit commit result:', commitResult);
                  
                  // Clear the pending edit commit
                  delete (window as any).pendingEditCommit;
                }
              }, 2000); // Wait 2 seconds for iframe refresh
            }, 1000);
          }
        }
        
        if (results.filesUpdated?.length > 0) {
          log('Files updated:');
          results.filesUpdated.forEach((file: string) => {
            log(`  ${file}`, 'command');
          });
        }
        
        // Update conversation context with applied code
        setConversationContext(prev => ({
          ...prev,
          appliedCode: [...prev.appliedCode, {
            files: [...(results.filesCreated || []), ...(results.filesUpdated || [])],
            timestamp: new Date()
          }]
        }));
        
        if (results.commandsExecuted?.length > 0) {
          log('Commands executed:');
          results.commandsExecuted.forEach((cmd: string) => {
            log(`  $ ${cmd}`, 'command');
          });
        }
        
        if (results.errors?.length > 0) {
          results.errors.forEach((err: string) => {
            log(err, 'error');
          });
        }
        
        if (data.structure) {
          displayStructure(data.structure);
        }
        
        if (data.explanation) {
          log(data.explanation);
        }
        
        if ((data as any).autoCompleted && (data as any).autoCompletedComponents) {
          log('Auto-generating missing components...', 'command');
          
                      setTimeout(() => {
              log('Auto-generated missing components:', 'info');
              (data as any).autoCompletedComponents.forEach((comp: string) => {
                log(`  ${comp}`, 'command');
              });
            }, 1000);
        } else if ((data as any).warning) {
          log((data as any).warning, 'error');
          
          if ((data as any).missingImports && (data as any).missingImports.length > 0) {
            const missingList = (data as any).missingImports.join(', ');
            addChatMessage(
              `Ask me to "create the missing components: ${missingList}" to fix these import errors.`,
              'system'
            );
          }
        }
        
        log('Code applied successfully!');
        console.log('[applyGeneratedCode] Response data:', data);
        console.log('[applyGeneratedCode] Debug info:', (data as any).debug);
        console.log('[applyGeneratedCode] Current sandboxData:', sandboxData);
        console.log('[applyGeneratedCode] Current iframe element:', iframeRef.current);
        console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current?.src);
        
        if (results.filesCreated?.length > 0) {
          setConversationContext(prev => ({
            ...prev,
            appliedCode: [...prev.appliedCode, {
              files: results.filesCreated,
              timestamp: new Date()
            }]
          }));
          
          // Update the chat message to show success
          // Only show file list if not in edit mode
          if (isEdit) {
            addChatMessage(`Edit applied successfully!`, 'system');
          } else {
            // Check if this is part of a generation flow (has recent AI recreation message)
            const recentMessages = chatMessages.slice(-5);
            const isPartOfGeneration = recentMessages.some(m => 
              m.content.includes('AI recreation generated') || 
              m.content.includes('Code generated')
            );
            
            // Don't show files if part of generation flow to avoid duplication
            if (isPartOfGeneration) {
              addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system');
            } else {
              addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system', {
                appliedFiles: results.filesCreated
              });
            }
          }
          
          // If there are failed packages, add a message about checking for errors
          if (results.packagesFailed?.length > 0) {
            addChatMessage(`⚠️ Some packages failed to install. Check the error banner above for details.`, 'system');
          }
          
          // Fetch updated file structure
          await fetchSandboxFiles();
          
          // Automatically commit to GitHub if connected
          console.log('[applyGeneratedCode] Checking GitHub commit conditions:', {
            githubConnected,
            currentGitHubRepo,
            filesCreated: results.filesCreated?.length,
            currentSandboxFiles: Object.keys(currentSandboxFiles).length
          });
          
          console.log('[applyGeneratedCode] Current GitHub repo state:', currentGitHubRepo);
          
          // For edits, we need to commit to existing repository
          const repoInfo = (window as any).currentGitHubRepoInfo;
          console.log('[applyGeneratedCode] Checking for edit commit:', {
            githubConnected,
            hasCurrentRepo: !!currentGitHubRepo,
            hasRepoInfo: !!repoInfo,
            filesCreated: results.filesCreated?.length,
            isEdit
          });
          
          if (isEdit && githubConnected && (currentGitHubRepo || repoInfo) && results.filesCreated?.length > 0) {
            const repoToUse = currentGitHubRepo || repoInfo;
            console.log('[applyGeneratedCode] ✅ Will commit edit to GitHub repository:', repoToUse.name);
            
            // Store commit info for later execution after files are applied
            (window as any).pendingEditCommit = {
              repoName: repoToUse.name,
              commitMessage: `CodeBharat.dev: Update ${results.filesCreated.join(', ')}`,
              isEdit
            };
            
            console.log('[applyGeneratedCode] Stored pending edit commit:', (window as any).pendingEditCommit);
            addChatMessage(`📝 Edit commit queued for: ${repoToUse.name}`, 'system');
          }
          
          // Automatically check and install any missing packages
          await checkAndInstallPackages();
          
          // Test build to ensure everything compiles correctly
          // Skip build test for now - it's causing errors with undefined activeSandbox
          // The build test was trying to access global.activeSandbox from the frontend,
          // but that's only available in the backend API routes
          console.log('[build-test] Skipping build test - would need API endpoint');
          
          // Force iframe refresh after applying code
          const refreshDelay = appConfig.codeApplication.defaultRefreshDelay; // Allow Vite to process changes
          
          setTimeout(() => {
            if (iframeRef.current && sandboxData?.url) {
              // Debounce check to prevent rapid successive refreshes
              const now = Date.now();
              if (now - lastRefreshTime < REFRESH_DEBOUNCE_MS) {
                console.log('[home] Skipping refresh due to debounce (last refresh was', now - lastRefreshTime, 'ms ago)');
                return;
              }
              
              // Check if iframe is already working before forcing refresh
              try {
                const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                if (iframeDoc && iframeDoc.readyState === 'complete') {
                  console.log('[home] Iframe already loaded and working, skipping refresh');
                  return;
                }
              } catch (e) {
                console.log('[home] Cannot check iframe state (CORS), proceeding with refresh');
              }
              
              console.log('[home] Refreshing iframe after code application...');
              setLastRefreshTime(now);
              
              // Method 1: Change src with timestamp
              const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&applied=true`;
              iframeRef.current.src = urlWithTimestamp;
              
              // Method 2: Force reload after a short delay
              setTimeout(() => {
                try {
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.location.reload();
                    console.log('[home] Force reloaded iframe content');
                  }
                } catch (e) {
                  console.log('[home] Could not reload iframe (cross-origin):', e);
                }
              }, 1000);
            }
          }, refreshDelay);
          
          // Vite error checking removed - handled by template setup
        }
        
          // Give Vite HMR a moment to detect changes, then ensure refresh
          if (iframeRef.current && sandboxData?.url) {
            // Wait for Vite to process the file changes
            // If packages were installed, wait longer for Vite to restart
            const packagesInstalled = results?.packagesInstalled?.length > 0 || data.results?.packagesInstalled?.length > 0;
            const refreshDelay = packagesInstalled ? appConfig.codeApplication.packageInstallRefreshDelay : appConfig.codeApplication.defaultRefreshDelay;
            console.log(`[applyGeneratedCode] Packages installed: ${packagesInstalled}, refresh delay: ${refreshDelay}ms`);
            
            setTimeout(async () => {
            if (iframeRef.current && sandboxData?.url) {
              // Debounce check to prevent rapid successive refreshes
              const now = Date.now();
              if (now - lastRefreshTime < REFRESH_DEBOUNCE_MS) {
                console.log('[applyGeneratedCode] Skipping refresh due to debounce (last refresh was', now - lastRefreshTime, 'ms ago)');
                return;
              }
              
              // Check if iframe is already working properly before forcing refresh
              try {
                const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                if (iframeDoc && iframeDoc.readyState === 'complete') {
                  // Iframe is already loaded and working, skip refresh
                  console.log('[applyGeneratedCode] Iframe already loaded and working, skipping refresh');
                  return;
                }
              } catch (e) {
                // CORS error means we can't check, but iframe might be working
                console.log('[applyGeneratedCode] Cannot check iframe state (CORS), proceeding with refresh');
              }
              
              console.log('[applyGeneratedCode] Starting iframe refresh sequence...');
              console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current.src);
              console.log('[applyGeneratedCode] Sandbox URL:', sandboxData.url);
              setLastRefreshTime(now);
              
              // Method 1: Try direct navigation first
              try {
                const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&force=true`;
                console.log('[applyGeneratedCode] Attempting direct navigation to:', urlWithTimestamp);
                
                // Remove any existing onload handler
                iframeRef.current.onload = null;
                
                // Navigate directly
                iframeRef.current.src = urlWithTimestamp;
                
                // Wait a bit and check if it loaded
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try to access the iframe content to verify it loaded
                try {
                  const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                  if (iframeDoc && iframeDoc.readyState === 'complete') {
                    console.log('[applyGeneratedCode] Iframe loaded successfully');
                    return;
                  }
                } catch (e) {
                  console.log('[applyGeneratedCode] Cannot access iframe content (CORS), assuming loaded');
                  return;
                }
              } catch (e) {
                console.error('[applyGeneratedCode] Direct navigation failed:', e);
              }
              
              // Method 2: Force complete iframe recreation if direct navigation failed
              console.log('[applyGeneratedCode] Falling back to iframe recreation...');
              const parent = iframeRef.current.parentElement;
              const newIframe = document.createElement('iframe');
              
              // Copy attributes
              newIframe.className = iframeRef.current.className;
              newIframe.title = iframeRef.current.title;
              newIframe.allow = iframeRef.current.allow;
              // Copy sandbox attributes
              const sandboxValue = iframeRef.current.getAttribute('sandbox');
              if (sandboxValue) {
                newIframe.setAttribute('sandbox', sandboxValue);
              }
              
              // Remove old iframe
              iframeRef.current.remove();
              
              // Add new iframe
              newIframe.src = `${sandboxData.url}?t=${Date.now()}&recreated=true`;
              parent?.appendChild(newIframe);
              
              // Update ref
              (iframeRef as any).current = newIframe;
              
              console.log('[applyGeneratedCode] Iframe recreated with new content');
            } else {
              console.error('[applyGeneratedCode] No iframe or sandbox URL available for refresh');
            }
          }, refreshDelay); // Dynamic delay based on whether packages were installed
        }
        
        } else {
          throw new Error(finalData?.error || 'Failed to apply code');
        }
      } else {
        // If no final data was received, still close loading
        addChatMessage('Code application may have partially succeeded. Check the preview.', 'system');
      }
    } catch (error: any) {
      log(`Failed to apply code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      // Clear isEdit flag after applying code
      setGenerationProgress(prev => ({
        ...prev,
        isEdit: false
      }));
    }
  };

  const fetchSandboxFiles = async () => {
    if (!sandboxData) return;
    
    try {
      const response = await fetch('/api/get-sandbox-files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSandboxFiles(data.files || {});
          setFileStructure(data.structure || '');
          console.log('[fetchSandboxFiles] Updated file list:', Object.keys(data.files || {}).length, 'files');
        }
      }
    } catch (error) {
      console.error('[fetchSandboxFiles] Error fetching files:', error);
    }
  };

  const fetchCurrentSandboxFiles = async () => {
    if (!sandboxData) {
      console.log('[fetchCurrentSandboxFiles] No sandbox data available');
      return {};
    }
    
    try {
      const response = await fetch('/api/get-sandbox-files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out unnecessary files
          const filteredFiles: Record<string, string> = {};
          const allFiles = data.files || {};
          
          Object.entries(allFiles).forEach(([path, content]) => {
            // Only include meaningful source files
            const isSourceFile = path.startsWith('src/') || 
                                path.startsWith('components/') || 
                                path.startsWith('pages/') ||
                                path === 'App.jsx' ||
                                path === 'App.js' ||
                                path === 'main.jsx' ||
                                path === 'main.js' ||
                                path === 'index.jsx' ||
                                path === 'index.js' ||
                                path === 'index.css' ||
                                path === 'App.css' ||
                                path === 'package.json' ||
                                path === 'vite.config.js' ||
                                path === 'tailwind.config.js' ||
                                path === 'postcss.config.js';
            
            if (isSourceFile) {
              filteredFiles[path] = content as string;
            }
          });
          
          setCurrentSandboxFiles(filteredFiles);
          console.log('[fetchCurrentSandboxFiles] Updated current file list:', Object.keys(filteredFiles).length, 'files');
          console.log('[fetchCurrentSandboxFiles] Files:', Object.keys(filteredFiles));
          return filteredFiles;
        }
      }
    } catch (error) {
      console.error('[fetchCurrentSandboxFiles] Error fetching files:', error);
    }
    return {};
  };



  const fetchSavedApps = async () => {
    if (!user) {
      setSavedApps([]);
      return;
    }

    try {
      const response = await fetch(`/api/save-app?userId=${user.uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedApps(data.apps || []);
        } else {
          console.error('[fetchSavedApps] API error:', data.error);
          setSavedApps([]);
        }
      } else {
        console.error('[fetchSavedApps] HTTP error:', response.status);
        setSavedApps([]);
      }
    } catch (error) {
      console.error('[fetchSavedApps] Error:', error);
      setSavedApps([]);
    }
  };



  const loadSavedApp = async (appId: string) => {
    try {
      setLoadingAppId(appId);
      setShowLoadingModal(true);
      setLoadingSteps(['Loading app data...']);
      console.log('[loadSavedApp] Loading app with ID:', appId);
      
      const response = await fetch(`/api/save-app?appId=${appId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('[loadSavedApp] API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[loadSavedApp] API response data:', data);
        
        if (data.success && data.app) {
          const app = data.app;
          setLoadingAppName(app.name);
          setLoadingSteps(['Loading app data...', 'App data loaded successfully']);
          console.log('[loadSavedApp] App data loaded:', {
            name: app.name,
            sandboxId: app.sandboxId,
            hasFiles: !!app.files,
            fileCount: app.files ? Object.keys(app.files).length : 0,
            hasGitHubRepo: !!app.githubRepo,
            hasGitHubRepoUrl: !!app.githubRepoUrl,
            githubRepo: app.githubRepo,
            githubRepoUrl: app.githubRepoUrl,
            hasChatHistory: !!app.chatHistory,
            chatHistoryLength: app.chatHistory ? app.chatHistory.length : 0
          });

          try {
            // Set the prompt input from the saved app
            if (app.prompt) {
              console.log('[loadSavedApp] Setting prompt input:', app.prompt.substring(0, 50) + '...');
              setPromptInput(app.prompt);
            }

            // Set the chat history if available
            if (app.chatHistory && Array.isArray(app.chatHistory)) {
              console.log('[loadSavedApp] Setting chat history:', app.chatHistory.length, 'messages');
              setChatMessages(app.chatHistory);
            }

            // Check if GitHub repository exists and user is connected - prioritize GitHub over database files
            if (app.githubRepo && app.githubRepoUrl && githubConnected) {
              setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...']);
              console.log('[loadSavedApp] GitHub repository found and user connected, creating sandbox and cloning:', app.githubRepo);
              addChatMessage(`🔄 Creating sandbox and cloning repository: ${app.githubRepo}`, 'system');
              
              try {
                // Create sandbox and clone repository
                setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...', 'Cloning repository...']);
                const result = await createSandboxAndCloneRepo(app.githubRepo, app.githubRepoUrl);
                
                if (result && result.files && Object.keys(result.files).length > 0) {
                  setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...', 'Cloning repository...', 'Loading files...']);
                  console.log('[loadSavedApp] Successfully loaded files from sandbox:', Object.keys(result.files).length, 'files');
                  
                  // Navigate to sandbox interface and show the files
                  setShowHomeScreen(false);
                  setActiveTab('generation');
                  
                  setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...', 'Cloning repository...', 'Loading files...', 'App ready!']);
                  addChatMessage(`✅ Loaded app: ${app.name} with ${Object.keys(result.files).length} files from GitHub`, 'system');
                  addChatMessage('📁 Repository cloned and files loaded from sandbox', 'system');
                  addChatMessage('🚀 Your app is now ready to run!', 'system');
                  
                  // Close loading modal after a brief delay
                  setTimeout(() => {
                    setShowLoadingModal(false);
                  }, 1000);
                } else {
                  console.log('[loadSavedApp] No files found after cloning repository');
                  setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...', 'Cloning repository...', 'No files found']);
                  addChatMessage(`⚠️ Loaded app: ${app.name}`, 'system');
                  addChatMessage('❌ No files found in GitHub repository', 'error');
                  addChatMessage('💡 The repository might be empty or inaccessible', 'system');
                  
                  setTimeout(() => {
                    setShowLoadingModal(false);
                  }, 2000);
                }
              } catch (githubError) {
                console.error('[loadSavedApp] Error cloning repository:', githubError);
                setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Creating sandbox...', 'Cloning repository...', 'Error cloning repository']);
                addChatMessage(`⚠️ Loaded app: ${app.name}`, 'system');
                addChatMessage('❌ Failed to clone GitHub repository', 'error');
                addChatMessage('💡 Check if the repository exists and is accessible', 'system');
                
                setTimeout(() => {
                  setShowLoadingModal(false);
                }, 2000);
              }
            } else if (app.githubRepo && app.githubRepoUrl && !githubConnected) {
              // GitHub repository exists but user is not connected - show prominent alert and reconnection prompt
              setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'GitHub disconnected, showing reconnection prompt...']);
              console.log('[loadSavedApp] GitHub repository exists but user not connected, showing reconnection prompt');
              
              // Close loading modal first
              setShowLoadingModal(false);
              
              // Show custom alert modal
              setTimeout(() => {
                showCustomAlertModal(
                  'GitHub Account Disconnected',
                  `This app "${app.name}" was originally saved to GitHub, but your GitHub account is now disconnected.\n\nPlease reconnect your GitHub account to access the original repository, or continue with database files.`,
                  'warning',
                  'Reconnect GitHub',
                  () => {
                    setShowCustomAlert(false);
                    setShowGitHubConnectionModal(true);
                  }
                );
                
                // Add chat messages
                addChatMessage(`⚠️ Loaded app: ${app.name}`, 'system');
                addChatMessage('🔗 This app was originally saved to GitHub, but your GitHub account is now disconnected', 'system');
                addChatMessage('💡 Please reconnect your GitHub account to access the repository', 'system');
                addChatMessage('📁 You can continue with database files or reconnect GitHub for full access', 'system');
              }, 500);
              
              return; // Exit early to prevent further processing
            } else if (app.files && Object.keys(app.files).length > 0) {
              // Fallback to database files if no GitHub repository
              setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Loading files from database...']);
              console.log('[loadSavedApp] No GitHub repo, using database files:', Object.keys(app.files).length, 'files');
              setCurrentSandboxFiles(app.files);
              
              // Navigate to sandbox interface and show the saved files
              console.log('[loadSavedApp] Navigating to sandbox interface');
              
              // Hide home screen to show sandbox interface
              setShowHomeScreen(false);
              
              // Create a simple sandbox data object for the interface
              const mockSandboxData = {
                sandboxId: `loaded-${appId}`,
                url: 'http://localhost:5173', // Default Vite URL
                structure: null
              };
              console.log('[loadSavedApp] Setting sandbox data:', mockSandboxData);
              setSandboxData(mockSandboxData);
              updateStatus('App loaded', true);
              
              // Switch to code generation tab to show the files
              setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Loading files from database...', 'Preparing interface...']);
              console.log('[loadSavedApp] Switching to generation tab');
              setActiveTab('generation');
              
              // Add a small delay to ensure state updates are processed
              setTimeout(() => {
                setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'Loading files from database...', 'Preparing interface...', 'App ready!']);
                console.log('[loadSavedApp] State updates completed, adding chat messages');
                addChatMessage(`✓ Loaded app: ${app.name} with ${Object.keys(app.files).length} files`, 'system');
                addChatMessage('📁 Files loaded from database', 'system');
                addChatMessage('🚀 Starting sandbox and running app...', 'system');
                
                // Close loading modal after a brief delay
                setTimeout(() => {
                  setShowLoadingModal(false);
                }, 1000);
              }, 100);
            } else {
              // No files and no GitHub repository
              setLoadingSteps(['Loading app data...', 'App data loaded successfully', 'No files found']);
              console.log('[loadSavedApp] No files and no GitHub repository available');
              
              // Close loading modal first
              setShowLoadingModal(false);
              
              // Show custom alert for no files
              setTimeout(() => {
                showCustomAlertModal(
                  'No Files Found',
                  `This app "${app.name}" has no saved files or GitHub repository.\n\nThis might be because:\n• The app was saved without files\n• GitHub repository was deleted\n• Database backup is missing`,
                  'error',
                  'Continue',
                  () => {
                    setShowCustomAlert(false);
                  }
                );
                
                addChatMessage(`⚠️ Loaded app: ${app.name}`, 'system');
                addChatMessage('❌ No files or GitHub repository found for this app', 'error');
                addChatMessage('💡 This app was saved without files or GitHub repository', 'system');
              }, 500);
              
              return; // Exit early
            }
          } catch (stateError) {
            console.error('[loadSavedApp] Error setting state:', stateError);
            addChatMessage('Error setting app data. Please try again.', 'error');
          }
        } else {
          console.error('[loadSavedApp] API returned error:', data);
          addChatMessage('Failed to load app.', 'error');
        }
      } else {
        console.error('[loadSavedApp] HTTP error:', response.status);
        addChatMessage('Failed to load app.', 'error');
      }
    } catch (error) {
      console.error('[loadSavedApp] Error:', error);
      addChatMessage('Error loading app. Please try again.', 'error');
      setShowLoadingModal(false);
    } finally {
      setLoadingAppId(null);
      setLoadingAppName('');
      setLoadingSteps([]);
    }
  };

  const commitToGitHub = async (appId: string) => {
    if (!githubConnected) {
      addChatMessage('🔗 Please connect your GitHub account first to commit your app to GitHub.', 'system');
      addChatMessage('💡 Click the "Connect GitHub" button in the sidebar to get started.', 'system');
      setShowGitHubConnectionModal(true);
      return;
    }
    
    setSelectedAppForGitHub(appId);
    setShowGitHubModal(true);
  };

  const handleGitHubCommit = async (repoName: string, commitMessage: string) => {
    if (!selectedAppForGitHub) return;

    try {
      const response = await fetch('/api/github-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: selectedAppForGitHub,
          repoName,
          commitMessage,
          userId: user?.uid
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addChatMessage(`✓ Successfully committed to GitHub: ${data.repoUrl}`, 'system');
          setShowGitHubModal(false);
          setSelectedAppForGitHub(null);
        } else {
          addChatMessage(`Failed to commit: ${data.error}`, 'error');
        }
      } else {
        addChatMessage('Failed to commit to GitHub. Please try again.', 'error');
      }
    } catch (error) {
      console.error('[handleGitHubCommit] Error:', error);
      addChatMessage('Error committing to GitHub. Please try again.', 'error');
    }
  };

  const checkGitHubConnection = async () => {
    console.log('[checkGitHubConnection] Starting check for user:', !!user);
    
    if (!user) {
      console.log('[checkGitHubConnection] No user, setting connected to false');
      setGitHubConnected(false);
      return;
    }

    try {
      console.log('[checkGitHubConnection] Calling API for user:', user.uid);
      const response = await fetch(`/api/github-status?userId=${user.uid}`);
      console.log('[checkGitHubConnection] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[checkGitHubConnection] API response data:', data);
        setGitHubConnected(data.connected);
        setGithubUsername(data.username || null);
        console.log('[checkGitHubConnection] Set GitHub connected to:', data.connected, 'Username:', data.username);
      } else {
        console.error('[checkGitHubConnection] API failed with status:', response.status);
        setGitHubConnected(false);
        setGithubUsername(null);
      }
    } catch (error) {
      console.error('[checkGitHubConnection] Error:', error);
      setGitHubConnected(false);
    }
  };

  const connectGitHub = async () => {
    if (!user) {
      addChatMessage('Please log in to connect your GitHub account.', 'system');
      return;
    }

    try {
      console.log('[connectGitHub] Starting GitHub connection for user:', user.uid);
      
      const response = await fetch(`/api/github/auth?userId=${user.uid}`);
      console.log('[connectGitHub] Auth API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[connectGitHub] Auth API response data:', data);
        
        if (data.success) {
          console.log('[connectGitHub] Redirecting to GitHub OAuth URL:', data.authUrl);
          // Redirect to GitHub OAuth
          window.location.href = data.authUrl;
        } else {
          console.error('[connectGitHub] Auth API error:', data.error);
          addChatMessage(`Failed to start GitHub connection: ${data.error}`, 'error');
        }
      } else {
        const errorText = await response.text();
        console.error('[connectGitHub] Auth API failed:', response.status, errorText);
        addChatMessage(`Failed to start GitHub connection: HTTP ${response.status}`, 'error');
      }
    } catch (error) {
      console.error('[connectGitHub] Network Error:', error);
      addChatMessage('Error connecting to GitHub. Please try again.', 'error');
    }
  };

  const handleDisconnectGitHub = () => {
    // Show confirmation dialog before disconnecting
    showCustomAlertModal(
      'Disconnect GitHub Account?',
      `⚠️ WARNING: Disconnecting your GitHub account may result in data loss!\n\n• Apps saved to GitHub repositories may become inaccessible\n• You may lose access to your generated code\n• Database backups will still be available, but GitHub integration will be lost\n\nAre you sure you want to disconnect your GitHub account?`,
      'warning',
      'Yes, Disconnect',
      () => {
        setShowCustomAlert(false);
        disconnectGitHub();
      }
    );
  };

  const disconnectGitHub = async () => {
    if (!user) return;
    
    try {
      console.log('[disconnectGitHub] Starting disconnect for user:', user.uid);
      
      // Remove GitHub connection from Firebase
      const response = await fetch('/api/save-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disconnect-github',
          appData: {
            userId: user.uid,
          },
        }),
      });

      const data = await response.json();
      console.log('[disconnectGitHub] Response:', data);

      if (response.ok && data.success) {
        setGitHubConnected(false);
        setGithubUsername(null);
        setShowGitHubConnectionModal(false);
        addChatMessage('GitHub account disconnected successfully', 'system');
        console.log('[disconnectGitHub] Successfully disconnected');
      } else {
        const errorMessage = data.error || 'Failed to disconnect GitHub account';
        console.error('[disconnectGitHub] API Error:', errorMessage);
        addChatMessage(`Failed to disconnect GitHub account: ${errorMessage}`, 'error');
        
        // For debugging: temporarily disconnect locally even if API fails
        console.log('[disconnectGitHub] Debug: Disconnecting locally for testing');
        setGitHubConnected(false);
        setGithubUsername(null);
        setShowGitHubConnectionModal(false);
      }
    } catch (error) {
      console.error('[disconnectGitHub] Network Error:', error);
      addChatMessage('Error disconnecting GitHub account: Network error', 'error');
      
      // For debugging: temporarily disconnect locally even if network fails
      console.log('[disconnectGitHub] Debug: Disconnecting locally for testing');
      setGitHubConnected(false);
      setGithubUsername(null);
      setShowGitHubConnectionModal(false);
    }
  };

  // Function to save app data to database
  const saveAppToDatabase = async (appData: {
    name: string;
    description: string;
    sandboxId: string;
    githubRepo: string;
    githubRepoUrl: string;
    prompt: string;
    files: Record<string, string>;
    chatHistory: ChatMessage[];
    creditsConsumed?: number;
  }) => {
    if (!user) {
      console.log('[saveAppToDatabase] No user available');
      return null;
    }

    try {
      console.log('[saveAppToDatabase] Saving app to database:', {
        name: appData.name,
        sandboxId: appData.sandboxId,
        githubRepo: appData.githubRepo,
        githubRepoUrl: appData.githubRepoUrl
      });

      const response = await fetch('/api/save-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          appData: {
            userId: user.uid,
            name: appData.name,
            description: appData.description,
            sandboxId: appData.sandboxId,
            githubRepo: appData.githubRepo,
            githubRepoUrl: appData.githubRepoUrl,
            prompt: appData.prompt,
            files: appData.files,
            chatHistory: appData.chatHistory,
            creditsConsumed: appData.creditsConsumed || currentGenerationCredits,
            previewUrl: sandboxData?.url || '',
            tags: ['generated', 'codebharat-dev'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      });

      const data = await response.json();
      console.log('[saveAppToDatabase] Save response:', data);

      if (response.ok && data.success) {
        console.log('[saveAppToDatabase] App saved successfully with ID:', data.appId);
        // Refresh the saved apps list
        fetchSavedApps();
        return data.appId;
      } else {
        console.error('[saveAppToDatabase] Failed to save app:', data.error);
        return null;
      }
    } catch (error) {
      console.error('[saveAppToDatabase] Error saving app:', error);
      return null;
    }
  };

  const createGitHubRepoForGeneration = async (prompt: string) => {
    console.log('[createGitHubRepoForGeneration] Starting with prompt:', prompt);
    console.log('[createGitHubRepoForGeneration] User:', !!user, 'GitHub connected:', githubConnected);
    console.log('[createGitHubRepoForGeneration] User details:', { userId: user?.uid, email: user?.email });
    console.log('[createGitHubRepoForGeneration] GitHub state:', { githubConnected, githubUsername });
    
    if (!user || !githubConnected) {
      console.log('[createGitHubRepoForGeneration] Skipped - no user or GitHub not connected');
      console.log('[createGitHubRepoForGeneration] Skipped reason:', { hasUser: !!user, githubConnected });
      return null;
    }

    try {
      // Generate a clean repository name with CodeBharat.dev prefix and timestamp
      const timestamp = Date.now();
      const cleanPrompt = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30); // Shorter to leave room for prefix and timestamp
      
      const repoName = `codebharat-dev-app-${timestamp}`;

      console.log('[createGitHubRepoForGeneration] Generated repo name:', repoName);

      const commitMessage = `CodeBharat.dev: Initial commit - ${prompt}`;
      const repoDescription = `Generated by CodeBharat.dev: ${prompt}`;

      console.log('[createGitHubRepoForGeneration] Calling GitHub API with:', {
        repoName,
        commitMessage,
        repoDescription,
        userId: user.uid,
        createOnly: true
      });

      const response = await fetch('/api/github-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          commitMessage,
          repoDescription,
          files: {},
          userId: user.uid,
          autoCommit: true,
          createOnly: true // Just create the repo, don't commit files yet
        }),
      });

      console.log('[createGitHubRepoForGeneration] API response status:', response.status);

      const data = await response.json();
      console.log('[createGitHubRepoForGeneration] API response data:', data);

      if (response.ok && data.success) {
        console.log('[createGitHubRepoForGeneration] Setting currentGitHubRepo to:', { name: repoName, url: data.repoUrl });
        setCurrentGitHubRepo({
          name: repoName,
          url: data.repoUrl
        });
        
        // Store repo info for later use
        (window as any).currentGitHubRepoInfo = {
          name: repoName,
          url: data.repoUrl
        };
        
        addChatMessage(`🚀 Created GitHub repository: ${data.repoUrl}`, 'system');
        return data.repoUrl;
      } else {
        addChatMessage(`⚠️ Failed to create GitHub repository: ${data.error}`, 'error');
        return null;
      }
    } catch (error) {
      console.error('[createGitHubRepoForGeneration] Error:', error);
      addChatMessage(`⚠️ Failed to create GitHub repository: Network error`, 'error');
      return null;
    }
  };

  const commitToCurrentGitHubRepo = async (files: Record<string, string>, commitMessage: string) => {
    // Get repo info from state or window object
    const repoInfo = currentGitHubRepo || (window as any).currentGitHubRepoInfo;
    
    console.log('[commitToCurrentGitHubRepo] Starting commit:', {
      user: !!user,
      githubConnected,
      currentGitHubRepo,
      repoInfo,
      filesCount: Object.keys(files).length,
      commitMessage
    });
    
    if (!user || !githubConnected || !repoInfo) {
      console.log('[commitToCurrentGitHubRepo] ❌ Commit skipped - missing requirements:', {
        user: !!user,
        githubConnected,
        currentGitHubRepo: !!currentGitHubRepo,
        repoInfo: !!repoInfo
      });
      return false;
    }

    try {
      console.log('[commitToCurrentGitHubRepo] Calling GitHub API with:', {
        repoName: repoInfo.name,
        commitMessage,
        filesCount: Object.keys(files).length,
        userId: user.uid,
        updateExisting: true
      });
      
      const response = await fetch('/api/github-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName: repoInfo.name,
          commitMessage,
          files,
          userId: user.uid,
          autoCommit: true,
          updateExisting: true
        }),
      });

      console.log('[commitToCurrentGitHubRepo] API response status:', response.status);
      const data = await response.json();
      console.log('[commitToCurrentGitHubRepo] API response data:', data);

      if (response.ok && data.success) {
        console.log('[commitToCurrentGitHubRepo] ✅ Commit successful');
        addChatMessage(`✅ Committed to GitHub: ${commitMessage}`, 'system');
        return true;
      } else {
        console.log('[commitToCurrentGitHubRepo] ❌ Commit failed:', data.error);
        addChatMessage(`⚠️ Commit failed: ${data.error}`, 'error');
        return false;
      }
    } catch (error) {
      console.error('[commitToCurrentGitHubRepo] Error:', error);
      addChatMessage(`⚠️ Commit failed: Network error`, 'error');
      return false;
    }
  };

  // New function to send git commit command directly to sandbox
  const commitSandboxToGitHub = async (commitMessage: string) => {
    if (!user) {
      console.log('[commitSandboxToGitHub] No user available');
      return null;
    }

    const repoInfo = currentGitHubRepo || (window as any).currentGitHubRepoInfo;
    if (!repoInfo) {
      console.log('[commitSandboxToGitHub] No repository info available');
      return null;
    }

    try {
      console.log('[commitSandboxToGitHub] Sending git commit command to sandbox...');
      
      // Send git commit command directly to sandbox
      const response = await fetch('/api/sandbox-git-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName: repoInfo.name,
          commitMessage,
          userId: user.uid
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to commit to sandbox: ${response.status}`);
      }

      const data = await response.json();
      console.log('[commitSandboxToGitHub] Sandbox git commit result:', data);

      if (data.success) {
        addChatMessage(`✅ Code committed to GitHub: ${data.repoUrl}`, 'system');
        return data;
      } else {
        console.error('[commitSandboxToGitHub] Sandbox git commit failed:', data.error);
        addChatMessage(`❌ Git commit failed: ${data.error}`, 'system');
        return null;
      }

    } catch (error) {
      console.error('[commitSandboxToGitHub] Error:', error);
      addChatMessage(`❌ Failed to commit to GitHub: ${(error as Error).message}`, 'system');
      return null;
    }
  };
  
  const restartViteServer = async () => {
    try {
      addChatMessage('Restarting Vite dev server...', 'system');
      
      const response = await fetch('/api/restart-vite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addChatMessage('✓ Vite dev server restarted successfully!', 'system');
          
          // Refresh the iframe after a short delay
          setTimeout(() => {
            if (iframeRef.current && sandboxData?.url) {
              iframeRef.current.src = `${sandboxData.url}?t=${Date.now()}`;
            }
          }, 2000);
        } else {
          addChatMessage(`Failed to restart Vite: ${data.error}`, 'error');
        }
      } else {
        addChatMessage('Failed to restart Vite server', 'error');
      }
    } catch (error) {
      console.error('[restartViteServer] Error:', error);
      addChatMessage(`Error restarting Vite: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const applyCode = async () => {
    const code = promptInput.trim();
    if (!code) {
      log('Please enter some code first', 'error');
      addChatMessage('No code to apply. Please generate code first.', 'system');
      return;
    }
    
    // Prevent double clicks
    if (loading) {
      console.log('[applyCode] Already loading, skipping...');
      return;
    }
    
    // Determine if this is an edit based on whether we have applied code before
    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(code, isEdit);
  };

  const renderMainContent = () => {
    if (activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0 || (sandboxData && Object.keys(currentSandboxFiles).length > 0))) {
      return (
        /* Generation Tab Content */
        <div className="absolute inset-0 flex overflow-hidden">
          {/* File Explorer - Hide during edits */}
          {!generationProgress.isEdit && (
            <div className="w-[200px] lg:w-[250px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
            <div className="p-3 bg-gray-100 text-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BsFolderFill className="w-4 h-4" />
                <span className="text-sm font-medium">Explorer</span>
              </div>
              <button
                onClick={fetchCurrentSandboxFiles}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Refresh files"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* File Tree */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <div className="text-sm">
                {/* Root app folder */}
                <div 
                  className="flex items-center gap-1 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-gray-700"
                  onClick={() => toggleFolder('app')}
                >
                  {expandedFolders.has('app') ? (
                    <FiChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                  {expandedFolders.has('app') ? (
                    <BsFolder2Open className="w-4 h-4 text-blue-500" />
                  ) : (
                    <BsFolderFill className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="font-medium text-gray-800">app</span>
                </div>
                
                {expandedFolders.has('app') && (
                  <div className="ml-4">
                    {/* Group files by directory */}
                    {(() => {
                      const fileTree: { [key: string]: Array<{ name: string; edited?: boolean }> } = {};
                      
                      // Create a map of edited files
                      const editedFiles = new Set(
                        generationProgress.files
                          .filter(f => f.edited)
                          .map(f => f.path)
                      );
                      
                      // Process all files from generation progress
                      generationProgress.files.forEach(file => {
                        const parts = file.path.split('/');
                        const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                        const fileName = parts[parts.length - 1];
                        
                        if (!fileTree[dir]) fileTree[dir] = [];
                        fileTree[dir].push({
                          name: fileName,
                          edited: file.edited || false
                        });
                      });
                      
                      // Always prioritize generation progress files over current sandbox files
                      // Only use current sandbox files if no generation progress files exist
                      if (generationProgress.files.length === 0 && Object.keys(currentSandboxFiles).length > 0) {
                        Object.entries(currentSandboxFiles).forEach(([relativePath, content]) => {
                          const parts = relativePath.split('/');
                          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                          const fileName = parts[parts.length - 1];
                          
                          if (!fileTree[dir]) fileTree[dir] = [];
                          fileTree[dir].push({
                            name: fileName,
                            edited: false
                          });
                        });
                      }
                      
                      return Object.entries(fileTree).map(([dir, files]) => (
                        <div key={dir} className="mb-1">
                          {dir && (
                            <div 
                              className="flex items-center gap-1 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-gray-700"
                              onClick={() => toggleFolder(dir)}
                            >
                              {expandedFolders.has(dir) ? (
                                <FiChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <FiChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              {expandedFolders.has(dir) ? (
                                <BsFolder2Open className="w-4 h-4 text-yellow-600" />
                              ) : (
                                <BsFolderFill className="w-4 h-4 text-yellow-600" />
                              )}
                              <span className="text-gray-700">{dir.split('/').pop()}</span>
                            </div>
                          )}
                          {(!dir || expandedFolders.has(dir)) && (
                            <div className={dir ? 'ml-6' : ''}>
                              {files.sort((a, b) => a.name.localeCompare(b.name)).map(fileInfo => {
                                const fullPath = dir ? `${dir}/${fileInfo.name}` : fileInfo.name;
                                const isSelected = selectedFile === fullPath;
                                
                                return (
                                  <div 
                                    key={fullPath} 
                                    className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    onClick={() => handleFileClick(fullPath)}
                                  >
                                    {getFileIcon(fileInfo.name)}
                                    <span className={`text-xs flex items-center gap-1 ${isSelected ? 'font-medium' : ''}`}>
                                      {fileInfo.name}
                                      {fileInfo.edited && (
                                        <span className={`text-[10px] px-1 rounded ${
                                          isSelected ? 'bg-blue-400' : 'bg-orange-500 text-white'
                                        }`}>✓</span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
          
          {/* Code Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thinking Mode Display - Only show during active generation */}
            {generationProgress.isGenerating && (generationProgress.isThinking || generationProgress.thinkingText) && (
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-purple-600 font-medium flex items-center gap-2">
                    {generationProgress.isThinking ? (
                      <>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                        AI is thinking...
                      </>
                    ) : (
                      <>
                        <span className="text-purple-600">✓</span>
                        Thought for {generationProgress.thinkingDuration || 0} seconds
                      </>
                    )}
                  </div>
                </div>
                {generationProgress.thinkingText && (
                  <div className="bg-purple-950 border border-purple-700 rounded-lg p-4 max-h-48 overflow-y-auto scrollbar-hide">
                    <pre className="text-xs font-mono text-purple-300 whitespace-pre-wrap">
                      {generationProgress.thinkingText}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Live Code Display */}
            <div className="flex-1 rounded-lg p-3 sm:p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide" ref={codeDisplayRef}>
                {/* Show selected file if one is selected */}
                {selectedFile ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-black border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-4 py-2 bg-[#36322F] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFileIcon(selectedFile)}
                          <span className="font-mono text-sm">{selectedFile}</span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="hover:bg-black/20 p-1 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-gray-900 border border-gray-700 rounded">
                        <SyntaxHighlighter
                          language={(() => {
                            const ext = selectedFile.split('.').pop()?.toLowerCase();
                            if (ext === 'css') return 'css';
                            if (ext === 'json') return 'json';
                            if (ext === 'html') return 'html';
                            return 'jsx';
                          })()}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {(() => {
                            // Always prioritize generated files over sandbox files
                            const file = generationProgress.files.find(f => f.path === selectedFile);
                            if (file?.content) {
                              return file.content;
                            }
                            
                            // Only fall back to sandbox files if no generated files exist
                            if (generationProgress.files.length === 0 && Object.keys(currentSandboxFiles).length > 0) {
                              // Convert selectedFile path to match sandbox file format
                              const relativePath = selectedFile.replace(/^\/home\/user\/app\//, '');
                              const sandboxContent = currentSandboxFiles[relativePath];
                              if (sandboxContent) {
                                return sandboxContent;
                              }
                            }
                            
                            return '// File content will appear here';
                          })()}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                ) : /* If no files parsed yet, show loading or raw stream */
                generationProgress.files.length === 0 && Object.keys(currentSandboxFiles).length === 0 && !generationProgress.currentFile ? (
                  generationProgress.isThinking ? (
                    // Beautiful loading state while thinking
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="mb-8 relative">
                          <div className="w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                          </div>
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">AI is analyzing your request</h3>
                        <p className="text-gray-400 text-sm">{generationProgress.status || 'Preparing to generate code...'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-100 text-gray-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-mono text-sm">Streaming code...</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-900 rounded">
                        <SyntaxHighlighter
                          language="jsx"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {generationProgress.streamedCode || 'Starting code generation...'}
                        </SyntaxHighlighter>
                        <span className="inline-block w-2 h-4 bg-orange-400 ml-1 animate-pulse" />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {/* Show current file being generated */}
                    {generationProgress.currentFile && (
                      <div className="bg-black border-2 border-gray-400 rounded-lg overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-[#36322F] text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">{generationProgress.currentFile.path}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              generationProgress.currentFile.type === 'css' ? 'bg-blue-600 text-white' :
                              generationProgress.currentFile.type === 'javascript' ? 'bg-yellow-600 text-white' :
                              generationProgress.currentFile.type === 'json' ? 'bg-green-600 text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {generationProgress.currentFile.type === 'javascript' ? 'JSX' : generationProgress.currentFile.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded">
                          <SyntaxHighlighter
                            language={
                              generationProgress.currentFile.type === 'css' ? 'css' :
                              generationProgress.currentFile.type === 'json' ? 'json' :
                              generationProgress.currentFile.type === 'html' ? 'html' :
                              'jsx'
                            }
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                          >
                            {generationProgress.currentFile.content}
                          </SyntaxHighlighter>
                          <span className="inline-block w-2 h-3 bg-orange-400 ml-4 mb-4 animate-pulse" />
                        </div>
                      </div>
                    )}
                    
                    {/* Show completed files with clear indicator */}
                    {generationProgress.files.length > 0 && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">Showing newly generated files</span>
                        </div>
                      </div>
                    )}
                    {generationProgress.files.map((file, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-[#36322F] text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <span className="font-mono text-sm">{file.path}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            file.type === 'css' ? 'bg-blue-600 text-white' :
                            file.type === 'javascript' ? 'bg-yellow-600 text-white' :
                            file.type === 'json' ? 'bg-green-600 text-white' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {file.type === 'javascript' ? 'JSX' : file.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="bg-gray-900 border border-gray-700  max-h-48 overflow-y-auto scrollbar-hide">
                          <SyntaxHighlighter
                            language={
                              file.type === 'css' ? 'css' :
                              file.type === 'json' ? 'json' :
                              file.type === 'html' ? 'html' :
                              'jsx'
                            }
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                            wrapLongLines={true}
                          >
                            {file.content}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show current sandbox files only when no generated files exist */}
                    {generationProgress.files.length === 0 && Object.keys(currentSandboxFiles).length > 0 && (
                      <>
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-sm font-medium">Showing files from sandbox (no new generation in progress)</span>
                          </div>
                        </div>
                        {Object.entries(currentSandboxFiles).map(([relativePath, content], idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-2 bg-[#36322F] text-white flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-500">📁</span>
                                <span className="font-mono text-sm">{relativePath}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                relativePath.endsWith('.css') ? 'bg-blue-600 text-white' :
                                relativePath.endsWith('.jsx') || relativePath.endsWith('.js') ? 'bg-yellow-600 text-white' :
                                relativePath.endsWith('.json') ? 'bg-green-600 text-white' :
                                relativePath.endsWith('.html') ? 'bg-orange-600 text-white' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {relativePath.endsWith('.jsx') || relativePath.endsWith('.js') ? 'JSX' :
                                 relativePath.endsWith('.css') ? 'CSS' :
                                 relativePath.endsWith('.json') ? 'JSON' :
                                 relativePath.endsWith('.html') ? 'HTML' :
                                 'FILE'}
                              </span>
                            </div>
                            <div className="bg-gray-900 border border-gray-700 max-h-48 overflow-y-auto scrollbar-hide">
                              <SyntaxHighlighter
                                language={
                                  relativePath.endsWith('.css') ? 'css' :
                                  relativePath.endsWith('.json') ? 'json' :
                                  relativePath.endsWith('.html') ? 'html' :
                                  'jsx'
                                }
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  fontSize: '0.75rem',
                                  background: 'transparent',
                                }}
                                showLineNumbers={true}
                                wrapLongLines={true}
                              >
                                {content as string}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    
                    {/* Show remaining raw stream if there's content after the last file */}
                    {!generationProgress.currentFile && generationProgress.streamedCode.length > 0 && (
                      <div className="bg-black border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-[#36322F] text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">Processing...</span>
                          </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded">
                          <SyntaxHighlighter
                            language="jsx"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={false}
                          >
                            {(() => {
                              // Show only the tail of the stream after the last file
                              const lastFileEnd = generationProgress.files.length > 0 
                                ? generationProgress.streamedCode.lastIndexOf('</file>') + 7
                                : 0;
                              let remainingContent = generationProgress.streamedCode.slice(lastFileEnd).trim();
                              
                              // Remove explanation tags and content
                              remainingContent = remainingContent.replace(/<explanation>[\s\S]*?<\/explanation>/g, '').trim();
                              
                              // If only whitespace or nothing left, show waiting message
                              return remainingContent || 'Waiting for next file...';
                            })()}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress indicator */}
            {generationProgress.components.length > 0 && (
              <div className="mx-6 mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                    style={{
                      width: `${(generationProgress.currentComponent / Math.max(generationProgress.components.length, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'preview') {
      
      // Check loading stage FIRST to prevent showing old sandbox
      // Don't show loading overlay for edits
      if (loadingStage || (generationProgress.isGenerating && !generationProgress.isEdit)) {
        return (
          <div className="relative w-full h-full bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {loadingStage === 'gathering' && 'Gathering website information...'}
                {loadingStage === 'planning' && 'Planning your design...'}
                {(loadingStage === 'generating' || generationProgress.isGenerating) && 'Generating your application...'}
              </h3>
              <p className="text-gray-600 text-sm">
                {loadingStage === 'gathering' && 'Analyzing the website structure and content'}
                {loadingStage === 'planning' && 'Creating the optimal React component architecture'}
                {(loadingStage === 'generating' || generationProgress.isGenerating) && 'Writing clean, modern code for your app'}
              </p>
            </div>
          </div>
        );
      }
      
      // Show sandbox iframe only when not in any loading state
      if (sandboxData?.url && !loading) {
        return (
          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={sandboxData.url}
              className="w-full h-full border-none"
              title="Open Lovable Sandbox"
              allow="clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
            {/* Refresh button */}
            <button
              onClick={() => {
                if (iframeRef.current && sandboxData?.url) {
                  console.log('[Manual Refresh] Forcing iframe reload...');
                  const newSrc = `${sandboxData.url}?t=${Date.now()}&manual=true`;
                  iframeRef.current.src = newSrc;
                }
              }}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
              title="Refresh sandbox"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        );
      }
      

      
      // Default state when no sandbox
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 text-gray-600 text-lg">
          {sandboxData ? (
            <div className="text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : (
            <div className="text-gray-500 text-center">
              <p className="text-sm">Start chatting to create your first app</p>
            </div>
          )}
        </div>
      );
    } else if (activeTab === 'generation') {
      // Code Generation tab is active but no generation in progress and no files
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {!sandboxData ? 'Start Your Project' : 'Ready to Generate Code'}
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {!sandboxData 
                ? 'Begin by chatting with the AI to create your first application. A sandbox will be created automatically when you start generating code.'
                : 'Start chatting with the AI to generate React components and build your application. The generated code will appear here as it\'s created.'
              }
            </p>
            <div className="bg-gray-100 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700 mb-2 font-medium">Try asking:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "Create a landing page for a restaurant"</li>
                <li>• "Build a todo app with React"</li>
                <li>• "Make a portfolio website"</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const sendChatMessage = async () => {
    const message = aiChatInput.trim();
    if (!message) return;
    
    console.log('[sendChatMessage] Starting with message:', message);
    console.log('[sendChatMessage] Current state:', {
      aiEnabled,
      user: !!user,
      githubConnected,
      conversationContextLength: conversationContext.appliedCode.length,
      sandboxData: !!sandboxData
    });
    
    if (!aiEnabled) {
      addChatMessage('AI is disabled. Please enable it first.', 'system');
      return;
    }

    // Check if user is logged in
    if (!user) {
      addChatMessage('❌ Please sign in to generate apps. You need AI Credits to use this feature.', 'system');
      setShowLoginModal(true);
      return;
    }

    // Check token balance before starting generation (but don't consume yet)
    if (isTokenCheckEnabled) {
      try {
        // First, check if user has enough tokens
        const estimatedTokens = Math.ceil(message.length / 4) + 800 + 2500 + Math.ceil((Math.ceil(message.length / 4) + 800 + 2500) * 0.2);
        addChatMessage(`💳 Estimating ${estimatedTokens.toLocaleString()} credits for this request...`, 'system');
        
        const response = await fetch('/api/tokens/check-balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            requiredTokens: estimatedTokens,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          if (response.status === 402) {
            // Insufficient tokens - show payment modal and stop generation
            addChatMessage(`❌ Insufficient AI Credits! You have ${data.currentBalance} credits but need ${data.requiredTokens} credits to generate this app. Please purchase credits to continue.`, 'system');
            setShowPaymentModal(true);
            return;
          } else if (response.status === 500 && data.error?.includes('Firebase not configured')) {
            // Firebase not configured - show setup message and stop generation
            addChatMessage(`❌ AI Credits system not configured. Please contact support to enable the credits system.`, 'system');
            return;
          } else {
            addChatMessage(`❌ Error: ${data.error}`, 'system');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking token balance:', error);
        addChatMessage('❌ AI Credits system unavailable. Please try again or contact support.', 'system');
        return; // Stop generation if token system fails
      }
    }
    
    addChatMessage(message, 'user');
    setAiChatInput('');
    
    // Check for special commands
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'check packages' || lowerMessage === 'install packages' || lowerMessage === 'npm install') {
      if (!sandboxData) {
        addChatMessage('No active sandbox. Create a sandbox first!', 'system');
        return;
      }
      await checkAndInstallPackages();
      return;
    }
    
    // Start sandbox creation in parallel if needed
    let sandboxPromise: Promise<void> | null = null;
    let sandboxCreating = false;
    
    if (!sandboxData) {
      sandboxCreating = true;
      addChatMessage('Creating sandbox while I plan your app...', 'system');
      sandboxPromise = createSandbox(true).catch((error: any) => {
        addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
        throw error;
      });
    }

    // Check if user can generate apps (GitHub connected + sufficient credits)
    const generationCheck = canGenerateApp();
    if (!generationCheck.canGenerate) {
      addChatMessage(`❌ **Cannot generate app:** ${generationCheck.reason}`, 'error');
      
      if (!githubConnected) {
        addChatMessage('🔗 **Please connect your GitHub account first**', 'system');
        addChatMessage('💡 Connect GitHub to create repositories for your apps', 'system');
        setShowGitHubConnectionModal(true);
      } else if (tokenBalance !== null && tokenBalance <= 0) {
        addChatMessage('💳 **Please purchase credits to continue**', 'system');
        addChatMessage('💡 You can buy credits from the payment section', 'system');
        setShowPaymentModal(true);
      }
      return;
    }
    
    // Create GitHub repository immediately for new generations
    let githubRepoPromise: Promise<string | null> | null = null;
    
    console.log('[sendChatMessage] Checking GitHub repo creation conditions:', {
      githubConnected,
      appliedCodeLength: conversationContext.appliedCode.length,
      isNewGeneration: conversationContext.appliedCode.length === 0,
      user: !!user,
      userId: user?.uid
    });
    
    if (githubConnected && conversationContext.appliedCode.length === 0) {
      console.log('[sendChatMessage] ✅ Creating GitHub repository immediately for:', message);
      githubRepoPromise = createGitHubRepoForGeneration(message);
      
      // Wait for repository creation before proceeding with generation
      try {
        const repoUrl = await githubRepoPromise;
        if (repoUrl) {
          console.log('[sendChatMessage] GitHub repository created successfully:', repoUrl);
          addChatMessage(`🚀 Created GitHub repository: ${repoUrl}`, 'system');
        } else {
          console.log('[sendChatMessage] GitHub repository creation failed');
          addChatMessage('⚠️ Failed to create GitHub repository, but continuing with generation', 'system');
        }
      } catch (error) {
        console.error('[sendChatMessage] GitHub repository creation error:', error);
        addChatMessage('⚠️ GitHub repository creation failed, but continuing with generation', 'system');
      }
    } else {
      console.log('[sendChatMessage] ❌ GitHub repo creation skipped:', {
        githubConnected,
        appliedCodeLength: conversationContext.appliedCode.length,
        reason: githubConnected ? 'Not a new generation (edit mode)' : 'GitHub not connected'
      });
    }
    
    // Determine if this is an edit
    const isEdit = conversationContext.appliedCode.length > 0;
    console.log('[sendChatMessage] Generation mode:', isEdit ? 'EDIT' : 'NEW GENERATION');
    
    try {
      // Reset credits for new generation
      setCurrentGenerationCredits(0);
      
      // Generation tab is already active from scraping phase
      setGenerationProgress(prev => ({
        ...prev,  // Preserve all existing state
        isGenerating: true,
        status: 'Starting AI generation...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: true,
        thinkingText: 'Analyzing your request...',
        thinkingDuration: undefined,
        currentFile: undefined,
        lastProcessedPosition: 0,
        // Add isEdit flag to generation progress
        isEdit: isEdit,
        // Keep existing files for edits - we'll mark edited ones differently
        files: prev.files
      }));
      
      // Backend now manages file state - no need to fetch from frontend
      console.log('[chat] Using backend file cache for context');
      
      const fullContext = {
        sandboxId: sandboxData?.sandboxId || (sandboxCreating ? 'pending' : null),
        structure: structureContent,
        recentMessages: chatMessages.slice(-20),
        conversationContext: conversationContext,
        currentCode: promptInput,
        sandboxUrl: sandboxData?.url,
        sandboxCreating: sandboxCreating
      };
      
      // Debug what we're sending
      console.log('[chat] Sending context to AI:');
      console.log('[chat] - sandboxId:', fullContext.sandboxId);
      console.log('[chat] - isEdit:', conversationContext.appliedCode.length > 0);
      
      const response = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          model: aiModel,
          context: fullContext,
          isEdit: conversationContext.appliedCode.length > 0
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonString = line.slice(6);
              
              // Validate JSON string before parsing
              if (!jsonString.trim()) {
                console.warn('[sendChatMessage] Empty JSON string received, skipping');
                continue;
              }
              
              // Check for unterminated strings or other JSON issues
              if (jsonString.includes('\\') && !jsonString.includes('\\\\')) {
                console.warn('[sendChatMessage] Potential escape character issue in JSON:', jsonString.substring(0, 100));
              }
              
              try {
                const data = JSON.parse(jsonString);
                
                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  // Add conversational text to chat only if it's not code
                  let text = data.text || '';
                  
                  // Remove package tags from the text
                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');
                  
                  // Filter out any XML tags and file content that slipped through
                  if (!text.includes('<file') && !text.includes('import React') && 
                      !text.includes('export default') && !text.includes('className=') &&
                      text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;
                    
                    // Tab is already switched after scraping
                    
                    const updatedState = { 
                      ...prev, 
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };
                    
                    // Process complete files from the accumulated stream
                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));
                    
                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];
                      
                      // Only add if we haven't processed this file yet
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        // Check if file already exists
                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);
                        
                        if (existingFileIndex >= 0) {
                          // Update existing file and mark as edited
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          // Add new file
                          updatedState.files = [...updatedState.files, {
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          }];
                        }
                        
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }
                    
                    // Check for current file being generated (incomplete file at the end)
                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];
                      
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        updatedState.currentFile = { 
                          path: filePath, 
                          content: partialContent, 
                          type: fileType 
                        };
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }
                    
                    return updatedState;
                  });
                } else if (data.type === 'app') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    status: 'Generated App.jsx structure'
                  }));
                } else if (data.type === 'component') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${data.name}`,
                    components: [...prev.components, { 
                      name: data.name, 
                      path: data.path, 
                      completed: true 
                    }],
                    currentComponent: data.index
                  }));
                } else if (data.type === 'package') {
                  // Handle package installation from tool calls
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: data.message || `Installing ${data.name}`
                  }));
                } else if (data.type === 'complete') {
                  console.log('[generate-code] Received completion event:', {
                    hasGeneratedCode: !!data.generatedCode,
                    hasExplanation: !!data.explanation,
                    hasTokenUsage: !!data.tokenUsage,
                    tokenUsage: data.tokenUsage,
                    tokenUsageType: typeof data.tokenUsage,
                    tokenUsageKeys: data.tokenUsage ? Object.keys(data.tokenUsage) : 'no keys'
                  });
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;
                  
                  // Consume credits based on actual token usage from API response
                  console.log('[generate-code] Checking token usage data:', {
                    hasTokenUsage: !!data.tokenUsage,
                    tokenUsage: data.tokenUsage,
                    tokenUsageType: typeof data.tokenUsage,
                    user: !!user,
                    isTokenCheckEnabled,
                    userUid: user?.uid
                  });
                  
                  if (data.tokenUsage && user && isTokenCheckEnabled) {
                    try {
                      console.log('[generate-code] Token usage data structure:', {
                        tokenUsage: data.tokenUsage,
                        promptTokens: data.tokenUsage.promptTokens,
                        completionTokens: data.tokenUsage.completionTokens,
                        promptTokensType: typeof data.tokenUsage.promptTokens,
                        completionTokensType: typeof data.tokenUsage.completionTokens
                      });
                      
                      // Validate token usage data
                      if (typeof data.tokenUsage.promptTokens !== 'number' || typeof data.tokenUsage.completionTokens !== 'number') {
                        console.error('[generate-code] Invalid token usage data:', data.tokenUsage);
                        throw new Error('Invalid token usage data structure');
                      }
                      
                      const actualTokens = data.tokenUsage.promptTokens + data.tokenUsage.completionTokens;
                      
                      console.log('[generate-code] Actual token usage from API:', {
                        promptTokens: data.tokenUsage.promptTokens,
                        completionTokens: data.tokenUsage.completionTokens,
                        totalTokens: actualTokens
                      });
                      

                      
                      // Consume the actual tokens used
                      const consumeResponse = await fetch('/api/tokens/consume-actual', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          userId: user.uid,
                          actualTokens,
                          description: `AI Code Generation: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
                        }),
                      });

                      const consumeData = await consumeResponse.json();

                      if (consumeData.success) {
                        // Update token balance
                        setTokenBalance(consumeData.remainingBalance);
                        setCurrentGenerationCredits(actualTokens); // Track credits for this generation
                        
                        // Show detailed transparency report
                        showCreditTransparency(actualTokens, 'AI Code Generation');
                        
                        // Track consumption history for transparency
                        await trackCreditConsumption('AI Code Generation', actualTokens, {
                          promptLength: message.length,
                          model: aiModel,
                          hasGitHubRepo: !!currentGitHubRepo,
                          filesGenerated: 0 // Will be updated after file parsing
                        });
                      } else {
                        console.error('Failed to consume actual tokens:', consumeData.error);
                        addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                      }
                    } catch (error) {
                      console.error('Error consuming actual tokens:', error);
                      addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                    }
                  } else {
                    console.log('[generate-code] Credit consumption skipped:', {
                      hasTokenUsage: !!data.tokenUsage,
                      hasUser: !!user,
                      isTokenCheckEnabled,
                      userUid: user?.uid
                    });
                  }
                  
                  if (isTokenCheckEnabled && user && !data.tokenUsage) {
                    // Fallback: if no token usage data, use estimated consumption
                    console.log('[generate-code] No token usage data, using fallback estimated consumption');
                    try {
                      const estimatedTokens = Math.ceil(message.length / 4) + 800 + 2500 + Math.ceil((Math.ceil(message.length / 4) + 800 + 2500) * 0.2);
                      
                      const consumeResponse = await fetch('/api/tokens/consume', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          userId: user.uid,
                          prompt: message,
                        }),
                      });

                      const consumeData = await consumeResponse.json();

                      if (consumeData.success) {
                        // Update token balance
                        setTokenBalance(consumeData.remainingBalance);
                        addChatMessage(`💳 AI Credits consumed: ${consumeData.tokensConsumed.toLocaleString()} (estimated). Remaining: ${consumeData.remainingBalance.toLocaleString()}`, 'system');
                      } else {
                        console.error('Failed to consume estimated tokens:', consumeData.error);
                        addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                      }
                    } catch (error) {
                      console.error('Error consuming estimated tokens:', error);
                      addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                    }
                  }
                  
                  // Save the last generated code
                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));
                  
                  // Clear thinking state when generation completes
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingText: undefined,
                    thinkingDuration: undefined
                  }));
                  
                  // Store packages to install from tool calls
                  if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                    console.log('[generate-code] Packages to install from tools:', data.packagesToInstall);
                    // Store packages globally for later installation
                    (window as any).pendingPackages = data.packagesToInstall;
                  }
                  
                  // Parse all files from the completed code if not already done
                  const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                  const parsedFiles: Array<{path: string; content: string; type: string; completed: boolean}> = [];
                  let fileMatch;
                  
                  while ((fileMatch = fileRegex.exec(data.generatedCode)) !== null) {
                    const filePath = fileMatch[1];
                    const fileContent = fileMatch[2];
                    const fileExt = filePath.split('.').pop() || '';
                    const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                    fileExt === 'css' ? 'css' :
                                    fileExt === 'json' ? 'json' :
                                    fileExt === 'html' ? 'html' : 'text';
                    
                    parsedFiles.push({
                      path: filePath,
                      content: fileContent.trim(),
                      type: fileType,
                      completed: true
                    });
                  }
                  
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${parsedFiles.length > 0 ? parsedFiles.length : prev.files.length} file${(parsedFiles.length > 0 ? parsedFiles.length : prev.files.length) !== 1 ? 's' : ''}!`,
                    isGenerating: false,
                    isStreaming: false,
                    isEdit: prev.isEdit,
                    // Keep the files that were already parsed during streaming
                    files: prev.files.length > 0 ? prev.files : parsedFiles
                  }));
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
                console.error('Problematic JSON string:', jsonString);
                console.error('JSON string length:', jsonString.length);
                console.error('JSON string preview:', jsonString.substring(0, 200));
                
                // Try to recover by finding the next valid JSON
                continue;
              }
            }
          }
        }
      }
      
      if (generatedCode) {
        // Parse files from generated code for metadata
        const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
        const generatedFiles = [];
        let match;
        while ((match = fileRegex.exec(generatedCode)) !== null) {
          generatedFiles.push(match[1]);
        }
        
        // Show appropriate message based on edit mode
        if (isEdit && generatedFiles.length > 0) {
          // For edits, show which file(s) were edited
          const editedFileNames = generatedFiles.map(f => f.split('/').pop()).join(', ');
          addChatMessage(
            explanation || `Updated ${editedFileNames}`,
            'ai',
            {
              appliedFiles: [generatedFiles[0]] // Only show the first edited file
            }
          );
        } else {
          // For new generation, show all files
          addChatMessage(explanation || 'Code generated!', 'ai', {
            appliedFiles: generatedFiles
          });
        }
        
        setPromptInput(generatedCode);
        // Don't show the Generated Code panel by default
        // setLeftPanelVisible(true);
        
        // Wait for sandbox creation if it's still in progress
        if (sandboxPromise) {
          addChatMessage('Waiting for sandbox to be ready...', 'system');
          try {
            await sandboxPromise;
            // Remove the waiting message
            setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
          } catch {
            addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
            return;
          }
        }

        // GitHub repository creation already handled at the start
        console.log('[sendChatMessage] GitHub repository creation completed earlier');
        
        if (sandboxData && generatedCode) {
          // Use isEdit flag that was determined at the start
          await applyGeneratedCode(generatedCode, isEdit);
        }
      }
      
      // Show completion status briefly then switch to preview
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit,
        // Clear thinking state on completion
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined
      }));
      
      // Add credit consumption summary
      if (user && isTokenCheckEnabled) {
        try {
          const balanceResponse = await fetch(`/api/tokens/balance?userId=${user.uid}`);
          const balanceData = await balanceResponse.json();
          if (balanceData.success) {
            addChatMessage(`✅ App generation completed! Current balance: ${balanceData.balance.tokens.toLocaleString()} credits`, 'system');
          }
        } catch (error) {
          console.error('Failed to fetch updated balance:', error);
        }
      }
      
      setTimeout(() => {
        // Switch to preview but keep files for display
        setActiveTab('preview');
      }, 1000); // Reduced from 3000ms to 1000ms
    } catch (error: any) {
      setChatMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
      addChatMessage(`Error: ${error.message}`, 'system');
      
      // Don't consume credits if generation failed
      if (isTokenCheckEnabled && user) {
        addChatMessage('💳 No credits consumed - generation failed', 'system');
      }
      
      // Reset generation progress and switch back to preview on error
      setGenerationProgress({
        isGenerating: false,
        status: '',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        files: [],
        currentFile: undefined,
        lastProcessedPosition: 0
      });
      setActiveTab('preview');
    }
  };


  const downloadZip = async () => {
    if (!sandboxData) {
      addChatMessage('No active sandbox to download. Create a sandbox first!', 'system');
      return;
    }
    
    setLoading(true);
    log('Creating zip file...');
    addChatMessage('Creating ZIP file of your Vite app...', 'system');
    
    try {
      const response = await fetch('/api/create-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        log('Zip file created!');
        addChatMessage('ZIP file created! Download starting...', 'system');
        
        const link = document.createElement('a');
        link.href = data.dataUrl;
        link.download = data.fileName || 'e2b-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addChatMessage(
          'Your Vite app has been downloaded! To run it locally:\n' +
          '1. Unzip the file\n' +
          '2. Run: npm install\n' +
          '3. Run: npm run dev\n' +
          '4. Open http://localhost:5173',
          'system'
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      log(`Failed to create zip: ${error.message}`, 'error');
      addChatMessage(`Failed to create ZIP: ${error.message}`, 'system');
    } finally {
      setLoading(false);
    }
  };

  const reapplyLastGeneration = async () => {
    if (!conversationContext.lastGeneratedCode) {
      addChatMessage('No previous generation to re-apply', 'system');
      return;
    }
    
    if (!sandboxData) {
      addChatMessage('Please create a sandbox first', 'system');
      return;
    }
    
    addChatMessage('Re-applying last generation...', 'system');
    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(conversationContext.lastGeneratedCode, isEdit);
  };

  // Auto-scroll code display to bottom when streaming
  useEffect(() => {
    if (codeDisplayRef.current && generationProgress.isStreaming) {
      codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
    }
  }, [generationProgress.streamedCode, generationProgress.isStreaming]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    // TODO: Add file content fetching logic here
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (ext === 'jsx' || ext === 'js') {
      return <SiJavascript className="w-4 h-4 text-yellow-500" />;
    } else if (ext === 'tsx' || ext === 'ts') {
      return <SiReact className="w-4 h-4 text-blue-500" />;
    } else if (ext === 'css') {
      return <SiCss3 className="w-4 h-4 text-blue-500" />;
    } else if (ext === 'json') {
      return <SiJson className="w-4 h-4 text-gray-600" />;
    } else {
      return <FiFile className="w-4 h-4 text-gray-600" />;
    }
  };

  const clearChatHistory = () => {
    setChatMessages([{
      content: 'Chat history cleared. How can I help you?',
      type: 'system',
      timestamp: new Date()
    }]);
  };






  const handlePromptGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    
    requireAuth(() => {
      handlePromptGenerationInternal();
    });
  };

    const handlePromptGenerationInternal = async () => {
    try {
      setIsGeneratingApp(true);
      console.log('[handlePromptGenerationInternal] Starting app generation with prompt:', promptInput);
      
      // Check if user is logged in
      if (!user) {
        addChatMessage('❌ Please sign in to generate apps. You need AI Credits to use this feature.', 'system');
        setShowLoginModal(true);
        return;
      }

      // Check token balance before starting generation (but don't consume yet)
      if (isTokenCheckEnabled) {
        try {
          // First, check if user has enough tokens
          const estimatedTokens = Math.ceil(promptInput.length / 4) + 800 + 2500 + Math.ceil((Math.ceil(promptInput.length / 4) + 800 + 2500) * 0.2);
          addChatMessage(`💳 Estimating ${estimatedTokens.toLocaleString()} credits for this request...`, 'system');
          
          const response = await fetch('/api/tokens/check-balance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              requiredTokens: estimatedTokens,
            }),
          });

          const data = await response.json();

          if (!data.success) {
            if (response.status === 402) {
              // Insufficient tokens - show payment modal and stop generation
              addChatMessage(`❌ Insufficient AI Credits! You have ${data.currentBalance} credits but need ${data.requiredTokens} credits to generate this app. Please purchase credits to continue.`, 'system');
              setShowPaymentModal(true);
              return;
            } else if (response.status === 500 && data.error?.includes('Firebase not configured')) {
              // Firebase not configured - show setup message and stop generation
              addChatMessage(`❌ AI Credits system not configured. Please contact support to enable the credits system.`, 'system');
              return;
            } else {
              addChatMessage(`❌ Error: ${data.error}`, 'system');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking token balance:', error);
          addChatMessage('❌ AI Credits system unavailable. Please try again or contact support.', 'system');
          return; // Stop generation if token system fails
        }
      }
      
      // Don't create GitHub repository here - we'll do it after sandbox is ready
      console.log('[handlePromptGenerationInternal] Will create GitHub repository after sandbox is ready');
      
      setHomeScreenFading(true);
    
      // Clear messages and show generation message
      setChatMessages([]);
      addChatMessage(`Starting to generate app based on your prompt...`, 'system');
      
      // Start creating sandbox immediately
      const sandboxPromise = !sandboxData ? createSandbox(true) : Promise.resolve();
      
      // Set loading stage immediately before hiding home screen
      setLoadingStage('planning');
      setActiveTab('preview');
      
      setTimeout(async () => {
      setShowHomeScreen(false);
      setHomeScreenFading(false);
      
      // Wait for sandbox to be ready
      await sandboxPromise;
      
      // Update loading stage to generating
      setLoadingStage('generating');
      setActiveTab('generation');
      
      try {
        // Store prompt in conversation context
        setConversationContext(prev => ({
          ...prev,
          currentProject: `Custom App: ${promptInput.substring(0, 50)}...`
        }));
        
        // Start generation
        setGenerationProgress(prev => ({
          isGenerating: true,
          status: 'Initializing AI...',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: true,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          files: prev.files || [],
          currentFile: undefined,
          lastProcessedPosition: 0
        }));
        
        const aiResponse = await fetch('/api/generate-ai-code-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptInput,
            model: aiModel,
            context: {
              sandboxId: sandboxData?.id,
              structure: structureContent,
              conversationContext: conversationContext
            }
          })
        });
        
        if (!aiResponse.ok) {
          throw new Error(`AI generation failed: ${aiResponse.status}`);
        }
        
        const reader = aiResponse.body?.getReader();
        const decoder = new TextDecoder();
        let generatedCode = '';
        let explanation = '';
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonString = line.slice(6);
                
                // Validate JSON string before parsing
                if (!jsonString.trim()) {
                  console.warn('[initial-generation] Empty JSON string received, skipping');
                  continue;
                }
                
                // Check for unterminated strings or other JSON issues
                if (jsonString.includes('\\') && !jsonString.includes('\\\\')) {
                  console.warn('[initial-generation] Potential escape character issue in JSON:', jsonString.substring(0, 100));
                }
                
                try {
                  const data = JSON.parse(jsonString);
                  
                  if (data.type === 'status') {
                    setGenerationProgress(prev => ({ ...prev, status: data.message }));
                  } else if (data.type === 'thinking') {
                    setGenerationProgress(prev => ({ 
                      ...prev, 
                      isThinking: true,
                      thinkingText: (prev.thinkingText || '') + data.text
                    }));
                  } else if (data.type === 'thinking_complete') {
                    setGenerationProgress(prev => ({ 
                      ...prev, 
                      isThinking: false,
                      thinkingDuration: data.duration
                    }));
                  } else if (data.type === 'conversation') {
                    let text = data.text || '';
                    text = text.replace(/<package>[^<]*<\/package>/g, '');
                    text = text.replace(/<packages>[^<]*<\/packages>/g, '');
                    
                    if (!text.includes('<file') && !text.includes('import React') && 
                        !text.includes('export default') && !text.includes('className=') &&
                        text.trim().length > 0) {
                      addChatMessage(text.trim(), 'ai');
                    }
                  } else if (data.type === 'stream' && data.raw) {
                    setGenerationProgress(prev => ({ 
                      ...prev, 
                      streamedCode: prev.streamedCode + data.text,
                      lastProcessedPosition: prev.lastProcessedPosition || 0
                    }));
                  } else if (data.type === 'component') {
                    setGenerationProgress(prev => ({
                      ...prev,
                      status: `Generated ${data.name}`,
                      components: [...prev.components, { 
                        name: data.name,
                        path: data.path,
                        completed: true
                      }],
                      currentComponent: prev.currentComponent + 1
                    }));
                  } else if (data.type === 'complete') {
                    console.log('[initial-generation] Received completion event:', {
                      hasGeneratedCode: !!data.generatedCode,
                      hasExplanation: !!data.explanation,
                      hasTokenUsage: !!data.tokenUsage,
                      tokenUsage: data.tokenUsage
                    });
                    
                    generatedCode = data.generatedCode;
                    explanation = data.explanation;
                    
                    // Consume credits based on actual token usage from API response
                    console.log('[initial-generation] Checking token usage data:', {
                      hasTokenUsage: !!data.tokenUsage,
                      tokenUsage: data.tokenUsage,
                      user: !!user,
                      isTokenCheckEnabled
                    });
                    
                    if (data.tokenUsage && user && isTokenCheckEnabled) {
                      try {
                        console.log('[initial-generation] Token usage data structure:', {
                          tokenUsage: data.tokenUsage,
                          promptTokens: data.tokenUsage.promptTokens,
                          completionTokens: data.tokenUsage.completionTokens,
                          promptTokensType: typeof data.tokenUsage.promptTokens,
                          completionTokensType: typeof data.tokenUsage.completionTokens
                        });
                        
                        // Validate token usage data
                        if (typeof data.tokenUsage.promptTokens !== 'number' || typeof data.tokenUsage.completionTokens !== 'number') {
                          console.error('[initial-generation] Invalid token usage data:', data.tokenUsage);
                          throw new Error('Invalid token usage data structure');
                        }
                        
                        const actualTokens = data.tokenUsage.promptTokens + data.tokenUsage.completionTokens;
                        
                        console.log('[initial-generation] Actual token usage from API:', {
                          promptTokens: data.tokenUsage.promptTokens,
                          completionTokens: data.tokenUsage.completionTokens,
                          totalTokens: actualTokens
                        });
                        
                        // Consume the actual tokens used
                        const consumeResponse = await fetch('/api/tokens/consume-actual', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userId: user.uid,
                            actualTokens,
                            description: `AI Code Generation: "${promptInput.substring(0, 100)}${promptInput.length > 100 ? '...' : ''}"`
                          }),
                        });

                        const consumeData = await consumeResponse.json();

                        if (consumeData.success) {
                          // Update token balance
                          setTokenBalance(consumeData.remainingBalance);
                          addChatMessage(`💳 AI Credits consumed: ${actualTokens.toLocaleString()} (actual usage). Remaining: ${consumeData.remainingBalance.toLocaleString()}`, 'system');
                        } else {
                          console.error('Failed to consume actual tokens:', consumeData.error);
                          addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                        }
                      } catch (error) {
                        console.error('Error consuming actual tokens:', error);
                        addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                      }
                    } else if (isTokenCheckEnabled && user) {
                      // Fallback: if no token usage data, use estimated consumption
                      console.log('[initial-generation] No token usage data, using fallback estimated consumption');
                      try {
                        const estimatedTokens = Math.ceil(promptInput.length / 4) + 800 + 2500 + Math.ceil((Math.ceil(promptInput.length / 4) + 800 + 2500) * 0.2);
                        
                        const consumeResponse = await fetch('/api/tokens/consume', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userId: user.uid,
                            prompt: promptInput,
                          }),
                        });

                        const consumeData = await consumeResponse.json();

                        if (consumeData.success) {
                          // Update token balance
                          setTokenBalance(consumeData.remainingBalance);
                          addChatMessage(`💳 AI Credits consumed: ${consumeData.tokensConsumed.toLocaleString()} (estimated). Remaining: ${consumeData.remainingBalance.toLocaleString()}`, 'system');
                        } else {
                          console.error('Failed to consume estimated tokens:', consumeData.error);
                          addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                        }
                      } catch (error) {
                        console.error('Error consuming estimated tokens:', error);
                        addChatMessage(`⚠️ Warning: Failed to consume credits after successful generation`, 'system');
                      }
                    }
                    
                    setConversationContext(prev => ({
                      ...prev,
                      lastGeneratedCode: generatedCode
                    }));
                  }
                } catch (e) {
                  console.error('Error parsing streaming data:', e);
                  console.error('Problematic JSON string:', jsonString);
                  console.error('JSON string length:', jsonString.length);
                  console.error('JSON string preview:', jsonString.substring(0, 200));
                  
                  // Try to recover by finding the next valid JSON
                  continue;
                }
              }
            }
          }
        }
        
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));
        
        if (generatedCode) {
          addChatMessage('App generated successfully!', 'system');
          
          if (explanation && explanation.trim()) {
            addChatMessage(explanation, 'ai');
          }
          
          setPromptInput(generatedCode);
          
          // Apply the generated code
          await applyGeneratedCode(generatedCode, false);
          
          addChatMessage(
            `Successfully generated your custom app based on: "${promptInput.substring(0, 100)}..."!`, 
            'ai'
          );
          
          // Add credit consumption summary
          if (user && isTokenCheckEnabled) {
            try {
              const balanceResponse = await fetch(`/api/tokens/balance?userId=${user.uid}`);
              const balanceData = await balanceResponse.json();
              if (balanceData.success) {
                addChatMessage(`✅ App generation completed! Current balance: ${balanceData.balance.tokens.toLocaleString()} credits`, 'system');
              }
            } catch (error) {
              console.error('Failed to fetch updated balance:', error);
            }
          }
          
          setPromptInput('');
          setShowPromptInput(false);
          setGenerationMode('clone');
          
          // Clear loading states
          setLoadingStage(null);
          setIsGeneratingApp(false);
          
          setTimeout(() => {
            setActiveTab('preview');
          }, 1000);
        } else {
          throw new Error('Failed to generate app');
        }
        
      } catch (error: any) {
        console.error('[handlePromptGenerationInternal] Error:', error);
        addChatMessage(`Failed to generate app: ${error.message}`, 'system');
        
        // Don't consume credits if generation failed
        if (isTokenCheckEnabled && user) {
          addChatMessage('💳 No credits consumed - generation failed', 'system');
        }
        
        setLoadingStage(null);
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: ''
        }));
        setActiveTab('preview');
        setIsGeneratingApp(false);
      }
      }, 500);
      
    } catch (error: any) {
      console.error('[handlePromptGenerationInternal] Outer error:', error);
      addChatMessage(`Failed to start app generation: ${error.message}`, 'system');
      setLoadingStage(null);
      setHomeScreenFading(false);
      setActiveTab('preview');
      setIsGeneratingApp(false);
    }
  };



  return (
    <div className="font-sans bg-background text-foreground h-screen flex flex-col overflow-hidden">
      {/* Home Screen Overlay */}
      {showHomeScreen && (
        <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
          {/* Dark Modern Background with Gradient Effects */}
          <div className="absolute inset-0 bg-gray-900 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
              {/* Flowing lines - top left */}
              <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
              
              {/* Flowing lines - top right */}
              <div className="absolute top-32 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              {/* Flowing lines - bottom left */}
              <div className="absolute bottom-32 left-16 w-72 h-72 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
              
              {/* Flowing lines - bottom right */}
              <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              
              {/* Particle effects */}
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => {
                  // Use a deterministic seed based on index to avoid hydration mismatch
                  const seed = i * 0.1;
                  const left = Math.round(((Math.sin(seed * 100) + 1) / 2) * 100);
                  const top = Math.round(((Math.cos(seed * 50) + 1) / 2) * 100);
                  const delay = Math.round(((Math.sin(seed * 200) + 1) / 2) * 300) / 100;
                  const duration = Math.round((2 + ((Math.cos(seed * 150) + 1) / 2) * 2) * 100) / 100;
                  
                  return (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        animationDelay: `${delay}s`,
                        animationDuration: `${duration}s`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Header Navigation */}
          <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <Image
                      src="/logo.png"
                      alt="CodeBharat.dev Logo"
                      width={64}
                      height={64}
                      className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain drop-shadow-lg"
                      priority
                    />
                  </div>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <a href="#" className="text-white/80 hover:text-white transition-colors">Features</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">Pricing</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">Docs</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">About</a>
              </div>
              
              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <ClientOnly 
                  fallback={
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
                    </div>
                  }
                >
                  {authLoading ? (
                    <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
                  ) : user ? (
                    <AccountMenu 
                      user={user} 
                      onSignOut={signOut}
                      onRechargeClick={() => setShowPaymentModal(true)}
                      onMyAppsClick={() => setShowMyApps(true)}
                      onGitHubClick={() => setShowGitHubConnectionModal(true)}
                      onAdminClick={() => window.open('/admin', '_blank')}
                      githubConnected={githubConnected}
                    />
                  ) : (
                    <>
                      <button 
                        onClick={() => setShowLoginModal(true)}
                        className="text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
                      >
                        Sign In
                      </button>
                      <button 
                        onClick={() => setShowLoginModal(true)}
                        className="bg-gradient-to-r from-orange-500 to-green-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
                      >
                        Get Started
                      </button>
                    </>
                  )}
                </ClientOnly>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
            
            {/* Mobile Menu */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="md:hidden mt-4 bg-black/20 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    {/* Navigation Links */}
                    <div className="space-y-3">
                      <a href="#" className="block text-white/80 hover:text-white transition-colors py-2">Features</a>
                      <a href="#" className="block text-white/80 hover:text-white transition-colors py-2">Pricing</a>
                      <a href="#" className="block text-white/80 hover:text-white transition-colors py-2">Docs</a>
                      <a href="#" className="block text-white/80 hover:text-white transition-colors py-2">About</a>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-white/20"></div>
                    
                    {/* Auth Buttons */}
                    <ClientOnly>
                      {authLoading ? (
                        <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
                      ) : user ? (
                        <div className="space-y-3">
                          <div className="pt-2">
                            {/* Mobile User Profile */}
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center">
                                {user?.photoURL ? (
                                  <img 
                                    src={user.photoURL} 
                                    alt={user.displayName || 'User'} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white text-sm font-medium">
                                    {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">
                                  {user?.displayName || 'User'}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                  {user?.email}
                                </p>
                              </div>
                            </div>
                            
                            {/* Account Actions */}
                            <div className="space-y-1 mt-2">
                              <button
                                onClick={() => {
                                  setShowMyApps(true);
                                  setMobileMenuOpen(false);
                                }}
                                className="w-full text-left text-white/80 hover:text-white transition-colors py-2 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                </svg>
                                My Apps
                              </button>
                              <button
                                onClick={() => {
                                  setShowGitHubConnectionModal(true);
                                  setMobileMenuOpen(false);
                                }}
                                className="w-full text-left text-white/80 hover:text-white transition-colors py-2 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                {githubConnected ? 'GitHub' : 'Connect GitHub'}
                              </button>
                              <button
                                onClick={() => {
                                  // TODO: Add settings functionality
                                  setMobileMenuOpen(false);
                                }}
                                className="w-full text-left text-white/80 hover:text-white transition-colors py-2 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await signOut();
                                    setMobileMenuOpen(false);
                                  } catch (error) {
                                    console.error('Failed to sign out:', error);
                                  }
                                }}
                                className="w-full text-left text-red-400 hover:text-red-300 transition-colors py-2 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <button 
                            onClick={() => {
                              setShowLoginModal(true);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full text-left text-white/80 hover:text-white transition-colors py-2"
                          >
                            Sign In
                          </button>
                          <button 
                            onClick={() => {
                              setShowLoginModal(true);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                          >
                            Get Started
                          </button>
                        </div>
                      )}
              </ClientOnly>
            </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Main Hero Section */}
          <div className="relative z-10 h-full flex items-center justify-center px-4 overflow-hidden">
            <div className="text-center max-w-4xl mx-auto w-full">
              {/* AI-Powered Development Badge */}
              <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-6 animate-fade-in">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                AI-Powered Development
              </div>
              
              {/* Main Headline */}
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Transform Ideas into{' '}
                <span className="text-orange-500">Reality with</span>{' '}
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  CodeBharat.dev
                </span>
              </h1>
              
              {/* Sub-headline */}
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                From concept to code in seconds. Experience the future of intelligent development with AI that understands your vision.
              </p>
              




              {/* Input Form */}
              <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
                  <form onSubmit={handlePromptGeneration} className="relative">
                    <div className="relative">
                      <textarea
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Describe your app idea... (e.g., 'Build a todo app with dark mode')"
                        className="w-full h-24 px-6 pr-20 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none"
                        autoFocus
                        rows={4}
                      />
                      <button
                        type="submit"
                        disabled={!promptInput.trim() || isGeneratingApp}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-orange-500 to-green-500 text-white p-3 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                        title={isGeneratingApp ? "Generating..." : "Generate"}
                      >
                        {isGeneratingApp ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                
                {/* Compact Style Selector */}

              </div>
              
              {/* Watch Demo Button */}
              <div className="mt-8">
                <button className="text-white/80 hover:text-white transition-colors px-6 py-3 rounded-xl hover:bg-white/10">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white/60 text-sm">
              Trusted by 10,000+ developers worldwide
            </p>
          </div>
          

        </div>
            )}
      
      <div className="bg-card px-3 sm:px-4 py-3 sm:py-4 border-b border-border flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-[#36322F] truncate">CodeBharat.dev</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Credits Display */}
          {user && mounted && tokenBalance !== null ? (
            <div className="inline-flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-orange-500 to-green-500 text-white px-2 sm:px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium [box-shadow:inset_0px_-2px_0px_0px_#171310,_0px_1px_6px_0px_rgba(58,_33,_8,_58%)]">
              <span className="hidden sm:inline">💳 {tokenBalance.toLocaleString()}</span>
              <span className="sm:hidden">💳 {tokenBalance.toLocaleString()}</span>
            </div>
          ) : user && mounted ? (
            <div className="inline-flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-orange-500 to-green-500 text-white px-2 sm:px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium [box-shadow:inset_0px_-2px_0px_0px_#171310,_0px_1px_6px_0px_rgba(58,_33,_8,_58%)]">
              <span className="hidden sm:inline">💳 ...</span>
              <span className="sm:hidden">💳 ...</span>
            </div>
          ) : null}
          

          
          {/* Status indicator */}
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-[#36322F] text-white px-2 sm:px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium [box-shadow:inset_0px_-2px_0px_0px_#171310,_0px_1px_6px_0px_rgba(58,_33,_8,_58%)]">
            <span className="hidden sm:inline">{mounted ? status.text : 'Loading...'}</span>
            <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>
        </div>
      </div>

      {/* Main Workspace - Responsive Design */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0 bg-gradient-to-br from-gray-50 to-gray-100">
        
        {/* AI Chat Panel - Responsive Sidebar */}
        <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white shadow-sm relative ${showPreview ? 'hidden lg:flex' : 'flex'} h-full`}>
          
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-green-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-sm truncate">AI Assistant</h3>
                  <p className="text-white/80 text-xs truncate">Ready to help you build</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile Preview Toggle */}
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className="lg:hidden p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="Toggle Preview"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    // Clear URL parameters and reset to home
                    router.push('/', { scroll: false });
                    setShowHomeScreen(true);
                    setSandboxData(null);
                    setCurrentSandboxFiles({});
                    setResponseArea([]);
                    setScreenshotError(null);
                    updateStatus('Not connected', false);
                    
                    // Clear all input fields
                    setPromptInput('');
                    setAiChatInput('');
                    
                    // Clear chat messages except the welcome message
                    setChatMessages([
                      {
                        content: 'Welcome! I can help you generate code with full context of your sandbox files and structure. Just start chatting - I\'ll automatically create a sandbox for you if needed!\n\n🚀 **New Feature**: When you connect your GitHub account, I\'ll automatically create a repository for each app you generate and commit all changes automatically!\n\nTip: If you see package errors like "react-router-dom not found", just type "npm install" or "check packages" to automatically install missing packages.',
                        type: 'system',
                        timestamp: new Date()
                      }
                    ]);
                    
                    // Reset other states
                    setActiveTab('generation');
                    setExpandedFolders(new Set(['app', 'src', 'src/components']));
                    setSelectedFile(null);
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                  title="Back to Home"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-white text-sm font-medium hidden sm:inline">Home</span>
                </button>
              </div>
            </div>
          </div>



          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 flex flex-col gap-2 scrollbar-hide min-h-0" ref={chatMessagesRef} style={{ minHeight: 0 }}>
            {chatMessages.map((msg, idx) => {
                const isGenerationComplete = msg.content.includes('Successfully recreated') || 
                                           msg.content.includes('AI recreation generated!') ||
                                           msg.content.includes('Code generated!');
                
                const completedFiles = msg.metadata?.appliedFiles || [];
                
                return (
                  <div key={idx} className="flex flex-col">
                    <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] sm:max-w-[85%] rounded-xl px-2.5 sm:px-3 py-2 shadow-sm ${
                        msg.type === 'user' ? 'bg-gradient-to-r from-orange-500 to-green-500 text-white' :
                        msg.type === 'ai' ? 'bg-white border border-gray-200 text-gray-800' :
                        msg.type === 'system' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                        msg.type === 'command' ? 'bg-gray-900 text-green-400 font-mono' :
                        msg.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                        'bg-gray-50 border border-gray-200 text-gray-700'
                      }`}>
                        {msg.type === 'command' ? (
                          <div className="flex items-start gap-2">
                            <span className={`text-xs ${
                              msg.metadata?.commandType === 'input' ? 'text-blue-400' :
                              msg.metadata?.commandType === 'error' ? 'text-red-400' :
                              msg.metadata?.commandType === 'success' ? 'text-green-400' :
                              'text-gray-400'
                            }`}>
                              {msg.metadata?.commandType === 'input' ? '$' : '>'}
                            </span>
                            <span className="flex-1 whitespace-pre-wrap text-sm">{msg.content}</span>
                          </div>
                        ) : msg.type === 'error' ? (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <div className="font-medium text-sm mb-1">Error</div>
                              <div className="whitespace-pre-wrap text-xs">{msg.content}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                    
                        {/* Show applied files if this is an apply success message */}
                        {msg.metadata?.appliedFiles && msg.metadata.appliedFiles.length > 0 && (
                          <div className="mt-2 ml-0 bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <div className="text-xs font-medium mb-1 text-blue-700">
                              {msg.content.includes('Applied') ? 'Files Updated:' : 'Generated Files:'}
                            </div>
                            <div className="flex flex-wrap items-start gap-1 max-w-full">
                              {msg.metadata.appliedFiles.map((filePath, fileIdx) => {
                                const fileName = filePath.split('/').pop() || filePath;
                                const fileExt = fileName.split('.').pop() || '';
                                const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                                fileExt === 'css' ? 'css' :
                                                fileExt === 'json' ? 'json' : 'text';
                                
                                return (
                                  <div
                                    key={`applied-${fileIdx}`}
                                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-blue-600 text-white rounded-md text-xs truncate max-w-[120px] sm:max-w-none"
                                    style={{ animationDelay: `${fileIdx * 30}ms` }}
                                  >
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                      fileType === 'css' ? 'bg-blue-300' :
                                      fileType === 'javascript' ? 'bg-yellow-300' :
                                      fileType === 'json' ? 'bg-green-300' :
                                      'bg-gray-300'
                                    }`} />
                                    {fileName}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Show generated files for completion messages */}
                        {isGenerationComplete && generationProgress.files.length > 0 && idx === chatMessages.length - 1 && !msg.metadata?.appliedFiles && !chatMessages.some(m => m.metadata?.appliedFiles) && (
                          <div className="mt-2 ml-0 bg-green-50 border border-green-200 rounded-lg p-2">
                            <div className="text-xs font-medium mb-1 text-green-700">Generated Files:</div>
                            <div className="flex flex-wrap items-start gap-1 max-w-full">
                              {generationProgress.files.map((file, fileIdx) => (
                                <div
                                  key={`complete-${fileIdx}`}
                                  className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-green-600 text-white rounded-md text-xs truncate max-w-[120px] sm:max-w-none"
                                  style={{ animationDelay: `${fileIdx * 30}ms` }}
                                >
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    file.type === 'css' ? 'bg-blue-300' :
                                    file.type === 'javascript' ? 'bg-yellow-300' :
                                    file.type === 'json' ? 'bg-green-300' :
                                    'bg-gray-300'
                                  }`} />
                                  {file.path.split('/').pop()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  );
            })}
            
            {/* Code application progress */}
            {codeApplicationState.stage && (
              <CodeApplicationProgress state={codeApplicationState} />
            )}
            
            {/* File generation progress - inline display (during generation) */}
            {generationProgress.isGenerating && (
              <div className="bg-gradient-to-r from-orange-50 to-green-50 border border-orange-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium text-orange-700">
                    {generationProgress.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-start gap-1 max-w-full">
                  {/* Show completed files */}
                  {generationProgress.files.map((file, idx) => (
                    <div
                      key={`file-${idx}`}
                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-orange-600 text-white rounded-md text-xs truncate max-w-[120px] sm:max-w-none"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {file.path.split('/').pop()}
                    </div>
                  ))}
                  
                  {/* Show current file being generated */}
                  {generationProgress.currentFile && (
                    <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-orange-500/70 text-white rounded-md text-xs animate-pulse truncate max-w-[120px] sm:max-w-none"
                      style={{ animationDelay: `${generationProgress.files.length * 30}ms` }}>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="truncate">{generationProgress.currentFile.path.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="relative">
              <Textarea
                className="min-h-[50px] sm:min-h-[60px] pr-12 resize-none border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm sm:text-base"
                placeholder="Ask me to modify your app, add features, or help with anything..."
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                rows={2}
              />
              <button
                onClick={sendChatMessage}
                className="absolute right-2 bottom-2 p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Send message (Enter)"
                disabled={!aiChatInput.trim()}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel - Responsive Main Content */}
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 bg-white ${showPreview ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Preview Header */}
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setShowPreview(false)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Chat"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('generation')}
                    className={`p-2 rounded-md transition-all ${
                      activeTab === 'generation' 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    title="Code Generation"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`p-2 rounded-md transition-all ${
                      activeTab === 'preview' 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    title="Live Preview"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {user && currentGitHubRepo && (
                  <a
                    href={currentGitHubRepo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md transition-all text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="View on GitHub"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === 'generation' ? 'Code Generation' : 'Live Preview'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Generation Status */}
                {activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0) && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-600">
                      {generationProgress.files.length} files
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-500 to-green-500 text-white rounded-full text-xs font-medium">
                      {generationProgress.isGenerating ? (
                        <>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          {generationProgress.isEdit ? 'Editing' : 'Generating'}
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-white rounded-full" />
                          Complete
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* External Link */}
                {sandboxData && !generationProgress.isGenerating && (
                  <a 
                    href={sandboxData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Preview Content */}
          <div className="flex-1 relative overflow-hidden bg-gray-50">
            {renderMainContent()}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <ClientOnly>
        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }}
        />
      </ClientOnly>



      {/* Credit History Modal */}
      {showCreditHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Credit History
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Complete transparency of your credit usage
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreditHistory(false);
                  setCreditHistory([]);
                }}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
              >
                <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {creditHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Credit History</h4>
                  <p className="text-gray-500">Your credit consumption history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {creditHistory.map((record, index) => (
                    <div key={record.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{record.operation}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">
                            -{record.creditsConsumed.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Balance: {record.balanceAfter.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {record.details && Object.keys(record.details).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-600">
                            {Object.entries(record.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* My Apps Modal - Modern Redesign */}
      {showMyApps && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    My Apps
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {savedApps.length} {savedApps.length === 1 ? 'app' : 'apps'} created
                    {(() => {
                      const totalCredits = savedApps.reduce((sum, app) => sum + (app.creditsConsumed || 0), 0);
                      return totalCredits > 0 ? ` • ${totalCredits.toLocaleString()} total credits used` : '';
                    })()}
                  </p>
                  <button
                    onClick={async () => {
                      setShowCreditHistory(true);
                      await fetchCreditHistory();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors mt-1"
                  >
                    View Credit History →
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMyApps(false);
                  setMyAppsSearchTerm('');
                  setMyAppsFilter('all');
                }}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
              >
                <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search and Filter Bar */}
            {savedApps.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search your apps..."
                      value={myAppsSearchTerm}
                      onChange={(e) => setMyAppsSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                    />
                  </div>
                  
                  {/* Filter Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMyAppsFilter('all')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        myAppsFilter === 'all'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All Apps
                    </button>
                    <button
                      onClick={() => setMyAppsFilter('recent')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        myAppsFilter === 'recent'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setMyAppsFilter('github')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        myAppsFilter === 'github'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      GitHub
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {savedApps.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-3">Start Building Amazing Apps</h4>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Create your first AI-powered application and watch it appear here. Each app you build gets saved automatically.
                  </p>
                  <button
                    onClick={() => {
                      setShowMyApps(false);
                      setMyAppsSearchTerm('');
                      setMyAppsFilter('all');
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Create Your First App
                  </button>
                </motion.div>
              ) : (
                (() => {
                  // Filter and search logic
                  let filteredApps = savedApps;
                  
                  // Apply search filter
                  if (myAppsSearchTerm) {
                    filteredApps = filteredApps.filter(app =>
                      app.name.toLowerCase().includes(myAppsSearchTerm.toLowerCase()) ||
                      app.description?.toLowerCase().includes(myAppsSearchTerm.toLowerCase()) ||
                      app.githubRepo?.toLowerCase().includes(myAppsSearchTerm.toLowerCase())
                    );
                  }
                  
                  // Apply category filter
                  if (myAppsFilter === 'recent') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    filteredApps = filteredApps.filter(app => {
                      const appDate = new Date(app.updatedAt);
                      return appDate > oneWeekAgo;
                    });
                  } else if (myAppsFilter === 'github') {
                    filteredApps = filteredApps.filter(app => app.githubRepo);
                  }
                  
                  if (filteredApps.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          {myAppsSearchTerm ? 'No apps found' : 'No apps in this category'}
                        </h4>
                        <p className="text-gray-500">
                          {myAppsSearchTerm 
                            ? `No apps match "${myAppsSearchTerm}"`
                            : myAppsFilter === 'recent' 
                              ? 'No apps created in the last 7 days'
                              : 'No apps with GitHub repositories'
                          }
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredApps.map((app, index) => (
                        <motion.div 
                          key={app.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                        >
                          {/* App Card Header */}
                          <div className="p-6 pb-4">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate text-lg group-hover:text-blue-600 transition-colors">
                                  {app.name}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  {formatDate(app.updatedAt)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {/* Open Button */}
                                <button
                                  onClick={() => {
                                    loadSavedApp(app.id);
                                    setShowMyApps(false);
                                  }}
                                  disabled={loadingAppId === app.id}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                    loadingAppId === app.id 
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105'
                                  }`}
                                  title={loadingAppId === app.id ? 'Loading...' : 'Open app'}
                                >
                                  {loadingAppId === app.id ? (
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                              {app.description || 'No description available'}
                            </p>
                          </div>
                          
                          {/* App Card Footer */}
                          <div className="px-6 pb-6">
                            {/* GitHub Repository Info */}
                            {app.githubRepo && (
                              <div className="mb-3">
                                <a
                                  href={app.githubRepoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                  </svg>
                                  {app.githubRepo}
                                </a>
                              </div>
                            )}
                            
                            {/* Credits Consumed Info */}
                            {app.creditsConsumed && app.creditsConsumed > 0 && (
                              <div className="mb-3">
                                <div className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  {app.creditsConsumed.toLocaleString()} credits used
                                </div>
                              </div>
                            )}
                            
                            {/* Sandbox ID */}
                            {app.sandboxId && (
                              <div className="mb-3">
                                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-mono">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                  </svg>
                                  {app.sandboxId.substring(0, 8)}...
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              {/* Preview Link */}
                              {app.previewUrl && (
                                <a
                                  href={app.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Preview
                                </a>
                              )}
                              
                              {/* Open Button */}
                              <button
                                onClick={() => {
                                  loadSavedApp(app.id);
                                  setShowMyApps(false);
                                }}
                                disabled={loadingAppId === app.id}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Open app with full features"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            </div>
                          </div>
                          
                          {/* Hover Effect Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </motion.div>
                      ))}
                    </div>
                  );
                })()
              )}
      </div>
    </motion.div>
  </div>
)}



      {/* GitHub Commit Modal */}
      {showGitHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <h3 className="text-lg font-semibold">Commit to GitHub</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Name *
                </label>
                <input
                  type="text"
                  id="repoName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-awesome-app"
                  defaultValue=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commit Message *
                </label>
                <textarea
                  id="commitMessage"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Initial commit: My awesome app"
                  defaultValue=""
                />
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">What will happen:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Create a new GitHub repository</li>
                  <li>Upload all your app files</li>
                  <li>Create an initial commit</li>
                  <li>Provide you with the repository URL</li>
                </ul>
                {githubConnected ? (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <p className="font-medium text-green-800">✓ GitHub Connected</p>
                    {githubUsername && (
                      <p className="text-green-700 text-xs">Connected as: @{githubUsername}</p>
                    )}
                    <p className="text-green-700">Ready to commit your app to GitHub!</p>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <p className="font-medium text-yellow-800">GitHub Not Connected</p>
                    <p className="text-yellow-700">Connect your GitHub account to commit repositories.</p>
                                    <button
                  onClick={connectGitHub}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Connect GitHub
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Manual GitHub check');
                    console.log('[DEBUG] User:', user);
                    console.log('[DEBUG] GitHub Connected:', githubConnected);
                    console.log('[DEBUG] GitHub Username:', githubUsername);
                    checkGitHubConnection();
                  }}
                  className="mt-2 ml-2 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Debug GitHub
                </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGitHubModal(false);
                  setSelectedAppForGitHub(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const repoNameInput = document.getElementById('repoName') as HTMLInputElement;
                  const commitMessageInput = document.getElementById('commitMessage') as HTMLTextAreaElement;
                  const repoName = repoNameInput?.value?.trim();
                  const commitMessage = commitMessageInput?.value?.trim();
                  
                  if (!repoName) {
                    alert('Please enter a repository name');
                    return;
                  }
                  
                  if (!commitMessage) {
                    alert('Please enter a commit message');
                    return;
                  }
                  
                  handleGitHubCommit(repoName, commitMessage);
                }}
                onClick={() => {
                  if (!githubConnected) {
                    addChatMessage('🔗 Please connect your GitHub account first to commit your app to GitHub.', 'system');
                    addChatMessage('💡 Click the "Connect GitHub" button in the sidebar to get started.', 'system');
                    setShowGitHubConnectionModal(true);
                    return;
                  }
                  
                  if (!repoName) {
                    alert('Please enter a repository name');
                    return;
                  }
                  
                  if (!commitMessage) {
                    alert('Please enter a commit message');
                    return;
                  }
                  
                  handleGitHubCommit(repoName, commitMessage);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  githubConnected 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {githubConnected ? 'Commit to GitHub' : 'Connect GitHub First'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Connection Modal */}
      {showGitHubConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub Integration
              </h2>
              <button
                onClick={() => setShowGitHubConnectionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {githubConnected ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-green-800">GitHub Connected</span>
                  </div>
                  {githubUsername && (
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="text-green-700 font-medium">Connected as: @{githubUsername}</span>
                    </div>
                  )}
                  <p className="text-green-700 text-sm">
                    Your GitHub account is connected and ready to commit your generated apps as repositories.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">What you can do:</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Save your generated apps as GitHub repositories
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Access your code from any device
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Share your projects with others
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleDisconnectGitHub}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Disconnect GitHub Account
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will remove your GitHub connection and may affect access to your saved apps
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-blue-800">Connect GitHub</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Connect your GitHub account to automatically create repositories for each app you generate and commit all changes automatically!
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Benefits:</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      🚀 Auto-create repositories when you start generating
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      ✅ Auto-commit all changes to the same repository
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      📁 Access and share your code from anywhere
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowGitHubConnectionModal(false);
                      connectGitHub();
                    }}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub Account
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    You'll be redirected to GitHub to authorize the connection
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowGitHubConnectionModal(false)}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {showCustomAlert && customAlertData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                customAlertData.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                customAlertData.type === 'error' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {customAlertData.type === 'warning' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : customAlertData.type === 'error' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-semibold mb-2 ${
                  customAlertData.type === 'warning' ? 'text-yellow-800' :
                  customAlertData.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {customAlertData.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {customAlertData.message}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomAlert(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
              {customAlertData.action && customAlertData.onAction && (
                <button
                  onClick={customAlertData.onAction}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                    customAlertData.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    customAlertData.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {customAlertData.action}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4">
                  <svg className="w-full h-full animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Loading App
                </h3>
                {loadingAppName && (
                  <p className="text-sm text-gray-600 mb-4">
                    {loadingAppName}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {loadingSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      index === loadingSteps.length - 1 ? 'bg-blue-600 animate-pulse' : 'bg-green-500'
                    }`}></div>
                    <span className={`text-sm ${
                      index === loadingSteps.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-600'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs text-gray-500">
                This may take a few moments...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {user && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          userId={user.uid}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            // Refresh token balance
            // The TokenBalance component will automatically refresh
          }}
        />
      )}

    </div>
  );
}