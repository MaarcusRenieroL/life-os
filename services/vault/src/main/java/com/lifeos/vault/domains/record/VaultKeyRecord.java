package com.lifeos.vault.domains.record;

import java.time.Instant;
import javax.crypto.SecretKey;

public record VaultKeyRecord(SecretKey key, Instant expiresAt) {}
