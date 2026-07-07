package com.travel.ai.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "travel_plans")
public class TravelPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "id")
    private User user;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 100)
    private String departureCity;

    @Column(nullable = false, length = 100)
    private String destinationCity;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TravelMode travelMode;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private BudgetLevel budgetLevel;

    @Column(nullable = false, columnDefinition = "TEXT DEFAULT ''")
    private String preferences;

    @Column(nullable = false, columnDefinition = "jsonb DEFAULT '{}'")
    private String planData;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private PlanStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = PlanStatus.GENERATING;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TravelMode {
        HIGH_SPEED_RAIL, FLIGHT, BUS, CAR, BIKE
    }

    public enum BudgetLevel {
        LOW, MEDIUM, HIGH
    }

    public enum PlanStatus {
        GENERATING, COMPLETED, FAILED
    }
}
