package com.lifeos.auth.store;

import com.lifeos.auth.domains.record.ChallengeRecord;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class ChallengeStore {

  private final ConcurrentHashMap<String, ChallengeRecord> challenges = new ConcurrentHashMap<>();

  public void save(String deviceId, ChallengeRecord challengeRecord) {
    challenges.put(deviceId, challengeRecord);
  }

  public ChallengeRecord get(String deviceId) {
    return challenges.get(deviceId);
  }

  public void remove(String deviceId) {
    challenges.remove(deviceId);
  }
}
