package com.intelijgps.controller;

import com.intelijgps.dto.LandmarkDTO;
import com.intelijgps.service.LandmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/landmarks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Landmarks", description = "API de Hitos Culturales e Históricos")
public class LandmarkController {

    private final LandmarkService landmarkService;

    @GetMapping("/nearby")
    @Operation(summary = "Busca hitos cerca de una coordenada GPS", description = "Utiliza funciones espaciales para encontrar hitos dentro del radio dado")
    public ResponseEntity<List<LandmarkDTO>> getNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "500") double radius,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(landmarkService.findNearby(lat, lon, radius, limit));
    }

    @GetMapping("/search")
    @Operation(summary = "Búsqueda de texto completo de hitos por nombre")
    public ResponseEntity<List<LandmarkDTO>> search(@RequestParam String q) {
        return ResponseEntity.ok(landmarkService.search(q));
    }

    @GetMapping("/autocomplete")
    @Operation(summary = "Autocompletado rápido para la interfaz de búsqueda")
    public ResponseEntity<List<LandmarkDTO>> autocomplete(@RequestParam String q) {
        return ResponseEntity.ok(landmarkService.autocomplete(q));
    }

    @GetMapping("/city/{city}")
    @Operation(summary = "Obtiene todos los hitos de una ciudad (Malabo, Bata, etc.)")
    public ResponseEntity<List<LandmarkDTO>> byCity(@PathVariable String city) {
        return ResponseEntity.ok(landmarkService.findByCity(city));
    }

    @GetMapping("/city/{city}/category/{category}")
    @Operation(summary = "Obtiene hitos por ciudad y categoría")
    public ResponseEntity<List<LandmarkDTO>> byCityAndCategory(
            @PathVariable String city, @PathVariable String category) {
        return ResponseEntity.ok(landmarkService.findByCityAndCategory(city, category));
    }

    @GetMapping("/closest")
    @Operation(summary = "Obtiene el hito más cercano a una posición GPS")
    public ResponseEntity<LandmarkDTO> closest(@RequestParam double lat, @RequestParam double lon) {
        LandmarkDTO dto = landmarkService.findClosest(lat, lon);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }
}
