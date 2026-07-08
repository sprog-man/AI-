package com.travel.ai.service;

import com.travel.ai.model.dto.request.CreatePlanRequest;
import com.travel.ai.model.entity.TravelPlan;
import com.travel.ai.repository.TravelPlanRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PlanService {

    private final TravelPlanRepository planRepository;
    private final AgentService agentService;
    // SSE emitters: key = planId
    private final ConcurrentHashMap<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public PlanService(TravelPlanRepository planRepository, AgentService agentService) {
        this.planRepository = planRepository;
        this.agentService = agentService;
    }

    public TravelPlan createPlan(CreatePlanRequest request, Long userId) {
        TravelPlan plan = new TravelPlan();
        plan.setUser(new com.travel.ai.model.entity.User());
        plan.getUser().setId(userId);
        plan.setTitle(request.getTitle());
        plan.setDepartureCity(request.getDepartureCity());
        plan.setDestinationCity(request.getDestinationCity());
        plan.setStartDate(request.getStartDate());
        plan.setEndDate(request.getEndDate());
        plan.setTravelMode(request.getTravelMode());
        plan.setBudgetLevel(request.getBudgetLevel());
        plan.setPreferences(request.getPreferences() != null ? request.getPreferences() : "");
        plan.setPlanData("{}");
        plan.setStatus(TravelPlan.PlanStatus.GENERATING);
        return planRepository.save(plan);
    }

    public TravelPlan createPlanWithUser(CreatePlanRequest request, com.travel.ai.model.entity.User user) {
        TravelPlan plan = new TravelPlan();
        plan.setUser(user);
        plan.setTitle(request.getTitle());
        plan.setDepartureCity(request.getDepartureCity());
        plan.setDestinationCity(request.getDestinationCity());
        plan.setStartDate(request.getStartDate());
        plan.setEndDate(request.getEndDate());
        plan.setTravelMode(request.getTravelMode());
        plan.setBudgetLevel(request.getBudgetLevel());
        plan.setPreferences(request.getPreferences() != null ? request.getPreferences() : "");
        plan.setPlanData("{}");
        plan.setStatus(TravelPlan.PlanStatus.GENERATING);
        return planRepository.save(plan);
    }

    public Page<TravelPlan> getPlans(Long userId, int page, int size) {
        var pageable = PageRequest.of(page - 1, size);
        return planRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public TravelPlan getPlanById(Long id) {
        return planRepository.findById(id).orElse(null);
    }

    public TravelPlan updatePlan(Long id, CreatePlanRequest request) {
        TravelPlan plan = planRepository.findById(id).orElse(null);
        if (plan != null) {
            if (request.getTitle() != null) plan.setTitle(request.getTitle());
            if (request.getPreferences() != null) plan.setPreferences(request.getPreferences());
            return planRepository.save(plan);
        }
        return null;
    }

    public void deletePlan(Long id) {
        planRepository.deleteById(id);
    }

    public TravelPlan savePlan(TravelPlan plan) {
        return planRepository.save(plan);
    }

    public SseEmitter getEmitter(Long planId) {
        return emitters.get(planId);
    }

    public void registerEmitter(Long planId, SseEmitter emitter) {
        emitters.put(planId, emitter);
        // Cleanup on completion/disconnect
        emitter.onCompletion(() -> emitters.remove(planId));
        emitter.onError(e -> emitters.remove(planId));
    }

    private void sendProgress(Long planId, String eventName, Map<String, Object> data) {
        SseEmitter emitter = emitters.get(planId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception ignored) {
                emitters.remove(planId);
            }
        }
    }

    @Async
    public void generatePlanAsync(TravelPlan plan, Map<String, Object> formData, Long userId) {
        try {
            // Progress: starting
            sendProgress(plan.getId(), "status", Map.of("step", "starting", "message", "开始生成攻略..."));

            // Call real agent
            String result = agentService.generatePlan(plan, formData);

            // Progress: processing
            sendProgress(plan.getId(), "status", Map.of("step", "processing", "message", "正在整合信息..."));

            // Save result
            plan.setPlanData(result);
            plan.setStatus(TravelPlan.PlanStatus.COMPLETED);
            planRepository.save(plan);

            // Progress: done
            sendProgress(plan.getId(), "status", Map.of("step", "completed", "message", "攻略生成完成"));

        } catch (Exception e) {
            plan.setStatus(TravelPlan.PlanStatus.FAILED);
            plan.setPlanData("{\"error\": \"" + e.getMessage() + "\"}");
            planRepository.save(plan);
            sendProgress(plan.getId(), "status", Map.of("step", "failed", "message", "生成失败: " + e.getMessage()));
        }
    }
}
