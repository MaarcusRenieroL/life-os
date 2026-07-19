import { Component, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-delete-account-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './delete-account-confirm-dialog.html',
  styleUrl: './delete-account-confirm-dialog.scss',
})
export class DeleteAccountConfirmDialog {
  visible = model<boolean>(false);

  protected cancel(): void {
    this.visible.set(false);
  }
}
