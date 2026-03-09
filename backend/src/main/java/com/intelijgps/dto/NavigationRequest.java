package com.intelijgps.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class NavigationRequest {
    private double currentLat;
    private double currentLon;
    private double nextLat;
    private double nextLon;
    private Double prevLat;   // optional, for heading calculation
    private Double prevLon;
    private String language;  // "es" or "es-GQ" for Ecuatoguineano modismos
}
