import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// ── Interfaces (mirror Project.cs + related entities) ──────────────
export interface ProjectTag   { tagID: number; name: string; }
export interface ProjectMember {
  userID: number; userName: string; email: string;
  userRole: string; isFollowing: boolean; avatarInitial: string;
}
export interface BlobFile {
  blobFileID: number; name: string; extension: string;
  size: number; directory: string;
  dateCreated: string; lastModified: string; uploadedBy: string;
}
export interface Notebook {
  notebookID: number; name: string; route: string;
  extension: string; size: number; type: string;
  lastModified: string;
}
export interface ProjectLog {
  logID: number; userName: string; action: string;
  detail: string; timestamp: string;
}

export interface ProjectDetail {
  projectID:           number;
  name:                string;
  route:               string;
  visibility:          string;
  description:         string;
  dateCreated:         string;
  lastUpdated:         string;
  forkedFromProjectID: number;
  forkedFromRoute:     string;
  projectTags:         ProjectTag[];
  members:             ProjectMember[];
  blobFiles:           BlobFile[];
  notebooks:           Notebook[];
  projectLog:          ProjectLog[];
}

export type ActiveTab = 'files' | 'notebooks' | 'log' | 'members';

@Component({
  selector:    'app-project-detail-mock',
  templateUrl: './project-detail-mock.component.html',
  styleUrls:   ['./project-detail-mock.component.scss']
})
export class ProjectDetailMockComponent implements OnInit {

  route_param  = '';
  activeTab: ActiveTab = 'files';
  project: ProjectDetail | null = null;
  loading = true;

  // Fork confirmation
  showForkConfirm  = false;
  forkInProgress   = false;

  // File upload mock
  showUploadPanel  = false;

  // Search within files
  fileSearch = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read the route param — format is "owner/project-name"
    const r = this.route.snapshot.paramMap.get('route') ?? '';
    this.route_param = r;
    this.loadProject(r);
  }

  private loadProject(route: string): void {
    // TODO: Replace with:
    // this.projectService.getByRoute(route).subscribe(p => { this.project = p; this.loading = false; });
    setTimeout(() => {
      this.project = this.getMockProject(route);
      this.loading = false;
    }, 300);
  }

  private getMockProject(route: string): ProjectDetail {
    // Return different mock depending on which project was clicked
    const isCA1 = route.includes('HC-CA1') || route === '';
    return {
      projectID:           isCA1 ? 1 : 3,
      name:                isCA1 ? 'HC-CA1-Firing' : 'Dopamine-D1D2',
      route:               isCA1 ? 'cgunay/HC-CA1-Firing' : 'adolocm/Dopamine-D1D2',
      visibility:          'public',
      description:         isCA1
        ? 'A full parameter sweep study of CA1 pyramidal neuron firing patterns using the Hodgkin-Huxley conductance-based framework. This dataset contains 10,000 parameter combinations exploring Na⁺, K⁺, and Ca²⁺ channel conductances and their effect on action potential shape and firing frequency.'
        : 'Computational model of D1/D2 receptor balance in basal ganglia circuits. Explores the role of dopamine receptor subtypes in regulating striatal output pathways during reinforcement learning tasks.',
      dateCreated:         '2023-03-12T09:00:00Z',
      lastUpdated:         '2025-11-14T14:32:00Z',
      forkedFromProjectID: 0,
      forkedFromRoute:     '',
      projectTags: [
        { tagID: 1, name: 'neuroscience' },
        { tagID: 2, name: 'computational' },
        ...(isCA1 ? [] : [{ tagID: 3, name: 'beta' }])
      ],
      members: [
        { userID: 1, userName: 'cgunay',          email: 'cgunay@ggc.edu',    userRole: 'Owner',  isFollowing: false, avatarInitial: 'C' },
        { userID: 2, userName: 'adolocm',          email: 'adolocm@gmail.com', userRole: 'Member', isFollowing: true,  avatarInitial: 'A' },
        { userID: 3, userName: 'hdinh',            email: 'hdinh@ggc.edu',     userRole: 'Member', isFollowing: true,  avatarInitial: 'H' },
        { userID: 4, userName: 'gradstudent1',     email: 'gs1@ggc.edu',       userRole: 'Member', isFollowing: false, avatarInitial: 'G' }
      ],
      blobFiles: [
        { blobFileID: 1, name: 'sweep_results',     extension: '.csv',  size: 2621440,  directory: '/data',  dateCreated: '2023-03-12T09:00:00Z', lastModified: '2025-11-14T14:32:00Z', uploadedBy: 'cgunay' },
        { blobFileID: 2, name: 'param_config',      extension: '.json', size: 4096,     directory: '/data',  dateCreated: '2023-03-12T09:00:00Z', lastModified: '2025-10-01T10:00:00Z', uploadedBy: 'cgunay' },
        { blobFileID: 3, name: 'run_sweep',         extension: '.py',   size: 20480,    directory: '/src',   dateCreated: '2023-03-15T11:00:00Z', lastModified: '2025-09-01T10:00:00Z', uploadedBy: 'cgunay' },
        { blobFileID: 4, name: 'analysis_pipeline', extension: '.py',   size: 16384,    directory: '/src',   dateCreated: '2023-04-01T09:00:00Z', lastModified: '2025-08-01T10:00:00Z', uploadedBy: 'adolocm' },
        { blobFileID: 5, name: 'summary_stats',     extension: '.csv',  size: 1048576,  directory: '/data',  dateCreated: '2023-05-01T09:00:00Z', lastModified: '2025-07-01T10:00:00Z', uploadedBy: 'cgunay' }
      ],
      notebooks: [
        { notebookID: 1, name: 'CA1 Parameter Analysis',    route: 'cgunay/HC-CA1-Firing/ca1-analysis',    extension: '.ipynb', size: 65536, type: 'jupyter',    lastModified: '2025-11-01T10:00:00Z' },
        { notebookID: 2, name: 'Interactive Firing Viz',    route: 'cgunay/HC-CA1-Firing/firing-viz',      extension: '.ojs',   size: 32768, type: 'observable', lastModified: '2025-10-15T10:00:00Z' }
      ],
      projectLog: [
        { logID: 1, userName: 'cgunay',      action: 'uploaded',   detail: 'sweep_results.csv',      timestamp: '2025-11-14T14:32:00Z' },
        { logID: 2, userName: 'adolocm',     action: 'modified',   detail: 'analysis_pipeline.py',   timestamp: '2025-11-01T09:00:00Z' },
        { logID: 3, userName: 'cgunay',      action: 'uploaded',   detail: 'summary_stats.csv',      timestamp: '2025-07-01T10:00:00Z' },
        { logID: 4, userName: 'gradstudent1',action: 'joined',     detail: 'added as Member',        timestamp: '2025-06-15T10:00:00Z' },
        { logID: 5, userName: 'cgunay',      action: 'created',    detail: 'Project initialised',    timestamp: '2023-03-12T09:00:00Z' }
      ]
    };
  }

  // ── Computed ──────────────────────────────────────────────
  get totalSizeBytes(): number {
    return this.project?.blobFiles.reduce((s, f) => s + f.size, 0) ?? 0;
  }

  get ownerMember(): ProjectMember | undefined {
    return this.project?.members.find(m => m.userRole === 'Owner');
  }

  get followerCount(): number {
    return this.project?.members.filter(m => m.isFollowing).length ?? 0;
  }

  get filteredFiles(): BlobFile[] {
    if (!this.project) return [];
    if (!this.fileSearch.trim()) return this.project.blobFiles;
    const q = this.fileSearch.toLowerCase();
    return this.project.blobFiles.filter(f =>
      f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q) || f.directory.toLowerCase().includes(q)
    );
  }

  get directories(): string[] {
    if (!this.project) return [];
    return [...new Set(this.project.blobFiles.map(f => f.directory))].sort();
  }

  filesInDir(dir: string): BlobFile[] {
    return this.filteredFiles.filter(f => f.directory === dir);
  }

  // ── Helpers ───────────────────────────────────────────────
  formatBytes(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576)    return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024)       return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }

  extColor(ext: string): string {
    const map: Record<string, string> = {
      '.csv': 'ext--csv', '.json': 'ext--json', '.py': 'ext--py',
      '.mat': 'ext--mat', '.h5': 'ext--h5', '.ipynb': 'ext--ipynb'
    };
    return map[ext] ?? 'ext--other';
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days  = Math.floor(diff / 86400000);
    if (days === 0)  return 'Today';
    if (days === 1)  return 'Yesterday';
    if (days < 30)   return `${days} days ago`;
    if (days < 365)  return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      uploaded: 'pi-upload',  modified: 'pi-pencil',
      joined:   'pi-user-plus', created: 'pi-plus-circle'
    };
    return map[action] ?? 'pi-circle';
  }

  // ── Actions ───────────────────────────────────────────────
  onFork(): void { this.showForkConfirm = true; }

  confirmFork(): void {
    this.forkInProgress = true;
    setTimeout(() => {
      this.forkInProgress  = false;
      this.showForkConfirm = false;
      // TODO: this.projectService.fork(this.project.projectID).subscribe(forked => {
      //   this.router.navigate(['/project', forked.route]);
      // });
      alert(`Fork created! Would navigate to: /project/${this.project?.route}-fork`);
    }, 1200);
  }

  cancelFork(): void { this.showForkConfirm = false; }

  onDownloadFile(f: BlobFile): void {
    // TODO: this.fileService.download(f.blobFileID)
    console.log('Download:', f.name + f.extension);
  }

  onViewNotebook(n: Notebook): void {
    // TODO: this.router.navigate(['/notebook', n.route])
    console.log('Open notebook:', n.route);
  }

  onBack(): void { this.router.navigate(['/dashboard']); }

  toggleUploadPanel(): void { this.showUploadPanel = !this.showUploadPanel; }
}