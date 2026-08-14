package com.lifeos.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter now live in
// com.lifeos.common, outside this app's default com.lifeos.core scan root.
// @EnableScheduling powers the notes module's trash-purge and auto-archive
// @Scheduled jobs.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.core", "com.lifeos.common"})
@EnableScheduling
public class CoreApplication {

  public static void main(String[] args) {

    SpringApplication.run(CoreApplication.class, args);
  }
}
