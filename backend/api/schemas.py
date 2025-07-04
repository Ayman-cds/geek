from ninja import Schema, File
from ninja.files import UploadedFile
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class ProjectCreateSchema(Schema):
    name: str
    description: Optional[str] = None


class ProjectUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponseSchema(Schema):
    id: UUID
    name: str
    description: Optional[str] = None
    owner_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectListSchema(Schema):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EvalCreateSchema(Schema):
    name: str
    description: Optional[str] = None
    project_id: UUID


class EvalUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None


class EvalResponseSchema(Schema):
    id: UUID
    name: str
    description: Optional[str] = None
    project_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EvalListSchema(Schema):
    id: UUID
    name: str
    description: Optional[str] = None
    project_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class EvalSetCreateSchema(Schema):
    name: Optional[str] = None
    eval_id: UUID
    endpoint_integration_id: Optional[UUID] = None


class EvalSetUpdateSchema(Schema):
    name: Optional[str] = None
    endpoint_integration_id: Optional[UUID] = None


class EvalSetResponseSchema(Schema):
    id: UUID
    name: str
    file_url: str
    row_count: Optional[int] = None
    eval_id: UUID
    endpoint_integration_id: Optional[UUID] = None
    uploaded_by_id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class EvalSetListSchema(Schema):
    id: UUID
    name: str
    file_url: str
    row_count: Optional[int] = None
    endpoint_integration_id: Optional[UUID] = None
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class EndpointIntegrationCreateSchema(Schema):
    name: str
    endpoint_url: str
    http_method: str = "POST"
    param_schema: Dict[str, Any]
    param_defaults: Optional[Dict[str, Any]] = None
    test_examples: List[Dict[str, Any]] = []
    eval_id: UUID


class EndpointIntegrationUpdateSchema(Schema):
    name: Optional[str] = None
    endpoint_url: Optional[str] = None
    http_method: Optional[str] = None
    param_schema: Optional[Dict[str, Any]] = None
    param_defaults: Optional[Dict[str, Any]] = None
    test_examples: Optional[List[Dict[str, Any]]] = None


class EndpointIntegrationResponseSchema(Schema):
    id: UUID
    name: str
    endpoint_url: str
    http_method: str
    param_schema: Dict[str, Any]
    param_defaults: Dict[str, Any]
    test_examples: List[Dict[str, Any]]
    eval_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EndpointIntegrationListSchema(Schema):
    id: UUID
    name: str
    endpoint_url: str
    http_method: str
    param_schema: Dict[str, Any]
    param_defaults: Dict[str, Any]
    test_examples: List[Dict[str, Any]]
    eval_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True 
