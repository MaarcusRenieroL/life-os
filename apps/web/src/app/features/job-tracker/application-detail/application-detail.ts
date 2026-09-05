import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApplicationApiService, EmailMessage, InterviewPrepItem, OutreachAttempt } from '../../../core/services/application-api.service';
import { ApplicationDetail } from '../../../core/models/job-tracker.model';
import { ResumeBuilderApiService } from '../../../core/services/resume-builder-api.service';
import { CoverLetter } from '../../../core/models/resume-builder.model';
import { downloadViaBlob } from '../../notes/shared/file-download.util';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './application-detail.html',
})
export class ApplicationDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applicationApi = inject(ApplicationApiService);
  private readonly resumeBuilderApi = inject(ResumeBuilderApiService);
  private readonly http = inject(HttpClient);

  protected readonly detail = signal<ApplicationDetail | null>(null);
  protected readonly outreach = signal<OutreachAttempt[]>([]);
  protected readonly emails = signal<EmailMessage[]>([]);
  protected readonly prepByRound = signal<Record<string, InterviewPrepItem[]>>({});
  protected readonly coverLetter = signal<CoverLetter | null>(null);
  protected readonly coverLetterBusy = signal(false);
  protected readonly loading = signal(true);

  protected offerSalary: number | null = null;
  protected offerCurrency = 'USD';

  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('applicationId') ?? '';
    if (!this.id) {
      this.loading.set(false);
      return;
    }
    this.applicationApi.detail(this.id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
        detail.interviews.forEach((round) =>
          this.applicationApi.prep(this.id, round.id).subscribe({
            next: (items) => this.prepByRound.set({ ...this.prepByRound(), [round.id]: items }),
          }),
        );
      },
      error: () => this.loading.set(false),
    });
    this.applicationApi.outreach(this.id).subscribe({ next: (items) => this.outreach.set(items) });
    this.applicationApi.emails(this.id).subscribe({ next: (items) => this.emails.set(items) });
    this.resumeBuilderApi.getCoverLetterForApplication(this.id).subscribe({
      next: (letter) => this.coverLetter.set(letter),
      error: () => this.coverLetter.set(null),
    });
  }

  protected generateCoverLetter(): void {
    this.coverLetterBusy.set(true);
    this.resumeBuilderApi.generateCoverLetter(this.id, {}).subscribe({
      next: (letter) => {
        this.coverLetterBusy.set(false);
        this.coverLetter.set(letter);
      },
      error: () => this.coverLetterBusy.set(false),
    });
  }

  protected saveCoverLetter(content: string): void {
    const letter = this.coverLetter();
    if (!letter) return;
    this.resumeBuilderApi.updateCoverLetter(letter.id, content).subscribe({ next: (updated) => this.coverLetter.set(updated) });
  }

  protected revertCoverLetter(): void {
    const letter = this.coverLetter();
    if (!letter) return;
    this.resumeBuilderApi.revertCoverLetter(letter.id).subscribe({ next: (updated) => this.coverLetter.set(updated) });
  }

  protected downloadCoverLetter(): void {
    const letter = this.coverLetter();
    if (!letter) return;
    downloadViaBlob(this.http, `/v1/cover-letters/${letter.id}/pdf`, 'cover-letter.pdf');
  }

  protected planOutreach(): void {
    this.applicationApi.planOutreach(this.id).subscribe({ next: (items) => this.outreach.set(items) });
  }

  protected togglePrep(roundId: string, item: InterviewPrepItem): void {
    this.applicationApi.togglePrep(this.id, roundId, item.id).subscribe({
      next: (updated) =>
        this.prepByRound.set({
          ...this.prepByRound(),
          [roundId]: (this.prepByRound()[roundId] ?? []).map((p) => (p.id === updated.id ? updated : p)),
        }),
    });
  }

  protected prep(roundId: string): InterviewPrepItem[] {
    return this.prepByRound()[roundId] ?? [];
  }

  protected saveOffer(): void {
    this.applicationApi
      .upsertOffer(this.id, { salary: this.offerSalary, currency: this.offerCurrency })
      .subscribe({ next: () => this.applicationApi.detail(this.id).subscribe({ next: (d) => this.detail.set(d) }) });
  }
}
