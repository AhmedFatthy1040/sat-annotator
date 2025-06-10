// Utility functions for the SAT Annotator

class Utils {
    // Generate unique ID
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Format date
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Get mouse position relative to element
    static getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    // Get touch position relative to element
    static getTouchPos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.touches[0].clientX - rect.left,
            y: evt.touches[0].clientY - rect.top
        };
    }    // Convert canvas coordinates to image coordinates
    static canvasToImageCoords(canvasX, canvasY, imageWidth, imageHeight, canvasWidth, canvasHeight, scale, offsetX, offsetY) {
        // Validate inputs to prevent infinite loops
        if (!isFinite(canvasX) || !isFinite(canvasY) || !isFinite(scale) || !isFinite(offsetX) || !isFinite(offsetY) || scale <= 0) {
            console.warn('Invalid coordinates in canvasToImageCoords:', { canvasX, canvasY, scale, offsetX, offsetY });
            return { x: 0, y: 0 };
        }
        
        // Convert canvas coordinates to normalized image coordinates (0-1)
        // 1. Subtract the image offset within the canvas
        // 2. Scale down by the displayed image size to get normalized coordinates
        const x = (canvasX - offsetX) / (imageWidth * scale);
        const y = (canvasY - offsetY) / (imageHeight * scale);
        
        // Clamp to 0-1 range to ensure valid normalized coordinates
        return {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y))
        };
    }// Convert image coordinates to canvas coordinates
    static imageToCanvasCoords(imageX, imageY, imageWidth, imageHeight, scale, offsetX, offsetY) {
        // Validate inputs to prevent infinite loops
        if (!isFinite(imageX) || !isFinite(imageY) || !isFinite(scale) || !isFinite(offsetX) || !isFinite(offsetY) || scale <= 0) {
            console.warn('Invalid coordinates in imageToCanvasCoords:', { imageX, imageY, scale, offsetX, offsetY });
            return { x: 0, y: 0 };
        }
        
        // Convert normalized coordinates (0-1) to canvas coordinates
        // imageX and imageY are already normalized (0-1), so we need to:
        // 1. Scale them by the displayed image size
        // 2. Add the image offset within the canvas
        const x = (imageX * imageWidth * scale) + offsetX;
        const y = (imageY * imageHeight * scale) + offsetY;
        
        // Debug first few coordinate transformations
        if (Math.random() < 0.01) { // Log 1% of transformations to avoid spam
            console.log('Coordinate transform:', {
                input: { imageX, imageY },
                imageSize: { imageWidth, imageHeight },
                transform: { scale, offsetX, offsetY },
                output: { x, y }
            });
        }
        
        return { x, y };
    }

    // Calculate distance between two points
    static distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    // Check if point is inside polygon
    static pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Deep clone object
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Polygon simplification using Douglas-Peucker algorithm
    static simplifyPolygon(points, tolerance = 0.01) {
        if (points.length <= 2) return points;
        
        // Convert array format [[x,y]] to object format [{x,y}] if needed
        const convertedPoints = points.map(point => {
            if (Array.isArray(point)) {
                return { x: point[0], y: point[1] };
            }
            return point;
        });
        
        const simplified = this.douglasPeucker(convertedPoints, tolerance);
        
        // Convert back to original format
        return simplified.map(point => {
            if (Array.isArray(points[0])) {
                return [point.x, point.y];
            }
            return point;
        });
    }

    static douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;
        
        // Find the point with the maximum distance from the line segment
        let dmax = 0;
        let index = 0;
        const end = points.length - 1;
        
        for (let i = 1; i < end; i++) {
            const d = this.perpendicularDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }
        
        // If max distance is greater than tolerance, recursively simplify
        if (dmax > tolerance) {
            // Recursive call
            const recResults1 = this.douglasPeucker(points.slice(0, index + 1), tolerance);
            const recResults2 = this.douglasPeucker(points.slice(index), tolerance);
            
            // Build the result list
            return recResults1.slice(0, -1).concat(recResults2);
        } else {
            return [points[0], points[end]];
        }
    }

    static perpendicularDistance(point, lineStart, lineEnd) {
        const A = lineEnd.x - lineStart.x;
        const B = lineEnd.y - lineStart.y;
        const C = lineStart.x - point.x;
        const D = lineStart.y - point.y;
        
        const dot = A * C + B * D;
        const lenSq = A * A + B * B;
        
        if (lenSq === 0) {
            // Line start and end are the same point
            return Math.sqrt(C * C + D * D);
        }
        
        const param = -dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * A;
            yy = lineStart.y + param * B;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate polygon area (for quality assessment)
    static polygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const p1 = Array.isArray(points[i]) ? { x: points[i][0], y: points[i][1] } : points[i];
            const p2 = Array.isArray(points[j]) ? { x: points[j][0], y: points[j][1] } : points[j];
            area += p1.x * p2.y - p2.x * p1.y;
        }
        
        return Math.abs(area) / 2;
    }

    // Adaptive simplification that preserves area
    static adaptiveSimplifyPolygon(points, maxPoints = 20, minTolerance = 0.001, maxTolerance = 0.05) {
        if (points.length <= maxPoints) return points;
        
        const originalArea = this.polygonArea(points);
        let tolerance = minTolerance;
        let simplified = points;
        
        // Binary search for optimal tolerance
        let low = minTolerance;
        let high = maxTolerance;
        
        while (high - low > 0.001 && simplified.length > maxPoints) {
            tolerance = (low + high) / 2;
            simplified = this.simplifyPolygon(points, tolerance);
            
            if (simplified.length > maxPoints) {
                low = tolerance;
            } else {
                high = tolerance;
            }
        }
        
        // Ensure we don't lose too much area (quality check)
        const simplifiedArea = this.polygonArea(simplified);
        const areaRatio = simplifiedArea / originalArea;
        
        // If we lost too much area, use a more conservative approach
        if (areaRatio < 0.8) {
            // Fall back to uniform point sampling
            return this.uniformSamplePolygon(points, maxPoints);
        }
        
        return simplified;
    }

    // Uniform sampling as fallback
    static uniformSamplePolygon(points, targetPoints) {
        if (points.length <= targetPoints) return points;
        
        const step = points.length / targetPoints;
        const sampled = [];
        
        for (let i = 0; i < targetPoints; i++) {
            const index = Math.floor(i * step);
            sampled.push(points[index]);
        }
        
        return sampled;
    }

    // Validate image file
    static isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/tif'];
        return validTypes.includes(file.type) || 
               file.name.toLowerCase().endsWith('.tiff') || 
               file.name.toLowerCase().endsWith('.tif') ||
               file.name.toLowerCase().endsWith('.geotiff');
    }

    // Download file
    static downloadFile(data, filename, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }    // Show loading
    static showLoading(message = 'Processing...') {
        console.log('Utils.showLoading called with message:', message);
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (!overlay) {
            console.error('Loading overlay element not found!');
            return;
        }
        if (!text) {
            console.error('Loading text element not found!');
            return;
        }
        
        text.textContent = message;
        overlay.style.display = 'flex';
        overlay.hidden = false;
        console.log('Loading overlay shown successfully');
    }    // Hide loading
    static hideLoading() {
        console.log('Utils.hideLoading called');
        const overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            console.error('Loading overlay element not found when trying to hide!');
            return;
        }
        
        try {
            // Force hide with multiple methods
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden';
            overlay.style.opacity = '0';
            overlay.hidden = true;
            overlay.classList.add('hidden');
            
            console.log('Loading overlay hidden successfully');
        } catch (error) {
            console.error('Error hiding loading overlay:', error);
        }
    }

    // Show toast notification
    static showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Linear interpolation
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // Get file extension
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    // Create element with attributes
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    // Wait for condition
    static async waitFor(condition, timeout = 5000, interval = 100) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, interval);
                }
            };
              check();
        });
    }

    // Show a temporary notification message
    static showNotification(message, duration = 3000) {
        // Create or reuse notification element
        let notification = document.getElementById('statusNotification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'statusNotification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.zIndex = '1000';
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
            document.body.appendChild(notification);
        }
        
        // Clear any existing timeout
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
        
        // Update message and display notification
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Hide after duration
        notification.timeoutId = setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }    // Show progress bar
    static showProgressBar(percent, text = '') {
        const container = document.getElementById('progressBarContainer');
        const bar = document.getElementById('progressBar');
        const label = document.getElementById('progressBarText');
        
        if (container && bar) {
            container.classList.add('show');
            bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
            if (label) label.textContent = text;
            console.log(`Progress bar shown: ${percent}% - ${text}`);
        }
    }
    
    // Hide progress bar
    static hideProgressBar() {
        const container = document.getElementById('progressBarContainer');
        if (container) {
            container.classList.remove('show');
            console.log('Progress bar hidden');
        }
    }
}

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.Utils = Utils;
