'use client';

import { useState, useEffect } from 'react';

interface EndpointIntegration {
  id: string;
  name: string;
  endpoint_url: string;
  http_method: string;
  param_schema: Record<string, string>;
  param_defaults: Record<string, unknown>;
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
        onMessage('Endpoint test successful!');
      } else {
        onMessage(`Endpoint test failed: ${testResult.error}`);
      }
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [testResult, ...prev]);
      onMessage(`Endpoint test failed: ${testResult.error}`);
    }
    setTestingEndpoint(false);
  };

  const createEndpoint = async () => {
    if (!endpointForm.name.trim() || !endpointForm.endpoint_url.trim() || !selectedEval) {
      onMessage('Name, URL, and eval selection are required');
      return;
    }

    if (!hasSuccessfulTest) {
      onMessage('Please test the endpoint successfully before creating the integration');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...endpointForm,
        eval_id: selectedEval,
        param_schema: JSON.parse(endpointForm.param_schema) as Record<string, string>,
        param_defaults: JSON.parse(endpointForm.param_defaults) as Record<string, unknown>
      };
      
      const response = await fetch(`${API_BASE}/endpoint-integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const endpoint = await response.json();
        setEndpoints([...endpoints, endpoint]);
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
        onMessage('Endpoint created successfully');
      } else {
        onMessage('Failed to create endpoint');
      }
    } catch {
      onMessage('Error creating endpoint');
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
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Create New Endpoint Integration</h2>
      <div className="card">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Select Evaluation *</label>
          <select
            value={selectedEval}
            onChange={(e) => setSelectedEval(e.target.value)}
            className="select-field"
          >
            <option value="">Select an evaluation...</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>{evaluation.name}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">Integration Name *</label>
          <input
            type="text"
            value={endpointForm.name}
            onChange={(e) => setEndpointForm({ ...endpointForm, name: e.target.value })}
            className="input-field"
            placeholder="OpenAI GPT-4 API"
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">Endpoint URL *</label>
          <input
            type="url"
            value={endpointForm.endpoint_url}
            onChange={(e) => setEndpointForm({ ...endpointForm, endpoint_url: e.target.value })}
            className="input-field"
            placeholder="https://api.openai.com/v1/chat/completions"
          />
        </div>
        
        <div className="mb-4">
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
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">Parameter Schema (JSON)</label>
          <textarea
            value={endpointForm.param_schema}
            onChange={(e) => setEndpointForm({ ...endpointForm, param_schema: e.target.value })}
            className="textarea-field"
            rows={4}
            placeholder='{"prompt": "string", "temperature": "number"}'
          />
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Default Parameters (JSON)</label>
          <textarea
            value={endpointForm.param_defaults}
            onChange={(e) => setEndpointForm({ ...endpointForm, param_defaults: e.target.value })}
            className="textarea-field"
            rows={3}
            placeholder='{"temperature": 0.7}'
          />
        </div>

        {/* Test Section */}
        <div className="border-t border-gray-300 pt-6">
          <h3 className="text-lg font-bold mb-4">Test Endpoint</h3>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">Test Data (JSON)</label>
            <textarea
              value={testForm.testData}
              onChange={(e) => setTestForm({ ...testForm, testData: e.target.value })}
              className="textarea-field"
              rows={4}
              placeholder='{"prompt": "Hello, how are you?", "temperature": 0.7}'
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">Headers (JSON)</label>
            <textarea
              value={testForm.headers}
              onChange={(e) => setTestForm({ ...testForm, headers: e.target.value })}
              className="textarea-field"
              rows={3}
              placeholder='{"Content-Type": "application/json", "Authorization": "Bearer your-api-key-here"}'
            />
          </div>
          
          <div className="flex gap-3 mb-4">
            <button 
              onClick={testEndpoint} 
              // disabled={testingEndpoint || !endpointForm.endpoint_url.trim()} 
              className="btn-secondary"
            >
              {testingEndpoint ? 'Testing...' : 'Test Endpoint'}
            </button>
            <button onClick={resetForm} className="btn-secondary">
              Reset Form
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Test Results</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border rounded ${
                      result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-medium ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.success ? '✓ Success' : '✗ Failed'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {result.status && (
                      <p className="text-sm mb-1">Status: {result.status}</p>
                    )}
                    
                    {result.error && (
                      <p className="text-sm text-red-600 mb-2">{result.error}</p>
                    )}
                    
                    {result.response && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium mb-1">Response Data</summary>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="border-t border-gray-300 pt-4">
          <button 
            onClick={createEndpoint} 
            disabled={loading || !selectedEval || !hasSuccessfulTest} 
            className={`btn-primary ${!hasSuccessfulTest ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Creating...' : 'Create Endpoint Integration'}
          </button>
          {!hasSuccessfulTest && (
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ Please test the endpoint successfully before creating the integration
            </p>
          )}
        </div>
      </div>
      
      {/* Existing Endpoints */}
      {selectedEval && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Endpoint Integrations</h3>
            <button onClick={loadEndpoints} className="btn-secondary">Refresh</button>
          </div>
          <div className="space-y-2">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="card">
                <h4 className="font-medium">{endpoint.name}</h4>
                <p className="text-sm mt-1">{endpoint.endpoint_url}</p>
                <p className="text-xs mt-2">Method: {endpoint.http_method}</p>
                <p className="text-xs">Created: {new Date(endpoint.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 