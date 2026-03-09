package com.intelijgps.repository;

import com.intelijgps.entity.CulturalLandmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LandmarkRepository extends JpaRepository<CulturalLandmark, Long>, LandmarkRepositoryCustom {

  List<CulturalLandmark> findByCityIgnoreCase(String city);

  List<CulturalLandmark> findByCityIgnoreCaseAndCategoryIgnoreCase(String city, String category);
}
