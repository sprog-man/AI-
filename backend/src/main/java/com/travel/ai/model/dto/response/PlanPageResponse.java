package com.travel.ai.model.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class PlanPageResponse {
    private List<PlanDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
