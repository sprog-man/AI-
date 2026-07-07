package com.travel.ai.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    USERNAME_TAKEN(409, "用户名已存在"),
    EMAIL_TAKEN(409, "邮箱已存在"),
    EMAIL_INVALID(400, "邮箱格式不合法"),
    PASSWORD_TOO_WEAK(400, "密码强度不足"),
    INVALID_CREDENTIALS(401, "邮箱或密码错误"),
    ACCOUNT_LOCKED(423, "账户已锁定"),
    TOKEN_REVOKED(410, "Token 已撤销"),
    TOKEN_EXPIRED(401, "Token 已过期"),
    UNAUTHORIZED(401, "未认证"),
    FORBIDDEN(403, "无权限访问"),
    CITY_NOT_FOUND(400, "地名无法识别"),
    START_DATE_INVALID(400, "出发日期无效"),
    END_DATE_INVALID(400, "返程日期无效"),
    DATE_RANGE_EXCEEDED(400, "日期跨度超过 180 天"),
    PLAN_NOT_FOUND(404, "计划不存在"),
    AGENT_TIMEOUT(504, "Agent 生成超时"),
    MAX_STEPS_EXCEEDED(500, "Agent 推理步数超限"),
    PLAN_RATE_LIMIT(429, "计划生成请求过于频繁"),
    CHAT_RATE_LIMIT(429, "聊天请求过于频繁");

    private final int httpStatus;
    private final String message;

    ErrorCode(int httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
