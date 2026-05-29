package com.zeyvo.config;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.url:redis://127.0.0.1:6379}")
    private String redisUrl;

    /** Standalone Lettuce client shared by Bucket4j-Redis rate limiter. */
    @Bean(destroyMethod = "shutdown")
    public RedisClient rateLimitRedisClient() {
        return RedisClient.create(RedisURI.create(redisUrl));
    }
}
