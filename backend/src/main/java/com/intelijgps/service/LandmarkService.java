package com.intelijgps.service;

import com.intelijgps.dto.LandmarkDTO;
import com.intelijgps.entity.CulturalLandmark;
import com.intelijgps.repository.LandmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LandmarkService {

    private final LandmarkRepository landmarkRepository;

    @Cacheable(value = "landmarks_nearby", key = "#lat + '_' + #lon + '_' + #radiusM")
    public List<LandmarkDTO> findNearby(double lat, double lon, double radiusM, int limit) {
        log.debug("Buscando hitos cerca de [{},{}] en un radio de {}m", lat, lon, radiusM);
        return landmarkRepository.findNearby(lon, lat, radiusM, limit)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<LandmarkDTO> search(String query) {
        return landmarkRepository.searchByName(query)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<LandmarkDTO> autocomplete(String query) {
        return landmarkRepository.autocomplete(query)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<LandmarkDTO> findByCity(String city) {
        return landmarkRepository.findByCityIgnoreCase(city)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<LandmarkDTO> findByCityAndCategory(String city, String category) {
        return landmarkRepository.findByCityIgnoreCaseAndCategoryIgnoreCase(city, category)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public LandmarkDTO findClosest(double lat, double lon) {
        CulturalLandmark lm = landmarkRepository.findClosest(lon, lat);
        return lm != null ? toDTO(lm) : null;
    }

    private LandmarkDTO toDTO(CulturalLandmark lm) {
        return LandmarkDTO.builder()
                .id(lm.getId())
                .name(lm.getName())
                .alias(lm.getAlias())
                .category(lm.getCategory())
                .city(lm.getCity())
                .region(lm.getRegion())
                .latitude(lm.getLatitude())
                .longitude(lm.getLongitude())
                .addressHint(lm.getAddressHint())
                .importance(lm.getImportance() != null ? lm.getImportance() : 5)
                .verified(Boolean.TRUE.equals(lm.getIsVerified()))
                .build();
    }
}
