from typing import List, Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class QuestRequest(BaseModel):
    time_minutes: int = Field(default=30, ge=10, le=180)
    location: Location
    mood: str = Field(default="curious", max_length=50)
    difficulty: str = Field(default="easy", max_length=30)


QuestStepType = Literal[
    "walk",
    "discover",
    "pause",
    "observe",
    "return",
]


class QuestStep(BaseModel):
    type: QuestStepType
    minutes: int = Field(ge=1, le=180)
    instruction: str = Field(min_length=1, max_length=300)


class Quest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    total_minutes: int = Field(ge=1, le=180)
    steps: List[QuestStep] = Field(min_length=1, max_length=12)
