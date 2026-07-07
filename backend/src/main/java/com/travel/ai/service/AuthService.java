package com.travel.ai.service;

import com.travel.ai.model.entity.User;
import com.travel.ai.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${JWT_SECRET}")
    private String jwtSecret;

    @Value("${JWT_ACCESS_EXPIRY_MS:3600000}")
    private long accessExpiry;

    @Value("${JWT_REFRESH_EXPIRY_MS:604800000}")
    private long refreshExpiry;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       RedisTemplate<String, Object> redisTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String email, Long userId) {
        return Jwts.builder()
                .subject(email)
                .claims(Map.of("userId", userId))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpiry))
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        String token = UUID.randomUUID().toString();
        String key = "rt:" + userId + ":" + token.split("-")[3];
        redisTemplate.opsForValue().set(key, userId, Duration.ofMillis(refreshExpiry));
        return token;
    }

    public boolean validateRefreshToken(Long userId, String token) {
        String key = "rt:" + userId + ":" + token.split("-")[3];
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public void revokeRefreshToken(Long userId, String token) {
        String key = "rt:" + userId + ":" + token.split("-")[3];
        redisTemplate.delete(key);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.parseLong(claims.getSubject());
    }

    public User register(String username, String email, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("USERNAME_TAKEN");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("EMAIL_TAKEN");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        return userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("INVALID_CREDENTIALS"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("INVALID_CREDENTIALS");
        }
        return user;
    }

    public long getAccessExpiryMs() { return accessExpiry; }
    public long getRefreshExpiryMs() { return refreshExpiry; }
}
