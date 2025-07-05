from enum import Enum


class ChatModel(Enum):
    """Chat model options for LLM completions."""

    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_O3_MINI = "o3-mini"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
