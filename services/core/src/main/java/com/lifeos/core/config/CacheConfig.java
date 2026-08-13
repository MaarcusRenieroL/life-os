package com.lifeos.core.config;

import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableCaching
public class CacheConfig {

  // Cache keys/TTLs follow the notes-module spec: tags and folders 5 min,
  // note detail 10 min. Values are JSON-serialized DTOs (not entities) so
  // there's no lazy-loading/serialization coupling to Hibernate proxies.
  @Bean
  public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
    RedisCacheConfiguration defaultConfig =
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer()));

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(defaultConfig)
        .withCacheConfiguration("user-tags", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("user-folders", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("note-detail", defaultConfig.entryTtl(Duration.ofMinutes(10)))
        .build();
  }
}
