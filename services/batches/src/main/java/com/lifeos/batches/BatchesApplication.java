package com.lifeos.batches;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@ComponentScan(basePackages = {"com.lifeos.batches", "com.lifeos.common"})
@EnableScheduling
@SpringBootApplication
public class BatchesApplication {

  public static void main(String[] args) {
    SpringApplication.run(BatchesApplication.class, args);
  }
}
