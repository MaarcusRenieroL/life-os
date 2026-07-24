package com.lifeos.finance_tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter live in
// com.lifeos.common, outside this app's default com.lifeos.finance_tracker scan root.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.finance_tracker", "com.lifeos.common"})
public class FinanceTrackerApplication {

  public static void main(String[] args) {

    SpringApplication.run(FinanceTrackerApplication.class, args);
  }
}
