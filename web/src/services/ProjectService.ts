import { ViaProject, ViaImageMetadata, ViaRegion, ViaAttribute } from '../models/Project';

export class ProjectService {
  private project: ViaProject = {
    _via_settings: {
      ui: {
        annotation_editor_height: 25,
        annotation_editor_fontsize: 12,
        leftsidebar_width: 300,
        image_grid: {
          img_height: 80,
          img_width: 100,
        },
      },
      core: {
        default_filepath: '',
      },
    },
    _via_img_metadata: {},
    _via_attributes: {
      region: {},
      file: {},
    },
  };

  private currentProjectName = 'via_project';

  // Initialize with demo data
  constructor() {
    this.addRegionAttribute('class', {
      type: 'text',
      description: 'Object class name',
    });
    this.addFileAttribute('source', {
      type: 'text',
      description: 'Image source',
    });
  }

  // Project management
  async loadProject(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.project = data;
          this.currentProjectName = file.name.replace('.json', '');
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async saveProject(): Promise<Blob> {
    const blob = new Blob([JSON.stringify(this.project, null, 2)], {
      type: 'application/json',
    });
    return blob;
  }

  getProjectName(): string {
    return this.currentProjectName;
  }

  setProjectName(name: string): void {
    this.currentProjectName = name;
  }

  // Image management
  addImage(imageId: string, metadata: Omit<ViaImageMetadata, 'regions'>): void {
    this.project._via_img_metadata[imageId] = {
      ...metadata,
      regions: [],
    };
  }

  getImages(): string[] {
    return Object.keys(this.project._via_img_metadata);
  }

  getImageMetadata(imageId: string): ViaImageMetadata | undefined {
    return this.project._via_img_metadata[imageId];
  }

  // Region management
  addRegion(imageId: string, region: ViaRegion): void {
    if (this.project._via_img_metadata[imageId]) {
      this.project._via_img_metadata[imageId].regions.push(region);
    }
  }

  updateRegion(imageId: string, regionId: number, region: ViaRegion): void {
    if (this.project._via_img_metadata[imageId]?.regions[regionId]) {
      this.project._via_img_metadata[imageId].regions[regionId] = region;
    }
  }

  // Attribute management
  addRegionAttribute(name: string, attribute: ViaAttribute): void {
    this.project._via_attributes.region[name] = attribute;
  }

  addFileAttribute(name: string, attribute: ViaAttribute): void {
    this.project._via_attributes.file[name] = attribute;
  }

  getRegionAttributes(): Record<string, ViaAttribute> {
    return this.project._via_attributes.region;
  }

  getFileAttributes(): Record<string, ViaAttribute> {
    return this.project._via_attributes.file;
  }
}
