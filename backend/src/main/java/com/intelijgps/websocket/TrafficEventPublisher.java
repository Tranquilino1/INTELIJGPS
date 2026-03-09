package com.intelijgps.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consumes Kafka traffic events and broadcasts them via STOMP WebSocket
 * to subscribed clients under /topic/traffic.{city}
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrafficEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "traffic.malabo", groupId = "intelijgps-group")
    public void onMalaboTraffic(Map<String, Object> event) {
        log.debug("Broadcasting traffic event to Malabo subscribers: {}", event);
        messagingTemplate.convertAndSend("/topic/traffic.malabo", event);
        messagingTemplate.convertAndSend("/topic/traffic", event); // broadcast channel
    }

    @KafkaListener(topics = "traffic.bata", groupId = "intelijgps-group")
    public void onBataTraffic(Map<String, Object> event) {
        log.debug("Broadcasting traffic event to Bata subscribers: {}", event);
        messagingTemplate.convertAndSend("/topic/traffic.bata", event);
        messagingTemplate.convertAndSend("/topic/traffic", event);
    }

    @KafkaListener(topics = "reports.nationwide", groupId = "intelijgps-group")
    public void onNationwideReport(Map<String, Object> event) {
        log.debug("Broadcasting nationwide report: {}", event);
        messagingTemplate.convertAndSend("/topic/traffic", event);
    }
}
