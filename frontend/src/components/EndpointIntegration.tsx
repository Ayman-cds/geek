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
  input: Record<string, unknown>;
}

interface TestExample {
  input: string;
  result?: TestResult;
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
  const [testing, setTesting] = useState(false);
  const [hasSuccessfulTest, setHasSuccessfulTest] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [endpointForm, setEndpointForm] = useState({
    name: '',
    endpoint_url: '',
    http_method: 'POST',
    param_schema: '{"prompt": "string", "temperature": "number"}',
    param_defaults: '{"temperature": 0.7}'
  });

  const [headers, setHeaders] = useState<string>(
    '{"Content-Type": "application/json", "Authorization": "Bearer your-api-key-here"}'
  );

  // Test examples with input and (later) result
  const [testExamples, setTestExamples] = useState<TestExample[]>([
    { input: '{"prompt": "What is the capital of France?", "temperature": 0.7}' }
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

  const runAllTests = async () => {
    if (!endpointForm.endpoint_url.trim()) {
      onMessage('Endpoint URL is required for testing');
      return;
    }
    if (testExamples.length === 0) {
      onMessage('❌ At least one test example is required');
      return;
    }
    setTesting(true);
    setHasSuccessfulTest(false);
    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(headers);
    } catch {
      onMessage('❌ Headers contain invalid JSON');
      setTesting(false);
      return;
    }

    const newExamples = [...testExamples];
    for (let i = 0; i < newExamples.length; i++) {
      const raw = newExamples[i].input;
      try {
        const testData = JSON.parse(raw);
        const opts: RequestInit = {
          method: endpointForm.http_method,
          headers: parsedHeaders,
        };
        if (endpointForm.http_method !== 'GET') {
          opts.body = JSON.stringify(testData);
        }
        const res = await fetch(endpointForm.endpoint_url, opts);
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        const result: TestResult = {
          success: res.ok,
          response: parsed,
          status: res.status,
          timestamp: new Date().toISOString(),
          input: testData,
          error: res.ok ? undefined : `HTTP ${res.status}: ${res.statusText}`
        };
        newExamples[i].result = result;
        if (res.ok) setHasSuccessfulTest(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        let parsedInput: Record<string, unknown> = {};
        try { parsedInput = JSON.parse(newExamples[i].input); } catch {}
        newExamples[i].result = {
          success: false,
          error: errorMsg,
          timestamp: new Date().toISOString(),
          input: parsedInput
        };
      }
      // update state after each test
      setTestExamples([...newExamples]);
    }
    setTesting(false);
    if (hasSuccessfulTest) {
      onMessage('✅ At least one test passed! You can now create the integration.');
    } else {
      onMessage('❌ All tests failed. Please fix your endpoint or test data.');
    }
  };

  const validateTestExamples = (): Record<string, unknown>[] | null => {
    const valid: Record<string, unknown>[] = [];
    for (const ex of testExamples) {
      try { 
        valid.push(JSON.parse(ex.input)); 
      } catch { 
        onMessage('❌ One or more test examples contain invalid JSON'); 
        return null; 
      }
    }
    return valid;
  };

  const createEndpoint = async () => {
    if (!endpointForm.name.trim() || !endpointForm.endpoint_url.trim()) {
      onMessage('❌ Name and URL are required');
      return;
    }
    if (testExamples.length === 0) {
      onMessage('❌ At least one test example is required');
      return;
    }
    if (!hasSuccessfulTest) {
      onMessage('❌ Please run tests successfully first');
      return;
    }
    
    const validExamples = validateTestExamples();
    if (!validExamples) return;

    setLoading(true);
    try {
      const payload = {
        ...endpointForm,
        eval_id: selectedEval,
        param_schema: JSON.parse(endpointForm.param_schema),
        param_defaults: JSON.parse(endpointForm.param_defaults),
        test_examples: validExamples
      };
      const res = await fetch(`${API_BASE}/endpoint-integrations`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const ep = await res.json();
        setEndpoints([...endpoints, ep]);
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
    setHeaders('{"Content-Type": "application/json", "Authorization": "Bearer your-api-key-here"}');
    setTestExamples([
      { input: '{"prompt": "What is the capital of France?", "temperature": 0.7}' }
    ]);
    setHasSuccessfulTest(false);
  };

  const updateExampleInput = (idx: number, val: string) => {
    const list = [...testExamples];
    list[idx].input = val;
    setTestExamples(list);
  };

  const addTestExample = () => {
    const newExample: TestExample = {
      input: '{"prompt": "Your test prompt here", "temperature": 0.7}'
    };
    setTestExamples([...testExamples, newExample]);
  };

  const removeTestExample = (idx: number) => {
    if (testExamples.length <= 1) {
      onMessage('❌ At least one test example is required');
      return;
    }
    const list = [...testExamples];
    list.splice(idx, 1);
    setTestExamples(list);
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
            {/* Step 1: Basic Information */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
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

            {/* Step 2: Test Examples */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <h3 className="text-lg font-semibold">Test Examples</h3>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="text-blue-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Test examples are required</p>
                    <p>At least one successful test example is required to create an integration. You can add more examples to better validate your endpoint across different scenarios.</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">Headers</label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  className="textarea-field"
                  rows={2}
                />
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Test Examples</h4>
                {testExamples.map((ex, idx) => (
                  <div key={idx} className="mb-4 p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Example {idx + 1}</label>
                      <button
                        onClick={() => removeTestExample(idx)}
                        disabled={testExamples.length <= 1}
                        className={`text-sm ${
                          testExamples.length <= 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-500 hover:text-red-700'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={ex.input}
                      onChange={(e) => updateExampleInput(idx, e.target.value)}
                      className="textarea-field"
                      rows={2}
                    />
                    {ex.result && (
                      <div className={`mt-2 p-3 border rounded text-sm ${
                        ex.result.success
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span>{ex.result.success ? '✅' : '❌'}</span>
                          <span className="font-medium">
                            {ex.result.success ? 'Success' : 'Failed'} (Status: {ex.result.status || 'N/A'})
                          </span>
                        </div>
                        <pre className="mt-2 text-xs overflow-auto">
                          {JSON.stringify(ex.result.response ?? ex.result.error, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={addTestExample}
                  className="btn-secondary"
                >
                  + Add Another Test Example
                </button>
                <button
                  onClick={runAllTests}
                  disabled={testing || !endpointForm.endpoint_url.trim()}
                  className="btn-secondary"
                >
                  {testing ? 'Testing...' : 'Run All Tests'}
                </button>
              </div>
            </div>

            {/* Step 3: Create Integration */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
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
                <p className="text-sm text-gray-600 mt-2">⚠️ Please run tests successfully first</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}