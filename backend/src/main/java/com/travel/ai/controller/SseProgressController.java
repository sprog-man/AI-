package com.travel.ai.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/plans")
public class SseProgressController {

    @GetMapping("/{id}/sse/progress")
    public SseEmitter sseProgress(@PathVariable Long id) {
        SseEmitter emitter = new SseEmitter(60000L); // 60s timeout
        // TODO: 实现 SSE 进度推送
        return emitter;
    }
}
