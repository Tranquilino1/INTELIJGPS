package com.intelijgps.repository;

import com.intelijgps.entity.TrafficReport;
import java.util.List;

public interface TrafficReportRepositoryCustom {
    List<TrafficReport> findActiveNear(double lon, double lat, double radiusM);
}
