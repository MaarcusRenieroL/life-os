package com.lifeos.common.events;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Marks the listener for an event record published through Spring's event publisher. It runs once
 * the publisher's transaction has committed (and straight away when there is none), so a rolled
 * back change never raises a notification. Hand the work to a {@link SerialEventQueue} inside it.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
public @interface AfterCommit {}
