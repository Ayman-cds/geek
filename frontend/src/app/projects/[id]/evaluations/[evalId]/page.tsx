'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEvaluation } from '../../../../../api/hooks/useEvaluations';
import { useEvalSets, useCreateEvalSet, useUpdateEvalSet, useEndpointIntegrations } from '../../../../../api/hooks/useEvalSets';
import { useProject } from '../../../../../api/hooks/useProjects';
import { EvalSet } from '../../../../../api/evalSets';
import EndpointIntegration from '../../../../../components/EndpointIntegration';

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
  const [activeTab, setActiveTab] = useState<'eval-sets' | 'integrations'>('eval-sets');

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
    </div>
  );
} 