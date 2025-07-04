from ninja import Router
from django.shortcuts import get_object_or_404
from typing import List

from .models import Eval, EndpointIntegration
from .schemas import (
    EndpointIntegrationCreateSchema, 
    EndpointIntegrationUpdateSchema, 
    EndpointIntegrationResponseSchema, 
    EndpointIntegrationListSchema
)

router = Router()


@router.post("/endpoint-integrations", response=EndpointIntegrationResponseSchema)
def create_endpoint_integration(request, integration_data: EndpointIntegrationCreateSchema):
    eval_obj = get_object_or_404(Eval, id=integration_data.eval_id)
    
    integration = EndpointIntegration.objects.create(
        name=integration_data.name,
        eval=eval_obj,
        endpoint_url=integration_data.endpoint_url,
        http_method=integration_data.http_method,
        param_schema=integration_data.param_schema,
        param_defaults=integration_data.param_defaults or {}
    )
    return integration


@router.get("/endpoint-integrations", response=List[EndpointIntegrationListSchema])
def list_endpoint_integrations(request):
    integrations = EndpointIntegration.objects.all()
    return integrations


@router.get("/evals/{eval_id}/endpoint-integrations", response=List[EndpointIntegrationListSchema])
def list_eval_endpoint_integrations(request, eval_id: str):
    eval_obj = get_object_or_404(Eval, id=eval_id)
    integrations = EndpointIntegration.objects.filter(eval=eval_obj)
    return integrations


@router.get("/endpoint-integrations/{integration_id}", response=EndpointIntegrationResponseSchema)
def get_endpoint_integration(request, integration_id: str):
    integration = get_object_or_404(EndpointIntegration, id=integration_id)
    return integration


@router.put("/endpoint-integrations/{integration_id}", response=EndpointIntegrationResponseSchema)
def update_endpoint_integration(request, integration_id: str, integration_data: EndpointIntegrationUpdateSchema):
    integration = get_object_or_404(EndpointIntegration, id=integration_id)
    
    if integration_data.name is not None:
        integration.name = integration_data.name
    if integration_data.endpoint_url is not None:
        integration.endpoint_url = integration_data.endpoint_url
    if integration_data.http_method is not None:
        integration.http_method = integration_data.http_method
    if integration_data.param_schema is not None:
        integration.param_schema = integration_data.param_schema
    if integration_data.param_defaults is not None:
        integration.param_defaults = integration_data.param_defaults
    
    integration.save()
    return integration


@router.delete("/endpoint-integrations/{integration_id}")
def delete_endpoint_integration(request, integration_id: str):
    integration = get_object_or_404(EndpointIntegration, id=integration_id)
    integration.delete()
    return {"message": "Endpoint integration deleted successfully"} 