package com.lifeos.vault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter now live in
// com.lifeos.common, outside this app's default com.lifeos.vault scan root.
@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.vault", "com.lifeos.common"})
public class VaultApplication {

  public static void main(String[] args) {

    SpringApplication.run(VaultApplication.class, args);
  }
}
