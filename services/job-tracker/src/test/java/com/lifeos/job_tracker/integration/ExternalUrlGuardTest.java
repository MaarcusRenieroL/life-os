package com.lifeos.job_tracker.integration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.net.InetAddress;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

class ExternalUrlGuardTest {

  private static Function<String, InetAddress[]> resolvesTo(String... ips) {
    return host -> {
      try {
        InetAddress[] out = new InetAddress[ips.length];
        for (int i = 0; i < ips.length; i++) out[i] = InetAddress.getByName(ips[i]);
        return out;
      } catch (Exception e) {
        throw new IllegalStateException(e);
      }
    };
  }

  @Test
  void aPublicHostIsAllowed() {
    assertThatCode(() -> ExternalUrlGuard.requirePublic("https://boards.greenhouse.io/acme/jobs/1", resolvesTo("104.18.2.2"))).doesNotThrowAnyException();
    assertThatCode(() -> ExternalUrlGuard.requirePublic("http://example.com:8080/x", resolvesTo("93.184.216.34"))).doesNotThrowAnyException();
  }

  @Test
  void privateLoopbackLinkLocalAndMetadataAddressesAreRefused() {
    for (String ip : new String[] {"127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "198.18.0.1"}) {
      assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("http://anything.example/", resolvesTo(ip)))
          .as(ip)
          .isInstanceOf(InvalidRequestException.class);
    }
  }

  @Test
  void aHostThatResolvesToAnyInternalAddressIsRefusedEvenIfAnotherIsPublic() {
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("http://rebind.example/", resolvesTo("93.184.216.34", "10.1.1.1")))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void otherSchemesCredentialsOddPortsAndUnknownHostsAreRefused() {
    var pub = resolvesTo("93.184.216.34");
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("file:///etc/passwd", pub)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("ftp://example.com/x", pub)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("http://user:pw@example.com/", pub)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("http://example.com:5432/", pub)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("http://nowhere.invalid/", host -> new InetAddress[0])).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> ExternalUrlGuard.requirePublic("not a url", pub)).isInstanceOf(InvalidRequestException.class);
  }
}
