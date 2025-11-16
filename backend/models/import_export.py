from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List, Literal
from datetime import datetime, timezone
import uuid


class ImportTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    file_type: Literal['csv', 'json', 'sql'] = 'csv'
    field_mappings: Dict[str, str] = Field(default_factory=dict)  # {source_field: target_field}
    value_mappings: Dict[str, Dict[str, str]] = Field(default_factory=dict)  # {field: {source_value: target_value}}
    date_format: str = Field(default='DD-MM-YYYY')
    description: Optional[str] = None


class ImportTemplateCreate(ImportTemplateBase):
    church_id: str


class ImportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    file_type: Optional[Literal['csv', 'json', 'sql']] = None
    field_mappings: Optional[Dict[str, str]] = None
    value_mappings: Optional[Dict[str, Dict[str, str]]] = None
    date_format: Optional[str] = None
    description: Optional[str] = None


class ImportTemplate(ImportTemplateBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ImportLogBase(BaseModel):
    template_id: Optional[str] = None
    file_name: str
    file_type: Literal['csv', 'json', 'sql']
    total_records: int = 0
    successful_records: int = 0
    failed_records: int = 0
    errors: List[str] = Field(default_factory=list)
    status: Literal['pending', 'validating', 'simulating', 'completed', 'failed'] = 'pending'
    imported_by: str  # user_id


class ImportLogCreate(ImportLogBase):
    church_id: str


class ImportLog(ImportLogBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
