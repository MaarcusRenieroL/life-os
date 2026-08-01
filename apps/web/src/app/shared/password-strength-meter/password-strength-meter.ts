import { Component, computed, input } from '@angular/core';
import { calculatePasswordStrength } from '../../core/utils/password-strength.util';

@Component({
  selector: 'app-password-strength-meter',
  templateUrl: './password-strength-meter.html',
  styleUrl: './password-strength-meter.scss',
  standalone: true,
  imports: [],
})
export class PasswordStrengthMeter {
  password = input<string>('');

  readonly segments = [0, 1, 2, 3];

  strength = computed(() => calculatePasswordStrength(this.password()));

  colorForScore(score: number): string {
    if (score <= 1) {
      return 'bg-destructive';
    } else if (score === 2) {
      return 'bg-accent';
    } else {
      return 'bg-primary';
    }
  }

  textColorForScore(score: number): string {
    if (score <= 1) {
      return 'text-destructive';
    } else if (score === 2) {
      return 'text-accent';
    } else {
      return 'text-primary';
    }
  }
}
