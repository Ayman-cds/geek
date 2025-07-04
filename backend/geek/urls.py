from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from api.api_projects import router as projects_router
from api.api_evals import router as evals_router
from api.api_eval_sets import router as eval_sets_router
from api.api_endpoint_integrations import router as integrations_router

api = NinjaAPI()

@api.get("/add")
def add(request, a: int, b: int):
    return {"result": a + b}

api.add_router("", projects_router)
api.add_router("", evals_router)
api.add_router("", eval_sets_router)
api.add_router("", integrations_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]
