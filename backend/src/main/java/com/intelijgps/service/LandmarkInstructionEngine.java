package com.intelijgps.service;

import com.intelijgps.dto.NavigationInstructionDTO;
import com.intelijgps.dto.NavigationRequest;
import com.intelijgps.entity.CulturalLandmark;
import com.intelijgps.repository.LandmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * LandmarkInstructionEngine
 * ─────────────────────────────────────────────────────────────────────────
 * Core INTELIJGPS algorithm: converts a GPS coordinate pair (current → next)
 * into a natural-language voice instruction anchored to the nearest landmark.
 *
 * Supports standard Spanish and "es-GQ" (Español Ecuatoguineano) with
 * culturally resonant local modismos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LandmarkInstructionEngine {

    private final LandmarkRepository landmarkRepository;

    @Value("${intelijgps.navigation.default-search-radius-m:300}")
    private double defaultSearchRadius;

    @Value("${intelijgps.navigation.voice-instruction-distance-m:150}")
    private int defaultInstructionDistance;

    // ── GQ Modismos replacement map ─────────────────────────────────────────
    private static final Map<String, String> GQ_MODISMOS = Map.of(
            "continúe recto", "siga directo nah",
            "gire a la derecha", "torce a la derecha",
            "gire a la izquierda", "torce a la izquierda",
            "dé la vuelta", "da la vuelta completa",
            "ha llegado a su destino", "ya llegaste al punto, compañero",
            "vaya derecho", "siga directo nah",
            "en la esquina de", "en la esquina de");

    /**
     * Main entry point: generate a navigation instruction for a maneuver point.
     */
    public NavigationInstructionDTO generateInstruction(NavigationRequest request) {
        double nextLon = request.getNextLon();
        double nextLat = request.getNextLat();

        // STEP 1 — Find nearby landmarks at the maneuver point
        List<CulturalLandmark> nearby = landmarkRepository.findNearby(
                nextLon, nextLat, defaultSearchRadius, 5);

        // STEP 2 — Select best landmark (highest importance, closest)
        CulturalLandmark best = nearby.isEmpty() ? null : nearby.get(0);

        // STEP 3 — Determine spatial relation between user and landmark
        String spatialRelation = best != null
                ? determineSpatialRelation(request.getCurrentLon(), request.getCurrentLat(),
                        best.getLongitude(), best.getLatitude())
                : null;

        // STEP 4 — Calculate turn direction
        String direction = determineTurnDirection(
                request.getCurrentLon(), request.getCurrentLat(),
                request.getNextLon(), request.getNextLat(),
                request.getPrevLon(), request.getPrevLat());

        // STEP 5 — Build instruction string
        String instruction = buildInstruction(best, spatialRelation, direction,
                defaultInstructionDistance, request.getLanguage());

        // STEP 6 — Apply GQ modismos if language is es-GQ
        if ("es-GQ".equalsIgnoreCase(request.getLanguage())) {
            instruction = applyModismos(instruction);
        }

        log.debug("Generated instruction: '{}'  landmark={}", instruction,
                best != null ? best.getName() : "none");

        return NavigationInstructionDTO.builder()
                .instruction(instruction)
                .landmark(best != null ? best.getName() : null)
                .spatialRelation(spatialRelation)
                .direction(direction)
                .distanceMeters(defaultInstructionDistance)
                .language(request.getLanguage() != null ? request.getLanguage() : "es")
                .build();
    }

    // ── Spatial Relation ────────────────────────────────────────────────────

    /**
     * Determine the spatial relation between the user's current position
     * and a landmark, expressed as a Spanish prepositional phrase.
     *
     * angle = bearing from user → landmark (degrees, 0=North, clockwise)
     * We compare this to the direction of travel to give a relative description.
     */
    private String determineSpatialRelation(double userLon, double userLat,
            double landmarkLon, double landmarkLat) {
        double dLon = landmarkLon - userLon;
        double dLat = landmarkLat - userLat;
        double angleDeg = Math.toDegrees(Math.atan2(dLon, dLat));
        // Normalize to [0, 360)
        double bearing = (angleDeg + 360) % 360;

        // Map bearing sectors to spatial relation phrases
        if (bearing >= 330 || bearing < 30)
            return "frente al";
        if (bearing >= 30 && bearing < 90)
            return "a la derecha del";
        if (bearing >= 90 && bearing < 150)
            return "a la derecha del";
        if (bearing >= 150 && bearing < 210)
            return "detrás del";
        if (bearing >= 210 && bearing < 270)
            return "a la izquierda del";
        if (bearing >= 270 && bearing < 330)
            return "a la izquierda del";
        return "cerca del";
    }

    // ── Turn Direction ───────────────────────────────────────────────────────

    /**
     * Calculate turn direction by comparing heading vectors.
     * Uses cross product of (prev→current) and (current→next) to detect left/right.
     */
    private String determineTurnDirection(double curLon, double curLat,
            double nextLon, double nextLat,
            Double prevLon, Double prevLat) {
        if (prevLon == null || prevLat == null) {
            // No previous point — can't determine turn, assume straight
            return "continúe recto";
        }

        // Vector A: prev → current
        double ax = curLon - prevLon;
        double ay = curLat - prevLat;

        // Vector B: current → next
        double bx = nextLon - curLon;
        double by = nextLat - curLat;

        // Cross product (2D): determines turn direction
        double cross = ax * by - ay * bx;

        // Dot product: determines if going forward or backward
        double dot = ax * bx + ay * by;

        // Angle between vectors
        double magA = Math.sqrt(ax * ax + ay * ay);
        double magB = Math.sqrt(bx * bx + by * by);

        if (magA == 0 || magB == 0)
            return "continúe recto";

        double cosAngle = dot / (magA * magB);
        // Clamp to [-1, 1] for floating point safety
        cosAngle = Math.max(-1.0, Math.min(1.0, cosAngle));
        double angleDeg = Math.toDegrees(Math.acos(cosAngle));

        if (angleDeg < 20) {
            return "continúe recto";
        } else if (angleDeg > 160) {
            return "dé la vuelta";
        } else if (cross > 0) {
            return angleDeg > 60 ? "gire a la izquierda" : "doble ligeramente a la izquierda";
        } else {
            return angleDeg > 60 ? "gire a la derecha" : "doble ligeramente a la derecha";
        }
    }

    // ── Instruction Builder ─────────────────────────────────────────────────

    private String buildInstruction(CulturalLandmark landmark,
            String spatialRelation,
            String direction,
            int distanceMeters,
            String language) {
        String distStr = distanceMeters >= 1000
                ? String.format("%.1f kilómetros", distanceMeters / 1000.0)
                : distanceMeters + " metros";

        if (landmark != null) {
            String finalRelation = spatialRelation;
            // Hyper-local: if very close, use "en la esquina de"
            if (distanceMeters < 30) {
                finalRelation = "en la esquina de";
            }

            // Remove grammatical article for "a" vs "al" / "a la"
            String article = getGrammaticalForm(finalRelation, landmark.getName());

            if (distanceMeters < 50 && "es-GQ".equalsIgnoreCase(language)) {
                return String.format("A unos pasos, %s %s, %s.", article, landmark.getName(), direction);
            }

            return String.format("En %s, %s %s, %s.", distStr, article, landmark.getName(), direction);
        } else {
            // Fallback: pure geometric instruction
            return String.format("En %s, %s.", distStr, direction);
        }
    }

    /**
     * Adjust preposition for gender agreement in Spanish:
     * "frente al Estadio" (masc.) vs "frente a la Catedral" (fem.)
     */
    private String getGrammaticalForm(String relation, String landmarkName) {
        if (relation == null)
            return "cerca de";
        // Very simplified gender heuristic based on landmark name endings
        boolean isFeminine = landmarkName.toLowerCase().matches(
                ".*\\b(catedral|plaza|clínica|clinica|universidad|gobernación|gobernacion|asamblea|zona|avenida|carretera)\\b.*");
        return switch (relation) {
            case "frente al" -> isFeminine ? "frente a la" : "frente al";
            case "detrás del" -> isFeminine ? "detrás de la" : "detrás del";
            case "a la derecha del" -> isFeminine ? "a la derecha de la" : "a la derecha del";
            case "a la izquierda del" -> isFeminine ? "a la izquierda de la" : "a la izquierda del";
            default -> isFeminine ? "cerca de la" : "cerca del";
        };
    }

    // ── GQ Modismos ─────────────────────────────────────────────────────────

    /**
     * Apply Español Ecuatoguineano modismos to a standard Spanish instruction.
     */
    private String applyModismos(String instruction) {
        String result = instruction;
        for (Map.Entry<String, String> entry : GQ_MODISMOS.entrySet()) {
            if (!entry.getKey().equals("en")) { // Don't replace "en" globally
                result = result.replace(entry.getKey(), entry.getValue());
            }
        }
        return result;
    }
}
