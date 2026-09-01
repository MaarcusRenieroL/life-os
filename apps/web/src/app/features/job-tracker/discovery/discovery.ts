import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JobApiService, JobSource } from '../../../core/services/job-api.service';

@Component({
  selector: 'app-job-discovery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './discovery.html',
})
export class JobDiscovery implements OnInit {
  private readonly jobApi = inject(JobApiService);

  protected readonly sources = signal<JobSource[]>([]);
  protected readonly result = signal<string>('');
  protected readonly busy = signal(false);

  protected newName = '';
  protected newUrl = '';
  protected importText = '';

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.jobApi.listSources().subscribe({ next: (sources) => this.sources.set(sources) });
  }

  protected addSource(): void {
    if (!this.newName.trim()) {
      return;
    }
    this.jobApi
      .createSource({ name: this.newName.trim(), url: this.newUrl.trim() || null, scrapeFrequency: 'DAILY' })
      .subscribe({
        next: () => {
          this.newName = '';
          this.newUrl = '';
          this.refresh();
        },
      });
  }

  protected deleteSource(source: JobSource): void {
    this.jobApi.deleteSource(source.id).subscribe({ next: () => this.refresh() });
  }

  protected runScrape(): void {
    this.busy.set(true);
    this.jobApi.runScrape().subscribe({
      next: (res) => {
        this.busy.set(false);
        this.result.set(JSON.stringify(res));
        this.refresh();
      },
      error: (err) => {
        this.busy.set(false);
        this.result.set(err?.error?.message ?? 'Scrape failed');
      },
    });
  }

  protected runImport(): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.importText);
    } catch {
      this.result.set('Import text is not valid JSON');
      return;
    }
    const jobs = Array.isArray(parsed) ? parsed : [parsed];
    this.busy.set(true);
    this.jobApi.importJobs(jobs).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.result.set(JSON.stringify(res));
        this.importText = '';
      },
      error: (err) => {
        this.busy.set(false);
        this.result.set(err?.error?.message ?? 'Import failed');
      },
    });
  }
}
