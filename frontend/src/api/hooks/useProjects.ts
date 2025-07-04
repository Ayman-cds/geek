import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    projectsApi,
    CreateProjectRequest,
    UpdateProjectRequest,
} from '../projects';

// Query keys
export const projectKeys = {
    all: ['projects'] as const,
    lists: () => [...projectKeys.all, 'list'] as const,
    list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
    details: () => [...projectKeys.all, 'detail'] as const,
    detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Get all projects
export const useProjects = () => {
    return useQuery({
        queryKey: projectKeys.lists(),
        queryFn: projectsApi.getProjects,
    });
};

// Get single project
export const useProject = (id: string) => {
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => projectsApi.getProject(id),
        enabled: !!id,
    });
};

// Create project
export const useCreateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProjectRequest) =>
            projectsApi.createProject(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });
};

// Update project
export const useUpdateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: UpdateProjectRequest;
        }) => projectsApi.updateProject(id, data),
        onSuccess: (updatedProject: { id: string }) => {
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
            queryClient.setQueryData(
                projectKeys.detail(updatedProject.id),
                updatedProject
            );
        },
    });
};

// Delete project
export const useDeleteProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => projectsApi.deleteProject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });
};
