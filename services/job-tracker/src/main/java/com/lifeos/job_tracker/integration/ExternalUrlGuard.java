package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Set;
import java.util.function.Function;

/**
 * Keeps the job-link fetcher on the public internet. A pasted URL is read by the server, so without this
 * a link to {@code http://localhost}, an internal service name, a private address or a cloud metadata
 * endpoint would be fetched from inside the network and its text handed back (and to the AI).
 *
 * <p>Checks the scheme, userinfo, port and every address the host resolves to. Redirects must be
 * re-checked by the caller with the same method, since a public page can redirect to a private one.
 */
final class ExternalUrlGuard {

  private static final Set<Integer> ALLOWED_PORTS = Set.of(80, 443, 8080, 8443);

  private ExternalUrlGuard() {}

  static URI requirePublic(String url) {
    return requirePublic(url, host -> {
      try {
        return InetAddress.getAllByName(host);
      } catch (UnknownHostException e) {
        return new InetAddress[0];
      }
    });
  }

  static URI requirePublic(String url, Function<String, InetAddress[]> resolver) {
    URI uri;
    try {
      uri = URI.create(url.trim());
    } catch (IllegalArgumentException e) {
      throw refuse("That doesn't look like a valid URL.");
    }
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
    if (!scheme.equals("http") && !scheme.equals("https")) {
      throw refuse("Enter a full job URL starting with http:// or https://");
    }
    if (uri.getUserInfo() != null) {
      throw refuse("Links with a username or password are not allowed.");
    }
    String host = uri.getHost();
    if (host == null || host.isBlank()) {
      throw refuse("That doesn't look like a valid URL.");
    }
    int port = uri.getPort();
    if (port != -1 && !ALLOWED_PORTS.contains(port)) {
      throw refuse("Only standard web ports are allowed for job links.");
    }

    InetAddress[] addresses = resolver.apply(host.startsWith("[") ? host.substring(1, host.length() - 1) : host);
    if (addresses == null || addresses.length == 0) {
      throw refuse("Couldn't find that site.");
    }
    for (InetAddress address : addresses) {
      if (isInternal(address)) {
        throw refuse("That link points at a private or internal address, so it can't be fetched.");
      }
    }
    return uri;
  }

  static boolean isInternal(InetAddress address) {
    if (address.isAnyLocalAddress()
        || address.isLoopbackAddress()
        || address.isLinkLocalAddress()
        || address.isSiteLocalAddress()
        || address.isMulticastAddress()) {
      return true;
    }
    byte[] b = address.getAddress();
    if (b.length == 4) {
      int first = b[0] & 0xff;
      int second = b[1] & 0xff;
      // 100.64.0.0/10 shared (carrier-grade NAT) space, 0.0.0.0/8, 192.0.0.0/24, 198.18.0.0/15 benchmarking
      return (first == 100 && second >= 64 && second <= 127)
          || first == 0
          || (first == 192 && second == 0 && (b[2] & 0xff) == 0)
          || (first == 198 && (second == 18 || second == 19));
    }
    // fc00::/7 unique-local addresses, which Java does not report as site-local
    return b.length == 16 && (b[0] & 0xfe) == 0xfc;
  }

  private static InvalidRequestException refuse(String message) {
    return new InvalidRequestException(message);
  }
}
