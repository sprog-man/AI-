package com.travel.ai.service;

import com.travel.ai.model.dto.request.CreatePlanRequest;
import com.travel.ai.model.entity.TravelPlan;
import com.travel.ai.repository.TravelPlanRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class PlanService {

    private final TravelPlanRepository planRepository;
    private final ExecutorService executor = Executors.newFixedThreadPool(10);
    // 存储 SSE Emitter，key=planId
    private final ConcurrentHashMap<Long, org.springframework.web.servlet.mvc.method.annotation.SseEmitter> emitters = new ConcurrentHashMap<>();

    public PlanService(TravelPlanRepository planRepository) {
        this.planRepository = planRepository;
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

    public Page<TravelPlan> getPlans(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size);
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

    public void registerEmitter(Long planId, org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter) {
        emitters.put(planId, emitter);
    }

    public void removeEmitter(Long planId) {
        emitters.remove(planId);
    }

    @Async
    public void generatePlanAsync(TravelPlan plan, Map<String, Object> formData, Long userId) {
        try {
            // TODO: 实际调用 AgentService 生成计划
            // 这里先模拟 5 秒后完成
            Thread.sleep(5000);
            plan.setStatus(TravelPlan.PlanStatus.COMPLETED);
            plan.setPlanData("{\"mock\": \"plan data\"}");
            planRepository.save(plan);
        } catch (InterruptedException e) {
            plan.setStatus(TravelPlan.PlanStatus.FAILED);
            planRepository.save(plan);
            Thread.currentThread().interrupt();
        }
    }
}
