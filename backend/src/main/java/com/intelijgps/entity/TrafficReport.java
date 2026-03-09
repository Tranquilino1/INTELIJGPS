package com.intelijgps.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.Point;

import java.time.Instant;

@Entity
@Table(name = "traffic_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TrafficReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_type", nullable = false, length = 50)
    private String reportType;
    // corte_lluvia, peaje_bloqueado, accidente, trafico_pesado, obra_vial, inundacion

    @Column(nullable = false)
    private Short severity;
    // 1=leve, 2=moderado, 3=grave

    @Column(columnDefinition = "GEOMETRY(POINT, 4326)", nullable = false)
    private Point geom;

    @Column(name = "affected_road", length = 255)
    private String affectedRoad;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reporter_id")
    private Long reporterId;

    @Column(name = "confirmed_by")
    @Builder.Default
    private Integer confirmedBy = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public double getLongitude() { return geom != null ? geom.getX() : 0; }
    public double getLatitude()  { return geom != null ? geom.getY() : 0; }
}
