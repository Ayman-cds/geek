const API_BASE = 'http://localhost:8000/api';

export interface Evaluation {
    id: string;
    name: string;
    description?: string;
    project_id: string;
    created_at: string;
}

export interface CreateEvaluationRequest {
    name: string;
    description?: string;
    project_id: string;
}

export interface UpdateEvaluationRequest {
    name: string;
    description?: string;
}

// Evaluations API
export const evaluationsApi = {
    // Get evaluations for a project
    getEvaluations: async (projectId: string): Promise<Evaluation[]> => {
        const response = await fetch(`${API_BASE}/projects/${projectId}/evals`);
        if (!response.ok) {
            throw new Error('Failed to fetch evaluations');
        }
        return response.json();
    },

    // Get single evaluation
    getEvaluation: async (id: string): Promise<Evaluation> => {
        const response = await fetch(`${API_BASE}/evals/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch evaluation');
        }
        return response.json();
    },

    // Create evaluation
    createEvaluation: async (
        data: CreateEvaluationRequest
    ): Promise<Evaluation> => {
        const response = await fetch(`${API_BASE}/evals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to create evaluation');
        }
        return response.json();
    },

    // Update evaluation
    updateEvaluation: async (
        id: string,
        data: UpdateEvaluationRequest
    ): Promise<Evaluation> => {
        const response = await fetch(`${API_BASE}/evals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to update evaluation');
        }
        return response.json();
    },

    // Delete evaluation
    deleteEvaluation: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/evals/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete evaluation');
        }
    },
};
