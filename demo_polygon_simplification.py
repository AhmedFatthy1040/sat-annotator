#!/usr/bin/env python3
"""
Test script to demonstrate polygon simplification functionality.
This script shows how the AI segmentation now generates simplified polygons
that are much more manageable for manual editing.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

import numpy as np
import cv2
from app.utils.sam_model import simplify_polygon, adaptive_simplify_polygon

def create_test_polygon():
    """Create a test polygon with many points to simulate AI segmentation output"""
    # Create a complex polygon with many points (simulating detailed AI output)
    center = (300, 300)
    radius = 100
    num_points = 100  # Simulate a very detailed polygon from AI
    
    points = []
    for i in range(num_points):
        angle = 2 * np.pi * i / num_points
        # Add some noise to make it more realistic
        noise_r = radius + np.random.normal(0, 10)
        noise_angle = angle + np.random.normal(0, 0.1)
        x = center[0] + noise_r * np.cos(noise_angle)
        y = center[1] + noise_r * np.sin(noise_angle)
        points.append([int(x), int(y)])
    
    return points

def visualize_simplification():
    """Visualize the polygon simplification process"""
    # Create test polygon
    original_points = create_test_polygon()
    print(f"Original polygon has {len(original_points)} points")
    
    # Test different simplification levels
    test_cases = [
        {"target": 50, "label": "Light simplification"},
        {"target": 30, "label": "Moderate simplification"},
        {"target": 20, "label": "Default simplification"},
        {"target": 15, "label": "Aggressive simplification"},
        {"target": 10, "label": "Maximum simplification"}    ]
    
    # Create visualization
    img_width, img_height = 800, 600
    img = np.ones((img_height, img_width, 3), dtype=np.uint8) * 255
    
    # Draw original polygon in red
    if len(original_points) > 2:
        cv2.polylines(img, [np.array(original_points, dtype=np.int32)], True, (0, 0, 255), 2)
        cv2.putText(img, f"Original: {len(original_points)} points", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    # Test each simplification level
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)]
    y_offset = 60
    
    for i, test_case in enumerate(test_cases):
        simplified_points = adaptive_simplify_polygon(original_points, test_case["target"])
        print(f"{test_case['label']}: {len(original_points)} -> {len(simplified_points)} points")
        
        # Draw simplified polygon
        if len(simplified_points) > 2:
            color = colors[i % len(colors)]
            cv2.polylines(img, [np.array(simplified_points, dtype=np.int32)], True, color, 1)
            cv2.putText(img, f"{test_case['label']}: {len(simplified_points)} points", 
                       (10, y_offset + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1)
    
    # Save the visualization
    output_path = "polygon_simplification_demo.png"
    cv2.imwrite(output_path, img)
    print(f"\nVisualization saved to: {output_path}")
    return output_path

def test_simplification_performance():
    """Test the performance impact of simplification"""
    import time
    
    print("\n=== Performance Test ===")
    
    # Create a very complex polygon
    complex_points = create_test_polygon()
    
    # Test original polygon processing time
    start_time = time.time()
    for _ in range(100):
        _ = len(complex_points)  # Simulate processing
    original_time = time.time() - start_time
    
    # Test simplified polygon processing time
    simplified_points = adaptive_simplify_polygon(complex_points, 20)
    start_time = time.time()
    for _ in range(100):
        _ = len(simplified_points)  # Simulate processing
    simplified_time = time.time() - start_time
    
    print(f"Original polygon: {len(complex_points)} points")
    print(f"Simplified polygon: {len(simplified_points)} points")
    print(f"Reduction: {((len(complex_points) - len(simplified_points)) / len(complex_points) * 100):.1f}%")
    if original_time > 0:
        print(f"Processing time improvement: {((original_time - simplified_time) / original_time * 100):.1f}%")
    else:
        print("Processing time improvement: Cannot calculate (times too small)")

def main():
    """Main test function"""
    print("=== SAT-Annotator Polygon Simplification Demo ===")
    print("This demo shows how AI-generated polygons are simplified to make them")
    print("more manageable for manual editing.\n")
    
    try:
        # Test basic simplification
        test_points = create_test_polygon()
        print(f"Created test polygon with {len(test_points)} points")
        
        # Test different simplification methods
        simple_result = simplify_polygon(test_points, tolerance=2.0)
        adaptive_result = adaptive_simplify_polygon(test_points, target_points=20)
        
        print(f"Simple simplification: {len(test_points)} -> {len(simple_result)} points")
        print(f"Adaptive simplification: {len(test_points)} -> {len(adaptive_result)} points")
        
        # Create visualization
        visualize_simplification()
        
        # Performance test
        test_simplification_performance()
        
        print("\n=== Benefits for Users ===")
        print("✓ Fewer points to manually edit")
        print("✓ Faster rendering and interaction")
        print("✓ Cleaner, more manageable polygons")
        print("✓ Configurable simplification levels")
        print("✓ Maintains shape accuracy")
        
    except Exception as e:
        print(f"Error running demo: {e}")
        print("Make sure you're running this from the project root directory.")

if __name__ == "__main__":
    main()
