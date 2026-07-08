package com.travel.ai.config;

import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class LangChain4jConfig {

    @Value("${langchain4j.open-ai.api-key}")
    private String apiKey;

    @Bean
    public ChatLanguageModel chatModel() {
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName("gpt-4o-mini")
                .temperature(0.0)
                .timeout(Duration.ofSeconds(120))
                .build();
    }

    /**
     * Agent interface — all tools are declared as @Tool methods.
     * AiServices generates the ReAct impl at runtime.
     */
    public interface TravelAgent {
        /**
         * Generate a complete travel plan from form data.
         * @param formData keys: destinationCity, startDate, endDate, departureCity, travelMode, budgetLevel, preferences
         * @return JSON string containing weather, tavilyResult, poiList, routes, imageGallery
         */
        String generatePlan(String formData);
    }

    @Bean
    public TravelAgent travelAgent(
            ChatLanguageModel chatModel,
            com.travel.ai.tool.TavilySearchTool tavilySearchTool,
            com.travel.ai.tool.GaodePOITool gaodePOITool,
            com.travel.ai.tool.GaodeRouteTool gaodeRouteTool,
            com.travel.ai.tool.WeatherTool weatherTool,
            com.travel.ai.tool.UnsplashImageTool unsplashImageTool) {

        return AiServices.builder(TravelAgent.class)
                .chatLanguageModel(chatModel)
                .tools(new PlanGenerationTool(tavilySearchTool, gaodePOITool, gaodeRouteTool, weatherTool, unsplashImageTool))
                .build();
    }
}

/**
 * Wrapper tool that exposes individual API calls as @Tool methods
 * so the LLM can call them in its own ReAct loop.
 */
class PlanGenerationTool {

    private final com.travel.ai.tool.TavilySearchTool tavilySearchTool;
    private final com.travel.ai.tool.GaodePOITool gaodePOITool;
    private final com.travel.ai.tool.GaodeRouteTool gaodeRouteTool;
    private final com.travel.ai.tool.WeatherTool weatherTool;
    private final com.travel.ai.tool.UnsplashImageTool unsplashImageTool;

    PlanGenerationTool(
            com.travel.ai.tool.TavilySearchTool tavilySearchTool,
            com.travel.ai.tool.GaodePOITool gaodePOITool,
            com.travel.ai.tool.GaodeRouteTool gaodeRouteTool,
            com.travel.ai.tool.WeatherTool weatherTool,
            com.travel.ai.tool.UnsplashImageTool unsplashImageTool) {
        this.tavilySearchTool = tavilySearchTool;
        this.gaodePOITool = gaodePOITool;
        this.gaodeRouteTool = gaodeRouteTool;
        this.weatherTool = weatherTool;
        this.unsplashImageTool = unsplashImageTool;
    }

    @Tool("查询目的地天气")
    public String queryWeather(String city) {
        return weatherTool.weatherQuery(city, "base");
    }

    @Tool("搜索目的地旅游攻略和推荐景点")
    public String searchDestinationGuide(String query) {
        return tavilySearchTool.tavilySearch(query);
    }

    @Tool("查询目的地 POI（景点/餐厅/酒店）")
    public String queryPOI(String city, String keywords) {
        return gaodePOITool.gaodePOI(city, keywords, "true");
    }

    @Tool("规划景点间路线")
    public String planRoute(String origin, String destination, String travelMode) {
        return gaodeRouteTool.gaodeRoute(origin, destination, travelMode != null ? travelMode : "TRANSIT");
    }

    @Tool("获取景点配图")
    public String getImage(String query) {
        return unsplashImageTool.unsplashImage(query);
    }
}
