import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ResumeBuilderApiService } from '../../../core/services/resume-builder-api.service';
import { ResumeKeywordMatch, ResumeSection, ResumeVariant } from '../../../core/models/resume-builder.model';
import { downloadViaBlob } from '../../notes/shared/file-download.util';

@Component({
  selector: 'app-resume-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './resume-builder.html',
})
export class ResumeBuilder implements OnInit {
  private readonly api = inject(ResumeBuilderApiService);
  private readonly http = inject(HttpClient);

  protected readonly variants = signal<ResumeVariant[]>([]);
  protected readonly selected = signal<ResumeVariant | null>(null);
  protected readonly keywordResult = signal<ResumeKeywordMatch | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly message = signal('');

  protected newVariantName = '';
  protected newSectionType = 'EXPERIENCE';
  protected tailorJobId = '';
  protected tailorInstruction = '';
  protected keywordJobId = '';

  protected readonly sectionTypes = [
    'SUMMARY',
    'EXPERIENCE',
    'EDUCATION',
    'SKILLS',
    'PROJECTS',
    'CERTIFICATIONS',
    'VOLUNTEER',
    'LANGUAGES',
  ];

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(selectId?: string): void {
    this.api.listVariants().subscribe({
      next: (variants) => {
        this.variants.set(variants);
        this.loading.set(false);
        const toSelect = selectId ? variants.find((v) => v.id === selectId) : (this.selected() ?? variants[0]);
        if (toSelect) {
          this.select(toSelect.id);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected select(id: string): void {
    this.api.getVariant(id).subscribe({ next: (variant) => this.selected.set(variant) });
  }

  protected createVariant(): void {
    if (!this.newVariantName.trim()) return;
    this.api.createVariant({ name: this.newVariantName.trim() }).subscribe({
      next: (variant) => {
        this.newVariantName = '';
        this.refresh(variant.id);
      },
    });
  }

  protected cloneVariant(variant: ResumeVariant): void {
    const name = prompt('New variant name', variant.name + ' (copy)');
    if (!name) return;
    this.api.cloneVariant(variant.id, name).subscribe({ next: (clone) => this.refresh(clone.id) });
  }

  protected deleteVariant(variant: ResumeVariant): void {
    if (!confirm(`Delete "${variant.name}"?`)) return;
    this.api.deleteVariant(variant.id).subscribe({ next: () => this.refresh() });
  }

  protected setBase(variant: ResumeVariant): void {
    this.api.updateVariant(variant.id, { base: true } as Partial<ResumeVariant>).subscribe({
      next: () => this.refresh(variant.id),
    });
  }

  protected addSection(): void {
    const variant = this.selected();
    if (!variant) return;
    this.api.createSection(variant.id, { sectionType: this.newSectionType, content: [] }).subscribe({
      next: () => this.select(variant.id),
    });
  }

  protected sectionText(section: ResumeSection): string {
    return JSON.stringify(section.content, null, 2);
  }

  protected saveSectionContent(section: ResumeSection, text: string): void {
    const variant = this.selected();
    if (!variant) return;
    let content: unknown[];
    try {
      content = JSON.parse(text);
    } catch {
      this.message.set('That section content is not valid JSON - not saved.');
      return;
    }
    this.api.updateSection(variant.id, section.id, { content }).subscribe({
      next: () => {
        this.message.set('Section saved.');
        this.select(variant.id);
      },
    });
  }

  protected deleteSection(section: ResumeSection): void {
    const variant = this.selected();
    if (!variant || !confirm('Delete this section?')) return;
    this.api.deleteSection(variant.id, section.id).subscribe({ next: () => this.select(variant.id) });
  }

  protected tailor(): void {
    const variant = this.selected();
    if (!variant || !this.tailorJobId.trim()) return;
    this.busy.set(true);
    this.api.tailorForJob(variant.id, this.tailorJobId.trim(), this.tailorInstruction || undefined).subscribe({
      next: (tailoring) => {
        this.busy.set(false);
        this.message.set(`Tailored resume ready (id ${tailoring.id.slice(0, 8)}). Download it from the job's detail page.`);
      },
      error: (err) => {
        this.busy.set(false);
        this.message.set(err?.error?.message ?? 'Tailoring failed.');
      },
    });
  }

  protected analyzeKeywords(): void {
    const variant = this.selected();
    if (!variant || !this.keywordJobId.trim()) return;
    this.busy.set(true);
    this.api.analyzeKeywords(variant.id, this.keywordJobId.trim()).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.keywordResult.set(result);
      },
      error: (err) => {
        this.busy.set(false);
        this.message.set(err?.error?.message ?? 'Keyword analysis failed.');
      },
    });
  }

  protected downloadPdf(): void {
    const variant = this.selected();
    if (!variant) return;
    downloadViaBlob(this.http, `/v1/resumes/variants/${variant.id}/pdf`, `${variant.name}.pdf`);
  }
}
