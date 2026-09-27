package com.lifeos.habit_tracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableCaching
public class CacheConfig {

  // habit-analytics is expensive (all of a user's habits crossed with their full log window) but
  // has no write-path eviction wired up yet - a log write doesn't invalidate it. A short 3-minute
  // TTL is the pragmatic tradeoff: bounded staleness without threading cache eviction through
  // every log-write path across the module.
  @Bean
  public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
    // spring-boot-starter-webmvc doesn't autoconfigure a JSR-310-aware ObjectMapper the way
    // spring-boot-starter-web does, and GenericJackson2JsonRedisSerializer's no-arg constructor
    // builds its own default mapper - which fails on java.time.LocalDate/Instant fields present
    // on every cached analytics DTO here. Give it a mapper with the module registered instead of
    // relying on defaults.
    ObjectMapper redisObjectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    RedisCacheConfiguration defaultConfig =
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(3))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer(redisObjectMapper)));

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(defaultConfig)
        .withCacheConfiguration("habit-analytics", defaultConfig.entryTtl(Duration.ofMinutes(3)))
        .withCacheConfiguration(
            "habit-weekly-summary", defaultConfig.entryTtl(Duration.ofMinutes(3)))
        .build();
  }
}
