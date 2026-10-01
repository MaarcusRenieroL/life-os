package com.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.auth.service.UserService;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class UserServiceTest {

  private static String normalise(String email) throws Exception {
    Method method = UserService.class.getDeclaredMethod("normaliseEmail", String.class);
    method.setAccessible(true);
    return (String) method.invoke(null, email);
  }

  @Test
  void emailsAreTrimmedAndLowerCasedSoSpellingsAreOneAccount() throws Exception {
    assertThat(normalise("  Jane@Example.COM ")).isEqualTo("jane@example.com");
    assertThat(normalise(null)).isEmpty();
  }
}
