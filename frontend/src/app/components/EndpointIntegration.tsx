'use client';

import { useState, useEffect } from 'react';

interface EndpointIntegration {
  id: string;
  name: string;
  endpoint_url: string;
  http_method: string;
  param_schema: Record<string, string>;
  param_defaults: Record<string, unknown>;
  test_examples: Array<Record<string, unknown>>;
  eval_id: string;
  created_at: string;
}

interface Evaluation {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  created_at: string;
}

interface EndpointIntegrationProps {
  evaluations: Evaluation[];
  selectedEval: string;
  setSelectedEval: (id: string) => void;
  onMessage: (message: string) => void;
}

interface TestResult {
  success: boolean;
  response?: any;
  error?: string;
  status?: number;
  timestamp: string;
}

const API_BASE = 'http://localhost:8000/api';

export default function EndpointIntegration({ 
  evaluations, 
  selectedEval, 
  setSelectedEval, 
  onMessage 
}: EndpointIntegrationProps) {
  const [endpoints, setEndpoints] = useState<EndpointIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hasSuccessfulTest, setHasSuccessfulTest] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [endpointForm, setEndpointForm] = useState({
    name: '',
    endpoint_url: '',
    http_method: 'POST',
    param_schema: '{"prompt": "string", "temperature": "number"}',
    param_defaults: '{"temperature": 0.7}'
  });

  const [testForm, setTestForm] = useState({
    testData: '{"prompt": "Hello, how are you?", "temperature": 0.7}',
    headers: '{"Content-Type": "application/json", "Authorization": "Bearer your-api-key-here"}'
  });

  // Test examples with better defaults
  const [testExamples, setTestExamples] = useState<string[]>([
    '{"prompt": "What is the capital of France?", "temperature": 0.7}',
    '{"prompt": "Explain quantum computing in simple terms", "temperature": 0.5}',
    '{"prompt": "Write a short poem about nature", "temperature": 0.9}'
  ]);

  const loadEndpoints = async () => {
    if (!selectedEval) return;
    try {
      const response = await fetch(`${API_BASE}/evals/${selectedEval}/endpoint-integrations`);
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data);
      }
    } catch {
      console.error('Error loading endpoints');
    }
  };

  useEffect(() => {
    if (selectedEval) {
      loadEndpoints();
    }
  }, [selectedEval]);

  const testEndpoint = async () => {
    if (!endpointForm.endpoint_url.trim()) {
      onMessage('Endpoint URL is required for testing');
      return;
    }

    setTestingEndpoint(true);
    try {
      const testData = JSON.parse(testForm.testData);
      const headers = JSON.parse(testForm.headers);
      
      const requestOptions: RequestInit = {
        method: endpointForm.http_method,
        headers: headers,
      };

      if (endpointForm.http_method !== 'GET') {
        requestOptions.body = JSON.stringify(testData);
      }

      const response = await fetch(endpointForm.endpoint_url, requestOptions);
      const responseData = await response.text();
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch {
        parsedResponse = responseData;
      }

      const testResult: TestResult = {
        success: response.ok,
        response: parsedResponse,
        status: response.status,
        timestamp: new Date().toISOString(),
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

      setTestResults(prev => [testResult, ...prev]);
      
      if (response.ok) {
        setHasSuccessfulTest(true);
        onMessage('✅ Endpoint test successful! You can now create the integration.');
      } else {
        onMessage(`❌ Endpoint test failed: ${testResult.error}`);
      }
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [testResult, ...prev]);
      onMessage(`❌ Endpoint test failed: ${testResult.error}`);
    }
    setTestingEndpoint(false);
  };

  const validateTestExamples = () => {
    const validExamples = [];
    for (let i = 0; i < testExamples.length; i++) {
      const example = testExamples[i].trim();
      if (example) {
        try {
          const parsed = JSON.parse(example);
          validExamples.push(parsed);
        } catch {
          onMessage(`❌ Test example ${i + 1} contains invalid JSON`);
          return null;
        }
      }
    }
    return validExamples;
  };

  const createEndpoint = async () => {
    if (!endpointForm.name.trim() || !endpointForm.endpoint_url.trim()) {
      onMessage('❌ Name and URL are required');
      return;
    }

    if (!hasSuccessfulTest) {
      onMessage('❌ Please test the endpoint successfully first');
      return;
    }

    const validTestExamples = validateTestExamples();
    if (validTestExamples === null) {
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...endpointForm,
        eval_id: selectedEval,
        param_schema: JSON.parse(endpointForm.param_schema) as Record<string, string>,
        param_defaults: JSON.parse(endpointForm.param_defaults) as Record<string, unknown>,
        test_examples: validTestExamples
      };
      
      const response = await fetch(`${API_BASE}/endpoint-integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const endpoint = await response.json();
        setEndpoints([...endpoints, endpoint]);
        resetForm();
        setShowCreateForm(false);
        onMessage('✅ Endpoint integration created successfully!');
      } else {
        onMessage('❌ Failed to create endpoint integration');
      }
    } catch {
      onMessage('❌ Error creating endpoint integration');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEndpointForm({
      name: '',
      endpoint_url: '',
      http_method: 'POST',
      param_schema: '{"prompt": "string", "temperature": "number"}',
      param_defaults: '{"temperature": 0.7}'
    });
    setTestResults([]);
    setHasSuccessfulTest(false);
    setTestForm({
      testData: '{"prompt": "Hello, how are you?", "temperature": 0.7}',
      headers: '{"Content-Type": "application/json", "Authorization": "Bearer your-api-key-here"}'
    });
    setTestExamples([
      '{"prompt": "What is the capital of France?", "temperature": 0.7}',
      '{"prompt": "Explain quantum computing in simple terms", "temperature": 0.5}',
      '{"prompt": "Write a short poem about nature", "temperature": 0.9}'
    ]);
  };

  const updateTestExample = (index: number, value: string) => {
    const newExamples = [...testExamples];
    newExamples[index] = value;
    setTestExamples(newExamples);
  };

  return (
    <div className="space-y-6">
      {/* Existing Integrations */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Endpoint Integrations</h2>
          <button onClick={loadEndpoints} className="btn-secondary">
            Refresh
          </button>
        </div>
        
        {endpoints.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No endpoint integrations yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Create your first integration to connect your API endpoints for evaluation.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="card bg-green-50 border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-green-800">{endpoint.name}</h3>
                    <p className="text-sm text-green-600 mt-1">{endpoint.endpoint_url}</p>
                    <div className="flex gap-4 mt-2 text-xs text-green-600">
                      <span>Method: {endpoint.http_method}</span>
                      <span>Examples: {endpoint.test_examples?.length || 0}</span>
                      <span>Created: {new Date(endpoint.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Integration */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Integration</h2>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            {showCreateForm ? 'Cancel' : '+ Add Integration'}
          </button>
        </div>

        {showCreateForm && (
          <div className="card">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-sm font-medium">1</span>
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium">Integration Name *</label>
                  <input
                    type="text"
                    value={endpointForm.name}
                    onChange={(e) => setEndpointForm({ ...endpointForm, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., OpenAI GPT-4"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">HTTP Method</label>
                  <select
                    value={endpointForm.http_method}
                    onChange={(e) => setEndpointForm({ ...endpointForm, http_method: e.target.value })}
                    className="select-field"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block mb-2 font-medium">Endpoint URL *</label>
                <input
                  type="url"
                  value={endpointForm.endpoint_url}
                  onChange={(e) => setEndpointForm({ ...endpointForm, endpoint_url: e.target.value })}
                  className="input-field"
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-sm font-medium">2</span>
                <h3 className="text-lg font-semibold">Test Examples</h3>
                <span className="text-sm text-gray-500">(Help AI understand your API)</span>
              </div>
              
              {testExamples.map((example, index) => (
                <div key={index} className="mb-3">
                  <label className="block mb-1 text-sm font-medium">Example {index + 1}</label>
                  <textarea
                    value={example}
                    onChange={(e) => updateTestExample(index, e.target.value)}
                    className="textarea-field"
                    rows={2}
                    placeholder={`{"prompt": "Example ${index + 1}", "temperature": 0.7}`}
                  />
                </div>
              ))}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-sm font-medium">3</span>
                <h3 className="text-lg font-semibold">Test Connection</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Test Data</label>
                  <textarea
                    value={testForm.testData}
                    onChange={(e) => setTestForm({ ...testForm, testData: e.target.value })}
                    className="textarea-field"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Headers</label>
                  <textarea
                    value={testForm.headers}
                    onChange={(e) => setTestForm({ ...testForm, headers: e.target.value })}
                    className="textarea-field"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  onClick={testEndpoint} 
                  disabled={testingEndpoint || !endpointForm.endpoint_url.trim()} 
                  className="btn-secondary"
                >
                  {testingEndpoint ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="mt-4">
                  <div className="max-h-32 overflow-y-auto">
                    {testResults.slice(0, 1).map((result, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded text-sm ${
                          result.success ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{result.success ? '✅' : '❌'}</span>
                          <span className="font-medium">
                            {result.success ? 'Connection successful!' : 'Connection failed'}
                          </span>
                        </div>
                        {result.error && (
                          <p className="mt-1 text-xs">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-sm font-medium">4</span>
                <h3 className="text-lg font-semibold">Create Integration</h3>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={createEndpoint} 
                  disabled={loading || !hasSuccessfulTest} 
                  className={`btn-primary ${!hasSuccessfulTest ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Creating...' : 'Create Integration'}
                </button>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
              
              {!hasSuccessfulTest && (
                <p className="text-sm text-gray-600 mt-2">
                  ⚠️ Please test the connection successfully first
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 