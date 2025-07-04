import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    evaluationsApi,
    CreateEvaluationRequest,
    UpdateEvaluationRequest,
} from '../evaluations';

// Query keys
export const evaluationKeys = {
    all: ['evaluations'] as const,
    lists: () => [...evaluationKeys.all, 'list'] as const,
    list: (projectId: string) =>
        [...evaluationKeys.lists(), { projectId }] as const,
    details: () => [...evaluationKeys.all, 'detail'] as const,
    detail: (id: string) => [...evaluationKeys.details(), id] as const,
};

// Get evaluations for a project
export const useEvaluations = (projectId: string) => {
    return useQuery({
        queryKey: evaluationKeys.list(projectId),
        queryFn: () => evaluationsApi.getEvaluations(projectId),
        enabled: !!projectId,
    });
};

// Get single evaluation
export const useEvaluation = (id: string) => {
    return useQuery({
        queryKey: evaluationKeys.detail(id),
        queryFn: () => evaluationsApi.getEvaluation(id),
        enabled: !!id,
    });
};

// Create evaluation
export const useCreateEvaluation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEvaluationRequest) =>
            evaluationsApi.createEvaluation(data),
        onSuccess: (newEvaluation: { project_id: string }) => {
            queryClient.invalidateQueries({
                queryKey: evaluationKeys.list(newEvaluation.project_id),
            });
        },
    });
};

// Update evaluation
export const useUpdateEvaluation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: UpdateEvaluationRequest;
        }) => evaluationsApi.updateEvaluation(id, data),
        onSuccess: (updatedEvaluation: { id: string; project_id: string }) => {
            queryClient.invalidateQueries({
                queryKey: evaluationKeys.list(updatedEvaluation.project_id),
            });
            queryClient.setQueryData(
                evaluationKeys.detail(updatedEvaluation.id),
                updatedEvaluation
            );
        },
    });
};

// Delete evaluation
export const useDeleteEvaluation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => evaluationsApi.deleteEvaluation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: evaluationKeys.lists() });
        },
    });
};
