package com.intelijgps.repository;

import com.intelijgps.entity.TrafficReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrafficReportRepository extends JpaRepository<TrafficReport, Long>, TrafficReportRepositoryCustom {

  @Query("SELECT t FROM TrafficReport t WHERE t.isActive = TRUE " +
      "AND (t.expiresAt IS NULL OR t.expiresAt > CURRENT_TIMESTAMP) " +
      "ORDER BY t.severity DESC, t.createdAt DESC")
  List<TrafficReport> findAllActive();

  @Query("SELECT t FROM TrafficReport t WHERE t.isActive = TRUE AND t.reportType = :type")
  List<TrafficReport> findActiveByType(@Param("type") String type);
}
