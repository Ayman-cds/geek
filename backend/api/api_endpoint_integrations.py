from ninja import Router
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from typing import List
import json

from .models import Eval, EndpointIntegration, CodeVersion, EvalSet
from .completion_gateway import LLMCompletionsGateway
from .helpers import retrieve_csv_from_azure
from .schemas import (
    EndpointIntegrationCreateSchema,
    EndpointIntegrationUpdateSchema,
    EndpointIntegrationResponseSchema,
    EndpointIntegrationListSchema,
    GenerateEvalRunnerSchema,
    GenerateEvalRunnerResponseSchema,
    CodeVersionUpdateSchema,
    CodeVersionResponseSchema,
    CodeVersionListSchema,
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
        param_defaults=integration_data.param_defaults or {},
        test_examples=integration_data.test_examples or [],
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
    if integration_data.test_examples is not None:
        integration.test_examples = integration_data.test_examples

    integration.save()
    return integration


@router.delete("/endpoint-integrations/{integration_id}")
def delete_endpoint_integration(request, integration_id: str):
    integration = get_object_or_404(EndpointIntegration, id=integration_id)
    integration.delete()
    return {"message": "Endpoint integration deleted successfully"}


@router.post("/generate-eval-runner", response=GenerateEvalRunnerResponseSchema)
def generate_eval_runner(request, data: GenerateEvalRunnerSchema):
    eval_obj = get_object_or_404(Eval, id=data.eval_id)
    endpoint_integration = get_object_or_404(
        EndpointIntegration, id=data.endpoint_integration_id
    )
    eval_set = get_object_or_404(EvalSet, id=data.eval_set_id)

    if endpoint_integration.eval != eval_obj:
        raise ValueError("Endpoint integration must belong to the specified eval")

    if eval_set.eval != eval_obj:
        raise ValueError("Eval set must belong to the specified eval")

    # Retrieve CSV data from Azure Blob Storage
    csv_data = retrieve_csv_from_azure(eval_set.file_url, data.sample_size)
    if not csv_data:
        raise ValueError("Failed to retrieve CSV data from blob storage")

    csv_sample_rows = csv_data["sample_rows"]
    total_rows = csv_data["total_rows"]

    llm_gateway = LLMCompletionsGateway()

    prompt = f"""
You are an expert Python developer tasked with generating a complete, runnable Python script that will:
1. Read CSV data from a file
2. Call an API endpoint for each row
3. Evaluate the responses according to specified criteria
4. Generate metrics and scores for the evaluation

Here's the context:

**Eval Information:**
- Eval Name: {eval_obj.name}
- Eval Description: {eval_obj.description or "No description provided"}

**Eval Set Information:**
- Eval Set Name: {eval_set.name}
- Total Rows: {total_rows}
- File URL: {eval_set.file_url}

**Endpoint Integration Details:**
- Name: {endpoint_integration.name}
- Endpoint URL: {endpoint_integration.endpoint_url}
- HTTP Method: {endpoint_integration.http_method}
- Parameter Schema: {json.dumps(endpoint_integration.param_schema, indent=2)}
- Parameter Defaults: {json.dumps(endpoint_integration.param_defaults, indent=2)}
- Test Examples: {json.dumps(endpoint_integration.test_examples, indent=2)}

**Sample CSV Data Rows (showing {len(csv_sample_rows)} of {total_rows} rows):**
{json.dumps(csv_sample_rows, indent=2)}

**Additional Instructions:**
{data.instructions or "No additional instructions provided"}

**Requirements:**
1. Generate complete, runnable Python code
2. Include all necessary imports
3. Handle HTTP requests to the endpoint
4. Download and parse CSV data from the provided file URL
5. Process each row from the CSV data
6. Implement basic evaluation metrics (accuracy, BLEU score, etc. where applicable)
7. Include error handling and logging
8. Save results to a JSON file
9. Use requests library for HTTP calls
10. Use pandas for CSV processing
11. Include a main function that can be called to run the evaluation
12. Handle CSV data retrieval from the provided URL: {eval_set.file_url}

**Code Structure:**
- Import statements
- Configuration constants
- Helper functions for downloading CSV data
- Helper functions for API calls
- Helper functions for evaluation metrics
- Main evaluation function
- if __name__ == "__main__": block

The code should be production-ready and handle edge cases gracefully.
ONLY return the code, never ever return anything else aside the the code, everything you output need to be executable. 
do not include ``` ``` quotations in your response just the code
"""

    # Generate the code using the LLM
    generated_code = llm_gateway.create_completion(prompt)

    # Create a new CodeVersion entry
    # Get the first user since we don't have authentication set up yet
    user = User.objects.first()
    if not user:
        raise ValueError("No users found. Please create a user first.")

    code_version = CodeVersion.objects.create(
        eval=eval_obj,
        eval_set=eval_set,
        endpoint_integration=endpoint_integration,
        code=generated_code,
        created_by=user,
        is_active=True,
    )

    return GenerateEvalRunnerResponseSchema(
        generated_code=generated_code,
        code_version=code_version.version,
        eval_id=eval_obj.id,
        code_version_id=code_version.id,
    )


@router.put("/code-versions/{code_version_id}", response=CodeVersionResponseSchema)
def update_code_version(
    request, code_version_id: str, update_data: CodeVersionUpdateSchema
):
    """
    Update the code of an existing code version. This creates a new version with the updated code.
    """
    # Get the existing code version
    existing_code_version = get_object_or_404(CodeVersion, id=code_version_id)

    # Get the first user since we don't have authentication set up yet
    user = User.objects.first()
    if not user:
        raise ValueError("No users found. Please create a user first.")

    # Create a new code version with the updated code
    new_code_version = CodeVersion.objects.create(
        eval=existing_code_version.eval,
        eval_set=existing_code_version.eval_set,
        endpoint_integration=existing_code_version.endpoint_integration,
        code=update_data.code,
        created_by=user,
        is_active=True,
    )

    return CodeVersionResponseSchema(
        id=new_code_version.id,
        eval_id=new_code_version.eval.id,
        version=new_code_version.version,
        code=new_code_version.code,
        created_at=new_code_version.created_at,
        is_active=new_code_version.is_active,
        code_version_id=new_code_version.id,
        eval_set_id=new_code_version.eval_set.id if new_code_version.eval_set else None,
        eval_set_name=(
            new_code_version.eval_set.name if new_code_version.eval_set else None
        ),
        endpoint_integration_id=(
            new_code_version.endpoint_integration.id
            if new_code_version.endpoint_integration
            else None
        ),
        endpoint_integration_name=(
            new_code_version.endpoint_integration.name
            if new_code_version.endpoint_integration
            else None
        ),
    )


@router.get("/code-versions/{code_version_id}", response=CodeVersionResponseSchema)
def get_code_version(request, code_version_id: str):
    """
    Get a specific code version by ID.
    """
    code_version = get_object_or_404(CodeVersion, id=code_version_id)

    return CodeVersionResponseSchema(
        id=code_version.id,
        eval_id=code_version.eval.id,
        version=code_version.version,
        code=code_version.code,
        created_at=code_version.created_at,
        is_active=code_version.is_active,
        code_version_id=code_version.id,
        eval_set_id=code_version.eval_set.id if code_version.eval_set else None,
        eval_set_name=code_version.eval_set.name if code_version.eval_set else None,
        endpoint_integration_id=(
            code_version.endpoint_integration.id
            if code_version.endpoint_integration
            else None
        ),
        endpoint_integration_name=(
            code_version.endpoint_integration.name
            if code_version.endpoint_integration
            else None
        ),
    )


@router.get("/evals/{eval_id}/code-versions", response=List[CodeVersionListSchema])
def list_eval_code_versions(request, eval_id: str):
    """
    List all code versions for a specific evaluation.
    """
    eval_obj = get_object_or_404(Eval, id=eval_id)
    code_versions = CodeVersion.objects.filter(eval=eval_obj).order_by("-version")

    return [
        CodeVersionListSchema(
            id=cv.id,
            eval_id=cv.eval.id,
            version=cv.version,
            created_at=cv.created_at,
            is_active=cv.is_active,
            eval_set_id=cv.eval_set.id if cv.eval_set else None,
            eval_set_name=cv.eval_set.name if cv.eval_set else None,
            endpoint_integration_id=(
                cv.endpoint_integration.id if cv.endpoint_integration else None
            ),
            endpoint_integration_name=(
                cv.endpoint_integration.name if cv.endpoint_integration else None
            ),
        )
        for cv in code_versions
    ]
