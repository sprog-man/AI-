package com.travel.ai.model.dto.request;

import com.travel.ai.model.entity.TravelPlan.BudgetLevel;
import com.travel.ai.model.entity.TravelPlan.TravelMode;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreatePlanRequest {
    @NotBlank
    @Size(min = 1, max = 100)
    private String title;

    @NotBlank
    @Size(min = 2, max = 100)
    private String departureCity;

    @NotBlank
    @Size(min = 2, max = 100)
    private String destinationCity;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotNull
    private TravelMode travelMode;

    @NotNull
    private BudgetLevel budgetLevel;

    @Size(max = 500)
    private String preferences = "";
}
