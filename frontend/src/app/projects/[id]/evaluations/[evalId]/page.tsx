'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEvaluation } from '../../../../../api/hooks/useEvaluations';
import { useEvalSets, useCreateEvalSet, useUpdateEvalSet, useEndpointIntegrations } from '../../../../../api/hooks/useEvalSets';
import { useProject } from '../../../../../api/hooks/useProjects';
import { EvalSet } from '../../../../../api/evalSets';
import EndpointIntegration from '../../../../../components/EndpointIntegration';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

export default function EvaluationDetails() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const evalId = params?.evalId as string;

  const { data: project } = useProject(projectId);
  const { data: evaluation, isLoading: evaluationLoading, error: evaluationError } = useEvaluation(evalId);
  const { data: evalSets = [], isLoading: evalSetsLoading, error: evalSetsError, refetch: refetchEvalSets } = useEvalSets(evalId);
  const { data: endpointIntegrations = [], refetch: refetchEndpointIntegrations } = useEndpointIntegrations();
  
  const createEvalSetMutation = useCreateEvalSet();
  const updateEvalSetMutation = useUpdateEvalSet();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);
  const [editingEvalSet, setEditingEvalSet] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'eval-sets' | 'integrations' | 'code-generation'>('eval-sets');

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    file: null as File | null,
    endpoint_integration_id: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    endpoint_integration_id: ''
  });

  // Code generation form state
  const [codeGenForm, setCodeGenForm] = useState({
    eval_set_id: '',
    endpoint_integration_id: '',
    instructions: '',
    sample_size: 5
  });
  const [generatedCode, setGeneratedCode] = useState('');
  const [editedCode, setEditedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCodeVersionId, setCurrentCodeVersionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [codeVersions, setCodeVersions] = useState<any[]>([]);
  const [selectedCodeVersion, setSelectedCodeVersion] = useState<any | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [activeCodeView, setActiveCodeView] = useState<'new' | 'existing'>('new');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };



  const handleUpload = async () => {
    if (!uploadForm.file) {
      showMessage('Please select a file to upload');
      return;
    }

    try {
      await createEvalSetMutation.mutateAsync({
        name: uploadForm.name,
        file: uploadForm.file,
        eval_id: evalId,
        endpoint_integration_id: uploadForm.endpoint_integration_id || undefined
      });
      setUploadForm({ name: '', file: null, endpoint_integration_id: '' });
      setShowUploadForm(false);
      showMessage('File uploaded successfully');
    } catch {
      showMessage('Failed to upload file');
    }
  };

  const handleEdit = (evalSet: EvalSet) => {
    setEditingEvalSet(evalSet.id);
    setEditForm({
      name: evalSet.name,
      endpoint_integration_id: evalSet.endpoint_integration_id || ''
    });
  };

  const handleUpdateEvalSet = async () => {
    if (!editingEvalSet) return;

    try {
      await updateEvalSetMutation.mutateAsync({
        id: editingEvalSet,
        data: {
          name: editForm.name,
          endpoint_integration_id: editForm.endpoint_integration_id || undefined
        }
      });
      setEditingEvalSet(null);
      showMessage('Eval set updated successfully');
    } catch {
      showMessage('Failed to update eval set');
    }
  };

  const handleBack = () => {
    router.push(`/projects/${projectId}`);
  };

  const getIntegrationName = (integrationId: string) => {
    const integration = endpointIntegrations.find(i => i.id === integrationId);
    return integration?.name || 'Unknown Integration';
  };

  const handleIntegrationMessage = (message: string) => {
    refetchEndpointIntegrations();
    showMessage(message);
  };

  const handleGenerateCode = async () => {
    if (!codeGenForm.eval_set_id || !codeGenForm.endpoint_integration_id) {
      showMessage('Please select both an eval set and endpoint integration');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-eval-runner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eval_id: evalId,
          eval_set_id: codeGenForm.eval_set_id,
          endpoint_integration_id: codeGenForm.endpoint_integration_id,
          instructions: codeGenForm.instructions,
          sample_size: codeGenForm.sample_size
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const data = await response.json();
      setGeneratedCode(data.generated_code);
      setEditedCode(data.generated_code);
      setCurrentCodeVersionId(data.code_version_id);
      setIsEditing(false);
      setActiveCodeView('new');
      fetchCodeVersions(); // Refresh the versions list
      showMessage('✅ Code generated successfully!');
    } catch (error) {
      showMessage('❌ Failed to generate code');
      console.error('Error generating code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCode = async () => {
    if (!currentCodeVersionId) {
      showMessage('❌ No code version to save');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:8000/api/code-versions/${currentCodeVersionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editedCode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save code');
      }

      const data = await response.json();
      setGeneratedCode(editedCode);
      setCurrentCodeVersionId(data.code_version_id);
      setIsEditing(false);
      fetchCodeVersions(); // Refresh the versions list
      showMessage('✅ Code saved successfully!');
    } catch (error) {
      showMessage('❌ Failed to save code');
      console.error('Error saving code:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCode = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedCode(generatedCode);
    setIsEditing(false);
  };

  const fetchCodeVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`http://localhost:8000/api/evals/${evalId}/code-versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch code versions');
      }
      const versions = await response.json();
      setCodeVersions(versions);
    } catch (error) {
      console.error('Error fetching code versions:', error);
      showMessage('❌ Failed to load code versions');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleViewCodeVersion = async (versionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/code-versions/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch code version');
      }
      const version = await response.json();
      setSelectedCodeVersion(version);
      setActiveCodeView('existing');
    } catch (error) {
      console.error('Error fetching code version:', error);
      showMessage('❌ Failed to load code version');
    }
  };

  const handleCloseFullscreen = () => {
    if (isEditing) {
      // If user was editing, revert changes
      setEditedCode(generatedCode);
      setIsEditing(false);
    }
    setIsFullscreen(false);
  };

  // Load code versions when component mounts
  useEffect(() => {
    if (evalId) {
      fetchCodeVersions();
    }
  }, [evalId]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        handleCloseFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  if (evaluationLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (evaluationError || !evaluation) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-8 border-red-200 bg-red-50">
          <p className="text-red-700 mb-4">Evaluation not found</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.includes('❌') 
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message}
        </div>
      )}
      
      <div className="mb-6">
        <button onClick={handleBack} className="btn-secondary mb-4">
          ← Back to {project?.name || 'Project'}
        </button>
        
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">{evaluation.name}</h1>
          {evaluation.description && (
            <p className="text-gray-700 mb-3">{evaluation.description}</p>
          )}
          <p className="text-sm text-gray-500">
            Created: {new Date(evaluation.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('eval-sets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'eval-sets'
                  ? 'border-grey-500 text-grey-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Eval Sets ({evalSets.length})
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Endpoint Integrations ({endpointIntegrations.filter(i => i.eval_id === evalId).length})
            </button>
            <button
              onClick={() => setActiveTab('code-generation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'code-generation'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Code Generation
            </button>
          </nav>
        </div>
      </div>

      {/* Eval Sets Tab */}
      {activeTab === 'eval-sets' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Eval Sets ({evalSets.length})</h2>
            <div className="flex gap-2">
              <button onClick={() => refetchEvalSets()} className="btn-secondary">
                Refresh
              </button>
              <button 
                onClick={() => setShowUploadForm(!showUploadForm)} 
                className="btn-primary"
              >
                {showUploadForm ? 'Cancel' : 'Upload New Dataset'}
              </button>
            </div>
          </div>

          {showUploadForm && (
            <div className="card mb-6">
              <h3 className="text-lg font-bold mb-4">Upload New Dataset</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium">Dataset Name</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    className="input-field"
                    placeholder="Leave empty to auto-generate"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">Endpoint Integration</label>
                  <select
                    value={uploadForm.endpoint_integration_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, endpoint_integration_id: e.target.value })}
                    className="select-field"
                  >
                    <option value="">No integration (can assign later)</option>
                    {endpointIntegrations
                      .filter(integration => integration.eval_id === evalId)
                      .map((integration) => (
                        <option key={integration.id} value={integration.id}>
                          {integration.name}
                        </option>
                      ))}
                  </select>
                  {endpointIntegrations.filter(i => i.eval_id === evalId).length === 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      No endpoint integrations found. Create one in the Integrations tab first.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block mb-2 font-medium">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleUpload}
                  disabled={createEvalSetMutation.isPending || !uploadForm.file}
                  className="btn-primary"
                >
                  {createEvalSetMutation.isPending ? 'Uploading...' : 'Upload Dataset'}
                </button>
                <button 
                  onClick={() => setShowUploadForm(false)} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {evalSetsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : evalSetsError ? (
            <div className="card text-center py-8 border-gray-400 bg-gray-100">
              <p className="text-gray-900 mb-4">Error loading eval sets</p>
              <button onClick={() => refetchEvalSets()} className="btn-primary">
                Try Again
              </button>
            </div>
          ) : evalSets.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-600 mb-4">No eval sets found for this evaluation</p>
              <button 
                onClick={() => setShowUploadForm(true)} 
                className="btn-primary"
              >
                Upload Your First Dataset
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {evalSets.map((evalSet) => (
                <div key={evalSet.id} className="card">
                  {editingEvalSet === evalSet.id ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block mb-2 font-medium">Dataset Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="input-field"
                            placeholder="Dataset name"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 font-medium">Endpoint Integration</label>
                          <select
                            value={editForm.endpoint_integration_id}
                            onChange={(e) => setEditForm({ ...editForm, endpoint_integration_id: e.target.value })}
                            className="select-field"
                          >
                            <option value="">No integration</option>
                            {endpointIntegrations
                              .filter(integration => integration.eval_id === evalId)
                              .map((integration) => (
                                <option key={integration.id} value={integration.id}>
                                  {integration.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleUpdateEvalSet}
                          disabled={updateEvalSetMutation.isPending}
                          className="btn-primary"
                        >
                          {updateEvalSetMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                          onClick={() => setEditingEvalSet(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg">{evalSet.name}</h3>
                        <button 
                          onClick={() => handleEdit(evalSet)}
                          className="btn-secondary"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">File:</p>
                          <p className="font-medium">{evalSet.file_url.split('/').pop()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Rows:</p>
                          <p className="font-medium">{evalSet.row_count || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Integration:</p>
                          <p className="font-medium">
                            {evalSet.endpoint_integration_id 
                              ? getIntegrationName(evalSet.endpoint_integration_id)
                              : 'No integration assigned'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Uploaded:</p>
                          <p className="font-medium">{new Date(evalSet.uploaded_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Endpoint Integrations Tab */}
      {activeTab === 'integrations' && (
        <div>
                     <EndpointIntegration
             evaluations={evaluation ? [evaluation] : []}
             selectedEval={evalId}
             setSelectedEval={() => {}} // Already selected
             onMessage={handleIntegrationMessage}
           />
        </div>
      )}

      {/* Code Generation Tab */}
      {activeTab === 'code-generation' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Generate Eval Runner Code</h2>
            <button onClick={fetchCodeVersions} className="btn-secondary">
              Refresh Versions
            </button>
          </div>

          {/* Sub-tabs for New Generation vs Existing Versions */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveCodeView('new')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeCodeView === 'new'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  New Generation
                </button>
                <button
                  onClick={() => setActiveCodeView('existing')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeCodeView === 'existing'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Existing Versions ({codeVersions.length})
                </button>
              </nav>
            </div>
          </div>

          {/* New Generation View */}
          {activeCodeView === 'new' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration Form */}
              <div className="space-y-6">
                <div className="card">
                <h3 className="text-lg font-bold mb-4">Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium">Eval Set *</label>
                    <select
                      value={codeGenForm.eval_set_id}
                      onChange={(e) => setCodeGenForm({ ...codeGenForm, eval_set_id: e.target.value })}
                      className="select-field"
                    >
                      <option value="">Select an eval set...</option>
                      {evalSets.map((evalSet) => (
                        <option key={evalSet.id} value={evalSet.id}>
                          {evalSet.name} ({evalSet.row_count || 'Unknown'} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Endpoint Integration *</label>
                    <select
                      value={codeGenForm.endpoint_integration_id}
                      onChange={(e) => setCodeGenForm({ ...codeGenForm, endpoint_integration_id: e.target.value })}
                      className="select-field"
                    >
                      <option value="">Select an endpoint integration...</option>
                      {endpointIntegrations
                        .filter(integration => integration.eval_id === evalId)
                        .map((integration) => (
                          <option key={integration.id} value={integration.id}>
                            {integration.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Sample Size</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={codeGenForm.sample_size}
                      onChange={(e) => setCodeGenForm({ ...codeGenForm, sample_size: parseInt(e.target.value) || 5 })}
                      className="input-field"
                      placeholder="Number of sample rows to use as context"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Number of sample rows from the eval set to use as context for code generation
                    </p>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Additional Instructions</label>
                    <textarea
                      value={codeGenForm.instructions}
                      onChange={(e) => setCodeGenForm({ ...codeGenForm, instructions: e.target.value })}
                      className="input-field"
                      rows={4}
                      placeholder="Any specific requirements or evaluation criteria..."
                    />
                  </div>

                  <button
                    onClick={handleGenerateCode}
                    disabled={isGenerating || !codeGenForm.eval_set_id || !codeGenForm.endpoint_integration_id}
                    className="btn-primary w-full"
                  >
                    {isGenerating ? 'Generating Code...' : 'Generate Eval Runner Code'}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Code Display */}
            <div className="space-y-6">
                             <div className="card">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold">Generated Code</h3>
                   {generatedCode && (
                     <div className="flex gap-2">
                       {isEditing ? (
                         <>
                           <button
                             onClick={handleSaveCode}
                             disabled={isSaving}
                             className="btn-primary text-sm"
                           >
                             {isSaving ? 'Saving...' : 'Save Changes'}
                           </button>
                           <button
                             onClick={handleCancelEdit}
                             className="btn-secondary text-sm"
                           >
                             Cancel
                           </button>
                         </>
                       ) : (
                         <>
                           <button
                             onClick={handleEditCode}
                             className="btn-primary text-sm"
                           >
                             Edit Code
                           </button>
                           <button
                             onClick={() => navigator.clipboard.writeText(generatedCode)}
                             className="btn-secondary text-sm"
                           >
                             Copy Code
                           </button>
                         </>
                       )}
                     </div>
                   )}
                 </div>
                 
                 {generatedCode ? (
                   <div className="border rounded-lg overflow-hidden">
                     <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
                       <span className="text-sm text-gray-300">eval_runner.py</span>
                       <button
                         onClick={() => setIsFullscreen(true)}
                         className="text-gray-300 hover:text-white text-sm"
                       >
                         ⛶ Fullscreen
                       </button>
                     </div>
                     <div className="relative">
                       <Editor
                         value={isEditing ? editedCode : generatedCode}
                         onValueChange={(code) => setEditedCode(code)}
                         highlight={(code) => highlight(code, languages.python, 'python')}
                         padding={16}
                         readOnly={!isEditing}
                         style={{
                           fontFamily: '"Fira Code", "Fira Mono", monospace',
                           fontSize: 14,
                           backgroundColor: '#2d3748',
                           color: '#e2e8f0',
                           minHeight: '500px',
                           outline: 'none',
                         }}
                       />
                     </div>
                   </div>
                 ) : (
                   <div className="bg-gray-50 p-8 rounded-lg text-center">
                     <p className="text-gray-600">
                       Generated code will appear here after configuration
                     </p>
                   </div>
                 )}
               </div>

                             {generatedCode && (
                 <div className="card">
                   <h4 className="font-bold mb-2">Next Steps</h4>
                   <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                     <li>Edit the code directly in the editor above (click "Edit Code")</li>
                     <li>Save your changes to create a new version</li>
                     <li>Copy the final code to your local environment</li>
                     <li>Save it as a Python file (e.g., `eval_runner.py`)</li>
                     <li>Install required dependencies: `pip install pandas requests`</li>
                     <li>Run the evaluation: `python eval_runner.py`</li>
                     <li>Review the results in the generated JSON file</li>
                   </ol>
                   
                   {isEditing && (
                     <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                       <p className="text-sm text-blue-800">
                         💡 <strong>Tip:</strong> You can modify the code directly in the editor. 
                         Your changes will be saved as a new version when you click "Save Changes".
                       </p>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
          )}

          {/* Existing Versions View */}
          {activeCodeView === 'existing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Code Versions List */}
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Code Versions ({codeVersions.length})</h3>
                  
                  {isLoadingVersions ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : codeVersions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No code versions found</p>
                      <button 
                        onClick={() => setActiveCodeView('new')}
                        className="btn-primary"
                      >
                        Generate Your First Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {codeVersions.map((version) => (
                        <div
                          key={version.id}
                          className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedCodeVersion?.id === version.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleViewCodeVersion(version.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">Version {version.version}</h4>
                            {version.is_active && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Eval Set:</span>{' '}
                              {version.eval_set_name || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">Integration:</span>{' '}
                              {version.endpoint_integration_name || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span>{' '}
                              {new Date(version.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Code Version Display */}
              <div className="space-y-6">
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">
                      {selectedCodeVersion ? `Version ${selectedCodeVersion.version}` : 'Select a Version'}
                    </h3>
                    {selectedCodeVersion && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedCodeVersion.code)}
                          className="btn-secondary text-sm"
                        >
                          Copy Code
                        </button>
                        <button
                          onClick={() => {
                            setGeneratedCode(selectedCodeVersion.code);
                            setEditedCode(selectedCodeVersion.code);
                            setCurrentCodeVersionId(selectedCodeVersion.id);
                            setIsEditing(false);
                            setActiveCodeView('new');
                          }}
                          className="btn-primary text-sm"
                        >
                          Edit This Version
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {selectedCodeVersion ? (
                    <div>
                      {/* Version Details */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Eval Set:</span>
                            <p className="text-gray-900">{selectedCodeVersion.eval_set_name || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Integration:</span>
                            <p className="text-gray-900">{selectedCodeVersion.endpoint_integration_name || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Version:</span>
                            <p className="text-gray-900">{selectedCodeVersion.version}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Created:</span>
                            <p className="text-gray-900">{new Date(selectedCodeVersion.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                                             {/* Code Display */}
                       <div className="border rounded-lg overflow-hidden">
                         <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
                           <span className="text-sm text-gray-300">eval_runner.py (Version {selectedCodeVersion.version})</span>
                           <button
                             onClick={() => {
                               setGeneratedCode(selectedCodeVersion.code);
                               setEditedCode(selectedCodeVersion.code);
                               setCurrentCodeVersionId(selectedCodeVersion.id);
                               setIsFullscreen(true);
                             }}
                             className="text-gray-300 hover:text-white text-sm"
                           >
                             ⛶ Fullscreen
                           </button>
                         </div>
                         <div className="relative">
                           <Editor
                             value={selectedCodeVersion.code}
                             onValueChange={() => {}} // Read-only
                             highlight={(code) => highlight(code, languages.python, 'python')}
                             padding={16}
                             readOnly={true}
                             style={{
                               fontFamily: '"Fira Code", "Fira Mono", monospace',
                               fontSize: 14,
                               backgroundColor: '#2d3748',
                               color: '#e2e8f0',
                               minHeight: '500px',
                               outline: 'none',
                             }}
                           />
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-8 rounded-lg text-center">
                      <p className="text-gray-600">
                        Select a code version from the list to view its details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Code Editor Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="w-full h-full max-w-7xl mx-4 my-4 bg-white rounded-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gray-800 px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">eval_runner.py</span>
                {currentCodeVersionId && (
                  <span className="text-gray-300 text-sm">
                    Version {codeVersions.find(v => v.id === currentCodeVersionId)?.version || 'Unknown'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveCode}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Cancel Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditCode}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Edit Code
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedCode || editedCode)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Copy Code
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseFullscreen}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <Editor
                value={isEditing ? editedCode : (generatedCode || selectedCodeVersion?.code || '')}
                onValueChange={(code) => setEditedCode(code)}
                highlight={(code) => highlight(code, languages.python, 'python')}
                padding={24}
                readOnly={!isEditing}
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", monospace',
                  fontSize: 16,
                  backgroundColor: '#2d3748',
                  color: '#e2e8f0',
                  height: '100%',
                  overflow: 'auto',
                  outline: 'none',
                }}
              />
            </div>

                         {/* Modal Footer */}
             <div className="bg-gray-100 px-6 py-3 border-t">
               <div className="flex justify-between items-center text-sm text-gray-600">
                 <div className="flex items-center gap-4">
                   <span>Lines: {(generatedCode || editedCode || '').split('\n').length}</span>
                   <span>Characters: {(generatedCode || editedCode || '').length}</span>
                   <span className="text-gray-500">Press ESC to close</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span>Python</span>
                   {isEditing && (
                     <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                       EDITING
                     </span>
                   )}
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
} 