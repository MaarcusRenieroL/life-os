package com.lifeos.job_tracker.domains.dto.request;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateNotificationSettingsRequest {

  Boolean emailOnStageChange;

  Boolean emailOnInterviewScheduled;

  Boolean emailOnOfferReceived;

  Boolean emailOnFollowUpDue;
}
