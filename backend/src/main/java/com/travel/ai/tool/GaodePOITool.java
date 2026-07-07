package com.travel.ai.tool;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class GaodePOITool {

    @Value("${GAODE_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Tool("查询目的地 POI（景点/餐厅/酒店）")
    public String gaodePOI(String city, String keywords, String citylimit) {
        try {
            String url = "https://restapi.amap.com/v3/place/text"
                    + "?key=" + apiKey
                    + "&keywords=" + keywords
                    + "&city=" + city
                    + "&citylimit=" + (citylimit != null ? citylimit : "true");
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return "高德 POI 查询失败: " + e.getMessage();
        }
    }
}
