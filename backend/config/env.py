import os
from typing import Optional


class Environment:
    """Environment configuration class for handling environment variables."""

    @property
    def OPENAI_API_KEY(self) -> str:
        """Get OpenAI API key from environment variables."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        return api_key


# Global instance
env = Environment()
