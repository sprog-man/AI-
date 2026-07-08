package com.travel.ai.service;

import com.travel.ai.config.LangChain4jConfig.TravelAgent;
import com.travel.ai.model.entity.TravelPlan;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AgentService {

    private final TravelAgent travelAgent;
    private final PlanService planService;
    // SSE emitters for chat modifications
    private final ConcurrentHashMap<Long, SseEmitter> chatEmitters = new ConcurrentHashMap<>();

    public AgentService(TravelAgent travelAgent, PlanService planService) {
        this.travelAgent = travelAgent;
        this.planService = planService;
    }

    /**
     * Build a prompt for the LLM agent from form data, then call it.
     */
    public String generatePlan(TravelPlan plan, Map<String, Object> formData) {
        String destination = (String) formData.get("destinationCity");
        String departure = (String) formData.get("departureCity");
        String startDate = (String) formData.get("startDate");
        String endDate = (String) formData.get("endDate");
        String travelMode = (String) formData.get("travelMode");
        String budgetLevel = (String) formData.get("budgetLevel");
        String preferences = (String) formData.get("preferences");

        String prompt = """
                Generate a detailed travel plan JSON with the following info:
                - Departure: %s
                - Destination: %s
                - Dates: %s to %s
                - Travel mode: %s
                - Budget level: %s
                - Preferences: %s
                Use available tools to gather weather, POI, route, guide info, and images.
                Return ONLY valid JSON with these top-level keys:
                "title", "weather", "tavilyResult", "poiList", "routes", "imageGallery",
                "dailyItinerary" (array of day objects), "budgetBreakdown".
                """;

        return travelAgent.generatePlan(String.format(prompt,
                departure, destination, startDate, endDate, travelMode, budgetLevel, preferences));
    }

    /**
     * Handle chat-based plan modification.
     * 1. Read current plan data
     * 2. Send user message + plan context to LLM
     * 3. Parse LLM response (updated JSON + natural language reply)
     * 4. Update plan data in DB
     * 5. Return structured result
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> chatModify(Long planId, String userMessage) {
        TravelPlan plan = planService.getPlanById(planId);
        if (plan == null) {
            return Map.of("reply", "计划不存在", "updated", false, "sections", new String[]{});
        }

        String planDataStr = plan.getPlanData();
        if (planDataStr == null || planDataStr.isBlank() || "{}".equals(planDataStr)) {
            return Map.of("reply", "计划尚未生成，无法微调", "updated", false, "sections", new String[]{});
        }

        // Check rate limiting (simple counter in memory for now)
        int chatCount = getChatCount(planId);
        if (chatCount >= 50) {
            return Map.of("reply", "今日聊天额度已用完，明天再来吧", "updated", false, "sections", new String[]{});
        }

        // Build context-aware prompt for the LLM
        String systemPrompt = """
                You are a travel plan assistant. The user wants to modify their existing travel plan.
                Analyze their request, determine the intent, and provide an updated plan.

                Available intents:
                - CHANGE_ACTIVITY: Replace/add/remove activities in itinerary
                - CHANGE_BUDGET: Adjust budget level or specific budget items
                - CHANGE_DATE: Modify dates (may require regenerating)
                - ADD_EVENT: Add a new activity/event
                - REMOVE_EVENT: Remove an activity
                - UNSUPPORTED: Request outside scope (e.g., booking hotels, flights)

                Rules:
                1. If the request is invalid (e.g., "change day 3" but plan only has 2 days), explain politely
                2. If unsupported, suggest alternatives ("目前不支持预订功能，但可以帮您更换推荐的酒店")
                3. Always return valid JSON matching the original plan structure
                4. Only modify what the user asked for, keep everything else unchanged
                """;

        String userPrompt = """
                Current plan data: %s

                User request: "%s"

                Please respond with a JSON object containing:
                - "intent": one of [CHANGE_ACTIVITY, CHANGE_BUDGET, CHANGE_DATE, ADD_EVENT, REMOVE_EVENT, UNSUPPORTED]
                - "reply": a friendly natural language response to the user
                - "updatedPlan": the complete updated plan JSON (same structure as input, only changed parts modified)
                - "updatedSections": array of section names that were modified (e.g., ["DAY1_ACTIVITIES", "BUDGET"])

                If unsupported, set updatedPlan to null and explain why.
                """;

        try {
            String fullPrompt = String.format(userPrompt, planDataStr, userMessage);
            String llmResponse = travelAgent.generatePlan(fullPrompt);

            // Parse the LLM response to extract structured data
            // The LLM may wrap JSON in markdown code blocks, so strip them
            String jsonPart = extractJson(llmResponse);

            Map<String, Object> parsedResponse = parseLlmResponse(jsonPart);

            if (parsedResponse == null) {
                // Fallback: couldn't parse, return raw reply
                incrementChatCount(planId);
                return Map.of(
                        "reply", "抱歉，我暂时无法处理您的请求。请尝试用更具体的描述，比如'把第二天第一个景点换成博物馆'。",
                        "updated", false,
                        "sections", new String[]{}
                );
            }

            String intent = (String) parsedResponse.getOrDefault("intent", "UNKNOWN");
            String reply = (String) parsedResponse.getOrDefault("reply", "收到您的消息，正在处理...");
            boolean updated = "UNSUPPORTED".equals(intent) ? false : true;

            // If we got an updated plan, save it
            if (updated && !("UNSUPPORTED".equals(intent))) {
                Object updatedPlanObj = parsedResponse.get("updatedPlan");
                if (updatedPlanObj != null) {
                    String updatedPlanJson = toJsonString(updatedPlanObj);
                    plan.setPlanData(updatedPlanJson);
                    planService.savePlan(plan);
                }
            }

            // Get modified sections
            Object sectionsObj = parsedResponse.get("updatedSections");
            String[] sections = new String[0];
            if (sectionsObj instanceof java.util.List<?> list) {
                sections = list.stream().map(Object::toString).toArray(String[]::new);
            }

            incrementChatCount(planId);
            return Map.of(
                    "reply", reply,
                    "updated", updated,
                    "sections", sections
            );

        } catch (Exception e) {
            return Map.of(
                    "reply", "处理您的请求时出错: " + e.getMessage(),
                    "updated", false,
                    "sections", new String[]{}
            );
        }
    }

    /**
     * Extract JSON portion from LLM response (handles markdown code blocks).
     */
    private String extractJson(String response) {
        if (response == null) return "{}";
        // Strip markdown code fences
        String trimmed = response.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastBacktick = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastBacktick > firstNewline) {
                trimmed = trimmed.substring(firstNewline + 1, lastBacktick).trim();
            }
        }
        // Find first { and last }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    /**
     * Parse the LLM's JSON response into a Map.
     * Uses simple parsing — in production would use a proper JSON library.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseLlmResponse(String jsonStr) {
        if (jsonStr == null || jsonStr.isBlank()) return null;
        try {
            // Use Jackson ObjectMapper from Spring's context
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(jsonStr, Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Convert an object back to JSON string.
     */
    private String toJsonString(Object obj) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    /**
     * Simple in-memory chat count per plan (for rate limiting).
     * In production, use Redis.
     */
    private final ConcurrentHashMap<Long, Integer> chatCounts = new ConcurrentHashMap<>();

    private int getChatCount(Long planId) {
        return chatCounts.getOrDefault(planId, 0);
    }

    private void incrementChatCount(Long planId) {
        chatCounts.merge(planId, 1, Integer::sum);
    }
}
