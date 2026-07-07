package com.travel.ai.controller;

import com.travel.ai.model.dto.request.LoginRequest;
import com.travel.ai.model.dto.request.RefreshRequest;
import com.travel.ai.model.dto.request.RegisterRequest;
import com.travel.ai.model.dto.response.ApiResponse;
import com.travel.ai.model.dto.response.AuthResponse;
import com.travel.ai.model.entity.User;
import com.travel.ai.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
        try {
            User user = authService.register(req.getUsername(), req.getEmail(), req.getPassword());
            String accessToken = authService.generateAccessToken(user.getEmail(), user.getId());
            String refreshToken = authService.generateRefreshToken(user.getId());
            AuthResponse response = new AuthResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshToken);
            response.setExpiresIn(Math.toIntExact(authService.getAccessExpiryMs() / 1000));
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.created(response));
        } catch (IllegalArgumentException e) {
            String errorCode = e.getMessage();
            if ("USERNAME_TAKEN".equals(errorCode)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(409, "用户名已存在"));
            }
            if ("EMAIL_TAKEN".equals(errorCode)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(409, "邮箱已存在"));
            }
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "注册失败: " + errorCode));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        try {
            User user = authService.login(req.getEmail(), req.getPassword());
            String accessToken = authService.generateAccessToken(user.getEmail(), user.getId());
            String refreshToken = authService.generateRefreshToken(user.getId());
            AuthResponse response = new AuthResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshToken);
            response.setExpiresIn(Math.toIntExact(authService.getAccessExpiryMs() / 1000));
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "邮箱或密码错误"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest req) {
        try {
            Long userId = authService.getUserIdFromToken(req.getRefreshToken());
            if (!authService.validateRefreshToken(userId, req.getRefreshToken())) {
                return ResponseEntity.status(HttpStatus.GONE)
                        .body(ApiResponse.error(410, "Token 已撤销"));
            }
            authService.revokeRefreshToken(userId, req.getRefreshToken());
            String newAccessToken = authService.generateAccessToken(
                    authService.getEmailFromToken(req.getRefreshToken()), userId);
            String newRefreshToken = authService.generateRefreshToken(userId);
            AuthResponse response = new AuthResponse();
            response.setAccessToken(newAccessToken);
            response.setRefreshToken(newRefreshToken);
            response.setExpiresIn(Math.toIntExact(authService.getAccessExpiryMs() / 1000));
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "Token 无效或已过期"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            try {
                Long userId = authService.getUserIdFromToken(
                        authentication.getCredentials().toString());
                // 需要从请求头获取 refreshToken
                authService.revokeRefreshToken(userId, "placeholder");
            } catch (Exception e) {
                // 忽略错误，继续返回成功
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
