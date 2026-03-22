import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of, Observable } from 'rxjs';

// ═══════════════════════════════════════════════════════════════
// Interfaces — 1:1 mirror of C# entities in Analysim.Core
// Field names match the JSON serialisation of the backend DTOs
// ═══════════════════════════════════════════════════════════════

/** Mirrors ProjectTag.cs */
export interface ProjectTag {
  tagID:     number;
  name:      string;
  projectID: number;
}

/** Mirrors User.cs (IdentityUser<int>) — safe subset only */
export interface User {
  id:       number;
  userName: string;
  email:    string;
  bio:      string;
}

/** Mirrors ProjectUser.cs */
export interface ProjectUser {
  userID:      number;
  projectID:   number;
  userRole:    string;   // 'Owner' | 'Member'
  isFollowing: boolean;
  user:        User;
}

/** Mirrors BlobFile.cs */
export interface BlobFile {
  blobFileID:   number;
  container:    string;
  directory:    string;
  name:         string;
  extension:    string;   // '.csv' | '.json' | '.py' | '.mat' | '.h5' | '.ipynb'
  size:         number;   // bytes
  uri:          string;
  dateCreated:  string;   // ISO DateTimeOffset
  lastModified: string;
  userID:       number;
  projectID:    number | null;
}

/** Mirrors Notebook.cs */
export interface Notebook {
  notebookID:   number;
  container:    string;   // Notebook.Container
  directory:    string;   // Notebook.Directory
  name:         string;
  route:        string;
  extension:    string;
  size:         number;
  uri:          string;
  dateCreated:  string;
  lastModified: string;
  projectID:    number | null;
  type:         string;   // 'observable' | 'jupyter' etc.
}

/** Mirrors Project.cs exactly */
export interface Project {
  projectID:           number;
  name:                string;        // max 20 chars
  visibility:          string;        // 'public' | 'private'
  description:         string;        // max 500 chars
  dateCreated:         string;        // ISO DateTimeOffset
  lastUpdated:         string;        // ISO DateTimeOffset
  route:               string;        // unique slug
  projectTags:         ProjectTag[];
  projectUsers:        ProjectUser[];
  blobFiles:           BlobFile[];
  notebooks:           Notebook[];
  forkedFromProjectID: number;        // 0 = original, >0 = forked
}

// ── Derived / computed for dashboard display ──────────────────

export interface DashboardProject extends Project {
  // computed at load time — not from backend
  ownerName:       string;
  memberCount:     number;
  followerCount:   number;
  totalSizeBytes:  number;
  fileExtensions:  string[];   // unique, uppercased: ['CSV', 'JSON', 'PY']
  isForked:        boolean;
  notebookCount:   number;
  selected?:       boolean;
}

// ── Filter / UI types ─────────────────────────────────────────

// ── Flat dataset row: one BlobFile + parent Project context ─────
// NOT a separate DB entity — derived from BlobFile.cs + Project.cs
export interface FlatDataset {
  blobFileID:   number;
  fileName:     string;
  extension:    string;
  sizeBytes:    number;
  directory:    string;
  lastModified: string;
  uploadedBy:   string;
  projectID:    number;
  projectName:  string;
  projectRoute: string;
  projectOwner: string;
  visibility:   string;
}

export type ViewMode        = 'table' | 'card';
export type MainTab         = 'projects' | 'datasets';
export type SortField       = 'name' | 'lastUpdated' | 'dateCreated' | 'memberCount'
                            | 'followerCount' | 'totalSizeBytes' | 'fileCount' | 'notebookCount';
export type SortDir         = 'asc' | 'desc';
export type OwnershipFilter = 'all' | 'mine' | 'following';

export interface RangeFilter { min: number; max: number; }
export interface ActiveChip  { key: string; label: string; }

export interface DropdownOption {
  label: string;
  value: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

@Component({
  selector:    'app-dashboard-mockup',
  templateUrl: './dashboard-mockup.component.html',
  styleUrls:   ['./dashboard-mockup.component.scss']
})
export class DashboardMockupComponent implements OnInit {

  constructor(private router: Router) {}

  // ── UI state ───────────────────────────────────────────────
  loading            = false;
  viewMode: ViewMode = 'table';
  mainTab: MainTab   = 'projects';
  selectAll          = false;
  showAnalyticsPanel = true;
  filterPanelOpen    = false;   // mobile filter sidebar toggle

  // ── Dataset view state ───────────────────────────────────────
  allDatasets:      FlatDataset[] = [];
  filteredDatasets: FlatDataset[] = [];
  dsSearch          = '';
  dsExtFilter:      string[]      = [];
  dsProjectFilter:  string | null = null;
  dsSizeFilter:     string | null = null;
  dsSortField       = 'lastModified';
  dsSortDir         = 'desc';

  tabOptions = [
    { label: 'Projects', value: 'projects', icon: 'pi pi-folder-open' },
    { label: 'Datasets', value: 'datasets', icon: 'pi pi-database'    }
  ];

  dsSortOptions = [
    { label: 'Last Modified', value: 'lastModified' },
    { label: 'File Name',     value: 'fileName'     },
    { label: 'Extension',     value: 'extension'    },
    { label: 'Size',          value: 'sizeBytes'    },
    { label: 'Project',       value: 'projectName'  }
  ];

  dsSizeOptions: DropdownOption[] = [
    { label: 'Any Size',           value: null     },
    { label: 'Small  (< 1 MB)',    value: 'small'  },
    { label: 'Medium (1 – 50 MB)', value: 'medium' },
    { label: 'Large  (> 50 MB)',   value: 'large'  }
  ];

  // Delete confirmation
  showDeleteConfirm                    = false;
  projectToDelete: DashboardProject | null = null;

  // ── Data ──────────────────────────────────────────────────
  allProjects:      DashboardProject[] = [];
  filteredProjects: DashboardProject[] = [];

  // ── Summary stats (derived) ────────────────────────────────
  get statTotalProjects()  { return this.allProjects.length; }
  get statTotalFiles()     { return this.allProjects.reduce((s, p) => s + p.blobFiles.length, 0); }
  get statTotalNotebooks() { return this.allProjects.reduce((s, p) => s + p.notebookCount, 0); }
  get statTotalSizeGB()    {
    const bytes = this.allProjects.reduce((s, p) => s + p.totalSizeBytes, 0);
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  }
  get statTotalForks()     { return this.allProjects.filter(p => p.isForked).length; }
  get statPublicProjects() { return this.allProjects.filter(p => p.visibility === 'public').length; }

  storageQuotaGB = 10;
  get storagePercent() {
    return Math.min(Math.round((+this.statTotalSizeGB / this.storageQuotaGB) * 100), 100);
  }
  get storageBarClass() {
    return this.storagePercent >= 90 ? 'bar--danger'
         : this.storagePercent >= 65 ? 'bar--warn'
         : 'bar--ok';
  }

  // ── Filter state ───────────────────────────────────────────
  globalSearch            = '';
  selectedVisibility:     string | null    = null;
  dateField:              'lastUpdated' | 'dateCreated' = 'lastUpdated';
  dateRange:              Date[]           = [];
  selectedExtensions:     string[]         = [];
  ownershipFilter:        OwnershipFilter  = 'all';
  hasNotebooksFilter:     string | null    = null;  // 'yes' | 'no' | null
  isForkFilter:           string | null    = null;  // 'original' | 'fork' | null
  memberCountRange:       RangeFilter      = { min: 0, max: 20 };
  storageSizeFilter:      string | null    = null;  // 'small' | 'medium' | 'large'

  // ── Sort state ─────────────────────────────────────────────
  sortField:  SortField = 'lastUpdated';
  sortDir:    SortDir   = 'desc';

  // ── Dropdown options ───────────────────────────────────────
  visibilityOptions: DropdownOption[] = [
    { label: 'All Visibility', value: null      },
    { label: 'Public',         value: 'public'  },
    { label: 'Private',        value: 'private' }
  ];

  notebookOptions: DropdownOption[] = [
    { label: 'Any',              value: null  },
    { label: 'Has Notebooks',    value: 'yes' },
    { label: 'No Notebooks',     value: 'no'  }
  ];

  forkOptions: DropdownOption[] = [
    { label: 'All Projects',   value: null       },
    { label: 'Original Only',  value: 'original' },
    { label: 'Forks Only',     value: 'fork'     }
  ];

  storageSizeOptions: DropdownOption[] = [
    { label: 'Any Size',                value: null    },
    { label: 'Small  (< 10 MB)',        value: 'small' },
    { label: 'Medium (10 – 100 MB)',    value: 'medium'},
    { label: 'Large  (> 100 MB)',       value: 'large' }
  ];

  dateFieldOptions = [
    { label: 'Last Updated',  value: 'lastUpdated'  },
    { label: 'Date Created',  value: 'dateCreated'  }
  ];

  sortFieldOptions: { label: string; value: SortField }[] = [
    { label: 'Last Updated',   value: 'lastUpdated'   },
    { label: 'Date Created',   value: 'dateCreated'   },
    { label: 'Name',           value: 'name'          },
    { label: 'Members',        value: 'memberCount'   },
    { label: 'Followers',      value: 'followerCount' },
    { label: 'Files',          value: 'fileCount'     },
    { label: 'Notebooks',      value: 'notebookCount' },
    { label: 'Storage',        value: 'totalSizeBytes'}
  ];

  // All unique extensions found across blobFiles (uppercased, no dot)
  allExtensions: string[] = ['CSV', 'JSON', 'PY', 'MAT', 'H5', 'IPYNB'];

  // ── Mock data — mirrors real Project.cs shape ──────────────
  // TODO: Replace with:
  // this.http.get<Project[]>('/api/project').subscribe(projects => {
  //   this.allProjects = projects.map(p => this.deriveFields(p));
  //   ...
  // });
  private getMockProjects(): Observable<Project[]> {
    const now = new Date();
    const d = (y: number, m: number, day: number) =>
      new Date(y, m - 1, day).toISOString();

    return of([
      {
        projectID: 1, name: 'HC-CA1-Firing', visibility: 'public',
        description: 'Parameter sweep for CA1 pyramidal neuron conductance models using Hodgkin-Huxley framework',
        dateCreated: d(2023, 3, 12), lastUpdated: d(2025, 11, 14),
        route: 'cgunay/HC-CA1-Firing', forkedFromProjectID: 0,
        projectTags: [{ tagID: 1, name: 'neuroscience', projectID: 1 }, { tagID: 2, name: 'computational', projectID: 1 }],
        projectUsers: [
          { userID: 1, projectID: 1, userRole: 'Owner', isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 2, projectID: 1, userRole: 'Member', isFollowing: true, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } },
          { userID: 3, projectID: 1, userRole: 'Member', isFollowing: true, user: { id: 3, userName: 'hdinh', email: 'hdinh@example.com', bio: '' } },
          { userID: 4, projectID: 1, userRole: 'Member', isFollowing: false, user: { id: 4, userName: 'student1', email: 's1@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 1,  container: 'projects', directory: '/data', name: 'sweep_results',    extension: '.csv', size: 2621440,  uri: '', dateCreated: d(2023,3,12), lastModified: d(2025,11,14), userID: 1, projectID: 1 },
          { blobFileID: 2,  container: 'projects', directory: '/data', name: 'param_config',     extension: '.json',size: 4096,     uri: '', dateCreated: d(2023,3,12), lastModified: d(2025,11,14), userID: 1, projectID: 1 },
          { blobFileID: 3,  container: 'projects', directory: '/src',  name: 'run_sweep',        extension: '.py',  size: 20480,    uri: '', dateCreated: d(2023,3,15), lastModified: d(2025,10,1),  userID: 1, projectID: 1 },
          { blobFileID: 4,  container: 'projects', directory: '/src',  name: 'analysis',         extension: '.py',  size: 16384,    uri: '', dateCreated: d(2023,4,1),  lastModified: d(2025,9,1),   userID: 1, projectID: 1 },
          { blobFileID: 5,  container: 'projects', directory: '/data', name: 'summary',          extension: '.csv', size: 1048576,  uri: '', dateCreated: d(2023,5,1),  lastModified: d(2025,8,1),   userID: 1, projectID: 1 }
        ],
        notebooks: [
          { notebookID: 1, name: 'CA1 Analysis', route: 'cgunay/HC-CA1-Firing/ca1-analysis', extension: '.ipynb', size: 65536, uri: '', dateCreated: d(2023,4,1), lastModified: d(2025,11,1), projectID: 1, type: 'jupyter', container: '', directory: '' }
        ]
      },
      {
        projectID: 2, name: 'CO2-MLO-Dataset', visibility: 'public',
        description: 'Mauna Loa Observatory atmospheric CO2 concentration readings from 1958 to present day',
        dateCreated: d(2023,6,1), lastUpdated: d(2025,10,2),
        route: 'cgunay/CO2-MLO-Dataset', forkedFromProjectID: 0,
        projectTags: [{ tagID: 5, name: 'climate', projectID: 2 }, { tagID: 6, name: 'csv', projectID: 2 }],
        projectUsers: [
          { userID: 1, projectID: 2, userRole: 'Owner', isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 5, projectID: 2, userRole: 'Member', isFollowing: true, user: { id: 5, userName: 'researcher2', email: 'r2@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 10, container: 'projects', directory: '/', name: 'co2-gr-mlo', extension: '.csv', size: 524288, uri: '', dateCreated: d(2023,6,1), lastModified: d(2025,10,2), userID: 1, projectID: 2 }
        ],
        notebooks: []
      },
      {
        projectID: 3, name: 'Dopamine-D1D2', visibility: 'public',
        description: 'D1/D2 receptor balance model in basal ganglia circuits using conductance-based neuron simulations',
        dateCreated: d(2023,9,15), lastUpdated: d(2026,1,8),
        route: 'adolocm/Dopamine-D1D2', forkedFromProjectID: 0,
        projectTags: [{ tagID: 9, name: 'neuroscience', projectID: 3 }, { tagID: 10, name: 'beta', projectID: 3 }],
        projectUsers: [
          { userID: 2, projectID: 3, userRole: 'Owner', isFollowing: false, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } },
          { userID: 1, projectID: 3, userRole: 'Member', isFollowing: true, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 6, projectID: 3, userRole: 'Member', isFollowing: false, user: { id: 6, userName: 'student3', email: 's3@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 20, container: 'projects', directory: '/model', name: 'basal_ganglia_model', extension: '.py',  size: 40960,   uri: '', dateCreated: d(2023,9,15), lastModified: d(2026,1,8), userID: 2, projectID: 3 },
          { blobFileID: 21, container: 'projects', directory: '/data',  name: 'param_sweep',         extension: '.h5',  size: 10485760,uri: '', dateCreated: d(2023,10,1), lastModified: d(2026,1,1), userID: 2, projectID: 3 },
          { blobFileID: 22, container: 'projects', directory: '/data',  name: 'results_summary',     extension: '.csv', size: 204800,  uri: '', dateCreated: d(2023,11,1), lastModified: d(2025,12,1),userID: 2, projectID: 3 }
        ],
        notebooks: [
          { notebookID: 5, name: 'D1D2 Analysis', route: 'adolocm/Dopamine-D1D2/d1d2-analysis', extension: '.ipynb', size: 32768, uri: '', dateCreated: d(2023,10,1), lastModified: d(2025,12,1), projectID: 3, type: 'jupyter', container: '', directory: '' },
          { notebookID: 6, name: 'Visualization', route: 'adolocm/Dopamine-D1D2/viz', extension: '.ojs', size: 16384, uri: '', dateCreated: d(2023,11,1), lastModified: d(2025,11,1), projectID: 3, type: 'observable', container: '', directory: '' }
        ]
      },
      {
        projectID: 4, name: 'EEG-Alpha-Wave', visibility: 'public',
        description: 'Alpha wave suppression recordings across 40 human subjects during visual stimulus experiments',
        dateCreated: d(2022,11,1), lastUpdated: d(2025,9,22),
        route: 'hdinh/EEG-Alpha-Wave', forkedFromProjectID: 0,
        projectTags: [{ tagID: 13, name: 'neuroscience', projectID: 4 }, { tagID: 14, name: 'eeg', projectID: 4 }],
        projectUsers: [
          { userID: 3, projectID: 4, userRole: 'Owner', isFollowing: false, user: { id: 3, userName: 'hdinh', email: 'hdinh@example.com', bio: '' } },
          { userID: 7, projectID: 4, userRole: 'Member', isFollowing: true, user: { id: 7, userName: 'medstudent', email: 'med@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 30, container: 'projects', directory: '/raw',  name: 'subject_recordings', extension: '.mat', size: 52428800, uri: '', dateCreated: d(2022,11,1), lastModified: d(2025,9,22), userID: 3, projectID: 4 },
          { blobFileID: 31, container: 'projects', directory: '/data', name: 'processed_alpha',     extension: '.csv', size: 2097152,  uri: '', dateCreated: d(2023,1,1),  lastModified: d(2025,8,1),  userID: 3, projectID: 4 }
        ],
        notebooks: []
      },
      {
        projectID: 5, name: 'CSD-Wave-Sim', visibility: 'private',
        description: 'Reaction-diffusion model of cortical spreading depression wave propagation in cortex tissue',
        dateCreated: d(2025,1,10), lastUpdated: d(2026,2,19),
        route: 'cgunay/CSD-Wave-Sim', forkedFromProjectID: 0,
        projectTags: [{ tagID: 17, name: 'neuroscience', projectID: 5 }, { tagID: 18, name: 'wip', projectID: 5 }],
        projectUsers: [
          { userID: 1, projectID: 5, userRole: 'Owner', isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 40, container: 'projects', directory: '/src',  name: 'csd_model', extension: '.py',   size: 32768,   uri: '', dateCreated: d(2025,1,10), lastModified: d(2026,2,19), userID: 1, projectID: 5 },
          { blobFileID: 41, container: 'projects', directory: '/data', name: 'sim_output', extension: '.json', size: 5242880, uri: '', dateCreated: d(2025,2,1),  lastModified: d(2026,2,1),  userID: 1, projectID: 5 }
        ],
        notebooks: [
          { notebookID: 10, name: 'CSD Analysis', route: 'cgunay/CSD-Wave-Sim/csd-analysis', extension: '.ipynb', size: 49152, uri: '', dateCreated: d(2025,3,1), lastModified: d(2026,1,1), projectID: 5, type: 'jupyter', container: '', directory: '' }
        ]
      },
      {
        projectID: 6, name: 'scRNA-PFC', visibility: 'public',
        description: 'Prefrontal cortex single-cell RNA sequencing data from 12 post-mortem human donors',
        dateCreated: d(2024,3,1), lastUpdated: d(2025,12,5),
        route: 'ponrajaprabhusk/scRNA-PFC', forkedFromProjectID: 0,
        projectTags: [{ tagID: 20, name: 'genomics', projectID: 6 }, { tagID: 21, name: 'beta', projectID: 6 }],
        projectUsers: [
          { userID: 8, projectID: 6, userRole: 'Owner', isFollowing: false, user: { id: 8, userName: 'ponrajaprabhusk', email: 'p@example.com', bio: '' } },
          { userID: 1, projectID: 6, userRole: 'Member', isFollowing: true, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 50, container: 'projects', directory: '/data', name: 'pfc_counts',   extension: '.csv',  size: 104857600, uri: '', dateCreated: d(2024,3,1), lastModified: d(2025,12,5), userID: 8, projectID: 6 },
          { blobFileID: 51, container: 'projects', directory: '/data', name: 'cell_metadata', extension: '.json', size: 1048576,  uri: '', dateCreated: d(2024,3,1), lastModified: d(2025,12,5), userID: 8, projectID: 6 }
        ],
        notebooks: []
      },
      {
        projectID: 7, name: 'TC-Loop-Osc', visibility: 'public',
        description: 'Sleep spindle and slow oscillation coupling in thalamo-cortical circuits',
        dateCreated: d(2023,8,1), lastUpdated: d(2026,1,30),
        route: 'adolocm/TC-Loop-Osc', forkedFromProjectID: 0,
        projectTags: [{ tagID: 25, name: 'neuroscience', projectID: 7 }, { tagID: 26, name: 'computational', projectID: 7 }],
        projectUsers: [
          { userID: 2, projectID: 7, userRole: 'Owner', isFollowing: false, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } },
          { userID: 1, projectID: 7, userRole: 'Member', isFollowing: true, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 9, projectID: 7, userRole: 'Member', isFollowing: false, user: { id: 9, userName: 'gradstudent2', email: 'gs2@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 60, container: 'projects', directory: '/model', name: 'tc_network',  extension: '.py',  size: 61440,    uri: '', dateCreated: d(2023,8,1), lastModified: d(2026,1,30), userID: 2, projectID: 7 },
          { blobFileID: 61, container: 'projects', directory: '/data',  name: 'sim_results', extension: '.h5',  size: 20971520, uri: '', dateCreated: d(2023,9,1), lastModified: d(2026,1,1),  userID: 2, projectID: 7 },
          { blobFileID: 62, container: 'projects', directory: '/data',  name: 'spindle_data',extension: '.csv', size: 524288,   uri: '', dateCreated: d(2023,10,1),lastModified: d(2025,12,1), userID: 2, projectID: 7 }
        ],
        notebooks: [
          { notebookID: 15, name: 'TC Analysis', route: 'adolocm/TC-Loop-Osc/tc-analysis', extension: '.ipynb', size: 81920, uri: '', dateCreated: d(2023,9,1), lastModified: d(2026,1,1), projectID: 7, type: 'jupyter', container: '', directory: '' }
        ]
      },
      {
        projectID: 8, name: 'Barrel-Cortex', visibility: 'private',
        description: 'Multi-electrode array recordings from mouse somatosensory barrel cortex during whisker stimulation',
        dateCreated: d(2024,2,1), lastUpdated: d(2025,8,17),
        route: 'hdinh/Barrel-Cortex', forkedFromProjectID: 3,
        projectTags: [{ tagID: 30, name: 'neuroscience', projectID: 8 }, { tagID: 31, name: 'in-vivo', projectID: 8 }],
        projectUsers: [
          { userID: 3, projectID: 8, userRole: 'Owner', isFollowing: false, user: { id: 3, userName: 'hdinh', email: 'hdinh@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 70, container: 'projects', directory: '/raw',  name: 'mea_recordings', extension: '.mat', size: 31457280, uri: '', dateCreated: d(2024,2,1), lastModified: d(2025,8,17), userID: 3, projectID: 8 },
          { blobFileID: 71, container: 'projects', directory: '/data', name: 'firing_rates',    extension: '.csv', size: 1048576,  uri: '', dateCreated: d(2024,3,1), lastModified: d(2025,7,1),  userID: 3, projectID: 8 }
        ],
        notebooks: []
      },
      {
        projectID: 9, name: 'RGC-RF-Models', visibility: 'public',
        description: 'Center-surround receptive field models fit to primate retinal ganglion cell spike trains',
        dateCreated: d(2022,5,1), lastUpdated: d(2025,7,11),
        route: 'cgunay/RGC-RF-Models', forkedFromProjectID: 0,
        projectTags: [{ tagID: 34, name: 'vision', projectID: 9 }, { tagID: 35, name: 'computational', projectID: 9 }],
        projectUsers: [
          { userID: 1, projectID: 9, userRole: 'Owner', isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 10, projectID: 9, userRole: 'Member', isFollowing: true, user: { id: 10, userName: 'visionlab', email: 'vl@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 80, container: 'projects', directory: '/src',  name: 'rf_model',   extension: '.py',  size: 24576,  uri: '', dateCreated: d(2022,5,1), lastModified: d(2025,7,11), userID: 1, projectID: 9 },
          { blobFileID: 81, container: 'projects', directory: '/data', name: 'spike_data',  extension: '.csv', size: 2097152,uri: '', dateCreated: d(2022,5,1), lastModified: d(2025,6,1),  userID: 1, projectID: 9 },
          { blobFileID: 82, container: 'projects', directory: '/data', name: 'rf_params',   extension: '.json',size: 8192,   uri: '', dateCreated: d(2022,6,1), lastModified: d(2025,5,1),  userID: 1, projectID: 9 }
        ],
        notebooks: [
          { notebookID: 20, name: 'RF Fitting', route: 'cgunay/RGC-RF-Models/rf-fitting', extension: '.ojs', size: 24576, uri: '', dateCreated: d(2022,7,1), lastModified: d(2025,6,1), projectID: 9, type: 'observable', container: '', directory: '' }
        ]
      },
      {
        projectID: 10, name: 'V1-Calcium-Img', visibility: 'public',
        description: 'Two-photon calcium imaging of orientation-selective neurons in mouse primary visual cortex',
        dateCreated: d(2024,8,1), lastUpdated: d(2026,3,1),
        route: 'adolocm/V1-Calcium-Img', forkedFromProjectID: 0,
        projectTags: [{ tagID: 38, name: 'vision', projectID: 10 }, { tagID: 39, name: 'beta', projectID: 10 }],
        projectUsers: [
          { userID: 2, projectID: 10, userRole: 'Owner', isFollowing: false, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } },
          { userID: 11, projectID: 10, userRole: 'Member', isFollowing: false, user: { id: 11, userName: 'labmember4', email: 'lm4@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 90, container: 'projects', directory: '/raw',  name: 'calcium_traces', extension: '.h5',  size: 209715200,uri: '', dateCreated: d(2024,8,1), lastModified: d(2026,3,1),  userID: 2, projectID: 10 },
          { blobFileID: 91, container: 'projects', directory: '/data', name: 'tuning_curves',   extension: '.csv', size: 1048576,  uri: '', dateCreated: d(2024,9,1), lastModified: d(2026,2,1),  userID: 2, projectID: 10 }
        ],
        notebooks: []
      },
      {
        projectID: 11, name: 'OlfBulb-Network', visibility: 'private',
        description: 'Mitral and granule cell interaction model for odour coding in the olfactory bulb glomerular layer',
        dateCreated: d(2025,6,1), lastUpdated: d(2026,2,5),
        route: 'ponrajaprabhusk/OlfBulb-Network', forkedFromProjectID: 0,
        projectTags: [{ tagID: 42, name: 'neuroscience', projectID: 11 }, { tagID: 43, name: 'wip', projectID: 11 }],
        projectUsers: [
          { userID: 8, projectID: 11, userRole: 'Owner', isFollowing: false, user: { id: 8, userName: 'ponrajaprabhusk', email: 'p@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 100, container: 'projects', directory: '/src', name: 'olf_model', extension: '.py', size: 16384, uri: '', dateCreated: d(2025,6,1), lastModified: d(2026,2,5), userID: 8, projectID: 11 }
        ],
        notebooks: []
      },
      {
        projectID: 12, name: 'M1-LFP-BCI', visibility: 'public',
        description: 'Local field potential recordings from primary motor cortex during BCI cursor control task',
        dateCreated: d(2022,3,1), lastUpdated: d(2025,6,28),
        route: 'hdinh/M1-LFP-BCI', forkedFromProjectID: 0,
        projectTags: [{ tagID: 46, name: 'motor', projectID: 12 }, { tagID: 47, name: 'clinical', projectID: 12 }],
        projectUsers: [
          { userID: 3, projectID: 12, userRole: 'Owner', isFollowing: false, user: { id: 3, userName: 'hdinh', email: 'hdinh@example.com', bio: '' } },
          { userID: 1, projectID: 12, userRole: 'Member', isFollowing: true, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 2, projectID: 12, userRole: 'Member', isFollowing: true, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 110, container: 'projects', directory: '/raw',  name: 'lfp_recordings', extension: '.mat', size: 78643200, uri: '', dateCreated: d(2022,3,1), lastModified: d(2025,6,28), userID: 3, projectID: 12 },
          { blobFileID: 111, container: 'projects', directory: '/data', name: 'lfp_processed',   extension: '.csv', size: 5242880,  uri: '', dateCreated: d(2022,5,1), lastModified: d(2025,5,1),  userID: 3, projectID: 12 },
          { blobFileID: 112, container: 'projects', directory: '/data', name: 'trial_metadata',  extension: '.json',size: 65536,   uri: '', dateCreated: d(2022,5,1), lastModified: d(2025,4,1),  userID: 3, projectID: 12 }
        ],
        notebooks: [
          { notebookID: 25, name: 'LFP Analysis', route: 'hdinh/M1-LFP-BCI/lfp-analysis', extension: '.ipynb', size: 73728, uri: '', dateCreated: d(2022,6,1), lastModified: d(2025,5,1), projectID: 12, type: 'jupyter', container: '', directory: '' }
        ]
      },
      {
        projectID: 13, name: 'Purkinje-Plast', visibility: 'public',
        description: 'Synaptic plasticity rules for parallel fibre and climbing fibre synapses on cerebellar Purkinje cells',
        dateCreated: d(2023,4,1), lastUpdated: d(2026,1,18),
        route: 'cgunay/Purkinje-Plast', forkedFromProjectID: 9,
        projectTags: [{ tagID: 50, name: 'neuroscience', projectID: 13 }, { tagID: 51, name: 'computational', projectID: 13 }],
        projectUsers: [
          { userID: 1, projectID: 13, userRole: 'Owner', isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 12, projectID: 13, userRole: 'Member', isFollowing: false, user: { id: 12, userName: 'postdoc1', email: 'pd1@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 120, container: 'projects', directory: '/model', name: 'purkinje_model', extension: '.py',   size: 49152,   uri: '', dateCreated: d(2023,4,1), lastModified: d(2026,1,18), userID: 1, projectID: 13 },
          { blobFileID: 121, container: 'projects', directory: '/data',  name: 'ltp_ltd_data',   extension: '.json', size: 131072,  uri: '', dateCreated: d(2023,5,1), lastModified: d(2025,12,1), userID: 1, projectID: 13 },
          { blobFileID: 122, container: 'projects', directory: '/data',  name: 'sim_results',    extension: '.csv',  size: 1048576, uri: '', dateCreated: d(2023,6,1), lastModified: d(2025,11,1), userID: 1, projectID: 13 }
        ],
        notebooks: [
          { notebookID: 30, name: 'Plasticity Viz', route: 'cgunay/Purkinje-Plast/plasticity-viz', extension: '.ojs', size: 40960, uri: '', dateCreated: d(2023,7,1), lastModified: d(2025,12,1), projectID: 13, type: 'observable', container: '', directory: '' }
        ]
      },
      {
        projectID: 14, name: 'AudCortex-STRF', visibility: 'public',
        description: 'Spectrotemporal receptive fields from ferret primary auditory cortex during natural sound stimulation',
        dateCreated: d(2022,1,1), lastUpdated: d(2025,5,14),
        route: 'adolocm/AudCortex-STRF', forkedFromProjectID: 0,
        projectTags: [{ tagID: 54, name: 'auditory', projectID: 14 }],
        projectUsers: [
          { userID: 2, projectID: 14, userRole: 'Owner', isFollowing: false, user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 130, container: 'projects', directory: '/data', name: 'strf_data', extension: '.csv', size: 1572864, uri: '', dateCreated: d(2022,1,1), lastModified: d(2025,5,14), userID: 2, projectID: 14 }
        ],
        notebooks: []
      },
      {
        projectID: 15, name: 'HH-Param-Sweep', visibility: 'public',
        description: 'Full factorial parameter sweep of Hodgkin-Huxley conductance values across 10k combinations',
        dateCreated: d(2024,1,1), lastUpdated: d(2026,3,10),
        route: 'cgunay/HH-Param-Sweep', forkedFromProjectID: 0,
        projectTags: [{ tagID: 58, name: 'neuroscience', projectID: 15 }, { tagID: 59, name: 'beta', projectID: 15 }, { tagID: 60, name: 'computational', projectID: 15 }],
        projectUsers: [
          { userID: 1,  projectID: 15, userRole: 'Owner',  isFollowing: false, user: { id: 1, userName: 'cgunay', email: 'cgunay@ggc.edu', bio: '' } },
          { userID: 2,  projectID: 15, userRole: 'Member', isFollowing: true,  user: { id: 2, userName: 'adolocm', email: 'adolocm@gmail.com', bio: '' } },
          { userID: 13, projectID: 15, userRole: 'Member', isFollowing: false, user: { id: 13, userName: 'gradstudent5', email: 'gs5@example.com', bio: '' } }
        ],
        blobFiles: [
          { blobFileID: 140, container: 'projects', directory: '/data',  name: 'sweep_10k',      extension: '.csv',  size: 52428800,  uri: '', dateCreated: d(2024,1,1), lastModified: d(2026,3,10), userID: 1, projectID: 15 },
          { blobFileID: 141, container: 'projects', directory: '/src',   name: 'run_hh_sweep',   extension: '.py',   size: 32768,     uri: '', dateCreated: d(2024,1,1), lastModified: d(2026,2,1),  userID: 1, projectID: 15 },
          { blobFileID: 142, container: 'projects', directory: '/data',  name: 'hh_config',      extension: '.json', size: 8192,      uri: '', dateCreated: d(2024,2,1), lastModified: d(2026,1,1),  userID: 1, projectID: 15 },
          { blobFileID: 143, container: 'projects', directory: '/data',  name: 'summary_stats',  extension: '.csv',  size: 4194304,   uri: '', dateCreated: d(2024,3,1), lastModified: d(2026,3,1),  userID: 1, projectID: 15 }
        ],
        notebooks: [
          { notebookID: 35, name: 'HH Sweep Analysis', route: 'cgunay/HH-Param-Sweep/hh-analysis', extension: '.ipynb', size: 122880, uri: '', dateCreated: d(2024,2,1), lastModified: d(2026,3,1), projectID: 15, type: 'jupyter', container: '', directory: '' },
          { notebookID: 36, name: 'Interactive Viz',   route: 'cgunay/HH-Param-Sweep/hh-viz',       extension: '.ojs',   size: 57344,  uri: '', dateCreated: d(2024,3,1), lastModified: d(2026,2,1), projectID: 15, type: 'observable', container: '', directory: '' }
        ]
      }
    ] as Project[]);
  }

  // ── Derive computed fields from raw Project ────────────────
  private deriveFields(p: Project): DashboardProject {
    const ownerPU   = p.projectUsers.find(pu => pu.userRole === 'Owner');
    const exts      = [...new Set(p.blobFiles.map(f => f.extension.replace('.','').toUpperCase()))];
    const totalBytes = p.blobFiles.reduce((s, f) => s + f.size, 0);
    return {
      ...p,
      ownerName:      ownerPU?.user?.userName ?? 'unknown',
      memberCount:    p.projectUsers.length,
      followerCount:  p.projectUsers.filter(pu => pu.isFollowing).length,
      totalSizeBytes: totalBytes,
      fileExtensions: exts,
      isForked:       p.forkedFromProjectID > 0,
      notebookCount:  p.notebooks.length,
      selected:       false
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────
  ngOnInit(): void {
    this.loading = true;
    this.getMockProjects().subscribe(projects => {
      this.allProjects      = projects.map(p => this.deriveFields(p));
      this.filteredProjects = [...this.allProjects];
      // Build the flat dataset list from all BlobFiles across all projects
      this.allDatasets      = this.buildFlatDatasets(this.allProjects);
      this.filteredDatasets = [...this.allDatasets];
      this.loading          = false;
    });
  }

  // ── Filtering ──────────────────────────────────────────────
  applyFilters(): void {
    let r = [...this.allProjects];

    if (this.globalSearch?.trim()) {
      const q = this.globalSearch.toLowerCase();
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.route.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.projectTags.some(t => t.name.toLowerCase().includes(q))
      );
    }

    if (this.selectedVisibility)
      r = r.filter(p => p.visibility === this.selectedVisibility);

    if (this.ownershipFilter === 'mine')
      r = r.filter(p => p.ownerName === 'cgunay'); // current user placeholder
    else if (this.ownershipFilter === 'following')
      r = r.filter(p => p.projectUsers.some(pu => pu.isFollowing));

    if (this.dateRange?.length === 2 && this.dateRange[0] && this.dateRange[1]) {
      const [from, to] = this.dateRange;
      r = r.filter(p => {
        const d = new Date(this.dateField === 'lastUpdated' ? p.lastUpdated : p.dateCreated);
        return d >= from && d <= to;
      });
    }

    if (this.selectedExtensions.length > 0)
      r = r.filter(p => p.fileExtensions.some(e => this.selectedExtensions.includes(e)));

    if (this.hasNotebooksFilter === 'yes') r = r.filter(p => p.notebookCount > 0);
    if (this.hasNotebooksFilter === 'no')  r = r.filter(p => p.notebookCount === 0);

    if (this.isForkFilter === 'original') r = r.filter(p => !p.isForked);
    if (this.isForkFilter === 'fork')     r = r.filter(p => p.isForked);

    if (this.storageSizeFilter === 'small')
      r = r.filter(p => p.totalSizeBytes < 10 * 1024 * 1024);
    else if (this.storageSizeFilter === 'medium')
      r = r.filter(p => p.totalSizeBytes >= 10 * 1024 * 1024 && p.totalSizeBytes <= 100 * 1024 * 1024);
    else if (this.storageSizeFilter === 'large')
      r = r.filter(p => p.totalSizeBytes > 100 * 1024 * 1024);

    this.filteredProjects = this.sortProjects(r);
    this.selectAll        = false;
  }

  private sortProjects(list: DashboardProject[]): DashboardProject[] {
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (this.sortField) {
        case 'name':          av = a.name;          bv = b.name; break;
        case 'lastUpdated':   av = a.lastUpdated;   bv = b.lastUpdated; break;
        case 'dateCreated':   av = a.dateCreated;   bv = b.dateCreated; break;
        case 'memberCount':   av = a.memberCount;   bv = b.memberCount; break;
        case 'followerCount': av = a.followerCount; bv = b.followerCount; break;
        case 'totalSizeBytes':av = a.totalSizeBytes;bv = b.totalSizeBytes; break;
        case 'fileCount':     av = a.blobFiles.length; bv = b.blobFiles.length; break;
        case 'notebookCount': av = a.notebookCount; bv = b.notebookCount; break;
        default:              av = a.lastUpdated;   bv = b.lastUpdated;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  onSortChange(): void { this.filteredProjects = this.sortProjects(this.filteredProjects); }

  toggleSortDir(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.filteredProjects = this.sortProjects(this.filteredProjects);
  }

  clearAllFilters(): void {
    this.globalSearch = ''; this.selectedVisibility = null;
    this.ownershipFilter = 'all'; this.dateRange = [];
    this.selectedExtensions = []; this.hasNotebooksFilter = null;
    this.isForkFilter = null; this.storageSizeFilter = null;
    this.sortField = 'lastUpdated'; this.sortDir = 'desc';
    this.filteredProjects = [...this.allProjects];
    this.selectAll = false;
  }

  removeChip(key: string): void {
    if (key === 'search')      this.globalSearch       = '';
    if (key === 'visibility')  this.selectedVisibility = null;
    if (key === 'ownership')   this.ownershipFilter    = 'all';
    if (key === 'date')        this.dateRange          = [];
    if (key === 'notebooks')   this.hasNotebooksFilter = null;
    if (key === 'fork')        this.isForkFilter       = null;
    if (key === 'storage')     this.storageSizeFilter  = null;
    if (key.startsWith('ext:'))
      this.selectedExtensions = this.selectedExtensions.filter(e => e !== key.replace('ext:',''));
    this.applyFilters();
  }

  onExtToggle(ext: string): void {
    const i = this.selectedExtensions.indexOf(ext);
    if (i > -1) this.selectedExtensions.splice(i, 1); else this.selectedExtensions.push(ext);
    this.applyFilters();
  }

  isExtSelected(ext: string): boolean { return this.selectedExtensions.includes(ext); }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.filteredProjects.forEach(p => p.selected = this.selectAll);
  }

  get selectedCount(): number { return this.filteredProjects.filter(p => p.selected).length; }

  // ── Actions ────────────────────────────────────────────────
  // ── View — navigates to the existing /project/:owner/:name route ──
  onView(p: DashboardProject): void {
    // Route format matches Project.Route which is "owner/project-name"
    this.router.navigate(['/project', p.route]);
  }

  onNewProject(): void {
    this.router.navigate(['/project/create']);
  }

  // ── Fork — calls the existing fork endpoint (wired in PR #134) ──
  onFork(p: DashboardProject): void {
    // TODO: inject ProjectService and call:
    // this.projectService.forkProject(p.projectID).subscribe(fork => {
    //   this.router.navigate(['/project', fork.route]);
    // });
    console.log('[Dashboard] Fork project:', p.projectID, p.route);
    alert(`Fork feature: will call POST /api/project/fork/${p.projectID}`);
  }

  // ── Delete — shows inline confirmation before destructive action ──
  onDelete(p: DashboardProject): void {
    this.projectToDelete  = p;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.projectToDelete) return;
    // TODO: inject ProjectService and call:
    // this.projectService.deleteProject(this.projectToDelete.projectID).subscribe(() => {
    //   this.allProjects      = this.allProjects.filter(p => p.projectID !== this.projectToDelete!.projectID);
    //   this.applyFilters();
    // });
    // Mockup: remove from local array to demonstrate the behaviour
    const id = this.projectToDelete.projectID;
    this.allProjects      = this.allProjects.filter(p => p.projectID !== id);
    this.filteredProjects = this.filteredProjects.filter(p => p.projectID !== id);
    this.cancelDelete();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.projectToDelete   = null;
  }

  // ── Export CSV — real file download, not console.log ──
  onExport(): void {
    const header = [
      'ProjectID', 'Name', 'Route', 'Visibility', 'Owner',
      'Files', 'Notebooks', 'Members', 'StorageBytes', 'StorageFormatted',
      'Tags', 'FileTypes', 'IsForked', 'ForkedFromID', 'DateCreated', 'LastUpdated'
    ].join(',');

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const rows = this.filteredProjects.map(p => [
      p.projectID,
      escape(p.name),
      escape(p.route),
      escape(p.visibility),
      escape(p.ownerName),
      p.blobFiles.length,
      p.notebookCount,
      p.memberCount,
      p.totalSizeBytes,
      escape(this.formatBytes(p.totalSizeBytes)),
      escape(p.projectTags.map(t => t.name).join('; ')),
      escape(p.fileExtensions.join('; ')),
      p.isForked ? 'Yes' : 'No',
      p.forkedFromProjectID || '',
      escape(p.dateCreated),
      escape(p.lastUpdated)
    ].join(','));

    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `analysim-projects-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Helpers ────────────────────────────────────────────────
  formatBytes(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576)    return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024)       return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }

  storageBarPct(bytes: number): number {
    const max = Math.max(...this.allProjects.map(p => p.totalSizeBytes), 1);
    return Math.round((bytes / max) * 100);
  }

  getNotebookTypes(notebooks: Notebook[]): string[] {
    return [...new Set(notebooks.map(n => n.type).filter(Boolean))];
  }

  get activeChips(): ActiveChip[] {
    const c: ActiveChip[] = [];
    if (this.globalSearch)           c.push({ key: 'search',     label: `"${this.globalSearch}"` });
    if (this.selectedVisibility)     c.push({ key: 'visibility', label: this.selectedVisibility });
    if (this.ownershipFilter !== 'all') c.push({ key: 'ownership',  label: this.ownershipFilter });
    if (this.dateRange?.length === 2 && this.dateRange[0]) c.push({ key: 'date', label: 'Date range' });
    if (this.hasNotebooksFilter)     c.push({ key: 'notebooks',  label: `Notebooks: ${this.hasNotebooksFilter}` });
    if (this.isForkFilter)           c.push({ key: 'fork',       label: this.isForkFilter });
    if (this.storageSizeFilter)      c.push({ key: 'storage',    label: `Size: ${this.storageSizeFilter}` });
    this.selectedExtensions.forEach(e => c.push({ key: `ext:${e}`, label: `.${e.toLowerCase()}` }));
    return c;
  }

  get hasActiveFilters(): boolean { return this.activeChips.length > 0; }

  // Extension colour for badges
  extColor(ext: string): string {
    const map: Record<string, string> = {
      CSV: 'ext--csv', JSON: 'ext--json', PY: 'ext--py',
      MAT: 'ext--mat', H5: 'ext--h5', IPYNB: 'ext--ipynb'
    };
    return map[ext] ?? 'ext--other';
  }

  // Analytics breakdown
  get extBreakdown(): { ext: string; count: number; pct: number }[] {
    const total = this.filteredProjects.length || 1;
    return this.allExtensions.map(ext => {
      const count = this.filteredProjects.filter(p => p.fileExtensions.includes(ext)).length;
      return { ext, count, pct: Math.round((count / total) * 100) };
    }).filter(x => x.count > 0);
  }

  get visBreakdown(): { label: string; count: number; pct: number }[] {
    const total = this.filteredProjects.length || 1;
    const pub   = this.filteredProjects.filter(p => p.visibility === 'public').length;
    const priv  = this.filteredProjects.filter(p => p.visibility === 'private').length;
    return [
      { label: 'Public',  count: pub,  pct: Math.round((pub  / total) * 100) },
      { label: 'Private', count: priv, pct: Math.round((priv / total) * 100) }
    ];
  }

  get avgFilesPerProject(): number {
    if (!this.filteredProjects.length) return 0;
    return Math.round(this.filteredProjects.reduce((s, p) => s + p.blobFiles.length, 0) / this.filteredProjects.length);
  }

  get forkedCount(): number { return this.filteredProjects.filter(p => p.isForked).length; }
  get withNotebooksCount(): number { return this.filteredProjects.filter(p => p.notebookCount > 0).length; }

  get avgMembersPerProject(): number {
    if (!this.filteredProjects.length) return 0;
    const total = this.filteredProjects.reduce((s, p) => s + p.memberCount, 0);
    return Math.round((total / this.filteredProjects.length) * 10) / 10;
  }

  // ── Build flat dataset list from BlobFiles ────────────────────
  private buildFlatDatasets(projects: DashboardProject[]): FlatDataset[] {
    const rows: FlatDataset[] = [];
    for (const p of projects) {
      for (const f of p.blobFiles) {
        rows.push({
          blobFileID:   f.blobFileID,
          fileName:     f.name,
          extension:    f.extension,
          sizeBytes:    f.size,
          directory:    f.directory,
          lastModified: f.lastModified,
          uploadedBy:   f.userID === p.projectUsers.find(pu => pu.userRole === 'Owner')?.userID
                          ? p.ownerName
                          : (p.projectUsers.find(pu => pu.userID === f.userID)?.user?.userName ?? p.ownerName),
          projectID:    p.projectID,
          projectName:  p.name,
          projectRoute: p.route,
          projectOwner: p.ownerName,
          visibility:   p.visibility
        });
      }
    }
    return rows;
  }

  // ── Dataset filtering ──────────────────────────────────────────
  applyDatasetFilters(): void {
    let r = [...this.allDatasets];

    if (this.dsSearch?.trim()) {
      const q = this.dsSearch.toLowerCase();
      r = r.filter(d =>
        d.fileName.toLowerCase().includes(q)      ||
        d.extension.toLowerCase().includes(q)     ||
        d.projectName.toLowerCase().includes(q)   ||
        d.projectOwner.toLowerCase().includes(q)  ||
        d.directory.toLowerCase().includes(q)
      );
    }

    if (this.dsExtFilter.length > 0)
      r = r.filter(d => this.dsExtFilter.includes(d.extension.replace('.','').toUpperCase()));

    if (this.dsProjectFilter)
      r = r.filter(d => d.projectName === this.dsProjectFilter);

    if (this.dsSizeFilter === 'small')  r = r.filter(d => d.sizeBytes < 1024 * 1024);
    if (this.dsSizeFilter === 'medium') r = r.filter(d => d.sizeBytes >= 1024*1024 && d.sizeBytes <= 50*1024*1024);
    if (this.dsSizeFilter === 'large')  r = r.filter(d => d.sizeBytes > 50 * 1024 * 1024);

    // Sort
    r = [...r].sort((a, b) => {
      let av: any, bv: any;
      switch (this.dsSortField) {
        case 'fileName':     av = a.fileName;     bv = b.fileName;     break;
        case 'extension':    av = a.extension;    bv = b.extension;    break;
        case 'sizeBytes':    av = a.sizeBytes;    bv = b.sizeBytes;    break;
        case 'projectName':  av = a.projectName;  bv = b.projectName;  break;
        case 'lastModified': av = a.lastModified; bv = b.lastModified; break;
        default:             av = a.lastModified; bv = b.lastModified;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this.dsSortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredDatasets = r;
  }

  clearDatasetFilters(): void {
    this.dsSearch = ''; this.dsExtFilter = [];
    this.dsProjectFilter = null; this.dsSizeFilter = null;
    this.filteredDatasets = [...this.allDatasets];
  }

  onDsExtToggle(ext: string): void {
    const i = this.dsExtFilter.indexOf(ext);
    if (i > -1) this.dsExtFilter.splice(i, 1); else this.dsExtFilter.push(ext);
    this.applyDatasetFilters();
  }

  isDsExtSelected(ext: string): boolean { return this.dsExtFilter.includes(ext); }

  toggleDsSortDir(): void {
    this.dsSortDir = this.dsSortDir === 'asc' ? 'desc' : 'asc';
    this.applyDatasetFilters();
  }

  onDsSortChange(): void { this.applyDatasetFilters(); }

  get dsActiveChips(): ActiveChip[] {
    const c: ActiveChip[] = [];
    if (this.dsSearch)       c.push({ key: 'dss',     label: `"${this.dsSearch}"` });
    if (this.dsProjectFilter) c.push({ key: 'dsproj',  label: this.dsProjectFilter });
    if (this.dsSizeFilter)   c.push({ key: 'dssize',  label: `Size: ${this.dsSizeFilter}` });
    this.dsExtFilter.forEach(e => c.push({ key: `dsext:${e}`, label: `.${e.toLowerCase()}` }));
    return c;
  }

  get hasDsActiveFilters(): boolean { return this.dsActiveChips.length > 0; }

  removeDsChip(key: string): void {
    if (key === 'dss')    this.dsSearch       = '';
    if (key === 'dsproj') this.dsProjectFilter = null;
    if (key === 'dssize') this.dsSizeFilter    = null;
    if (key.startsWith('dsext:'))
      this.dsExtFilter = this.dsExtFilter.filter(e => e !== key.replace('dsext:',''));
    this.applyDatasetFilters();
  }

  // Unique projects for the dataset "Project" filter dropdown
  get dsProjectOptions(): DropdownOption[] {
    const names = [...new Set(this.allDatasets.map(d => d.projectName))].sort();
    return [{ label: 'All Projects', value: null as string | null }, ...names.map((n: string) => ({ label: n, value: n as string | null }))];
  }
  
  // Navigate to parent project from dataset row
  // Avoids 'as any' cast which Angular template parser rejects
  onViewDatasetProject(route: string): void {
    this.router.navigate(['/project', route]);
  }

  onDsExport(): void {
    const header = 'BlobFileID,FileName,Extension,SizeBytes,SizeFormatted,Directory,Project,ProjectOwner,Visibility,LastModified';
    const escape = (v: string) => `"${v.replace(/"/g,'""')}"`;
    const rows = this.filteredDatasets.map(d => [
      d.blobFileID, escape(d.fileName + d.extension), escape(d.extension),
      d.sizeBytes, escape(this.formatBytes(d.sizeBytes)),
      escape(d.directory), escape(d.projectName),
      escape(d.projectOwner), escape(d.visibility), escape(d.lastModified)
    ].join(','));
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `analysim-datasets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // Dataset stats for the banner
  get statUniqueExtensions(): number {
    return new Set(this.allDatasets.map(d => d.extension)).size;
  }

  get statTotalDatasetSize(): string {
    const bytes = this.allDatasets.reduce((s, d) => s + d.sizeBytes, 0);
    return this.formatBytes(bytes);
  }

  get ownerBreakdown(): { owner: string; count: number; pct: number }[] {
    const total = this.filteredProjects.length || 1;
    const map: Record<string, number> = {};
    this.filteredProjects.forEach(p => { map[p.ownerName] = (map[p.ownerName] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([owner, count]) => ({ owner, count, pct: Math.round((count / total) * 100) }));
  }

  // ── Time-based analytics ───────────────────────────────────
  private monthsAgo(n: number): Date {
    const d = new Date(); d.setMonth(d.getMonth() - n); return d;
  }

  get createdLast30Days(): number {
    const cutoff = this.monthsAgo(1);
    return this.allProjects.filter(p => new Date(p.dateCreated) >= cutoff).length;
  }

  get createdLast12Months(): number {
    const cutoff = this.monthsAgo(12);
    return this.allProjects.filter(p => new Date(p.dateCreated) >= cutoff).length;
  }

  get updatedLast30Days(): number {
    const cutoff = this.monthsAgo(1);
    return this.allProjects.filter(p => new Date(p.lastUpdated) >= cutoff).length;
  }

  get forkedProjectsCount(): number {
    // Projects that are forks of another (ForkedFromProjectID > 0)
    return this.allProjects.filter(p => p.forkedFromProjectID > 0).length;
  }

  get privateProjectsCount(): number {
    return this.allProjects.filter(p => p.visibility === 'private').length;
  }

  get largestProject(): DashboardProject | null {
    if (!this.filteredProjects.length) return null;
    return this.filteredProjects.reduce((max, p) => p.totalSizeBytes > max.totalSizeBytes ? p : max);
  }

  get mostFollowedProject(): DashboardProject | null {
    // Project with most followers (ProjectUser.IsFollowing count)
    // Uses projectID as stable tiebreaker so result is sort-order independent
    if (!this.filteredProjects.length) return null;
    return [...this.filteredProjects].sort((a, b) =>
      b.followerCount !== a.followerCount
        ? b.followerCount - a.followerCount
        : a.projectID - b.projectID          // stable tiebreaker
    )[0];
  }

  get activityByMonth(): { month: string; created: number; updated: number }[] {
    const months: { month: string; created: number; updated: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      months.push({
        month:   label,
        created: this.allProjects.filter(p => { const dd = new Date(p.dateCreated);  return dd >= start && dd <= end; }).length,
        updated: this.allProjects.filter(p => { const dd = new Date(p.lastUpdated);  return dd >= start && dd <= end; }).length
      });
    }
    return months;
  }

  get maxActivityVal(): number {
    const vals = this.activityByMonth.flatMap(m => [m.created, m.updated]);
    return Math.max(...vals, 1);
  }
}