package com.travel.ai.controller;

import com.travel.ai.model.dto.request.CreatePlanRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.model.dto.response.PlanDTO;
import com.travel.ai.model.dto.response.PlanPageResponse;
import com.travel.ai.model.entity.TravelPlan;
import com.travel.ai.repository.TravelPlanRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/plans")
public class PlanController {

    private final TravelPlanRepository planRepository;

    public PlanController(TravelPlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlanDTO>> createPlan(
            @Valid @RequestBody CreatePlanRequest request,
            Authentication authentication) {
        // TODO: 实现完整的计划生成逻辑（调用 Agent）
        PlanDTO dto = new PlanDTO();
        dto.setStatus("GENERATING");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(dto));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PlanPageResponse>> getPlans(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page - 1, size);
        Page<TravelPlan> plans = planRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable);
        PlanPageResponse response = new PlanPageResponse();
        response.setContent(plans.getContent().stream().map(PlanDTO::fromEntity).toList());
        response.setPage(page);
        response.setSize(size);
        response.setTotalElements(plans.getTotalElements());
        response.setTotalPages(plans.getTotalPages());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanDTO>> getPlan(@PathVariable Long id) {
        TravelPlan plan = planRepository.findById(id).orElse(null);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(PlanDTO.fromEntity(plan)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanDTO>> updatePlan(
            @PathVariable Long id,
            @RequestBody CreatePlanRequest request) {
        // TODO: 实现计划更新
        return ResponseEntity.ok(ApiResponse.ok(new PlanDTO()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        planRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
