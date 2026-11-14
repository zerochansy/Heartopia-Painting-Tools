/**
 * Main Application Logic
 * Handles step navigation, size selection, and image upload
 */

const app = {
    // Grid dimensions for each ratio and precision level
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

    // Current state
    state: {
        currentStep: 1,
        selectedRatio: "16:9",
        selectedLevel: 0,
        uploadedImage: null,
        pixelArt: null,
        colors: {},
        currentColorGroup: 1,
        currentColor: "#051616",
    },

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initializeColorLoader();
        this.updateGridDisplay();
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Size selection
        document.querySelectorAll(".size-item").forEach((item) => {
            item.addEventListener("click", () => this.selectSize(item));
        });

        // Level selection
        document.querySelectorAll(".level-item").forEach((item) => {
            item.addEventListener("click", () => this.selectLevel(item));
        });

        // Upload area
        const uploadArea = document.getElementById("upload-area");
        const imageInput = document.getElementById("image-input");

        uploadArea.addEventListener("click", () => imageInput.click());
        uploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = "#997C7B";
            uploadArea.style.backgroundColor = "#FFF6EA";
        });
        uploadArea.addEventListener("dragleave", () => {
            uploadArea.style.borderColor = "#FFE4BA";
            uploadArea.style.backgroundColor = "transparent";
        });
        uploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = "#FFE4BA";
            uploadArea.style.backgroundColor = "transparent";
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        imageInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        document.getElementById("change-image-btn").addEventListener("click", () => {
            imageInput.click();
        });
        document.getElementById("remove-image-btn").addEventListener("click", () => {
            this.removeUploadedImage();
        });

        // Info button
        document.getElementById("info-btn").addEventListener("click", () => {
            document.getElementById("info-popup").classList.remove("hidden");
        });

        document.querySelector(".btn-close").addEventListener("click", () => {
            document.getElementById("info-popup").classList.add("hidden");
        });

        document.getElementById("info-popup").addEventListener("click", (e) => {
            if (e.target.id === "info-popup") {
                document.getElementById("info-popup").classList.add("hidden");
            }
        });

        // Home button: reload the page to fully reset the application
        document.getElementById("btn-home").addEventListener("click", () => {
            window.location.reload();
        });

        // WeChat QR click -> show popup with QR image
        const wechatEl = document.getElementById("wechat-qr");
        if (wechatEl) {
            wechatEl.style.cursor = "pointer";
            wechatEl.addEventListener("click", () => this.showWeChatPopup());
        }
    },

    /**
     * Initialize color loader
     */
    async initializeColorLoader() {
        try {
            const colorData = await colorLoader.initialize();
            if (!colorData) {
                return;
            }

            this.state.colors = colorData;
            console.log("Colors loaded:", colorData);

            // Setup color panel after colors are loaded
            if (window.tools) {
                tools.setupColorPanel();
            }
        } catch (error) {
            console.error("Error loading colors:", error);
        }
    },

    /**
     * Select size/ratio
     */
    selectSize(item) {
        // Remove previous selection
        document.querySelectorAll(".size-item").forEach((s) => {
            s.setAttribute("data-selected", "false");
        });

        // Set new selection
        item.setAttribute("data-selected", "true");
        this.state.selectedRatio = item.getAttribute("data-ratio");

        // Update grid display
        this.updateGridDisplay();
    },

    /**
     * Select precision level
     */
    selectLevel(item) {
        // Remove previous selection
        document.querySelectorAll(".level-item").forEach((l) => {
            l.setAttribute("data-selected", "false");
        });

        // Set new selection
        item.setAttribute("data-selected", "true");
        this.state.selectedLevel = parseInt(item.getAttribute("data-level"));

        // Update grid display
        this.updateGridDisplay();
    },

    /**
     * Update grid display
     */
    updateGridDisplay() {
        const dims = this.gridDimensions[this.state.selectedRatio][this.state.selectedLevel];
        const gridDisplay = document.getElementById("grid-display");
        gridDisplay.textContent = `${dims[0]} x ${dims[1]}`;
    },

    /**
     * Handle image upload
     */
    handleImageUpload(file) {
        // Validate file
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Auto-crop the center portion to the selected aspect and grid size
            this.autoCropCenter(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    /**
     * Show crop modal to allow user to crop uploaded image to selected aspect ratio
     */
    autoCropCenter(imageData) {
        const dims = this.gridDimensions[this.state.selectedRatio][this.state.selectedLevel];
        const gridW = dims[0];
        const gridH = dims[1];

        const img = new Image();
        img.onload = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const desiredAspect = gridW / gridH;

            let sx, sy, sw, sh;
            const imgAspect = nw / nh;
            if (imgAspect > desiredAspect) {
                // image is wider: use full height, crop sides
                sh = nh;
                sw = Math.round(sh * desiredAspect);
                sx = Math.round((nw - sw) / 2);
                sy = 0;
            } else {
                // image is taller: use full width, crop top/bottom
                sw = nw;
                sh = Math.round(sw / desiredAspect);
                sx = 0;
                sy = Math.round((nh - sh) / 2);
            }

            // Create high-resolution cropped image (preserve original quality)
            const highCanvas = document.createElement("canvas");
            highCanvas.width = sw;
            highCanvas.height = sh;
            const hctx = highCanvas.getContext("2d");
            hctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            const highResData = highCanvas.toDataURL("image/png");

            // Create grid-sized image for processing (low-res)
            const gridCanvas = document.createElement("canvas");
            gridCanvas.width = gridW;
            gridCanvas.height = gridH;
            const gctx = gridCanvas.getContext("2d");
            gctx.drawImage(img, sx, sy, sw, sh, 0, 0, gridW, gridH);
            const gridData = gridCanvas.toDataURL("image/png");

            // Use the low-res image for processing, but show the high-res preview
            this.state.uploadedImage = gridData;
            this.state.uploadedImagePreview = highResData;
            this.displayImagePreview(highResData);
            this.enableNextButton();
        };
        img.src = imageData;
    },

    /**
     * Display image preview
     */
    displayImagePreview(imageData) {
        const uploadArea = document.getElementById("upload-area");
        const imagePreview = document.getElementById("image-preview");
        const previewImage = document.getElementById("image-preview-img");

        uploadArea.style.display = "none";
        imagePreview.classList.remove("hidden");
        previewImage.src = imageData;
        // Clear file input so selecting the same file again will trigger change
        const imgInput = document.getElementById("image-input");
        if (imgInput) imgInput.value = "";
    },

    /**
     * Remove the selected image and return to the upload prompt
     */
    removeUploadedImage() {
        this.state.uploadedImage = null;
        this.state.uploadedImagePreview = null;

        const uploadArea = document.getElementById("upload-area");
        const imagePreview = document.getElementById("image-preview");
        const previewImage = document.getElementById("image-preview-img");
        const nextBtn = document.getElementById("btn-step2-next");
        const imageInput = document.getElementById("image-input");

        previewImage.removeAttribute("src");
        imagePreview.classList.add("hidden");
        uploadArea.style.display = "flex";
        nextBtn.disabled = true;
        imageInput.value = "";
    },

    /**
     * Enable next button
     */
    enableNextButton() {
        const nextBtn = document.getElementById("btn-step2-next");
        nextBtn.disabled = false;
    },

    /**
     * Go to specific step
     */
    goToStep(step) {
        // Hide all steps
        document.querySelectorAll(".step").forEach((s) => {
            s.classList.add("hidden");
        });

        // Show specific step
        const stepElement = document.getElementById(`step-${step}`);
        if (stepElement) {
            stepElement.classList.remove("hidden");
        }

        this.state.currentStep = step;
    },

    /**
     * Next step
     */
    nextStep() {
        switch (this.state.currentStep) {
            case 1:
                this.goToStep(2);
                break;
            case 2:
                if (this.state.uploadedImage) {
                    this.goToStep(3);
                    this.processImage();
                }
                break;
            case 3:
                // Processing is done, move to painting
                setTimeout(() => {
                    this.goToStep(4);
                    this.initializePainting();
                }, 1500);
                break;
        }
    },

    /**
     * Process image (convert to pixel art)
     */
    processImage() {
        // Simulate processing with timeout
        // In real app, this would process the image
        setTimeout(() => {
            this.nextStep();
        }, 2000);
    },

    /**
     * Initialize painting interface
     */
    initializePainting() {
        // Initialize canvas
        if (window.canvas) {
            window.canvas.initialize(
                this.state.selectedRatio,
                this.state.selectedLevel,
                this.state.uploadedImage,
            );
        }

        // Initialize color panel
        if (window.colorPanel) {
            window.colorPanel.initialize(this.state.colors);
        }

        // Initialize tools
        if (window.tools) {
            window.tools.initialize();
        }
    },

    /**
     * Reset application state
     */
    resetState() {
        this.state = {
            currentStep: 1,
            selectedRatio: "16:9",
            selectedLevel: 0,
            uploadedImage: null,
            pixelArt: null,
            colors: this.state.colors,
            currentColorGroup: 1,
            currentColor: "#051616",
        };

        // Reset UI
        document.getElementById("upload-area").style.display = "flex";
        document.getElementById("image-preview").classList.add("hidden");
        document.getElementById("btn-step2-next").disabled = true;

        // Reset size selection
        document.querySelectorAll(".size-item").forEach((item) => {
            item.setAttribute(
                "data-selected",
                item.getAttribute("data-ratio") === "16:9" ? "true" : "false",
            );
        });

        // Reset level selection
        document.querySelectorAll(".level-item").forEach((item) => {
            item.setAttribute(
                "data-selected",
                item.getAttribute("data-level") === "0" ? "true" : "false",
            );
        });

        this.updateGridDisplay();
        // Clear file input to allow re-uploading same file
        const imgInput = document.getElementById("image-input");
        if (imgInput) imgInput.value = "";
    },

    /**
     * Show a simple modal popup with WeChat QR image
     */
    showWeChatPopup() {
        // Remove existing if present
        const existing = document.getElementById("wechat-popup");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "wechat-popup";
        Object.assign(modal.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
        });

        const panel = document.createElement("div");
        Object.assign(panel.style, {
            position: "relative",
            background: "#fff",
            padding: "12px",
            borderRadius: "8px",
            maxWidth: "90%",
            maxHeight: "90%",
            boxSizing: "border-box",
        });

        const img = document.createElement("img");
        img.src = "assets/images/wechat_pay.jpg";
        img.alt = "WeChat Pay QR";
        Object.assign(img.style, {
            maxWidth: "400px",
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: "4px",
        });

        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Close";
        btn.className = "btn-close";

        const closeImg = document.createElement("img");
        closeImg.src = "assets/images/icon_btn_close.svg";
        closeImg.alt = "Close";

        btn.appendChild(closeImg);
        btn.addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        panel.appendChild(img);
        panel.appendChild(btn);
        modal.appendChild(panel);
        document.body.appendChild(modal);
    },
};

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // Wait for color loader to be ready
    if (typeof colorLoader !== "undefined") {
        app.init();
    } else {
        console.error("Color loader not loaded");
    }
});

const gameIdElement = document.querySelector("#game-id");
gameIdElement.addEventListener("click", function () {
    const text = this.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = this.textContent;
        this.textContent = $(".copied_text").html();
        setTimeout(() => {
            this.textContent = originalText;
        }, 1500);
    });
});
gameIdElement.style.cursor = "pointer";
gameIdElement.title = "點擊複製遊戲ID";

$("div").click(function (e) {});
