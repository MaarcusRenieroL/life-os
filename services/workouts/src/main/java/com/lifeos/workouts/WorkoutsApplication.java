package com.lifeos.workouts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {"com.lifeos.workouts", "com.lifeos.common"})
public class WorkoutsApplication {

  public static void main(String[] args) {
    SpringApplication.run(WorkoutsApplication.class, args);
  }
}
