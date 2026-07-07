package com.travel.ai.repository;

import com.travel.ai.model.entity.PlanCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlanCacheRepository extends JpaRepository<PlanCache, Long> {
    Optional<PlanCache> findByDestinationAndCacheKey(String destination, String cacheKey);
    List<PlanCache> findByExpiresAtLessThanEqual(LocalDateTime now);
}
