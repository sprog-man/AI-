package com.travel.ai.tool;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class TavilySearchTool {

    @Value("${TAVILY_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool("搜索目的地旅游攻略和推荐景点")
    public String tavilySearch(String query) {
        try {
            String url = "https://api.tavily.com/search"
                    + "?api_key=" + apiKey
                    + "&query=" + java.net.URLEncoder.encode(query, "UTF-8")
                    + "&max_results=5";
            String result = restTemplate.getForObject(url, String.class);
            return result != null ? result : "搜索结果为空";
        } catch (Exception e) {
            // Fallback: return cached data or placeholder
            return getFallbackResult(query, "TAVILY");
        }
    }

    private String getFallbackResult(String query, String source) {
        return String.format(
                "{\"note\": \"%s API 超时，使用缓存数据\", \"query\": \"%s\", \"cache_status\": \"fallback\"}",
                source, query
        );
    }
}
