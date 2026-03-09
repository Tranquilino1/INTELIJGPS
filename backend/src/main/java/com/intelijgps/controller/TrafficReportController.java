package com.intelijgps.controller;

import com.intelijgps.dto.TrafficReportRequest;
import com.intelijgps.entity.TrafficReport;
import com.intelijgps.service.TrafficReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Traffic Reports", description = "Nzalang-Sync: Reportes de Tráfico API")
public class TrafficReportController {

    private final TrafficReportService trafficService;

    @PostMapping
    @Operation(summary = "Enviar un nuevo reporte de tráfico (dispara Kafka + WebSocket push)")
    public ResponseEntity<TrafficReport> createReport(@RequestBody TrafficReportRequest request) {
        return ResponseEntity.ok(trafficService.createReport(request));
    }

    @GetMapping("/active")
    @Operation(summary = "Obtiene todos los reportes de tráfico activos actualmente")
    public ResponseEntity<List<TrafficReport>> getActiveReports() {
        return ResponseEntity.ok(trafficService.getActiveReports());
    }

    @GetMapping("/nearby")
    @Operation(summary = "Obtiene reportes de tráfico activos cerca de una posición GPS")
    public ResponseEntity<List<TrafficReport>> getNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5000") double radius) {
        return ResponseEntity.ok(trafficService.getActiveReportsNear(lat, lon, radius));
    }
}
