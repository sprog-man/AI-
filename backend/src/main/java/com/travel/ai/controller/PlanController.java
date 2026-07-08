package com.travel.ai.controller;

import com.travel.ai.model.dto.request.CreatePlanRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.model.dto.response.PlanDTO;
import com.travel.ai.model.dto.response.PlanPageResponse;
import com.travel.ai.model.entity.TravelPlan;
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
            String token = (String) authentication.getCredentials();
            Long userId = authService.getUserIdFromToken(token);

            // Load full user entity for JPA relationship
            com.travel.ai.model.entity.User user = authService.findUserByEmail(
                    authService.getEmailFromToken(token));

            // Validate business rules
            request.validateBusinessRules();

            TravelPlan plan = planService.createPlanWithUser(request, user);

            Map<String, Object> formData = Map.of(
                    "title", request.getTitle(),
                    "departureCity", request.getDepartureCity(),
                    "destinationCity", request.getDestinationCity(),
                    "startDate", request.getStartDate().toString(),
                    "endDate", request.getEndDate().toString(),
                    "travelMode", request.getTravelMode().name(),
                    "budgetLevel", request.getBudgetLevel().name(),
                    "preferences", request.getPreferences() != null ? request.getPreferences() : ""
            );

            planService.generatePlanAsync(plan, formData, userId);

            PlanDTO dto = PlanDTO.fromEntity(plan);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created(dto));
        } catch (IllegalArgumentException e) {
            String errorCode = e.getMessage();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, getErrorMessage(errorCode)));
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
    public ResponseEntity<ApiResponse<PlanDTO>> getPlan(
            @PathVariable Long id,
            Authentication authentication) {
        TravelPlan plan = planService.getPlanById(id);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }

        // Ownership check
        if (authentication != null && authentication.getCredentials() != null) {
            String token = (String) authentication.getCredentials();
            try {
                Long currentUserId = authService.getUserIdFromToken(token);
                if (!currentUserId.equals(plan.getUser().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.error(403, "无权访问此计划"));
                }
            } catch (Exception ignored) {
                // Token invalid, allow access anyway (SSE endpoint is public)
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(PlanDTO.fromEntity(plan)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanDTO>> updatePlan(
            @PathVariable Long id,
            @RequestBody CreatePlanRequest request,
            Authentication authentication) {
        // Ownership check
        if (authentication != null && authentication.getCredentials() != null) {
            String token = (String) authentication.getCredentials();
            try {
                Long currentUserId = authService.getUserIdFromToken(token);
                TravelPlan plan = planService.getPlanById(id);
                if (plan != null && !currentUserId.equals(plan.getUser().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.error(403, "无权修改此计划"));
                }
            } catch (Exception ignored) {}
        }

        TravelPlan plan = planService.updatePlan(id, request);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(PlanDTO.fromEntity(plan)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(
            @PathVariable Long id,
            Authentication authentication) {
        // Ownership check
        if (authentication != null && authentication.getCredentials() != null) {
            String token = (String) authentication.getCredentials();
            try {
                Long currentUserId = authService.getUserIdFromToken(token);
                TravelPlan plan = planService.getPlanById(id);
                if (plan != null && !currentUserId.equals(plan.getUser().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            } catch (Exception ignored) {}
        }

        planService.deletePlan(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/sse/progress")
    public SseEmitter sseProgress(@PathVariable Long id) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 min timeout
        planService.registerEmitter(id, emitter);
        // Send initial status
        try {
            TravelPlan plan = planService.getPlanById(id);
            if (plan != null) {
                emitter.send(SseEmitter.event()
                        .name("status")
                        .data(Map.of("step", "pending",
                                "message", "等待生成...",
                                "status", plan.getStatus().name())));
            }
        } catch (Exception ignored) {}
        return emitter;
    }

    /**
     * Map ErrorCode string to user-friendly message.
     */
    private String getErrorMessage(String code) {
        return switch (code) {
            case "START_DATE_INVALID" -> "出发日期不能是过去的时间";
            case "END_DATE_INVALID" -> "返程日期不能早于出发日期";
            case "DATE_RANGE_EXCEEDED" -> "日期跨度不能超过 180 天";
            default -> "请求参数无效: " + code;
        };
    }
}
