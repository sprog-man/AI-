package com.travel.ai.controller;

import com.travel.ai.model.dto.request.ChatRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/plans/{id}/chat")
public class ChatController {

    private final AuthService authService;

    public ChatController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(
            @PathVariable Long id,
            @RequestBody ChatRequest request) {
        Map<String, Object> response = Map.of(
                "agentReply", "收到您的消息，正在处理...",
                "planDataUpdated", false,
                "updatedSections", new String[]{}
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
