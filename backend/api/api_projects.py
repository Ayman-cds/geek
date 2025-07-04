from ninja import Router
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from typing import List

from .models import Project
from .schemas import ProjectCreateSchema, ProjectUpdateSchema, ProjectResponseSchema, ProjectListSchema

router = Router()


@router.post("/projects", response=ProjectResponseSchema)
def create_project(request, project_data: ProjectCreateSchema):
    owner = User.objects.first()
    if not owner:
        return {"error": "No users found. Please create a user first."}, 400
    
    project = Project.objects.create(
        name=project_data.name,
        description=project_data.description,
        owner=owner
    )
    return project


@router.get("/projects", response=List[ProjectListSchema])
def list_projects(request):
    projects = Project.objects.all()
    return projects


@router.get("/projects/{project_id}", response=ProjectResponseSchema)
def get_project(request, project_id: str):
    project = get_object_or_404(Project, id=project_id)
    return project


@router.put("/projects/{project_id}", response=ProjectResponseSchema)
def update_project(request, project_id: str, project_data: ProjectUpdateSchema):
    project = get_object_or_404(Project, id=project_id)
    
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    
    project.save()
    return project


@router.delete("/projects/{project_id}")
def delete_project(request, project_id: str):
    project = get_object_or_404(Project, id=project_id)
    project.delete()
    return {"message": "Project deleted successfully"} 