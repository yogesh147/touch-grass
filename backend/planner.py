import json
import os
from typing import Any

import httpx

from backend.models import QuestRequest


SYSTEM_PROMPT = """
You are Touch Grass, an outdoor micro-adventure planner.

Your purpose is to help people spend less time looking at screens.

Create a tiny, safe outdoor quest.

IMPORTANT RULES:

1. The total duration must fit within the requested time.
2. The user should be able to put their phone away after reading the quest.
3. Prefer walking, plants, trees, observation, quiet moments, and harmless discovery.
4. Never require entering private property.
5. Never suggest dangerous activities.
6. Never invent an exact address, business, road, park, or landmark.
7. Keep instructions short and actionable.
8. Do not tell the user to continuously use their phone.
9. Return ONLY valid JSON.
10. Do not wrap the JSON in markdown.

The JSON must have exactly this structure:

{
  "title": "Short quest title",
  "total_minutes": 30,
  "steps": [
    {
      "type": "walk",
      "minutes": 5,
      "instruction": "Walk toward a green space."
    }
  ]
}

Allowed step types:

walk
discover
pause
observe
return
"""


def extract_json(text: str) -> dict[str, Any]:
    """
    Safely extract JSON if the model accidentally adds surrounding text.
    """

    cleaned = text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()

        if len(lines) >= 3:
            cleaned = "\n".join(lines[1:-1]).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError("Gemma did not return valid JSON.")

        return json.loads(cleaned[start:end + 1])


def validate_quest(
        quest: dict[str, Any],
        requested_minutes: int,
) -> dict[str, Any]:

    if not isinstance(quest, dict):
        raise ValueError("Quest must be an object.")

    title = quest.get("title")

    if not isinstance(title, str) or not title.strip():
        raise ValueError("Quest title is missing.")

    steps = quest.get("steps")

    if not isinstance(steps, list) or not steps:
        raise ValueError("Quest steps are missing.")

    allowed_types = {
        "walk",
        "discover",
        "pause",
        "observe",
        "return",
    }

    cleaned_steps = []
    total = 0

    for step in steps[:12]:

        if not isinstance(step, dict):
            continue

        step_type = step.get("type")
        minutes = step.get("minutes")
        instruction = step.get("instruction")

        if step_type not in allowed_types:
            continue

        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            continue

        if minutes < 1:
            continue

        if not isinstance(instruction, str):
            continue

        instruction = instruction.strip()

        if not instruction:
            continue

        cleaned_steps.append(
            {
                "type": step_type,
                "minutes": minutes,
                "instruction": instruction[:300],
            }
        )

        total += minutes

    if not cleaned_steps:
        raise ValueError("No valid quest steps returned.")

    # Don't allow the model to exceed the user's available time.
    if total > requested_minutes:
        overflow = total - requested_minutes

        for step in reversed(cleaned_steps):
            if overflow <= 0:
                break

            removable = max(0, step["minutes"] - 1)
            reduction = min(removable, overflow)

            step["minutes"] -= reduction
            overflow -= reduction

        total = sum(step["minutes"] for step in cleaned_steps)

    if total <= 0:
        raise ValueError("Invalid quest duration.")

    return {
        "title": title.strip()[:100],
        "total_minutes": total,
        "steps": cleaned_steps,
    }


async def call_gemma(
        system_prompt: str,
        user_prompt: str,
) -> str:

    gemma_url = os.getenv("GEMMA_URL", "").strip()
    gemma_model = os.getenv("GEMMA_MODEL", "gemma3").strip()

    if not gemma_url:
        raise RuntimeError(
            "GEMMA_URL is not configured. "
            "Use Offline Demo or configure a Gemma inference server."
        )

    # This adapter expects an Ollama-compatible /api/generate endpoint.
    endpoint = gemma_url.rstrip("/") + "/api/generate"

    payload = {
        "model": gemma_model,
        "prompt": (
            f"{system_prompt}\n\n"
            f"USER REQUEST:\n{user_prompt}"
        ),
        "stream": False,
        "options": {
            "temperature": 0.7,
        },
    }

    timeout = httpx.Timeout(
        connect=10.0,
        read=120.0,
        write=20.0,
        pool=20.0,
    )

    async with httpx.AsyncClient(timeout=timeout) as client:

        response = await client.post(
            endpoint,
            json=payload,
        )

        response.raise_for_status()

        data = response.json()

    generated = data.get("response")

    if not isinstance(generated, str):
        raise RuntimeError(
            "Gemma server returned an unexpected response."
        )

    return generated


async def generate_quest(request: QuestRequest) -> dict[str, Any]:

    user_prompt = f"""
Available time: {request.time_minutes} minutes.

Starting coordinates:
latitude: {request.location.lat}
longitude: {request.location.lng}

Mood: {request.mood}

Difficulty: {request.difficulty}

Create a small outdoor quest.
Do not invent specific nearby landmarks.
The location is provided only as environmental context.
"""

    raw_response = await call_gemma(
        SYSTEM_PROMPT,
        user_prompt,
    )

    parsed = extract_json(raw_response)

    return validate_quest(
        parsed,
        request.time_minutes,
    )
