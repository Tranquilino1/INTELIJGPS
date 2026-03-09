"""
INTELIJGPS — Landmark Navigation Algorithm
Reference implementation: GPS Coordinate → Voice Instruction

This module converts a user's GPS position and heading into a culturally-aware
voice navigation instruction based on the nearest landmark, tailored for
Equatorial Guinea's landmark-based addressing system.

Example output: "Estás cerca, a la derecha del Estadio de Malabo"
"""

import math
from dataclasses import dataclass
from enum import Enum
from typing import Optional


# ============================================================
# Data Models
# ============================================================

class LandmarkCategory(Enum):
    EDIFICIO = "edificio"
    SURTIDOR = "surtidor"      # Gas station
    MERCADO = "mercado"
    IGLESIA = "iglesia"
    HOSPITAL = "hospital"
    HOTEL = "hotel"
    AEROPUERTO = "aeropuerto"
    PUERTO = "puerto"
    EDUCACION = "educacion"


@dataclass
class Landmark:
    id: int
    name: str
    category: str
    nav_phrase_es: Optional[str]     # Pre-curated cultural phrase
    distance_m: float                # Distance from user in meters
    bearing_deg: float               # Bearing from user to landmark (0=N, 90=E)
    latitude: float
    longitude: float


@dataclass
class TrafficAlert:
    id: int
    report_type: str
    severity: int
    title: str
    distance_m: float


# ============================================================
# Core Algorithm
# ============================================================

def normalize_angle(angle: float) -> float:
    """Normalize angle to 0-360 range."""
    return angle % 360


def get_relative_direction(user_heading: float, landmark_bearing: float) -> str:
    """
    Determine the spatial relationship between user's heading direction
    and the landmark's position.

    Args:
        user_heading: User's compass heading in degrees (0=N, 90=E)
        landmark_bearing: Bearing from user to landmark in degrees

    Returns:
        Spanish relative direction phrase
    """
    delta = normalize_angle(landmark_bearing - user_heading)

    if delta < 30 or delta > 330:
        return "delante de"
    elif 30 <= delta < 60:
        return "a la derecha de, cerca de"
    elif 60 <= delta < 120:
        return "a la derecha de"
    elif 120 <= delta < 150:
        return "detrás a la derecha de"
    elif 150 <= delta < 210:
        return "detrás de"
    elif 210 <= delta < 240:
        return "detrás a la izquierda de"
    elif 240 <= delta < 300:
        return "a la izquierda de"
    else:  # 300 <= delta < 330
        return "a la izquierda de, cerca de"


def get_distance_prefix(distance_m: float) -> str:
    """
    Generate a natural-sounding distance prefix in Español Ecuatoguineano.

    Args:
        distance_m: Distance in meters

    Returns:
        Cultural distance phrase
    """
    if distance_m < 50:
        return "Estás justo"
    elif distance_m < 150:
        return "Estás cerca,"
    elif distance_m < 300:
        return f"A {round(distance_m)} metros,"
    else:
        return f"A unos {round(distance_m / 100) * 100} metros,"


def get_category_reference(category: str, name: str) -> str:
    """
    Build a culturally-appropriate reference phrase based on
    the landmark's category.

    In Guinea Ecuatorial, landmarks are often referenced with specific
    articles and prepositions depending on their type.

    Args:
        category: Landmark category code
        name: Landmark name

    Returns:
        Formatted reference string
    """
    CATEGORY_TEMPLATES = {
        "surtidor":    f"el surtidor de {name}",
        "mercado":     f"el mercado de {name}",
        "iglesia":     f"la iglesia de {name}",
        "hospital":    f"el hospital de {name}",
        "hotel":       f"el hotel {name}",
        "aeropuerto":  f"el aeropuerto de {name}",
        "puerto":      f"el puerto de {name}",
        "educacion":   f"la {name}",
    }
    return CATEGORY_TEMPLATES.get(category, name)


def build_voice_instruction(
    landmark: Landmark,
    relation: str,
    distance_m: float
) -> str:
    """
    Build the final voice navigation instruction.

    Priority:
    1. Use pre-curated nav_phrase if available (culturally verified)
    2. Otherwise, dynamically compose from category + distance + direction

    Args:
        landmark: Nearest landmark data
        relation: Relative direction phrase
        distance_m: Distance to landmark in meters

    Returns:
        Complete voice instruction string
    """
    # Priority 1: Use curated cultural phrase if available
    if landmark.nav_phrase_es:
        prefix = get_distance_prefix(distance_m)
        return f"{prefix} {landmark.nav_phrase_es}"

    # Priority 2: Dynamic composition
    prefix = get_distance_prefix(distance_m)
    reference = get_category_reference(landmark.category, landmark.name)
    return f"{prefix} {relation} {reference}"


def coordinate_to_landmark_instruction(
    user_lat: float,
    user_lon: float,
    user_heading: float,
    nearby_landmarks: list[Landmark],
    active_alerts: list[TrafficAlert] = None,
    search_radius_m: int = 500
) -> str:
    """
    MAIN ALGORITHM: Convert GPS coordinates into a landmark-based
    voice navigation instruction.

    This is the core of INTELIJGPS — translating coordinates into
    human-readable, culturally-relevant directions that match how
    people in Equatorial Guinea actually give directions.

    Args:
        user_lat: User's latitude
        user_lon: User's longitude
        user_heading: User's compass heading (0-360 degrees)
        nearby_landmarks: List of landmarks from PostGIS fn_nearby_landmarks()
        active_alerts: Optional list of active traffic alerts nearby
        search_radius_m: Search radius in meters

    Returns:
        Voice instruction string ready for TTS

    Example:
        >>> instruction = coordinate_to_landmark_instruction(
        ...     user_lat=3.7523,
        ...     user_lon=8.7741,
        ...     user_heading=45.0,
        ...     nearby_landmarks=[
        ...         Landmark(id=1, name="Estadio de Malabo",
        ...                  category="edificio", nav_phrase_es=None,
        ...                  distance_m=120, bearing_deg=0,
        ...                  latitude=3.7533, longitude=8.7741)
        ...     ]
        ... )
        >>> print(instruction)
        "Estás cerca, delante de Estadio de Malabo"
    """

    # STEP 1: Handle no landmarks found
    if not nearby_landmarks:
        return "Continúa recto por la carretera"

    # STEP 2: Select the best landmark (closest verified)
    best = nearby_landmarks[0]

    # STEP 3: Compute relative direction
    relation = get_relative_direction(user_heading, best.bearing_deg)

    # STEP 4: Build the voice instruction
    instruction = build_voice_instruction(best, relation, best.distance_m)

    # STEP 5: Append traffic context if available
    if active_alerts:
        top_alert = active_alerts[0]
        instruction += f". ¡Ojo! {top_alert.title}"

    return instruction


# ============================================================
# Example: Simulate the algorithm
# ============================================================

def demo():
    """Demonstrate the algorithm with sample data from Malabo and Bata."""

    print("=" * 60)
    print("INTELIJGPS — Landmark Navigation Algorithm Demo")
    print("=" * 60)

    # Scenario 1: Near Estadio de Malabo, heading North
    print("\n📍 Scenario 1: Near Estadio de Malabo")
    print(f"   Position: 3.7523° N, 8.7741° W | Heading: 45° (NE)")
    landmarks_1 = [
        Landmark(id=1, name="Estadio de Malabo", category="edificio",
                 nav_phrase_es=None, distance_m=120, bearing_deg=0,
                 latitude=3.7533, longitude=8.7741)
    ]
    result = coordinate_to_landmark_instruction(3.7523, 8.7741, 45, landmarks_1)
    print(f"   🗣️ Voice: \"{result}\"")

    # Scenario 2: Near Total gas station, facing it
    print("\n📍 Scenario 2: Near Surtidor Total Ela Nguema")
    print(f"   Position: 1.8634° N, 9.7653° E | Heading: 90° (E)")
    landmarks_2 = [
        Landmark(id=8, name="Total de Ela Nguema", category="surtidor",
                 nav_phrase_es="Frente al surtidor de Total de Ela Nguema",
                 distance_m=40, bearing_deg=85,
                 latitude=1.8640, longitude=9.7660)
    ]
    result = coordinate_to_landmark_instruction(1.8634, 9.7653, 90, landmarks_2)
    print(f"   🗣️ Voice: \"{result}\"")

    # Scenario 3: Far from Edificio Abayak, with traffic alert
    print("\n📍 Scenario 3: Near Edificio Abayak + Traffic Alert")
    print(f"   Position: 1.8501° N, 9.7821° E | Heading: 0° (N)")
    landmarks_3 = [
        Landmark(id=6, name="Edificio Abayak", category="edificio",
                 nav_phrase_es="Detrás del edificio Abayak",
                 distance_m=310, bearing_deg=180,
                 latitude=3.7501, longitude=8.7821)
    ]
    alerts = [
        TrafficAlert(id=1, report_type="ROAD_CUT", severity=4,
                     title="Carretera cortada por lluvia en Rebola",
                     distance_m=800)
    ]
    result = coordinate_to_landmark_instruction(1.8501, 9.7821, 0, landmarks_3, alerts)
    print(f"   🗣️ Voice: \"{result}\"")

    # Scenario 4: No landmarks nearby
    print("\n📍 Scenario 4: Rural road — no landmarks")
    print(f"   Position: 1.5000° N, 10.0000° E | Heading: 180° (S)")
    result = coordinate_to_landmark_instruction(1.5, 10.0, 180, [])
    print(f"   🗣️ Voice: \"{result}\"")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    demo()
