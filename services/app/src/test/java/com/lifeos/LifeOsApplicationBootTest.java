package com.lifeos;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Starts every module together against a real Postgres: runs each module's Flyway history, lets
 * Hibernate validate every entity, and fails on any duplicate bean, route or property clash. Only
 * runs when SPRING_DATASOURCE_URL (plus _USERNAME / _PASSWORD) points at a database, as in CI.
 */
@EnabledIfEnvironmentVariable(named = "SPRING_DATASOURCE_URL", matches = ".+")
@SpringBootTest(
    properties = {
      "jwt.secret=dGVzdC1qd3Qtc2VjcmV0LXRlc3Qtand0LXNlY3JldC0xMjM0NTY=",
      "internal.api-key=test-internal-key",
      "owner.user-id=00000000-0000-0000-0000-000000000001",
      "gmail.client-id=unused",
      "gmail.client-secret=unused",
      "encryption.gmail-secret=ZXZlcnktbW9kdWxlLW5lZWRzLTMyLWJ5dGVzLWtleSE=",
      "encryption.finance-secret=YW5vdGhlci0zMi1ieXRlLXRlc3Qta2V5LXNlY3JldCE="
    })
class LifeOsApplicationBootTest {

  @Autowired private DataSource dataSource;

  @Test
  void everyModuleStartsInOneContext() throws Exception {
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement();
        var schemas =
            statement.executeQuery(
                "select count(*) from information_schema.tables where table_name = 'flyway_schema_history'")) {
      schemas.next();
      assertThat(schemas.getInt(1)).isEqualTo(11);
    }
  }
}
