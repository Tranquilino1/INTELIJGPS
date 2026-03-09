package com.intelijgps.service;

import com.intelijgps.dto.TrafficReportRequest;
import com.intelijgps.entity.TrafficReport;
import com.intelijgps.repository.TrafficReportRepository;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class TrafficReportService {

    private final TrafficReportRepository reportRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public TrafficReportService(
            TrafficReportRepository reportRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            @org.springframework.beans.factory.annotation.Autowired(required = false) org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.reportRepository = reportRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    @Value("${intelijgps.kafka.topics.traffic-malabo:traffic.malabo}")
    private String topicMalabo;

    @Value("${intelijgps.kafka.topics.traffic-bata:traffic.bata}")
    private String topicBata;

    @Value("${intelijgps.kafka.topics.reports-nationwide:reports.nationwide}")
    private String topicNationwide;

    private static final GeometryFactory GEO_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    public TrafficReport createReport(TrafficReportRequest req) {
        var geom = GEO_FACTORY.createPoint(new Coordinate(req.getLongitude(), req.getLatitude()));
        geom.setSRID(4326);

        var report = TrafficReport.builder()
                .reportType(req.getReportType())
                .severity((short) req.getSeverity())
                .geom(geom)
                .affectedRoad(req.getAffectedRoad())
                .description(req.getDescription())
                .isActive(true)
                .expiresAt(Instant.now().plusSeconds(4 * 3600)) // 4hrs TTL
                .build();

        report = reportRepository.save(report);
        publishToKafka(report);
        return report;
    }

    public List<TrafficReport> getActiveReports() {
        return reportRepository.findAllActive();
    }

    public List<TrafficReport> getActiveReportsNear(double lat, double lon, double radiusM) {
        return reportRepository.findActiveNear(lon, lat, radiusM);
    }

    private void publishToKafka(TrafficReport report) {
        var payload = Map.of(
                "id", report.getId(),
                "reportType", report.getReportType(),
                "severity", report.getSeverity(),
                "latitude", report.getLatitude(),
                "longitude", report.getLongitude(),
                "affectedRoad", report.getAffectedRoad() != null ? report.getAffectedRoad() : "",
                "description", report.getDescription() != null ? report.getDescription() : "",
                "createdAt", report.getCreatedAt() != null ? report.getCreatedAt().toString() : "");

        String city = detectCity(report.getLatitude(), report.getLongitude());

        // Render fallback: Direct memory websocket broadcasting if Kafka is disabled
        if (kafkaTemplate == null) {
            log.info("Kafka desactivado. Publicando evento directamente vía WebSocket...");
            if (messagingTemplate != null) {
                messagingTemplate.convertAndSend("/topic/traffic." + city.toLowerCase(), payload);
                messagingTemplate.convertAndSend("/topic/traffic", payload);
            }
            return;
        }

        String topic = switch (city) {
            case "Malabo" -> topicMalabo;
            case "Bata" -> topicBata;
            default -> topicNationwide;
        };

        try {
            kafkaTemplate.send(topic, String.valueOf(report.getId()), payload);
            log.info("Reporte {} publicado en Kafka '{}'", report.getId(), topic);
        } catch (Exception e) {
            log.warn("Error Kafka: {}", e.getMessage());
        }
    }

    /** Rough city detection based on bounding boxes */
    private String detectCity(double lat, double lon) {
        // Malabo: Isla de Bioko Norte bbox ~[3.65-3.85, 8.65-8.85]
        if (lat >= 3.65 && lat <= 3.85 && lon >= 8.65 && lon <= 8.85)
            return "Malabo";
        // Bata: Litoral bbox ~[1.75-2.0, 9.70-9.82]
        if (lat >= 1.75 && lat <= 2.00 && lon >= 9.70 && lon <= 9.82)
            return "Bata";
        return "Nacional";
    }

    /** Scheduled cleanup: deactivate expired reports every 30 minutes */
    @Scheduled(fixedRate = 1_800_000)
    public void expireOldReports() {
        long count = reportRepository.findAllActive().stream()
                .filter(r -> r.getExpiresAt() != null && r.getExpiresAt().isBefore(Instant.now()))
                .peek(r -> {
                    r.setIsActive(false);
                    reportRepository.save(r);
                })
                .count();
        if (count > 0)
            log.info("Expirados {} reportes de tráfico antiguos", count);
    }
}
