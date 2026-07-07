package com.travel.ai.service;

import com.travel.ai.model.entity.TravelPlan;
import com.travel.ai.tool.*;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AgentService {

    private final TavilySearchTool tavilySearchTool;
    private final GaodePOITool gaodePOITool;
    private final GaodeRouteTool gaodeRouteTool;
    private final WeatherTool weatherTool;
    private final UnsplashImageTool unsplashImageTool;

    public AgentService(TavilySearchTool tavilySearchTool,
                        GaodePOITool gaodePOITool,
                        GaodeRouteTool gaodeRouteTool,
                        WeatherTool weatherTool,
                        UnsplashImageTool unsplashImageTool) {
        this.tavilySearchTool = tavilySearchTool;
        this.gaodePOITool = gaodePOITool;
        this.gaodeRouteTool = gaodeRouteTool;
        this.weatherTool = weatherTool;
        this.unsplashImageTool = unsplashImageTool;
    }

    public String generatePlan(TravelPlan plan, Map<String, Object> formData) {
        String destination = (String) formData.get("destinationCity");
        String startDate = (String) formData.get("startDate");
        String endDate = (String) formData.get("endDate");
        int maxSteps = 15;
        AtomicInteger stepCounter = new AtomicInteger(0);

        StringBuilder result = new StringBuilder();

        // Step 1: Query weather
        if (stepCounter.incrementAndGet() <= maxSteps) {
            String weather = weatherTool.weatherQuery(destination, "base");
            result.append("\"weather\": ").append(weather).append(",\n");
        }

        // Step 2: Search攻略 (tavily guide)
        if (stepCounter.incrementAndGet() <= maxSteps) {
            String query = destination + "攻略 " + startDate + " to " + endDate;
            String tavilyResult = tavilySearchTool.tavilySearch(query);
            result.append("\"tavilyResult\": ").append(tavilyResult).append(",\n");
        }

        // Step 3: Query POI
        if (stepCounter.incrementAndGet() <= maxSteps) {
            String pois = gaodePOITool.gaodePOI(destination, "scenic,restaurant,hotel", "true");
            result.append("\"poiList\": ").append(pois).append(",\n");
        }

        // Step 4: Route planning
        if (stepCounter.incrementAndGet() <= maxSteps) {
            String routes = gaodeRouteTool.gaodeRoute("0", "0", "TRANSIT");
            result.append("\"routes\": ").append(routes).append(",\n");
        }

        // Step 5: Get images
        if (stepCounter.incrementAndGet() <= maxSteps) {
            String images = unsplashImageTool.unsplashImage(destination);
            result.append("\"imageGallery\": ").append(images);
        }

        return "{" + result.toString() + "}";
    }

    public String chatModify(Long planId, String message) {
        // TODO: implement intent classification + tool calling + plan update
        return "Received: " + message;
    }
}
