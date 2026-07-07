package com.travel.ai.config;

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
                .timeout(Duration.ofSeconds(30))
                .build();
    }

    public interface AgentService {
        String chat(String message);
    }

    @Bean
    public AgentService agentService(ChatLanguageModel chatModel) {
        return AiServices.builder(AgentService.class)
                .chatLanguageModel(chatModel)
                .build();
    }
}
