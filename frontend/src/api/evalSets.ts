const API_BASE = 'http://localhost:8000/api';

export interface EvalSet {
    id: string;
    name: string;
    file_url: string;
    row_count?: number;
    eval_id: string;
    endpoint_integration_id?: string;
    uploaded_at: string;
}

export interface EndpointIntegration {
    id: string;
    name: string;
    endpoint_url: string;
    http_method: string;
    param_schema: Record<string, string>;
    param_defaults: Record<string, unknown>;
    test_examples: Array<Record<string, unknown>>;
    eval_id: string;
    headers?: Record<string, string>;
    auth_type?: string;
    created_at: string;
}

export interface CreateEvalSetRequest {
    name?: string;
    file: File;
    eval_id: string;
    endpoint_integration_id?: string;
}

export const evalSetsApi = {
    getEvalSets: async (evalId: string): Promise<EvalSet[]> => {
        const response = await fetch(`${API_BASE}/evals/${evalId}/eval-sets`);
        if (!response.ok) {
            throw new Error('Failed to fetch eval sets');
        }
        return response.json();
    },

    // Get single eval set
    getEvalSet: async (id: string): Promise<EvalSet> => {
        const response = await fetch(`${API_BASE}/eval-sets/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch eval set');
        }
        return response.json();
    },

    // Create eval set (file upload)
    createEvalSet: async (data: CreateEvalSetRequest): Promise<EvalSet> => {
        const formData = new FormData();
        formData.append('eval_id', data.eval_id);
        formData.append('file', data.file);
        if (data.name) formData.append('name', data.name);
        if (data.endpoint_integration_id) {
            formData.append(
                'endpoint_integration_id',
                data.endpoint_integration_id
            );
        }

        const response = await fetch(`${API_BASE}/eval-sets`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error('Failed to create eval set');
        }
        return response.json();
    },

    // Update eval set
    updateEvalSet: async (
        id: string,
        data: { name?: string; endpoint_integration_id?: string }
    ): Promise<EvalSet> => {
        const response = await fetch(`${API_BASE}/eval-sets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to update eval set');
        }
        return response.json();
    },

    // Delete eval set
    deleteEvalSet: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/eval-sets/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete eval set');
        }
    },
};

// Endpoint Integrations API
export const endpointIntegrationsApi = {
    // Get all endpoint integrations
    getEndpointIntegrations: async (): Promise<EndpointIntegration[]> => {
        const response = await fetch(`${API_BASE}/endpoint-integrations`);
        if (!response.ok) {
            throw new Error('Failed to fetch endpoint integrations');
        }
        return response.json();
    },

    // Get single endpoint integration
    getEndpointIntegration: async (
        id: string
    ): Promise<EndpointIntegration> => {
        const response = await fetch(`${API_BASE}/endpoint-integrations/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch endpoint integration');
        }
        return response.json();
    },
};
