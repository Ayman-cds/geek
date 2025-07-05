"""
Example usage of the Generate Eval Runner endpoint.

This script demonstrates how to call the /api/generate-eval-runner endpoint
to generate Python code that can run evaluations against an API endpoint.
"""

import requests
import json

# Example request payload
example_request = {
    "eval_id": "123e4567-e89b-12d3-a456-426614174000",
    "endpoint_integration_id": "123e4567-e89b-12d3-a456-426614174001",
    "csv_sample_rows": [
        {
            "prompt": "What is the capital of France?",
            "expected_output": "Paris",
            "category": "geography",
        },
        {
            "prompt": "Explain quantum computing in simple terms",
            "expected_output": "Quantum computing uses quantum bits that can exist in multiple states simultaneously",
            "category": "science",
        },
        {
            "prompt": "Write a Python function to calculate factorial",
            "expected_output": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)",
            "category": "programming",
        },
    ],
    "instructions": "Focus on evaluating factual accuracy and code correctness. Use BLEU score for text similarity and custom metrics for code evaluation.",
}


def call_generate_eval_runner():
    """
    Example function to call the generate eval runner endpoint.

    Note: This would require authentication in a real scenario.
    """
    api_url = "http://localhost:8000/api/generate-eval-runner"

    # In a real scenario, you would include authentication headers
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer your_token_here"
    }

    try:
        response = requests.post(api_url, headers=headers, json=example_request)

        if response.status_code == 200:
            result = response.json()
            print("Success! Generated eval runner code:")
            print(f"Code Version: {result['code_version']}")
            print(f"Code Version ID: {result['code_version_id']}")
            print(f"Eval ID: {result['eval_id']}")
            print("\nGenerated Code:")
            print("=" * 50)
            print(result["generated_code"])
            print("=" * 50)

            # Save the generated code to a file
            filename = f"eval_runner_v{result['code_version']}.py"
            with open(filename, "w") as f:
                f.write(result["generated_code"])
            print(f"\nCode saved to: {filename}")

        else:
            print(f"Error: {response.status_code}")
            print(response.text)

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")


if __name__ == "__main__":
    call_generate_eval_runner()
