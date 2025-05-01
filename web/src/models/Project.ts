export interface ViaProject {
  _via_settings: {
    ui: {
      annotation_editor_height: number;
      annotation_editor_fontsize: number;
      leftsidebar_width: number;
      image_grid: {
        img_height: number;
        img_width: number;
      };
    };
    core: {
      default_filepath: string;
    };
  };
  _via_img_metadata: {
    [imageId: string]: ViaImageMetadata;
  };
  _via_attributes: {
    region: {
      [attributeName: string]: ViaAttribute;
    };
    file: {
      [attributeName: string]: ViaAttribute;
    };
  };
}

export interface ViaImageMetadata {
  filename: string;
  size: number;
  regions: ViaRegion[];
  file_attributes: Record<string, string>;
}

export interface ViaRegion {
  shape_attributes: {
    name: string; // "rect", "polygon", etc.
    all_points_x?: number[];
    all_points_y?: number[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
    rx?: number;
    ry?: number;
  };
  region_attributes: Record<string, string>;
}

export interface ViaAttribute {
  type: string; // "text", "checkbox", "dropdown", "radio"
  description: string;
  options?: string[]; // For dropdown/radio
  default_value?: string;
}
