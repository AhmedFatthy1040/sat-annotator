import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor
import cv2
from pathlib import Path
import os
from typing import Dict, Tuple, List, Optional
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def simplify_polygon(points, tolerance=2.0):
    """
    Simplify a polygon using the Douglas-Peucker algorithm to reduce the number of points.
    
    Args:
        points: List of [x, y] coordinates
        tolerance: Maximum distance threshold for point removal (higher = more aggressive simplification)
    
    Returns:
        Simplified polygon with fewer points
    """
    if len(points) < 3:
        return points
    
    # Convert to numpy array for easier manipulation
    points_array = np.array(points, dtype=np.float32)
    
    # Use OpenCV's approxPolyDP function which implements Douglas-Peucker algorithm
    # Calculate epsilon as a percentage of the contour perimeter
    perimeter = cv2.arcLength(points_array, True)
    epsilon = tolerance / 100.0 * perimeter if perimeter > 0 else tolerance
    
    # Simplify the contour
    simplified = cv2.approxPolyDP(points_array, epsilon, True)
    
    # Convert back to list format
    simplified_points = simplified.squeeze().tolist()
    
    # Ensure we have at least 3 points for a valid polygon
    if len(simplified_points) < 3:
        # If simplification reduced to less than 3 points, use original
        return points
    
    # Make sure points are in the correct format
    if not isinstance(simplified_points[0], list):
        simplified_points = [simplified_points]
    
    logger.debug(f"Polygon simplified from {len(points)} to {len(simplified_points)} points")
    return simplified_points


def adaptive_simplify_polygon(points, target_points=20, min_tolerance=0.5, max_tolerance=5.0):
    """
    Adaptively simplify a polygon to achieve approximately the target number of points.
    
    Args:
        points: List of [x, y] coordinates
        target_points: Desired number of points (default: 20)
        min_tolerance: Minimum tolerance for simplification
        max_tolerance: Maximum tolerance for simplification
    
    Returns:
        Simplified polygon with approximately target_points
    """
    if len(points) <= target_points:
        return points
    
    # Binary search to find the right tolerance
    low, high = min_tolerance, max_tolerance
    best_result = points
    
    for _ in range(10):  # Max 10 iterations
        mid = (low + high) / 2
        simplified = simplify_polygon(points, mid)
        
        if len(simplified) == target_points:
            return simplified
        elif len(simplified) > target_points:
            low = mid
            best_result = simplified
        else:
            high = mid
    
    return best_result


class SAMSegmenter:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Check if running in Docker or locally
        in_docker = os.path.exists('/.dockerenv')
        base_path = Path("/app") if in_docker else Path(".")
        
        self.sam_checkpoint = str(base_path / "models/sam_vit_h_4b8939.pth")
        self.model_type = "vit_h"
        
        if not Path(self.sam_checkpoint).exists():
            raise FileNotFoundError(f"SAM checkpoint not found at {self.sam_checkpoint}. Please download it from https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth")
        
        self.sam = sam_model_registry[self.model_type](checkpoint=self.sam_checkpoint)
        self.sam.to(device=self.device)
        self.predictor = SamPredictor(self.sam)
        
        # Cache for storing image embeddings and masks
        self.cache: Dict[str, Dict] = {}
        self.current_image_path = None

    def set_image(self, image_path):
        """Set the image for segmentation and cache its embedding"""
        # Check if we've already processed this image
        if image_path in self.cache:
            self.current_image_path = image_path
            return self.cache[image_path]['image_size']
        
        # Load and process the image with better format support
        image = self._load_image_safely(image_path)
        if image is None:
            raise ValueError(f"Could not load image from {image_path}")
        
        self.predictor.set_image(image)
        
        # Store in cache
        self.cache[image_path] = {
            'image_size': image.shape[:2],  # (height, width)
            'masks': {},  # Will store generated masks
            'embeddings': None  # This is implicitly stored in the predictor
        }
        self.current_image_path = image_path
        
        return image.shape[:2]  # Return height, width
    
    def _load_image_safely(self, image_path: str) -> Optional[np.ndarray]:
        """Load image with fallback methods for different formats"""
        image_path = Path(image_path)
        
        # Check if it's a processed TIFF file
        if image_path.name.startswith("processed_") and not image_path.exists():
            # Look for processed version in processed directory
            processed_dir = image_path.parent / "processed"
            if processed_dir.exists():
                processed_files = list(processed_dir.glob(f"processed_{image_path.stem}.*"))
                if processed_files:
                    image_path = processed_files[0]
                    logger.info(f"Using processed TIFF version: {image_path}")
        
        # Method 1: Try OpenCV first (fastest for standard formats)
        try:
            image = cv2.imread(str(image_path))
            if image is not None:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                logger.info(f"Loaded image with OpenCV: {image.shape}")
                return image
        except Exception as e:
            logger.warning(f"OpenCV failed to load {image_path}: {e}")
        
        # Method 2: Try PIL for better format support
        try:
            with Image.open(image_path) as pil_img:
                # Convert to RGB if needed
                if pil_img.mode != 'RGB':
                    if pil_img.mode == 'RGBA':
                        # Handle transparency by compositing with white background
                        background = Image.new('RGB', pil_img.size, (255, 255, 255))
                        background.paste(pil_img, mask=pil_img.split()[3])
                        pil_img = background
                    else:
                        pil_img = pil_img.convert('RGB')
                
                # Convert to numpy array
                image = np.array(pil_img)
                logger.info(f"Loaded image with PIL: {image.shape}")
                return image
        except Exception as e:
            logger.warning(f"PIL failed to load {image_path}: {e}")
        
        # Method 3: Check for processed versions if original TIFF fails
        if image_path.suffix.lower() in ['.tif', '.tiff']:
            processed_dir = image_path.parent / "processed"
            if processed_dir.exists():
                # Look for processed PNG version
                processed_png = processed_dir / f"processed_{image_path.stem}.png"
                if processed_png.exists():
                    try:
                        image = cv2.imread(str(processed_png))
                        if image is not None:
                            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                            logger.info(f"Loaded processed TIFF version: {image.shape}")
                            return image
                    except Exception as e:
                        logger.warning(f"Failed to load processed version {processed_png}: {e}")
        
        logger.error(f"All methods failed to load image: {image_path}")
        return None

    def predict_from_point(self, point_coords, point_labels=None):
        """Generate mask from a point prompt, using cache if available"""
        if self.current_image_path is None:
            raise ValueError("No image set for segmentation. Call set_image() first.")
        
        # Convert to tuple for cache key
        point_key = tuple(point_coords)
        
        # Check if we already have a mask for this point
        if point_key in self.cache[self.current_image_path]['masks']:
            return self.cache[self.current_image_path]['masks'][point_key]
        
        # Generate new mask
        point_coords_array = np.array([point_coords])
        if point_labels is None:
            point_labels = np.array([1])  # 1 indicates a foreground point
        
        masks, scores, _ = self.predictor.predict(
            point_coords=point_coords_array,
            point_labels=point_labels,
            multimask_output=True
        )
        
        best_mask_idx = np.argmax(scores)
        mask = masks[best_mask_idx].astype(np.uint8) * 255  # Convert to 8-bit mask
        
        # Cache the result
        self.cache[self.current_image_path]['masks'][point_key] = mask
        
        return mask

    def mask_to_polygon(self, mask, simplify=True, target_points=20):
        """
        Convert binary mask to polygon coordinates with optional simplification.
        
        Args:
            mask: Binary mask from segmentation
            simplify: Whether to simplify the polygon (default: True)
            target_points: Target number of points for simplified polygon (default: 20)
        
        Returns:
            Polygon coordinates as list of [x, y] points
        """
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        
        largest_contour = max(contours, key=cv2.contourArea)
        polygon = largest_contour.squeeze().tolist()
        
        if not isinstance(polygon[0], list):
            polygon = [polygon]
        
        if simplify and len(polygon) > target_points:
            # Use adaptive simplification to get manageable number of points
            simplified_polygon = adaptive_simplify_polygon(polygon, target_points)
            logger.info(f"Polygon simplified from {len(polygon)} to {len(simplified_polygon)} points")
            return simplified_polygon
        
        return polygon

    def clear_cache(self, image_path=None):
        """Clear the cache for a specific image or all images"""
        if image_path:
            if image_path in self.cache:
                del self.cache[image_path]
                if self.current_image_path == image_path:
                    self.current_image_path = None
        else:
            self.cache = {}
            self.current_image_path = None
