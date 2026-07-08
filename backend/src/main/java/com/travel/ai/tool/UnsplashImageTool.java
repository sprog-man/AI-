package com.travel.ai.tool;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class UnsplashImageTool {

    @Value("${UNSPLASH_ACCESS_KEY}")
    private String accessKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool("获取景点配图")
    public String unsplashImage(String query) {
        try {
            String url = "https://api.unsplash.com/search/photos"
                    + "?query=" + java.net.URLEncoder.encode(query, "UTF-8")
                    + "&client_id=" + accessKey
                    + "&per_page=1";
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return getFallbackResult(query);
        }
    }

    private String getFallbackResult(String query) {
        return String.format(
                "{\"note\": \"图片服务不可用\", \"query\": \"%s\", \"images\": []}",
                query
        );
    }
}
