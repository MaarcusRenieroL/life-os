package com.lifeos.app;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.Map;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * In-memory caches for every module. Core, notes, habit-tracker and finance each used to declare
 * their own Redis cache manager; with everything in one process a plain local cache does the same
 * job. Cache names are prefixed per module, and each keeps its original TTL.
 */
@Configuration
@EnableCaching
public class CacheConfig {

  private static final int MAX_ENTRIES = 10_000;

  @Bean
  public CacheManager cacheManager() {
    SimpleCacheManager manager = new SimpleCacheManager();
    manager.setCaches(
        Map.ofEntries(
                // core
                Map.entry("module-settings", Duration.ofMinutes(5)),
                Map.entry("user-settings", Duration.ofMinutes(5)),
                // notes
                Map.entry("user-tags", Duration.ofMinutes(5)),
                Map.entry("user-folders", Duration.ofMinutes(5)),
                Map.entry("note-detail", Duration.ofMinutes(10)),
                // habit-tracker: no write-path eviction, so a short TTL bounds the staleness
                Map.entry("habit-analytics", Duration.ofMinutes(3)),
                Map.entry("habit-weekly-summary", Duration.ofMinutes(3)),
                // finance: merchants are mutated by several implicit write paths, hence the short TTL
                Map.entry("finance-categories", Duration.ofMinutes(5)),
                Map.entry("finance-merchants", Duration.ofMinutes(2)),
                Map.entry("finance-analytics-dashboard", Duration.ofMinutes(5)),
                Map.entry("finance-analytics-category", Duration.ofMinutes(5)),
                Map.entry("finance-analytics-trends", Duration.ofMinutes(5)),
                Map.entry("finance-analytics-merchants", Duration.ofMinutes(5)))
            .entrySet()
            .stream()
            .map(
                entry ->
                    new CaffeineCache(
                        entry.getKey(),
                        Caffeine.newBuilder()
                            .expireAfterWrite(entry.getValue())
                            .maximumSize(MAX_ENTRIES)
                            .build()))
            .toList());
    return manager;
  }
}
