package com.lifeos.app;

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
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * One Redis cache manager for every module's caches (core, notes, habit-tracker and finance each
 * declared their own {@code cacheManager}). Core, notes and habits cache with a Jackson 2 mapper
 * that knows java.time; finance caches with the app's own Jackson 3 mapper, as before. Cache names
 * are prefixed per module, so the TTLs below are each module's original ones.
 */
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public RedisCacheManager cacheManager(
      RedisConnectionFactory connectionFactory, tools.jackson.databind.ObjectMapper jackson3Mapper) {
    ObjectMapper redisObjectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    RedisCacheConfiguration standard =
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer(redisObjectMapper)));
    RedisCacheConfiguration finance =
        standard.serializeValuesWith(
            RedisSerializationContext.SerializationPair.fromSerializer(
                new GenericJacksonJsonRedisSerializer(jackson3Mapper)));

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(standard)
        // core
        .withCacheConfiguration("module-settings", standard.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("user-settings", standard.entryTtl(Duration.ofMinutes(5)))
        // notes
        .withCacheConfiguration("user-tags", standard.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("user-folders", standard.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("note-detail", standard.entryTtl(Duration.ofMinutes(10)))
        // habit-tracker: no write-path eviction, so a short TTL bounds the staleness
        .withCacheConfiguration("habit-analytics", standard.entryTtl(Duration.ofMinutes(3)))
        .withCacheConfiguration("habit-weekly-summary", standard.entryTtl(Duration.ofMinutes(3)))
        // finance: merchants are mutated by several implicit write paths, hence the short TTL
        .withCacheConfiguration("finance-categories", finance.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("finance-merchants", finance.entryTtl(Duration.ofMinutes(2)))
        .withCacheConfiguration("finance-analytics-dashboard", finance.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("finance-analytics-category", finance.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("finance-analytics-trends", finance.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("finance-analytics-merchants", finance.entryTtl(Duration.ofMinutes(5)))
        .build();
  }
}
