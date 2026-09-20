package com.lifeos.finance_tracker.config;

import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import tools.jackson.databind.ObjectMapper;

// Mirrors services/notes' CacheConfig (JSON-serialized DTOs via a RedisCacheManager, keyed with
// plain strings) but reuses this app's autoconfigured Jackson 3 (tools.jackson) ObjectMapper bean
// - the same one AnalyticsService already used for its hand-rolled StringRedisTemplate caching -
// instead of building a fresh Jackson 2 mapper, since GenericJackson2JsonRedisSerializer targets
// com.fasterxml.jackson while this service is on Jackson 3 end to end.
//
// Near-static lookups (categories, merchants) get a longer TTL; merchants get a short one since
// they're mutated by several implicit write paths (recordTransaction/rename during imports) in
// addition to their own CRUD, so a short TTL acts as a safety net on top of explicit eviction.
// Analytics caches mirror the 5-minute TTL the previous hand-rolled implementation used.
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public RedisCacheManager cacheManager(
      RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
    GenericJacksonJsonRedisSerializer serializer = new GenericJacksonJsonRedisSerializer(objectMapper);

    RedisCacheConfiguration defaultConfig =
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(serializer));

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(defaultConfig)
        .withCacheConfiguration("finance-categories", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("finance-merchants", defaultConfig.entryTtl(Duration.ofMinutes(2)))
        .withCacheConfiguration(
            "finance-analytics-dashboard", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration(
            "finance-analytics-category", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration(
            "finance-analytics-trends", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration(
            "finance-analytics-merchants", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .build();
  }
}
