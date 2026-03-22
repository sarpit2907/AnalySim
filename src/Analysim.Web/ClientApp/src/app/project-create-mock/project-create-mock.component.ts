import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface CreateProjectForm {
  name:        string;
  visibility:  string;
  description: string;
  tags:        string[];
}

@Component({
  selector:    'app-project-create-mock',
  templateUrl: './project-create-mock.component.html',
  styleUrls:   ['./project-create-mock.component.scss']
})
export class ProjectCreateMockComponent {

  constructor(private router: Router) {}

  // ── Form state ────────────────────────────────────
  form: CreateProjectForm = {
    name:        '',
    visibility:  'public',
    description: '',
    tags:        []
  };

  tagInput       = '';
  submitting     = false;
  submitted      = false;
  nameError      = '';

  // ── Validation ────────────────────────────────────
  get routePreview(): string {
    if (!this.form.name.trim()) return '';
    const slug = this.form.name.trim()
      .replace(/[^a-zA-Z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    return `currentuser/${slug}`;   // replace with real auth username
  }

  get nameCharCount(): number { return this.form.name.length; }
  get descCharCount(): number { return this.form.description.length; }

  get isFormValid(): boolean {
    return this.form.name.trim().length >= 2
        && this.form.name.length <= 20
        && this.form.description.length <= 500
        && this.form.visibility !== '';
  }

  validateName(): void {
    if (this.form.name.length > 20) {
      this.nameError = 'Name must be 20 characters or fewer';
    } else if (this.form.name.length > 0 && this.form.name.length < 2) {
      this.nameError = 'Name must be at least 2 characters';
    } else if (/[^a-zA-Z0-9\-_]/.test(this.form.name)) {
      this.nameError = 'Only letters, numbers, hyphens and underscores allowed';
    } else {
      this.nameError = '';
    }
  }

  // ── Tags ──────────────────────────────────────────
  addTag(): void {
    const t = this.tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !this.form.tags.includes(t) && this.form.tags.length < 10) {
      this.form.tags.push(t);
    }
    this.tagInput = '';
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  removeTag(tag: string): void {
    this.form.tags = this.form.tags.filter(t => t !== tag);
  }

  // ── Submit ────────────────────────────────────────
  onSubmit(): void {
    if (!this.isFormValid || this.submitting) return;
    this.submitting = true;

    // TODO: inject ProjectService and call:
    // this.projectService.create({
    //   name:        this.form.name,
    //   visibility:  this.form.visibility,
    //   description: this.form.description,
    //   route:       this.routePreview,
    //   projectTags: this.form.tags.map(name => ({ name }))
    // }).subscribe(project => {
    //   this.router.navigate(['/project', project.route]);
    // });

    setTimeout(() => {
      this.submitting = false;
      this.submitted  = true;
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1500);
    }, 1000);
  }

  onCancel(): void { this.router.navigate(['/dashboard']); }
}