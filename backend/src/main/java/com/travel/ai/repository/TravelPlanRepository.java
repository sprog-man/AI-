package com.travel.ai.repository;

import com.travel.ai.model.entity.TravelPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TravelPlanRepository extends JpaRepository<TravelPlan, Long> {
    Page<TravelPlan> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    TravelPlan findByIdAndUserId(Long id, Long userId);
}
