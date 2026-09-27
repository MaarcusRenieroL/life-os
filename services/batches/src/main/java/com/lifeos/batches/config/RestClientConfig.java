package com.lifeos.batches.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

  // Both clients previously used the bare RestClient.builder() static factory, which applies no
  // timeout at all - a hung peer would hold the calling thread indefinitely against a
  // 6-connection pool.

  // Vault calls are small, quick internal reads, so common's internalRestClientBuilder
  // (3s connect / 5s read) is exactly right: fail fast.
  @Bean
  public RestClient vaultRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${vault.internal-base-url}") String baseUrl) {
    return builder.baseUrl(baseUrl).build();
  }

  /**
   * Also an internal call, but deliberately NOT on internalRestClientBuilder's 5s read timeout.
   * Every method on FinanceTrackerClient is a statement-import call, and the batch one hands
   * finance-tracker a whole parsed statement (100-400 rows) which it categorizes, merchant-matches,
   * applies to budgets and balances, and inserts inside a single transaction before responding.
   * That legitimately takes far longer than 5s on a large statement, so a fail-fast read timeout
   * here would time out a working import. Connect stays fast - a peer that isn't accepting
   * connections is still a fast failure.
   */
  @Bean
  public RestClient financeTrackerRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${finance.internal-base-url}") String baseUrl) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(120));
    return builder.baseUrl(baseUrl).requestFactory(factory).build();
  }
}
