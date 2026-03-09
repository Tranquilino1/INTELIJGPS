package com.intelijgps.repository;

import com.intelijgps.entity.CulturalLandmark;
import java.util.List;

public interface LandmarkRepositoryCustom {
    List<CulturalLandmark> findNearby(double lon, double lat, double radiusM, int limit);

    List<CulturalLandmark> searchByName(String query);

    List<CulturalLandmark> autocomplete(String query);

    CulturalLandmark findClosest(double lon, double lat);

    List<CulturalLandmark> findNearbyByCategory(double lon, double lat, double radiusM, String category);
}
