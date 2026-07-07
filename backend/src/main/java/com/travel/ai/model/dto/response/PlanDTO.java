package com.travel.ai.model.dto.response;

import com.travel.ai.model.entity.TravelPlan;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PlanDTO {
    private Long id;
    private Long userId;
    private String title;
    private String departureCity;
    private String destinationCity;
    private LocalDate startDate;
    private LocalDate endDate;
    private String travelMode;
    private String budgetLevel;
    private String preferences;
    private String planData;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PlanDTO fromEntity(TravelPlan plan) {
        PlanDTO dto = new PlanDTO();
        dto.setId(plan.getId());
        dto.setUserId(plan.getUser().getId());
        dto.setTitle(plan.getTitle());
        dto.setDepartureCity(plan.getDepartureCity());
        dto.setDestinationCity(plan.getDestinationCity());
        dto.setStartDate(plan.getStartDate());
        dto.setEndDate(plan.getEndDate());
        dto.setTravelMode(plan.getTravelMode().name());
        dto.setBudgetLevel(plan.getBudgetLevel().name());
        dto.setPreferences(plan.getPreferences());
        dto.setPlanData(plan.getPlanData());
        dto.setStatus(plan.getStatus().name());
        dto.setCreatedAt(plan.getCreatedAt());
        dto.setUpdatedAt(plan.getUpdatedAt());
        return dto;
    }
}
