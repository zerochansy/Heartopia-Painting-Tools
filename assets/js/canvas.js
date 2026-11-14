/**
 * Canvas and Pixel Art Processing
 * Handles canvas drawing, grid, zoom, and pan
 */

const canvas = {
    // Canvas properties
    properties: {
        element: null,
        context: null,
        ratio: "16:9",
        level: 0,
        gridWidth: 30,
        gridHeight: 18,
        pixelSize: 20,
        offsetX: 0,
        offsetY: 0,
        zoom: 1.0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        highlightGridPos: null,
        canvasWidth: 1100,
        canvasHeight: 630,
    },

    // Color grid data
    pixelGrid: [],
    gridDimensions: {
        "16:9": [
            [30, 18],
            [50, 28],
            [100, 56],
            [150, 84],
        ],
        "4:3": [
            [30, 24],
            [50, 38],
            [100, 76],
            [150, 114],
        ],
        "1:1": [
            [30, 30],
            [50, 50],
            [100, 100],
            [150, 150],
        ],
        "3:4": [
            [24, 30],
            [38, 50],
            [76, 100],
            [114, 150],
        ],
        "9:16": [
            [18, 30],
            [28, 50],
            [56, 100],
            [84, 150],
        ],
    },

    /**
     * Initialize canvas
     */
    initialize(ratio, level, imageData) {
        this.properties.element = document.getElementById("paint-canvas");
        this.properties.context = this.properties.element.getContext("2d", {
            willReadFrequently: true,
        });
        this.properties.ratio = ratio;
        this.properties.level = level;

        // Set grid dimensions
        const dims = this.gridDimensions[ratio][level];
        this.properties.gridWidth = dims[0];
        this.properties.gridHeight = dims[1];

        // Calculate pixel size to fit canvas
        const canvasWidth = 1100;
        const canvasHeight = 630;
        const pixelWidth = canvasWidth / this.properties.gridWidth;
        const pixelHeight = canvasHeight / this.properties.gridHeight;
        this.properties.pixelSize = Math.min(pixelWidth, pixelHeight);
        this.properties.canvasWidth = canvasWidth;
        this.properties.canvasHeight = canvasHeight;

        // Set canvas size
        this.properties.element.width = canvasWidth;
        this.properties.element.height = canvasHeight;

        // Initialize pixel grid
        this.initializePixelGrid();

        // Center the image on canvas (both horizontal and vertical)
        this.centerImage();

        // Process image
        this.processImage(imageData);

        // Setup event listeners
        this.setupEventListeners();

        // Initial draw
        this.draw();
    },

    /**
     * Center image on canvas
     */
    centerImage() {
        // Get actual canvas dimensions
        const canvasWidth = this.properties.element.width;
        const canvasHeight = this.properties.element.height;

        // Calculate grid size without zoom (zoom is applied in draw with pixelSize multiplication)
        const gridPixelWidth = this.properties.pixelSize * this.properties.gridWidth;
        const gridPixelHeight = this.properties.pixelSize * this.properties.gridHeight;

        // Center without considering zoom - zoom is applied during rendering
        this.properties.offsetX = (canvasWidth - gridPixelWidth) / 2;
        this.properties.offsetY = (canvasHeight - gridPixelHeight) / 2;
    },

    /**
     * Initialize pixel grid with white color
     */
    initializePixelGrid() {
        this.pixelGrid = [];
        for (let y = 0; y < this.properties.gridHeight; y++) {
            this.pixelGrid[y] = [];
            for (let x = 0; x < this.properties.gridWidth; x++) {
                this.pixelGrid[y][x] = "#FFFFFF";
            }
        }
    },

    /**
     * Process uploaded image and create pixel art
     */
    processImage(imageData) {
        const img = new Image();
        img.onload = () => {
            // Create temporary canvas to resize image
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = this.properties.gridWidth;
            tempCanvas.height = this.properties.gridHeight;
            const tempCtx = tempCanvas.getContext("2d");

            // Draw resized image
            tempCtx.drawImage(img, 0, 0, this.properties.gridWidth, this.properties.gridHeight);

            // Get image data
            const imageData = tempCtx.getImageData(
                0,
                0,
                this.properties.gridWidth,
                this.properties.gridHeight,
            );
            const data = imageData.data;

            // Convert to available colors
            const colors = app.state.colors;
            const allColors = this.getAllAvailableColors(colors);

            // Process each pixel
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Find closest available color
                const closestColor = this.findClosestColor(r, g, b, allColors);
                const pixelIndex = i / 4;
                const y = Math.floor(pixelIndex / this.properties.gridWidth);
                const x = pixelIndex % this.properties.gridWidth;

                if (y < this.properties.gridHeight) {
                    this.pixelGrid[y][x] = closestColor;
                }
            }

            this.draw();
        };
        img.src = imageData;
    },

    /**
     * Get all available colors from color groups
     */
    getAllAvailableColors(colorGroups) {
        const allColors = [];
        Object.values(colorGroups).forEach((group) => {
            if (group.colors) {
                allColors.push(...group.colors);
            }
        });
        return allColors;
    },

    /**
     * Find closest color in palette
     */
    findClosestColor(r, g, b, colorPalette) {
        let closestColor = colorPalette[0];
        let minDistance = Infinity;

        colorPalette.forEach((hexColor) => {
            const [pr, pg, pb] = this.hexToRgb(hexColor);
            const distance = Math.sqrt(
                Math.pow(r - pr, 2) + Math.pow(g - pg, 2) + Math.pow(b - pb, 2),
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestColor = hexColor;
            }
        });

        return closestColor;
    },

    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
            : [255, 255, 255];
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const element = this.properties.element;

        // Mouse events
        element.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        element.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        element.addEventListener("mouseup", (e) => this.handleMouseUp(e));
        element.addEventListener("wheel", (e) => this.handleWheel(e));
        element.addEventListener("contextmenu", (e) => e.preventDefault());

        // Touch events (use non-passive so we can preventDefault and control scrolling)
        element.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: false });
        element.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
        element.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: false });

        // Zoom slider
        const zoomSlider = document.getElementById("zoom-slider");
        zoomSlider.addEventListener("input", (e) => {
            const newZoom = parseFloat(e.target.value);
            this.setZoom(newZoom);
            this.draw();
        });
    },

    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        const pos = this.getCanvasCoords(e.clientX, e.clientY);
        const x = pos.x;
        const y = pos.y;

        if (e.button === 0) {
            // Left click - pick color if eyedropper active, otherwise drag
            const gridPos = this.getGridPosition(x, y);
            if (gridPos && window.tools && window.tools.eyedropperActive) {
                this.pickColor(gridPos.x, gridPos.y);
            } else {
                // Start dragging
                this.properties.isDragging = true;
                this.properties.dragStartX = x;
                this.properties.dragStartY = y;
                this.properties.element.style.cursor = "grabbing";
            }
        }
    },

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        const pos = this.getCanvasCoords(e.clientX, e.clientY);
        const x = pos.x;
        const y = pos.y;

        // Update highlight position when using eyedropper
        if (window.tools && window.tools.eyedropperActive) {
            const gridPos = this.getGridPosition(x, y);
            this.properties.highlightGridPos = gridPos;
            this.properties.element.style.cursor = "crosshair";
            this.draw();
        } else if (!this.properties.isDragging) {
            // Show grab cursor when not dragging (ready to drag)
            this.properties.element.style.cursor = "grab";
        }

        if (this.properties.isDragging) {
            const dx = x - this.properties.dragStartX;
            const dy = y - this.properties.dragStartY;

            this.properties.offsetX += dx;
            this.properties.offsetY += dy;

            this.properties.dragStartX = x;
            this.properties.dragStartY = y;

            // Ensure panning doesn't move the grid completely out of view
            this.clampOffsets();

            this.draw();
        }
    },

    /**
     * Handle mouse up
     */
    handleMouseUp(e) {
        if (e.button === 0) {
            this.properties.isDragging = false;
            // Reset cursor to grab when not dragging
            if (window.tools && !window.tools.eyedropperActive) {
                this.properties.element.style.cursor = "grab";
            }
        }
    },

    /**
     * Handle wheel zoom
     */
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(1, Math.min(10, this.properties.zoom + delta));

        // Zoom around canvas center (ignore mouse position to keep consistent)
        this.setZoom(newZoom);
        this.draw();
    },

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (!e.touches || e.touches.length === 0) return;

        const touch = e.touches[0];
        const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
        const x = pos.x;
        const y = pos.y;

        if (e.touches.length === 1) {
            // Single touch: if eyedropper is active, pick color; otherwise start dragging (pan)
            const gridPos = this.getGridPosition(x, y);
            if (window.tools && window.tools.eyedropperActive) {
                if (gridPos) {
                    e.preventDefault();
                    this.pickColor(gridPos.x, gridPos.y);
                }
            } else {
                // Start dragging for one-finger pan
                e.preventDefault();
                this.properties.isDragging = true;
                this.properties.dragStartX = x;
                this.properties.dragStartY = y;
                this.properties.element.style.cursor = "grabbing";
            }
        }
    },

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!e.touches || e.touches.length === 0) return;

        if (e.touches.length === 2) {
            // Two finger - zoom (placeholder: prevent default)
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY,
            );
            // Pinch zoom can be implemented here if desired
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
            const x = pos.x;
            const y = pos.y;

            // If eyedropper active, update highlight; otherwise handle panning
            if (window.tools && window.tools.eyedropperActive) {
                const gridPos = this.getGridPosition(x, y);
                this.properties.highlightGridPos = gridPos;
                this.properties.element.style.cursor = "crosshair";
                e.preventDefault();
                this.draw();
                return;
            }

            if (this.properties.isDragging) {
                e.preventDefault();
                const dx = x - this.properties.dragStartX;
                const dy = y - this.properties.dragStartY;

                this.properties.offsetX += dx;
                this.properties.offsetY += dy;

                this.properties.dragStartX = x;
                this.properties.dragStartY = y;

                this.clampOffsets();
                this.draw();
            }
        }
    },

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        // End dragging or eyedropper highlight
        if (this.properties.isDragging) {
            this.properties.isDragging = false;
            if (window.tools && !window.tools.eyedropperActive) {
                this.properties.element.style.cursor = "grab";
            }
        }

        // Clear highlight when touch ends if not in eyedropper mode
        if (!window.tools || !window.tools.eyedropperActive) {
            this.properties.highlightGridPos = null;
            this.draw();
        }
    },

    /**
     * Get grid position from mouse coordinates
     */
    getGridPosition(x, y) {
        const pixelSize = this.properties.pixelSize * this.properties.zoom;
        const gridX = Math.floor((x - this.properties.offsetX) / pixelSize);
        const gridY = Math.floor((y - this.properties.offsetY) / pixelSize);

        if (
            gridX >= 0 &&
            gridX < this.properties.gridWidth &&
            gridY >= 0 &&
            gridY < this.properties.gridHeight
        ) {
            return { x: gridX, y: gridY };
        }
        return null;
    },

    /**
     * Convert client coordinates to canvas coordinate space (accounting for CSS size / internal size)
     */
    getCanvasCoords(clientX, clientY) {
        const rect = this.properties.element.getBoundingClientRect();
        const scaleX = this.properties.element.width / rect.width;
        const scaleY = this.properties.element.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return { x, y };
    },

    /**
     * Set zoom while preserving a point under a client coordinate or the canvas center.
     * If clientX/clientY are omitted, zoom is performed around the canvas center.
     */
    setZoom(newZoom, clientX, clientY) {
        const oldZoom = this.properties.zoom;
        if (newZoom === oldZoom) return;

        const oldPixelSize = this.properties.pixelSize * oldZoom;
        const newPixelSize = this.properties.pixelSize * newZoom;

        // Determine pivot point in canvas internal coords
        let pivotX, pivotY;
        if (typeof clientX === "number" && typeof clientY === "number") {
            const p = this.getCanvasCoords(clientX, clientY);
            pivotX = p.x;
            pivotY = p.y;
        } else {
            pivotX = this.properties.element.width / 2;
            pivotY = this.properties.element.height / 2;
        }

        // Keep the world point under pivot stable: offset' = pivot - (pivot - offset) * (new/old)
        this.properties.offsetX =
            pivotX - (pivotX - this.properties.offsetX) * (newPixelSize / oldPixelSize);
        this.properties.offsetY =
            pivotY - (pivotY - this.properties.offsetY) * (newPixelSize / oldPixelSize);

        this.properties.zoom = newZoom;

        // Update UI controls if present
        const slider = document.getElementById("zoom-slider");
        if (slider) slider.value = newZoom;
        const display = document.getElementById("zoom-display");
        if (display) display.textContent = newZoom.toFixed(1) + "x";

        // Keep offsets in valid range
        this.clampOffsets();
    },

    /**
     * Clamp offsetX / offsetY so the rendered grid remains visible
     */
    clampOffsets() {
        const pixelSize = this.properties.pixelSize * this.properties.zoom;
        const gridPixelWidth = pixelSize * this.properties.gridWidth;
        const gridPixelHeight = pixelSize * this.properties.gridHeight;

        const canvasWidth = this.properties.element.width;
        const canvasHeight = this.properties.element.height;

        // If grid smaller than canvas, center it
        if (gridPixelWidth <= canvasWidth) {
            this.properties.offsetX = (canvasWidth - gridPixelWidth) / 2;
        } else {
            const minX = canvasWidth - gridPixelWidth;
            const maxX = 0;
            if (this.properties.offsetX < minX) this.properties.offsetX = minX;
            if (this.properties.offsetX > maxX) this.properties.offsetX = maxX;
        }

        if (gridPixelHeight <= canvasHeight) {
            this.properties.offsetY = (canvasHeight - gridPixelHeight) / 2;
        } else {
            const minY = canvasHeight - gridPixelHeight;
            const maxY = 0;
            if (this.properties.offsetY < minY) this.properties.offsetY = minY;
            if (this.properties.offsetY > maxY) this.properties.offsetY = maxY;
        }
    },

    /**
     * Pick color from grid
     */
    pickColor(x, y) {
        const color = this.pixelGrid[y][x];
        app.state.currentColor = color;

        // Trigger color selection event
        document.dispatchEvent(
            new CustomEvent("colorPicked", {
                detail: { color: color },
            }),
        );
    },

    /**
     * Draw canvas
     */
    draw() {
        const ctx = this.properties.context;
        const pixelSize = this.properties.pixelSize * this.properties.zoom;

        // Clear canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, this.properties.element.width, this.properties.element.height);

        // Draw grid
        ctx.save();
        ctx.translate(this.properties.offsetX, this.properties.offsetY);

        // Draw pixels
        for (let y = 0; y < this.properties.gridHeight; y++) {
            for (let x = 0; x < this.properties.gridWidth; x++) {
                // Determine fill style; if tutorial active, dim non-current tutorial color
                let pixelColor = this.pixelGrid[y][x] || "#FFFFFF";
                if (
                    window.tools &&
                    window.tools.tutorialActive &&
                    Array.isArray(window.tools.tutorialData) &&
                    window.tools.tutorialData.length > 0
                ) {
                    const curIdx = window.tools.currentTutorialStep || 0;
                    const highlightColor = (window.tools.tutorialData[curIdx] || "").toLowerCase();
                    if (pixelColor.toLowerCase() === highlightColor) {
                        ctx.fillStyle = pixelColor;
                    } else {
                        // dim other colors
                        ctx.fillStyle = "#F3F3F3";
                    }
                } else {
                    ctx.fillStyle = pixelColor;
                }
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

                // Draw thin grid lines if enabled
                if (window.tools && window.tools.gridVisible) {
                    this.drawGridLine(ctx, x, y, pixelSize);
                }
            }
        }

        // Draw thicker 5x5 group borders counting from bottom-left
        if (window.tools && window.tools.gridVisible) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#999999";

            const gridPixelWidth = pixelSize * this.properties.gridWidth;
            const gridPixelHeight = pixelSize * this.properties.gridHeight;

            // Vertical group lines (every 5 columns from left)
            for (let c = 5; c < this.properties.gridWidth; c += 5) {
                const xPos = c * pixelSize;
                ctx.beginPath();
                ctx.moveTo(xPos, 0);
                ctx.lineTo(xPos, gridPixelHeight);
                ctx.stroke();
            }

            // Horizontal group lines (every 5 rows from bottom)
            // compute boundaries: boundaryRow = gridHeight - k*5
            for (let k = 1; ; k++) {
                const boundaryRow = this.properties.gridHeight - k * 5;
                if (boundaryRow <= 0) break;
                const yPos = boundaryRow * pixelSize;
                ctx.beginPath();
                ctx.moveTo(0, yPos);
                ctx.lineTo(gridPixelWidth, yPos);
                ctx.stroke();
            }
        }

        // Draw picker highlight if active
        if (window.tools && window.tools.eyedropperActive && this.properties.highlightGridPos) {
            const pos = this.properties.highlightGridPos;
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 4;
            ctx.strokeRect(pos.x * pixelSize, pos.y * pixelSize, pixelSize, pixelSize);

            // Add black outline for better visibility
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                pos.x * pixelSize - 2,
                pos.y * pixelSize - 2,
                pixelSize + 4,
                pixelSize + 4,
            );

            // Add extra inner border
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 1;
            ctx.strokeRect(
                pos.x * pixelSize + 1,
                pos.y * pixelSize + 1,
                pixelSize - 2,
                pixelSize - 2,
            );
        }

        ctx.restore();
    },

    /**
     * Draw grid lines
     */
    drawGridLine(ctx, x, y, pixelSize) {
        ctx.strokeStyle = "#999999";
        ctx.lineWidth = 1;

        // Regular grid
        ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

        // Thick grid every 5 pixels
        if ((x + 1) % 5 === 0) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo((x + 1) * pixelSize, y * pixelSize);
            ctx.lineTo((x + 1) * pixelSize, (y + 1) * pixelSize);
            ctx.stroke();
        }

        if ((y + 1) % 5 === 0) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x * pixelSize, (y + 1) * pixelSize);
            ctx.lineTo((x + 1) * pixelSize, (y + 1) * pixelSize);
            ctx.stroke();
        }
    },
};

// Make canvas globally available
window.canvas = canvas;
