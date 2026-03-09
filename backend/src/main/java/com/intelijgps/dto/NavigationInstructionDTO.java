package com.intelijgps.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class NavigationInstructionDTO {
    private String instruction;
    private String landmark;
    private String spatialRelation;
    private String direction;
    private int distanceMeters;
    private String language;
}
