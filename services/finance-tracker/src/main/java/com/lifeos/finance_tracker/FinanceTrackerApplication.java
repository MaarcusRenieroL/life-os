package com.lifeos.finance_tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {"com.lifeos.finance_tracker", "com.lifeos.common"})
public class FinanceTrackerApplication {

  public static void main(String[] args) {

    SpringApplication.run(FinanceTrackerApplication.class, args);
  }
}
