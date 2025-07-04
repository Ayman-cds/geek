from django.contrib import admin
from .models import (
    Project, Eval, EndpointIntegration, EvalSet, EvalSetItem, 
    CodeVersion, EvalRun, RunResult
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'created_at', 'updated_at']
    list_filter = ['created_at', 'owner']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Eval)
class EvalAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'created_at', 'updated_at']
    list_filter = ['created_at', 'project']
    search_fields = ['name', 'description', 'project__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(EndpointIntegration)
class EndpointIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'eval', 'endpoint_url', 'http_method', 'created_at']
    list_filter = ['http_method', 'created_at']
    search_fields = ['name', 'endpoint_url', 'eval__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(EvalSet)
class EvalSetAdmin(admin.ModelAdmin):
    list_display = ['name', 'eval', 'endpoint_integration', 'row_count', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at', 'eval', 'endpoint_integration']
    search_fields = ['name', 'eval__name', 'endpoint_integration__name']
    readonly_fields = ['id', 'uploaded_at']
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj and obj.eval:
            form.base_fields['endpoint_integration'].queryset = EndpointIntegration.objects.filter(eval=obj.eval)
        return form


@admin.register(EvalSetItem)
class EvalSetItemAdmin(admin.ModelAdmin):
    list_display = ['eval_set', 'row_number', 'id']
    list_filter = ['eval_set']
    search_fields = ['eval_set__name']
    readonly_fields = ['id']
    ordering = ['eval_set', 'row_number']


@admin.register(CodeVersion)
class CodeVersionAdmin(admin.ModelAdmin):
    list_display = ['eval', 'version', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'created_at', 'eval']
    search_fields = ['eval__name', 'created_by__username']
    readonly_fields = ['id', 'created_at', 'version']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ['eval']
        return self.readonly_fields


@admin.register(EvalRun)
class EvalRunAdmin(admin.ModelAdmin):
    list_display = ['eval', 'code_version', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'started_at', 'completed_at']
    search_fields = ['eval__name', 'code_version__version']
    readonly_fields = ['id', 'started_at']


@admin.register(RunResult)
class RunResultAdmin(admin.ModelAdmin):
    list_display = ['run', 'eval_set_item', 'created_at']
    list_filter = ['created_at', 'run__status']
    search_fields = ['run__eval__name']
    readonly_fields = ['id', 'created_at']
