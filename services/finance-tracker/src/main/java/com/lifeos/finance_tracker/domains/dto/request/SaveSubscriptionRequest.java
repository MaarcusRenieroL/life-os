package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Create and update share this - update replaces every editable field (null accountId really
 * means "no account"), so the client always sends the whole form. autoCreateExpense null means the
 * default (true). Billing status is changed through pause/resume/cancel, not here. */
public record SaveSubscriptionRequest(
    @NotBlank @Size(max = 200) String name,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotNull BillingCycle billingCycle,
    @NotNull LocalDate nextBillingDate,
    UUID accountId,
    UUID categoryId,
    Boolean autoCreateExpense,
    @Min(0) @Max(30) Integer reminderDaysBefore,
    @Min(1) @Max(5) Integer usageRating,
    LocalDate lastUsedOn,
    @Size(max = 1000) String notes) {}
