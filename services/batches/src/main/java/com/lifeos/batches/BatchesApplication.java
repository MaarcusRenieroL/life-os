package com.lifeos.batches;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@ComponentScan(basePackages = {"com.lifeos.batches", "com.lifeos.common"})
@SpringBootApplication
public class BatchesApplication {

  public static void main(String[] args) {
    SpringApplication.run(BatchesApplication.class, args);
  }
}
