export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
}

const COMMON_PASSWORDS = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome'];

const LABELS: PasswordStrength['label'][] = [
  'Very Weak',
  'Weak',
  'Fair',
  'Strong',
  'Very Strong',
];

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: 'Very Weak' };
  }

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { score: 0, label: 'Very Weak' };
  }

  let charsetSize = 0;

  if (/[a-z]/.test(password)) {
    charsetSize += 26;
  }

  if (/[A-Z]/.test(password)) {
    charsetSize += 26;
  }

  if (/[0-9]/.test(password)) {
    charsetSize += 10;
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    charsetSize += 32;
  }

  let entropyBits = password.length * Math.log2(charsetSize);

  if (hasRepeatedRun(password, 3)) {
    entropyBits -= 10;
  }

  if (hasSequentialRun(password, 3)) {
    entropyBits -= 10;
  }

  const score = scoreFromEntropy(entropyBits);

  return { score, label: LABELS[score] };
}

function scoreFromEntropy(entropyBits: number): PasswordStrength['score'] {
  if (entropyBits < 28) {
    return 0;
  }

  if (entropyBits < 36) {
    return 1;
  }

  if (entropyBits < 60) {
    return 2;
  }

  if (entropyBits < 80) {
    return 3;
  }

  return 4;
}

function hasRepeatedRun(password: string, runLength: number): boolean {
  for (let i = 0; i <= password.length - runLength; i++) {
    const window = password.slice(i, i + runLength);

    if ([...window].every((char) => char === window[0])) {
      return true;
    }
  }

  return false;
}

function hasSequentialRun(password: string, runLength: number): boolean {
  for (let i = 0; i <= password.length - runLength; i++) {
    const window = password.slice(i, i + runLength);
    let isSequential = true;

    for (let j = 1; j < window.length; j++) {
      if (window.charCodeAt(j) !== window.charCodeAt(j - 1) + 1) {
        isSequential = false;
        break;
      }
    }

    if (isSequential) {
      return true;
    }
  }

  return false;
}
