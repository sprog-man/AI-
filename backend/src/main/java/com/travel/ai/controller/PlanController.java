package com.travel.ai.controller;

import com.travel.ai.model.dto.request.CreatePlanRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.model.dto.response.PlanDTO;
import com.travel.ai.model.dto.response.PlanPageResponse;
import com.travel.ai.model.entity.TravelPlan;
import com.travel.ai.repository.TravelPlanRepository;
import com.travel.ai.service.AgentService;
import com.travel.ai.service.AuthService;
import com.travel.ai.service.PlanService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/plans")
public class PlanController {

    private final PlanService planService;
    private final AgentService agentService;
    private final AuthService authService;

    public PlanController(PlanService planService,
                          AgentService agentService,
                          AuthService authService) {
        this.planService = planService;
        this.agentService = agentService;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlanDTO>> createPlan(
            @Valid @RequestBody CreatePlanRequest request,
            Authentication authentication) {
        try {
            // 从 JWT 中提取 userId
            String token = (String) authentication.getCredentials();
            Long userId = authService.getUserIdFromToken(token);

            // 创建计划记录
            TravelPlan plan = planService.createPlan(request, userId);

            // 异步生成计划
            planService.generatePlanAsync(plan, mapFromRequest(request), userId);

            PlanDTO dto = PlanDTO.fromEntity(plan);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "创建计划失败: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PlanPageResponse>> getPlans(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            String token = (String) authentication.getCredentials();
            Long userId = authService.getUserIdFromToken(token);
            Page<TravelPlan> plans = planService.getPlans(userId, page, size);

            PlanPageResponse response = new PlanPageResponse();
            response.setContent(plans.getContent().stream().map(PlanDTO::fromEntity).toList());
            response.setPage(page);
            response.setSize(size);
            response.setTotalElements(plans.getTotalElements());
            response.setTotalPages(plans.getTotalPages());
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "查询失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanDTO>> getPlan(@PathVariable Long id) {
        TravelPlan plan = planService.getPlanById(id);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(PlanDTO.fromEntity(plan)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanDTO>> updatePlan(
            @PathVariable Long id,
            @RequestBody CreatePlanRequest request) {
        TravelPlan plan = planService.updatePlan(id, request);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(PlanDTO.fromEntity(plan)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        planService.deletePlan(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/sse/progress")
    public SseEmitter sseProgress(@PathVariable Long id) {
        SseEmitter emitter = new SseEmitter(60000L);
        planService.registerEmitter(id, emitter);
        return emitter;
    }

    private Map<String, Object> mapFromRequest(CreatePlanRequest request) {
        return Map.of(
                "title", request.getTitle(),
                "departureCity", request.getDepartureCity(),
                "destinationCity", request.getDestinationCity(),
                "startDate", request.getStartDate().toString(),
                "endDate", request.getEndDate().toString(),
                "travelMode", request.getTravelMode().name(),
                "budgetLevel", request.getBudgetLevel().name(),
                "preferences", request.getPreferences()
        );
    }
}
