package com.lifeos.job_tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter live in
// com.lifeos.common, outside this app's default com.lifeos.job_tracker scan root.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.job_tracker", "com.lifeos.common"})
public class JobTrackerApplication {

  public static void main(String[] args) {

    SpringApplication.run(JobTrackerApplication.class, args);
  }
}
