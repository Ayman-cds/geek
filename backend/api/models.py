import uuid
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="e.g. 'Chatbot Quality Audit'")
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name


class Eval(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='evals')
    name = models.CharField(max_length=255, help_text="e.g. 'Relevance & Fluency Test'")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.project.name} - {self.name}"


class EndpointIntegration(models.Model):
    HTTP_METHOD_CHOICES = [
        ('POST', 'POST'),
        ('GET', 'GET'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eval = models.ForeignKey(Eval, on_delete=models.CASCADE, related_name='endpoint_integrations')
    name = models.CharField(max_length=255, help_text="e.g. 'OpenAI GPT-4 Turbo'")
    endpoint_url = models.URLField(max_length=500)
    http_method = models.CharField(max_length=10, choices=HTTP_METHOD_CHOICES, default='POST')
    param_schema = models.JSONField(
        help_text="Schema for parameters, e.g. {'prompt': 'string', 'temperature': 'number'}"
    )
    param_defaults = models.JSONField(
        default=dict,
        help_text="User-provided defaults for missing params"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.eval.name} - {self.name}"


class EvalSet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eval = models.ForeignKey(Eval, on_delete=models.CASCADE, related_name='eval_sets')
    endpoint_integration = models.ForeignKey(
        EndpointIntegration, 
        on_delete=models.CASCADE, 
        related_name='eval_sets',
        null=True,
        blank=True,
        help_text="Optional; can be assigned later"
    )
    name = models.CharField(max_length=255, help_text="e.g. 'June 2025 translation prompts'")
    file_url = models.URLField(max_length=500, help_text="Azure Blob SAS URL")
    row_count = models.IntegerField(null=True, blank=True, help_text="Optional; for quick sanity checks")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_eval_sets')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def clean(self):
        if self.eval and self.endpoint_integration:
            if self.endpoint_integration.eval != self.eval:
                raise ValidationError(
                    'Endpoint integration must belong to the same eval as the eval set.'
                )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.eval.name} - {self.name}"


class EvalSetItem(models.Model):
    """
    Optional: If you want row-level querying or per-row results, parse CSV into this table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eval_set = models.ForeignKey(EvalSet, on_delete=models.CASCADE, related_name='items')
    row_number = models.IntegerField(help_text="Original CSV line number")
    input_payload = models.JSONField(help_text="The parsed prompt/fields row")
    reference_output = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Optional 'ground truth'"
    )
    
    class Meta:
        ordering = ['row_number']
        unique_together = ['eval_set', 'row_number']
        
    def __str__(self):
        return f"{self.eval_set.name} - Row {self.row_number}"


class CodeVersion(models.Model):
    """
    Every time AI writes new integration code (or user edits it), snapshot it here
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eval = models.ForeignKey(Eval, on_delete=models.CASCADE, related_name='code_versions')
    version = models.IntegerField(help_text="Incrementing; start at 1")
    code = models.TextField(help_text="Full Python script, runnable out-of-the-box")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_code_versions')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False, help_text="Only one version per eval is active")
    
    class Meta:
        ordering = ['-version']
        unique_together = ['eval', 'version']
        
    def save(self, *args, **kwargs):
        # Auto-increment version for new code versions
        if not self.version:
            last_version = CodeVersion.objects.filter(eval=self.eval).order_by('-version').first()
            self.version = (last_version.version + 1) if last_version else 1
        
        # Ensure only one active version per eval
        if self.is_active:
            CodeVersion.objects.filter(eval=self.eval, is_active=True).update(is_active=False)
            
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.eval.name} - v{self.version}"


class EvalRun(models.Model):
    """
    When someone 'kicks off' a batch, you create a run record
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eval = models.ForeignKey(Eval, on_delete=models.CASCADE, related_name='runs')
    code_version = models.ForeignKey(CodeVersion, on_delete=models.CASCADE, related_name='runs')
    run_params = models.JSONField(
        default=dict,
        help_text="Overrides or flags for this run"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.eval.name} - Run {self.started_at.strftime('%Y-%m-%d %H:%M')}"


class RunResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(EvalRun, on_delete=models.CASCADE, related_name='results')
    eval_set_item = models.ForeignKey(
        EvalSetItem, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='results',
        help_text="NULL if you skip items table"
    )
    raw_output = models.TextField(help_text="Raw response from the endpoint")
    metrics = models.JSONField(
        default=dict,
        help_text="BLEU/ROUGE/etc. computed metrics"
    )
    scores = models.JSONField(
        default=dict,
        help_text="User or AI-generated rubric scores"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.run.eval.name} - Result {self.created_at.strftime('%Y-%m-%d %H:%M')}"
