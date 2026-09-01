import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApplicationApiService } from '../../../core/services/application-api.service';
import { ApplicationDetail } from '../../../core/models/job-tracker.model';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './application-detail.html',
})
export class ApplicationDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applicationApi = inject(ApplicationApiService);

  protected readonly detail = signal<ApplicationDetail | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('applicationId');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.applicationApi.detail(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
