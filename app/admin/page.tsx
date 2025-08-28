import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage AI model configuration and system settings</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminPanel />
          
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">System Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Environment:</span>
                <span className="ml-2 text-gray-600">{process.env.NODE_ENV}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Version:</span>
                <span className="ml-2 text-gray-600">1.0.0</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-600">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
