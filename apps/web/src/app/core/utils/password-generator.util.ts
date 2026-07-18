export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+=[]{}',
};

const AMBIGUOUS = 'O0lI1';

export function generatePassword(options: PasswordGeneratorOptions): string {
  const pools: string[] = [];

  if (options.includeLowercase) {
    pools.push(filterAmbiguous(CHARSETS.lowercase, options));
  }

  if (options.includeUppercase) {
    pools.push(filterAmbiguous(CHARSETS.uppercase, options));
  }

  if (options.includeNumbers) {
    pools.push(filterAmbiguous(CHARSETS.numbers, options));
  }

  if (options.includeSymbols) {
    pools.push(filterAmbiguous(CHARSETS.symbols, options));
  }

  if (pools.length === 0) {
    throw new Error('At least one character set must be selected');
  }

  const allChars = pools.join('');
  const result: string[] = [];

  for (const pool of pools) {
    result.push(pool[secureRandomInt(pool.length)]);
  }

  while (result.length < options.length) {
    result.push(allChars[secureRandomInt(allChars.length)]);
  }

  shuffle(result);

  return result.slice(0, options.length).join('');
}

function filterAmbiguous(charset: string, options: PasswordGeneratorOptions): string {
  if (!options.excludeAmbiguous) {
    return charset;
  }

  return [...charset].filter((char) => !AMBIGUOUS.includes(char)).join('');
}

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function shuffle(list: string[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
}
