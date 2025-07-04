const API_BASE = 'http://localhost:8000/api';

export interface Project {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
}

export interface UpdateProjectRequest {
    name: string;
    description?: string;
}

export const projectsApi = {
    // Get all projects
    getProjects: async (): Promise<Project[]> => {
        const response = await fetch(`${API_BASE}/projects`);
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        return response.json();
    },

    // Get single project
    getProject: async (id: string): Promise<Project> => {
        const response = await fetch(`${API_BASE}/projects/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch project');
        }
        return response.json();
    },

    // Create project
    createProject: async (data: CreateProjectRequest): Promise<Project> => {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to create project');
        }
        return response.json();
    },

    // Update project
    updateProject: async (
        id: string,
        data: UpdateProjectRequest
    ): Promise<Project> => {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to update project');
        }
        return response.json();
    },

    // Delete project
    deleteProject: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete project');
        }
    },
};
