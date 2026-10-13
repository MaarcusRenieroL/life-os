package com.lifeos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * The whole backend in one JVM. Every module (auth, vault, job-tracker, ...) is a plain library
 * jar under {@code com.lifeos.*}; scanning from this package picks all of them up, including their
 * JPA entities and repositories.
 *
 * <p>Several modules reuse the same class names (every one has a GlobalExceptionHandler, two have
 * a TodayService, ...), which collide as bean names when they share one context, so beans are
 * named by fully-qualified class name.
 */
@SpringBootApplication(nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class)
@ConfigurationPropertiesScan
@EnableScheduling
public class LifeOsApplication {

  public static void main(String[] args) {
    SpringApplication.run(LifeOsApplication.class, args);
  }
}
