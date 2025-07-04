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

// Eval Sets API
export const evalSetsApi = {
    // Get eval sets for an evaluation
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
        // Validate that eval_id is present
        if (!data.eval_id || data.eval_id.trim() === '') {
            throw new Error('eval_id is required');
        }

        // Validate that file is present
        if (!data.file) {
            throw new Error('file is required');
        }

        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('eval_id', data.eval_id.trim());

        if (data.name && data.name.trim()) {
            formData.append('name', data.name.trim());
        }

        if (
            data.endpoint_integration_id &&
            data.endpoint_integration_id.trim()
        ) {
            formData.append(
                'endpoint_integration_id',
                data.endpoint_integration_id.trim()
            );
        }

        const url = `${API_BASE}/eval-sets`;

        console.log('Uploading to URL:', url);
        console.log('eval_id:', data.eval_id);
        console.log('FormData contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header manually - let the browser set it with boundary
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    url,
                });
                throw new Error(
                    `Failed to create eval set: ${response.status} ${response.statusText} - ${errorText}`
                );
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            return result;
        } catch (error) {
            console.error('Network error or JSON parsing error:', error);
            throw error;
        }
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
