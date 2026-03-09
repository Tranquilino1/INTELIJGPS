package com.intelijgps.repository;

import com.intelijgps.entity.TrafficReport;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class TrafficReportRepositoryImpl implements TrafficReportRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${spring.profiles.active:postgresql}")
    private String activeProfile;

    private boolean isH2() {
        return activeProfile.contains("h2");
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<TrafficReport> findActiveNear(double lon, double lat, double radiusM) {
        String sql;
        if (isH2()) {
            sql = """
                    SELECT * FROM traffic_reports
                    WHERE is_active = TRUE
                      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                      AND ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) <= :radiusM
                    ORDER BY severity DESC, created_at DESC
                    """;
        } else {
            sql = """
                    SELECT * FROM traffic_reports
                    WHERE is_active = TRUE
                      AND (expires_at IS NULL OR expires_at > NOW())
                      AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusM)
                    ORDER BY severity DESC, created_at DESC
                    """;
        }
        Query query = entityManager.createNativeQuery(sql, TrafficReport.class);
        query.setParameter("lon", lon);
        query.setParameter("lat", lat);
        query.setParameter("radiusM", radiusM);
        return query.getResultList();
    }
}
