from ninja import Router, File, Query
from ninja.files import UploadedFile
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from typing import List
import os
import csv
from io import StringIO

from .models import Eval, EvalSet, EndpointIntegration
from .schemas import EvalSetResponseSchema, EvalSetListSchema, EvalSetUpdateSchema
from .helpers import upload_csv_to_azure, delete_csv_from_azure, retrieve_csv_from_azure

router = Router()


def extract_name_from_filename(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = name.replace('_', ' ').replace('-', ' ')
    return ' '.join(word.capitalize() for word in name.split())


def count_csv_rows(file_content: str) -> int:
    try:
        reader = csv.reader(StringIO(file_content))
        return sum(1 for row in reader) - 1
    except:
        return 0


@router.post("/eval-sets", response=EvalSetResponseSchema)
def create_eval_set(
    request,
    file: UploadedFile = File(...),
    name: str = None,
    endpoint_integration_id: str = None,
):
    eval_id = request.POST.get("eval_id")
    if not eval_id:
        return {"error": "eval_id is required"}, 400

    eval_obj = get_object_or_404(Eval, id=eval_id)
    endpoint_integration = None

    if endpoint_integration_id:
        endpoint_integration = get_object_or_404(EndpointIntegration, id=endpoint_integration_id)
        if endpoint_integration.eval_id != eval_obj.id:
            return {"error": "Endpoint integration does not belong to the specified eval"}, 400

    user = User.objects.first()
    if not user:
        return {"error": "No users found. Please create a user first."}, 400

    if not name:
        name = extract_name_from_filename(file.name)

    file_content = file.read().decode('utf-8')
    row_count = count_csv_rows(file_content)

    file.seek(0)
    azure_url = upload_csv_to_azure(file, eval_id, file.name)

    if not azure_url:
        return {"error": "Failed to upload file to Azure Blob Storage"}, 500

    eval_set = EvalSet.objects.create(
        name=name,
        eval=eval_obj,
        endpoint_integration=endpoint_integration,
        file_url=azure_url,
        row_count=row_count,
        uploaded_by=user
    )

    return eval_set


@router.put("/eval-sets/{eval_set_id}", response=EvalSetResponseSchema)
def update_eval_set(request, eval_set_id: str, eval_set_data: EvalSetUpdateSchema):
    eval_set = get_object_or_404(EvalSet, id=eval_set_id)
    
    if eval_set_data.name is not None:
        eval_set.name = eval_set_data.name
    
    if eval_set_data.endpoint_integration_id is not None:
        if eval_set_data.endpoint_integration_id:
            endpoint_integration = get_object_or_404(EndpointIntegration, id=eval_set_data.endpoint_integration_id)
            if endpoint_integration.eval_id != eval_set.eval_id:
                return {"error": "Endpoint integration does not belong to the same eval"}, 400
            eval_set.endpoint_integration = endpoint_integration
        else:
            eval_set.endpoint_integration = None
    
    eval_set.save()
    return eval_set


@router.get("/eval-sets", response=List[EvalSetListSchema])
def list_eval_sets(request):
    eval_sets = EvalSet.objects.all()
    return eval_sets


@router.get("/evals/{eval_id}/eval-sets", response=List[EvalSetListSchema])
def list_eval_eval_sets(request, eval_id: str):
    eval_obj = get_object_or_404(Eval, id=eval_id)
    eval_sets = EvalSet.objects.filter(eval=eval_obj)
    return eval_sets


@router.get("/endpoint-integrations/{integration_id}/eval-sets", response=List[EvalSetListSchema])
def list_integration_eval_sets(request, integration_id: str):
    integration = get_object_or_404(EndpointIntegration, id=integration_id)
    eval_sets = EvalSet.objects.filter(endpoint_integration=integration)
    return eval_sets


@router.get("/eval-sets/{eval_set_id}", response=EvalSetResponseSchema)
def get_eval_set(request, eval_set_id: str):
    eval_set = get_object_or_404(EvalSet, id=eval_set_id)
    return eval_set


@router.delete("/eval-sets/{eval_set_id}")
def delete_eval_set(request, eval_set_id: str):
    eval_set = get_object_or_404(EvalSet, id=eval_set_id)

    if eval_set.file_url:
        delete_csv_from_azure(eval_set.file_url)

    eval_set.delete()
    return {"message": "Eval set deleted successfully"}


@router.get("/eval-sets/{eval_set_id}/sample-data")
def get_eval_set_sample_data(request, eval_set_id: str, sample_size: int = Query(5)):
    eval_set = get_object_or_404(EvalSet, id=eval_set_id)

    csv_data = retrieve_csv_from_azure(eval_set.file_url, sample_size)
    if not csv_data:
        return {"error": "Failed to retrieve CSV data from blob storage"}, 500

    return {
        "eval_set_id": eval_set_id,
        "eval_set_name": eval_set.name,
        "sample_rows": csv_data["sample_rows"],
        "total_rows": csv_data["total_rows"],
        "sample_size": len(csv_data["sample_rows"]),
    }
