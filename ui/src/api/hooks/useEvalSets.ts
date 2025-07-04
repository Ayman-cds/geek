import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    evalSetsApi,
    endpointIntegrationsApi,
    CreateEvalSetRequest,
} from '../evalSets';

// Query keys
export const evalSetKeys = {
    all: ['evalSets'] as const,
    lists: () => [...evalSetKeys.all, 'list'] as const,
    list: (evalId: string) => [...evalSetKeys.lists(), { evalId }] as const,
    details: () => [...evalSetKeys.all, 'detail'] as const,
    detail: (id: string) => [...evalSetKeys.details(), id] as const,
};

export const endpointIntegrationKeys = {
    all: ['endpointIntegrations'] as const,
    lists: () => [...endpointIntegrationKeys.all, 'list'] as const,
    details: () => [...endpointIntegrationKeys.all, 'detail'] as const,
    detail: (id: string) => [...endpointIntegrationKeys.details(), id] as const,
};

// Get eval sets for an evaluation
export const useEvalSets = (evalId: string) => {
    return useQuery({
        queryKey: evalSetKeys.list(evalId),
        queryFn: () => evalSetsApi.getEvalSets(evalId),
        enabled: !!evalId,
    });
};

// Get single eval set
export const useEvalSet = (id: string) => {
    return useQuery({
        queryKey: evalSetKeys.detail(id),
        queryFn: () => evalSetsApi.getEvalSet(id),
        enabled: !!id,
    });
};

// Create eval set
export const useCreateEvalSet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEvalSetRequest) => {
            console.log('Creating eval set with data:', data);
            return evalSetsApi.createEvalSet(data);
        },
        onSuccess: (newEvalSet: { eval_id: string }) => {
            queryClient.invalidateQueries({
                queryKey: evalSetKeys.list(newEvalSet.eval_id),
            });
        },
        onError: (error) => {
            console.error('Error creating eval set:', error);
        },
    });
};

// Update eval set
export const useUpdateEvalSet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: { name?: string; endpoint_integration_id?: string };
        }) => evalSetsApi.updateEvalSet(id, data),
        onSuccess: (updatedEvalSet: { id: string; eval_id: string }) => {
            queryClient.invalidateQueries({
                queryKey: evalSetKeys.list(updatedEvalSet.eval_id),
            });
            queryClient.setQueryData(
                evalSetKeys.detail(updatedEvalSet.id),
                updatedEvalSet
            );
        },
    });
};

// Delete eval set
export const useDeleteEvalSet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => evalSetsApi.deleteEvalSet(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: evalSetKeys.lists() });
        },
    });
};

// Get all endpoint integrations
export const useEndpointIntegrations = () => {
    return useQuery({
        queryKey: endpointIntegrationKeys.lists(),
        queryFn: endpointIntegrationsApi.getEndpointIntegrations,
    });
};

// Get single endpoint integration
export const useEndpointIntegration = (id: string) => {
    return useQuery({
        queryKey: endpointIntegrationKeys.detail(id),
        queryFn: () => endpointIntegrationsApi.getEndpointIntegration(id),
        enabled: !!id,
    });
};
