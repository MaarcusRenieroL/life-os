package com.lifeos.notes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter live in
// com.lifeos.common, outside this app's default com.lifeos.notes scan root.
// @EnableScheduling powers the notes module's trash-purge and auto-archive
// @Scheduled jobs.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.notes", "com.lifeos.common"})
@EnableScheduling
public class NotesApplication {

  public static void main(String[] args) {

    SpringApplication.run(NotesApplication.class, args);
  }
}
