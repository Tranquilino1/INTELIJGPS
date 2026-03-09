package com.intelijgps.repository;

import com.intelijgps.entity.CulturalLandmark;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class LandmarkRepositoryImpl implements LandmarkRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${spring.profiles.active:postgresql}")
    private String activeProfile;

    private boolean isH2() {
        return activeProfile.contains("h2");
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<CulturalLandmark> findNearby(double lon, double lat, double radiusM, int limit) {
        String sql;
        if (isH2()) {
            sql = """
                    SELECT * FROM cultural_landmarks
                    WHERE ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) <= :radiusM
                    ORDER BY importance DESC, ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) ASC
                    LIMIT :limit
                    """;
        } else {
            sql = """
                    SELECT * FROM cultural_landmarks
                    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusM)
                    ORDER BY importance DESC, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) ASC
                    LIMIT :limit
                    """;
        }
        Query query = entityManager.createNativeQuery(sql, CulturalLandmark.class);
        query.setParameter("lon", lon);
        query.setParameter("lat", lat);
        query.setParameter("radiusM", radiusM);
        query.setParameter("limit", limit);
        return query.getResultList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<CulturalLandmark> searchByName(String queryStr) {
        String sql;
        if (isH2()) {
            sql = "SELECT * FROM cultural_landmarks WHERE LOWER(name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY importance DESC LIMIT 20";
        } else {
            sql = """
                    SELECT * FROM cultural_landmarks
                    WHERE to_tsvector('spanish', name) @@ plainto_tsquery('spanish', :query)
                       OR LOWER(name) LIKE LOWER(CONCAT('%', :query, '%'))
                    ORDER BY importance DESC LIMIT 20
                    """;
        }
        Query query = entityManager.createNativeQuery(sql, CulturalLandmark.class);
        query.setParameter("query", queryStr);
        return query.getResultList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<CulturalLandmark> autocomplete(String queryStr) {
        String sql;
        if (isH2()) {
            sql = "SELECT * FROM cultural_landmarks WHERE LOWER(name) LIKE LOWER(CONCAT(:query, '%')) ORDER BY importance DESC LIMIT 8";
        } else {
            sql = """
                    SELECT * FROM cultural_landmarks
                    WHERE LOWER(name) LIKE LOWER(CONCAT(:query, '%'))
                       OR EXISTS (SELECT 1 FROM unnest(alias) a WHERE LOWER(a) LIKE LOWER(CONCAT(:query, '%')))
                    ORDER BY importance DESC LIMIT 8
                    """;
        }
        Query query = entityManager.createNativeQuery(sql, CulturalLandmark.class);
        query.setParameter("query", queryStr);
        return query.getResultList();
    }

    @Override
    public CulturalLandmark findClosest(double lon, double lat) {
        String sql;
        if (isH2()) {
            sql = "SELECT * FROM cultural_landmarks WHERE is_verified = TRUE ORDER BY ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) ASC LIMIT 1";
        } else {
            sql = "SELECT * FROM cultural_landmarks WHERE is_verified = TRUE ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) ASC LIMIT 1";
        }
        Query query = entityManager.createNativeQuery(sql, CulturalLandmark.class);
        query.setParameter("lon", lon);
        query.setParameter("lat", lat);
        List<CulturalLandmark> result = query.getResultList();
        return result.isEmpty() ? null : result.get(0);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<CulturalLandmark> findNearbyByCategory(double lon, double lat, double radiusM, String category) {
        String sql;
        if (isH2()) {
            sql = """
                    SELECT * FROM cultural_landmarks WHERE category = :category
                    AND ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) <= :radiusM
                    ORDER BY importance DESC LIMIT 10
                    """;
        } else {
            sql = """
                    SELECT * FROM cultural_landmarks WHERE category = :category
                    AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusM)
                    ORDER BY importance DESC LIMIT 10
                    """;
        }
        Query query = entityManager.createNativeQuery(sql, CulturalLandmark.class);
        query.setParameter("lon", lon);
        query.setParameter("lat", lat);
        query.setParameter("radiusM", radiusM);
        query.setParameter("category", category);
        return query.getResultList();
    }
}
