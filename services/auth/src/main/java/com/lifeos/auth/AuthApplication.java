package com.lifeos.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter now live in
// com.lifeos.common, outside this app's default com.lifeos.auth scan root.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.auth", "com.lifeos.common"})
public class AuthApplication {

  public static void main(String[] args) {

    SpringApplication.run(AuthApplication.class, args);
  }
}
