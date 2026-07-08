package com.travel.ai.tool;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class WeatherTool {

    @Value("${GAODE_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool("查询目的地天气")
    public String weatherQuery(String city, String extensions) {
        try {
            String url = "https://restapi.amap.com/v3/weather/weatherInfo"
                    + "?key=" + apiKey
                    + "&city=" + city
                    + "&extensions=" + extensions;
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return getFallbackResult(city);
        }
    }

    private String getFallbackResult(String city) {
        return String.format(
                "{\"note\": \"天气查询不可用\", \"city\": \"%s\", \"weather\": \"未知\"}",
                city
        );
    }
}
