package com.intelijgps.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TrafficReportRequest {
    private String reportType;
    private int severity;
    private double latitude;
    private double longitude;
    private String affectedRoad;
    private String description;
}
