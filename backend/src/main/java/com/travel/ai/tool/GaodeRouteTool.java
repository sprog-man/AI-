package com.travel.ai.tool;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class GaodeRouteTool {

    @Value("${GAODE_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool("规划景点间路线")
    public String gaodeRoute(String origin, String destination, String travelMode) {
        try {
            String url = "https://restapi.amap.com/v5/direction/transit/integrated"
                    + "?key=" + apiKey
                    + "&origin=" + origin
                    + "&destination=" + destination
                    + "&city=" + destination
                    + "&type=" + (travelMode != null ? travelMode : "TRANSIT");
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return "路线规划失败: " + e.getMessage();
        }
    }
}
