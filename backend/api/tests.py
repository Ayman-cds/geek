from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock
import json

from .models import Project, Eval, EndpointIntegration, CodeVersion
from .api_endpoint_integrations import generate_eval_runner
from .schemas import GenerateEvalRunnerSchema


class GenerateEvalRunnerTestCase(TestCase):
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass"
        )
        self.project = Project.objects.create(
            name="Test Project", description="Test description", owner=self.user
        )
        self.eval = Eval.objects.create(
            name="Test Eval", description="Test eval description", project=self.project
        )
        self.endpoint_integration = EndpointIntegration.objects.create(
            name="Test Integration",
            eval=self.eval,
            endpoint_url="https://api.example.com/chat",
            http_method="POST",
            param_schema={"prompt": "string", "temperature": "number"},
            param_defaults={"temperature": 0.7},
            test_examples=[
                {"prompt": "Hello", "temperature": 0.5},
                {"prompt": "How are you?", "temperature": 0.8},
            ],
        )

    @patch("api.api_endpoint_integrations.LLMCompletionsGateway")
    def test_generate_eval_runner_success(self, mock_gateway_class):
        """Test successful eval runner generation."""
        # Mock the LLM gateway
        mock_gateway = MagicMock()
        mock_gateway.create_completion.return_value = """
import requests
import pandas as pd
import json

def main():
    print("Generated eval runner code")
    
if __name__ == "__main__":
    main()
"""
        mock_gateway_class.return_value = mock_gateway

        # Create mock request
        mock_request = MagicMock()
        mock_request.user = self.user

        # Create test data
        test_data = GenerateEvalRunnerSchema(
            eval_id=self.eval.id,
            endpoint_integration_id=self.endpoint_integration.id,
            csv_sample_rows=[
                {"prompt": "Test prompt 1", "expected_output": "Test output 1"},
                {"prompt": "Test prompt 2", "expected_output": "Test output 2"},
            ],
            instructions="Test the API responses for accuracy",
        )

        # Call the function
        result = generate_eval_runner(mock_request, test_data)

        # Verify the result
        self.assertIsNotNone(result.generated_code)
        self.assertEqual(result.eval_id, self.eval.id)
        self.assertEqual(result.code_version, 1)

        # Verify a CodeVersion was created
        code_version = CodeVersion.objects.filter(eval=self.eval).first()
        self.assertIsNotNone(code_version)
        self.assertTrue(code_version.is_active)
        self.assertEqual(code_version.created_by, self.user)

        # Verify the LLM was called with the right prompt
        mock_gateway.create_completion.assert_called_once()
        call_args = mock_gateway.create_completion.call_args[0]
        self.assertIn("Test Eval", call_args[0])
        self.assertIn("Test Integration", call_args[0])
        self.assertIn("https://api.example.com/chat", call_args[0])


# Create your tests here.
