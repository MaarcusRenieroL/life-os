package com.lifeos.auth.exception;

public class BiometricAlreadyEnrolledException extends RuntimeException {
  public BiometricAlreadyEnrolledException(String deviceId) {
    super("Biometric already enrolled for device: " + deviceId);
  }
}
