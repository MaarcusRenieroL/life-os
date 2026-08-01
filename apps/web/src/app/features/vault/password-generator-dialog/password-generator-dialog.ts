import { Component, effect, inject, model, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SliderModule } from 'primeng/slider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';
import { FormsModule } from '@angular/forms';
import { ClipboardService } from '../../../core/services/clipboard.service';
import {
  generatePassword,
  PasswordGeneratorOptions,
} from '../../../core/utils/password-generator.util';

@Component({
  selector: 'app-password-generator-dialog',
  standalone: true,
  imports: [
    DialogModule,
    SliderModule,
    ToggleSwitchModule,
    ButtonModule,
    InputTextModule,
    PasswordStrengthMeter,
    FormsModule,
  ],
  templateUrl: './password-generator-dialog.html',
  styleUrl: './password-generator-dialog.scss',
})
export class PasswordGeneratorDialog {
  passwordSelected = output<string>();
  visible = model<boolean>(false);

  clipboardService = inject(ClipboardService);

  options = signal<PasswordGeneratorOptions>({
    length: 16,
    includeLowercase: true,
    includeUppercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
  });

  generated = signal<string>('');

  constructor() {
    this.generated.set(generatePassword(this.options()));

    effect(() => {
      this.generated.set(generatePassword(this.options()));
    });
  }

  regenerate() {
    this.generated.set(generatePassword(this.options()));
  }

  toggleOption(key: 'includeUppercase' | 'includeLowercase' | 'includeNumbers' | 'includeSymbols') {
    const current = this.options();

    let activeCount = 0;

    if (current.includeNumbers) {
      activeCount++;
    }

    if (current.includeSymbols) {
      activeCount++;
    }

    if (current.includeUppercase) {
      activeCount++;
    }

    if (current.includeLowercase) {
      activeCount++;
    }

    if (current[key] && activeCount === 1) {
      return;
    }

    this.options.set({ ...current, [key]: !current[key] });
  }

  setLength(newLength: number) {
    this.options.set({ ...this.options(), length: newLength });
  }

  copyGenerated() {
    this.clipboardService.copyWithAutoClear(this.generated(), 'generator');
  }

  useThisPassword() {
    this.passwordSelected.emit(this.generated());
    this.visible.set(false);
  }
}
