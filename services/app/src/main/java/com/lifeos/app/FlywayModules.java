package com.lifeos.app;

import java.util.List;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Each module owns a Postgres schema and a migration history inside it
 * ({@code <schema>.flyway_schema_history}), and their version numbers overlap (every module has a
 * V1). Spring Boot's single Flyway run can't express that, so this runs one per module, in the
 * same place and order Boot would have, before JPA validates the mappings. Migration files live in
 * {@code db/migration/<module>/} in each module's jar; never edit one that has been applied (its
 * checksum is recorded).
 */
@Configuration
public class FlywayModules {

  private static final Logger log = LoggerFactory.getLogger(FlywayModules.class);

  record Module(String name, String schema) {}

  static final List<Module> MODULES =
      List.of(
          new Module("auth", "auth_schema"),
          new Module("vault", "vault_schema"),
          new Module("job-tracker", "job_tracker_schema"),
          new Module("core", "core_schema"),
          new Module("notes", "notes_schema"),
          new Module("finance-tracker", "finance_schema"),
          new Module("batches", "batches_schema"),
          new Module("habit-tracker", "habit_tracker_schema"),
          new Module("tasks", "tasks_schema"),
          new Module("workouts", "workouts_schema"),
          new Module("calendar", "calendar_schema"));

  @Bean
  public FlywayMigrationStrategy perModuleMigration() {
    return boot -> {
      DataSource dataSource = boot.getConfiguration().getDataSource();
      for (Module module : MODULES) {
        log.info("Migrating {} ({})", module.name(), module.schema());
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration/" + module.name())
            .schemas(module.schema())
            .defaultSchema(module.schema())
            .load()
            .migrate();
      }
    };
  }
}
