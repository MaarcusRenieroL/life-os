package com.lifeos.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter live in
// com.lifeos.common, outside this app's default com.lifeos.core scan root.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.core", "com.lifeos.common"})
public class CoreApplication {

  public static void main(String[] args) {

    SpringApplication.run(CoreApplication.class, args);
  }
}
