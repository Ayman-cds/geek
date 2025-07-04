'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject, useUpdateProject } from '../../../api/hooks/useProjects';
import { useEvaluations, useCreateEvaluation } from '../../../api/hooks/useEvaluations';

export default function ProjectDetails() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { data: evaluations = [], isLoading: evaluationsLoading, error: evaluationsError, refetch: refetchEvaluations } = useEvaluations(projectId);
  
  const updateProjectMutation = useUpdateProject();
  const createEvaluationMutation = useCreateEvaluation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  // Edit project form
  const [editForm, setEditForm] = useState({
    name: project?.name || '',
    description: project?.description || ''
  });

  // Create evaluation form
  const [evalForm, setEvalForm] = useState({ name: '', description: '' });

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdateProject = async () => {
    if (!editForm.name.trim()) {
      showMessage('Project name is required');
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        data: {
          name: editForm.name,
          description: editForm.description
        }
      });
      setIsEditing(false);
      showMessage('Project updated successfully');
    } catch {
      showMessage('Failed to update project');
    }
  };

  const handleCreateEvaluation = async () => {
    if (!evalForm.name.trim()) {
      showMessage('Evaluation name is required');
      return;
    }
    
    try {
      await createEvaluationMutation.mutateAsync({
        name: evalForm.name,
        description: evalForm.description,
        project_id: projectId
      });
      setEvalForm({ name: '', description: '' });
      setShowCreateForm(false);
      showMessage('Evaluation created successfully');
    } catch {
      showMessage('Failed to create evaluation');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleEvaluationClick = (evalId: string) => {
    router.push(`/projects/${projectId}/evaluations/${evalId}`);
  };

  const handleEditToggle = () => {
    if (project && !isEditing) {
      setEditForm({
        name: project.name,
        description: project.description || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || ''
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading project...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-8 border-red-200 bg-red-50">
          <p className="text-red-600 mb-4">Project not found</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
          {message}
        </div>
      )}
      
      <div className="mb-6">
        <button onClick={handleBack} className="btn-secondary mb-4">
          ← Back to Projects
        </button>
        
        <div className="card">
          {isEditing ? (
            <div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Project Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Project name"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="textarea-field"
                  rows={3}
                  placeholder="Project description"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleUpdateProject}
                  disabled={updateProjectMutation.isPending || !editForm.name.trim()}
                  className="btn-primary"
                >
                  {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <button onClick={handleEditToggle} className="btn-secondary">
                  Edit
                </button>
              </div>
              {project.description && (
                <p className="text-gray-700 mb-3">{project.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Evaluations ({evaluations.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => refetchEvaluations()} className="btn-secondary">
            Refresh
          </button>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className="btn-primary"
          >
            {showCreateForm ? 'Cancel' : 'Create New Evaluation'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Create New Evaluation</h3>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Evaluation Name *</label>
            <input
              type="text"
              value={evalForm.name}
              onChange={(e) => setEvalForm({ ...evalForm, name: e.target.value })}
              className="input-field"
              placeholder="GPT-4 Response Quality"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Description</label>
            <textarea
              value={evalForm.description}
              onChange={(e) => setEvalForm({ ...evalForm, description: e.target.value })}
              className="textarea-field"
              rows={3}
              placeholder="Evaluate GPT-4 responses for accuracy and helpfulness"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCreateEvaluation}
              disabled={createEvaluationMutation.isPending || !evalForm.name.trim()}
              className="btn-primary"
            >
              {createEvaluationMutation.isPending ? 'Creating...' : 'Create Evaluation'}
            </button>
            <button 
              onClick={() => setShowCreateForm(false)} 
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {evaluationsLoading ? (
        <div className="card text-center py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading evaluations...</p>
        </div>
      ) : evaluationsError ? (
        <div className="card text-center py-8 border-red-200 bg-red-50">
          <p className="text-red-600 mb-4">Error loading evaluations</p>
          <button onClick={() => refetchEvaluations()} className="btn-primary">
            Try Again
          </button>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600 mb-4">No evaluations found for this project</p>
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="btn-primary"
          >
            Create Your First Evaluation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluations.map((evaluation) => (
            <div 
              key={evaluation.id} 
              className="card hover:shadow-lg transition-all duration-200 cursor-pointer hover-lift"
              onClick={() => handleEvaluationClick(evaluation.id)}
            >
              <h3 className="font-bold text-lg mb-2">{evaluation.name}</h3>
              {evaluation.description && (
                <p className="text-gray-700 mb-3">{evaluation.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(evaluation.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 