package com.lifeos.calendar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.calendar", "com.lifeos.common"})
public class CalendarApplication {

  public static void main(String[] args) {
    SpringApplication.run(CalendarApplication.class, args);
  }
}
