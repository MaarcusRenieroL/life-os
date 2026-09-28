package com.lifeos.tasks;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.tasks", "com.lifeos.common"})
public class TasksApplication {

  public static void main(String[] args) {
    SpringApplication.run(TasksApplication.class, args);
  }
}
