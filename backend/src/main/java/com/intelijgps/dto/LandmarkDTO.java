package com.intelijgps.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class LandmarkDTO {
    private Long id;
    private String name;
    private String[] alias;
    private String category;
    private String city;
    private String region;
    private double latitude;
    private double longitude;
    private String addressHint;
    private int importance;
    private boolean verified;
}
