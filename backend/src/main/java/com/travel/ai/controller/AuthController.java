package com.travel.ai.controller;

import com.travel.ai.model.dto.request.LoginRequest;
import com.travel.ai.model.dto.request.RefreshRequest;
import com.travel.ai.model.dto.request.RegisterRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.model.dto.response.AuthResponse;
import com.travel.ai.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest req) {
        // TODO: 实现注册逻辑
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(new AuthResponse()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        // TODO: 实现登录逻辑
        return ResponseEntity.ok(ApiResponse.ok(new AuthResponse()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest req) {
        // TODO: 实现 Token 刷新逻辑
        return ResponseEntity.ok(ApiResponse.ok(new AuthResponse()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // TODO: 实现登出逻辑（删除 Redis 中的 Refresh Token）
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
