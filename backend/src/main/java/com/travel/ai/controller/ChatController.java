package com.travel.ai.controller;

import com.travel.ai.model.dto.request.ChatRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.service.AgentService;
import com.travel.ai.service.PlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/plans/{id}/chat")
public class ChatController {

    private final AgentService agentService;
    private final PlanService planService;

    public ChatController(AgentService agentService, PlanService planService) {
        this.agentService = agentService;
        this.planService = planService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(
            @PathVariable Long id,
            @RequestBody ChatRequest request) {
        // Validate message
        String message = request.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "消息不能为空"));
        }

        var plan = planService.getPlanById(id);
        if (plan == null) {
            return ResponseEntity.notFound().build();
        }

        // Call agent for chat modification
        Map<String, Object> result = agentService.chatModify(id, message);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "reply", result.get("reply"),
                "planDataUpdated", result.getOrDefault("updated", false),
                "updatedSections", result.getOrDefault("sections", new String[]{})
        )));
    }
}
