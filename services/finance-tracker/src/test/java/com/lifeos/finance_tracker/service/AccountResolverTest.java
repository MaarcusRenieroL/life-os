package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.lifeos.common.security.EncryptionService;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.repository.AccountRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountResolverTest {

  @Mock private AccountRepository accountRepository;
  @Mock private EncryptionService encryptionService;
  private AccountResolver resolver;
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    resolver = new AccountResolver(accountRepository, encryptionService);
    // The "encrypted" number is just the number, so tests can read what the account number is.
    lenient().when(encryptionService.decrypt(org.mockito.ArgumentMatchers.anyString())).thenAnswer(call -> call.getArgument(0));
  }

  private Account account(String name, String bank, AccountType type, String number, boolean primary) {
    return Account.builder().id(UUID.randomUUID()).userId(userId).accountName(name).bankName(bank).accountType(type).accountNumberEncrypted(number).isActive(true).isPrimary(primary).build();
  }

  private void accounts(Account... all) {
    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(all));
  }

  @Test
  void anAccountCalledHdfcMatchesAnAlertFromHdfcBank() {
    Account savings = account("Savings Account", "HDFC", AccountType.SAVINGS, "50100012342277", false);
    Account card = account("Pixel Play", "HDFC", AccountType.CREDIT_CARD, "5522", false);
    accounts(savings, card);

    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.SAVINGS, null)).contains(savings);
    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.CREDIT_CARD, null)).contains(card);
  }

  @Test
  void theAccountsOwnDigitsBeatTheBankAndTypeGuess() {
    Account a = account("Salary", "Canara", AccountType.SAVINGS, "1234567829", false);
    Account b = account("Joint", "Canara", AccountType.SAVINGS, "9876540001", false);
    accounts(a, b);

    assertThat(resolver.resolve(userId, "Canara Bank", AccountType.SAVINGS, "7829")).contains(a);
    assertThat(resolver.resolve(userId, "Canara Bank", AccountType.SAVINGS, "0001")).contains(b);
  }

  @Test
  void digitsFindTheAccountEvenWhenTheUserTypedADifferentBankName() {
    Account loan = account("Loan Account", "My loan bank", AccountType.SAVINGS, "XXXX4689", false);
    Account other = account("Other", "Canara", AccountType.SAVINGS, "1111", false);
    accounts(loan, other);

    assertThat(resolver.resolve(userId, "Canara Bank", AccountType.SAVINGS, "4689")).contains(loan);
  }

  @Test
  void anAlertForOtherDigitsIsNotBookedIntoTheOnlyAccountAtThatBank() {
    // The user's Canara account is a loan (…4689); a savings alert for …7829 must not land in it.
    Account loan = account("Loan Account", "Canara Bank", AccountType.SAVINGS, "XXXX4689", false);
    accounts(loan);

    assertThat(resolver.resolve(userId, "Canara Bank", AccountType.SAVINGS, "7829")).isEmpty();
    assertThat(resolver.resolve(userId, "Canara Bank", AccountType.SAVINGS, "4689")).contains(loan);
  }

  @Test
  void anAccountWithNoNumberOnFileStaysACandidateForAnyDigits() {
    Account savings = account("Savings", "HDFC", AccountType.SAVINGS, null, false);
    accounts(savings);

    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.SAVINGS, "2277")).contains(savings);
  }

  @Test
  void twoEquallyGoodCandidatesAreNotGuessedBetween() {
    accounts(account("A", "HDFC", AccountType.SAVINGS, "1111", false), account("B", "HDFC Bank", AccountType.SAVINGS, "2222", false));

    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.SAVINGS, null)).isEmpty();
  }

  @Test
  void anAmbiguousBankFallsBackToThePrimaryAccount() {
    Account primary = account("Main", "HDFC", AccountType.SAVINGS, "1111", true);
    accounts(primary, account("Spare", "HDFC", AccountType.SAVINGS, "2222", false));

    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.SAVINGS, null)).contains(primary);
  }

  @Test
  void aDifferentBankOrTypeIsNeverMatched() {
    accounts(account("Savings", "HDFC", AccountType.SAVINGS, "1111", false));

    assertThat(resolver.resolve(userId, "ICICI Bank", AccountType.SAVINGS, null)).isEmpty();
    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.CREDIT_CARD, null)).isEmpty();
  }

  @Test
  void inactiveAccountsAreIgnored() {
    Account closed = account("Old", "HDFC", AccountType.SAVINGS, "1111", false);
    closed.setActive(false);
    accounts(closed);

    assertThat(resolver.resolve(userId, "HDFC Bank", AccountType.SAVINGS, null)).isEmpty();
  }

  @Test
  void bankNamesAreComparedLoosely() {
    assertThat(AccountResolver.sameBank("HDFC Bank Ltd.", "hdfc")).isTrue();
    assertThat(AccountResolver.sameBank("Canara Bank", "Canara")).isTrue();
    assertThat(AccountResolver.sameBank("State Bank of India", "SBI")).isFalse();
    assertThat(AccountResolver.sameBank("HDFC", "ICICI")).isFalse();
    assertThat(AccountResolver.sameBank(null, "HDFC")).isFalse();
    assertThat(AccountResolver.normaliseBank("The Federal Bank Ltd")).isEqualTo("federal");
  }
}
