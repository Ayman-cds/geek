import tempfile
import uuid
import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from django.conf import settings
from dotenv import load_dotenv

load_dotenv()


def upload_csv_to_azure(csv_file, eval_id, original_filename):
    try:
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(original_filename)[1]
        file_name = f"eval_{eval_id}_{unique_id}{file_extension}"
        
        account_name = "dunesa"
        account_key = os.getenv("AZURE_ACCOUNT_KEY")
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
        
        blob_service_client = BlobServiceClient.from_connection_string(
            connection_string
        )
        
        container_client = blob_service_client.get_container_client("geek-evals")
        
        csv_file.seek(0)
        container_client.upload_blob(
            name=file_name,
            data=csv_file.read(),
            overwrite=True,
            content_settings=ContentSettings(content_type="text/csv"),
        )
        
        azure_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/geek-evals/{file_name}"
        
        return azure_url
        
    except Exception as e:
        print(f"Azure upload failed: {str(e)}")
        return None


def delete_csv_from_azure(file_url):
    try:
        account_name = "dunesa"
        account_key = os.getenv("AZURE_ACCOUNT_KEY")
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
        
        blob_service_client = BlobServiceClient.from_connection_string(
            connection_string
        )
        
        container_client = blob_service_client.get_container_client("geek-evals")
        
        blob_name = file_url.split("/")[-1]
        container_client.delete_blob(blob_name)
        
        return True
        
    except Exception as e:
        print(f"Azure delete failed: {str(e)}")
        return False 