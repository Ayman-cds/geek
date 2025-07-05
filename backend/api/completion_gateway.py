import base64
import logging
import time
import asyncio
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TypeVar, Type
import os

from config.env import env
from openai import AsyncOpenAI, OpenAI
from utils.types import ChatModel
import instructor
from pydantic import BaseModel

os.environ["INSTRUCTOR_DEBUG"] = "1"
logging.getLogger("instructor").setLevel(logging.DEBUG)

DEFAULT_MODEL = "gpt-4o"
DEFAULT_MODEL_PARAMETERS = {
    "temperature": 0.1,
    "max_tokens": 10000,
}
STRUCTURED_OUTPUT_DEFAULT_MODEL_PARAMETERS = {
    "temperature": 0.1,
    "max_tokens": 16384,
}

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class CompletionsGateway(ABC):
    @abstractmethod
    def create_completion(
        self,
        prompt: str,
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = DEFAULT_MODEL_PARAMETERS,
    ) -> str:
        pass

    @abstractmethod
    async def async_create_completion(
        self,
        prompt: str,
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = DEFAULT_MODEL_PARAMETERS,
    ) -> str:
        pass

    @abstractmethod
    def create_structured_completion(
        self,
        prompt: str,
        schema: Type[T],
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = STRUCTURED_OUTPUT_DEFAULT_MODEL_PARAMETERS,
    ) -> T:
        pass

    @abstractmethod
    async def async_create_structured_completion(
        self,
        prompt: str,
        schema: Type[T],
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = STRUCTURED_OUTPUT_DEFAULT_MODEL_PARAMETERS,
    ) -> T:
        pass


class LLMCompletionsGateway(CompletionsGateway):
    def __init__(self):
        self.client = OpenAI(
            api_key=env.OPENAI_API_KEY,
        )
        self.async_client = AsyncOpenAI(
            api_key=env.OPENAI_API_KEY,
        )
        self.instructor_client = instructor.from_openai(
            OpenAI(api_key=env.OPENAI_API_KEY)
        )
        self.async_instructor_client = instructor.from_openai(
            AsyncOpenAI(api_key=env.OPENAI_API_KEY)
        )

    def create_completion(
        self,
        prompt: str,
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = DEFAULT_MODEL_PARAMETERS,
    ) -> str:
        try:
            start_time = time.time()
            message_content = []
            if prompt:
                message_content.append({"role": "user", "content": prompt})

            if images:
                for image_path in images:
                    if image_path.startswith("data:image/") or len(image_path) > 255:
                        base64_image = (
                            image_path.split(",")[-1]
                            if "," in image_path
                            else image_path
                        )
                    elif image_path.startswith(("http://", "https://")):
                        message_content.append(
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": image_path,
                                            "detail": "auto",
                                        },
                                    }
                                ],
                            }
                        )
                        continue
                    else:
                        try:
                            with open(image_path, "rb") as image_file:
                                base64_image = base64.b64encode(
                                    image_file.read()
                                ).decode("utf-8")
                        except Exception as e:
                            print(f"Error processing image {image_path}: {str(e)}")
                            raise

                    message_content.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                        "detail": "auto",
                                    },
                                }
                            ],
                        }
                    )

            completion = self.client.chat.completions.create(
                model=model.value,
                messages=message_content,
                temperature=(
                    1.0
                    if model == ChatModel.GPT_O3_MINI
                    else params.get("temperature", 0.1)
                ),
            )

            end_time = time.time()
            response_time = end_time - start_time
            logger.info(f"completion response time: {response_time:.2f} seconds")
            logger.info(completion.choices[0].message.content)

            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error in LLMCompletionsGateway: {str(e)}")
            raise

    async def async_create_completion(
        self,
        prompt: str,
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = DEFAULT_MODEL_PARAMETERS,
    ) -> str:
        try:
            start_time = asyncio.get_event_loop().time()
            message_content = []
            if prompt:
                message_content.append({"role": "user", "content": prompt})

            if images:
                for image_path in images:
                    if image_path.startswith("data:image/") or len(image_path) > 255:
                        base64_image = (
                            image_path.split(",")[-1]
                            if "," in image_path
                            else image_path
                        )
                    elif image_path.startswith(("http://", "https://")):
                        message_content.append(
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": image_path,
                                            "detail": "auto",
                                        },
                                    }
                                ],
                            }
                        )
                        continue
                    else:
                        try:
                            with open(image_path, "rb") as image_file:
                                base64_image = base64.b64encode(
                                    image_file.read()
                                ).decode("utf-8")
                        except Exception as e:
                            logger.error(
                                f"Error processing image {image_path}: {str(e)}"
                            )
                            raise

                    message_content.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                        "detail": "auto",
                                    },
                                }
                            ],
                        }
                    )

            completion = await self.async_client.chat.completions.create(
                model=model.value,
                messages=message_content,
                temperature=(
                    1.0
                    if model == ChatModel.GPT_O3_MINI
                    else params.get("temperature", 0.1)
                ),
            )

            end_time = asyncio.get_event_loop().time()
            response_time = end_time - start_time
            logger.info(f"Async completion response time: {response_time:.2f} seconds")
            logger.info(completion.choices[0].message.content)

            return completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in async LLMCompletionsGateway: {str(e)}")
            raise

    def create_structured_completion(
        self,
        prompt: str,
        schema: Type[T],
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = STRUCTURED_OUTPUT_DEFAULT_MODEL_PARAMETERS,
    ) -> T:
        try:
            start_time = time.time()
            message_content = []
            if prompt:
                message_content.append({"role": "user", "content": prompt})

            if images:
                for image_path in images:
                    if image_path.startswith("data:image/") or len(image_path) > 255:
                        base64_image = (
                            image_path.split(",")[-1]
                            if "," in image_path
                            else image_path
                        )
                    elif image_path.startswith(("http://", "https://")):
                        message_content.append(
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": image_path,
                                            "detail": "auto",
                                        },
                                    }
                                ],
                            }
                        )
                        continue
                    else:
                        try:
                            with open(image_path, "rb") as image_file:
                                base64_image = base64.b64encode(
                                    image_file.read()
                                ).decode("utf-8")
                        except Exception as e:
                            print(f"Error processing image {image_path}: {str(e)}")
                            raise

                    message_content.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                        "detail": "auto",
                                    },
                                }
                            ],
                        }
                    )

            response = self.instructor_client.chat.completions.create(
                model=model.value,
                messages=message_content,
                temperature=(
                    1.0
                    if model == ChatModel.GPT_O3_MINI
                    else params.get("temperature", 0.1)
                ),
                max_tokens=params.get("max_tokens", 16384),
                response_model=schema,
            )

            end_time = time.time()
            response_time = end_time - start_time
            logger.info(
                f"Structured completion response time: {response_time:.2f} seconds"
            )

            return response
        except Exception as e:
            print(f"Error in LLMCompletionsGateway structured completion: {str(e)}")
            raise

    async def async_create_structured_completion(
        self,
        prompt: str,
        schema: Type[T],
        model: Optional[ChatModel] = ChatModel.GPT_4O,
        images: Optional[List[str]] = None,
        params: Dict[str, Any] = STRUCTURED_OUTPUT_DEFAULT_MODEL_PARAMETERS,
    ) -> T:
        try:
            start_time = asyncio.get_event_loop().time()
            message_content = []
            if prompt:
                message_content.append({"role": "user", "content": prompt})

            if images:
                for image_path in images:
                    if image_path.startswith("data:image/") or len(image_path) > 255:
                        base64_image = (
                            image_path.split(",")[-1]
                            if "," in image_path
                            else image_path
                        )
                    elif image_path.startswith(("http://", "https://")):
                        message_content.append(
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": image_path,
                                            "detail": "auto",
                                        },
                                    }
                                ],
                            }
                        )
                        continue
                    else:
                        try:
                            with open(image_path, "rb") as image_file:
                                base64_image = base64.b64encode(
                                    image_file.read()
                                ).decode("utf-8")
                        except Exception as e:
                            logger.error(
                                f"Error processing image {image_path}: {str(e)}"
                            )
                            raise

                    message_content.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                        "detail": "auto",
                                    },
                                }
                            ],
                        }
                    )

            response = await self.async_instructor_client.chat.completions.create(
                model=model.value,
                messages=message_content,
                temperature=(
                    1.0
                    if model == ChatModel.GPT_O3_MINI
                    else params.get("temperature", 0.1)
                ),
                max_tokens=params.get("max_tokens", 16384),
                response_model=schema,
            )

            end_time = asyncio.get_event_loop().time()
            response_time = end_time - start_time
            logger.info(
                f"Async structured completion response time: {response_time:.2f} seconds"
            )

            return response
        except Exception as e:
            logger.error(
                f"Error in async LLMCompletionsGateway structured completion: {str(e)}"
            )
            raise
