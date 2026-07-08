package com.travel.ai.model.dto.request;

import com.travel.ai.model.entity.TravelPlan.BudgetLevel;
import com.travel.ai.model.entity.TravelPlan.TravelMode;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreatePlanRequest {
    @NotBlank(message = "计划名称不能为空")
    @Size(min = 1, max = 100, message = "计划名称长度需在 1-100 之间")
    private String title;

    @NotBlank(message = "出发地不能为空")
    @Size(min = 2, max = 100, message = "出发地长度需在 2-100 之间")
    private String departureCity;

    @NotBlank(message = "目的地不能为空")
    @Size(min = 2, max = 100, message = "目的地长度需在 2-100 之间")
    private String destinationCity;

    @NotNull(message = "出发日期不能为空")
    private LocalDate startDate;

    @NotNull(message = "返程日期不能为空")
    private LocalDate endDate;

    @NotNull(message = "出行方式不能为空")
    private TravelMode travelMode;

    @NotNull(message = "预算范围不能为空")
    private BudgetLevel budgetLevel;

    @Size(max = 500, message = "偏好描述不能超过 500 个字符")
    private String preferences = "";

    /**
     * Validate business rules beyond Bean Validation annotations.
     * @throws IllegalArgumentException with ErrorCode message if validation fails
     */
    public void validateBusinessRules() {
        // Start date must not be in the past
        LocalDate today = LocalDate.now();
        today = today.withDayOfMonth(1); // Compare at day granularity
        if (startDate.isBefore(today)) {
            throw new IllegalArgumentException("START_DATE_INVALID");
        }

        // End date must not be before start date
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("END_DATE_INVALID");
        }

        // Date range cannot exceed 180 days
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        if (daysBetween > 180) {
            throw new IllegalArgumentException("DATE_RANGE_EXCEEDED");
        }
    }
}
