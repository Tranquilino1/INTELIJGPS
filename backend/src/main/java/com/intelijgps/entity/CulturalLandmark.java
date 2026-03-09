package com.intelijgps.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Point;

import java.time.Instant;

@Entity
@Table(name = "cultural_landmarks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CulturalLandmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT[]")
    private String[] alias;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String region;

    /**
     * PostGIS POINT geometry in WGS84 (EPSG:4326).
     * Uses JTS (Java Topology Suite) via Hibernate Spatial.
     */
    @Column(columnDefinition = "GEOMETRY(POINT, 4326)", nullable = false)
    private Point geom;

    @Column(name = "address_hint", columnDefinition = "TEXT")
    private String addressHint;

    @Column(nullable = false)
    @Builder.Default
    private Short importance = 5;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(length = 50)
    @Builder.Default
    private String source = "crowdsource";

    @Column(length = 30)
    private String phone;

    @Column(name = "opening_hours", length = 100)
    private String openingHours;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Convenience helpers
    public double getLongitude() { return geom != null ? geom.getX() : 0; }
    public double getLatitude()  { return geom != null ? geom.getY() : 0; }
}
