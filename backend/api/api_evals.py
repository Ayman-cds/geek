from ninja import Router
from django.shortcuts import get_object_or_404
from typing import List

from .models import Project, Eval
from .schemas import EvalCreateSchema, EvalUpdateSchema, EvalResponseSchema, EvalListSchema

router = Router()


@router.post("/evals", response=EvalResponseSchema)
def create_eval(request, eval_data: EvalCreateSchema):
    project = get_object_or_404(Project, id=eval_data.project_id)
    
    eval_obj = Eval.objects.create(
        name=eval_data.name,
        description=eval_data.description,
        project=project
    )
    return eval_obj


@router.get("/evals", response=List[EvalListSchema])
def list_evals(request):
    evals = Eval.objects.all()
    return evals


@router.get("/projects/{project_id}/evals", response=List[EvalListSchema])
def list_project_evals(request, project_id: str):
    project = get_object_or_404(Project, id=project_id)
    evals = Eval.objects.filter(project=project)
    return evals


@router.get("/evals/{eval_id}", response=EvalResponseSchema)
def get_eval(request, eval_id: str):
    eval_obj = get_object_or_404(Eval, id=eval_id)
    return eval_obj


@router.put("/evals/{eval_id}", response=EvalResponseSchema)
def update_eval(request, eval_id: str, eval_data: EvalUpdateSchema):
    eval_obj = get_object_or_404(Eval, id=eval_id)
    
    if eval_data.name is not None:
        eval_obj.name = eval_data.name
    if eval_data.description is not None:
        eval_obj.description = eval_data.description
    
    eval_obj.save()
    return eval_obj


@router.delete("/evals/{eval_id}")
def delete_eval(request, eval_id: str):
    eval_obj = get_object_or_404(Eval, id=eval_id)
    eval_obj.delete()
    return {"message": "Eval deleted successfully"} 