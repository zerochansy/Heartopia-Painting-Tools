/**
 * Color Loader - Extracts and organizes colors from color.svg
 * Dynamically creates color groups and details
 */

const colorLoader = {
    svgPath: "./assets/color/color.svg",
    colorData: null,

    /**
     * Fetch and parse the SVG file
     */
    async loadSVG() {
        try {
            const response = await fetch(this.svgPath);
            const svgText = await response.text();
            return svgText;
        } catch (error) {
            console.error("Error loading SVG:", error);
            return null;
        }
    },

    /**
     * Extract all fill colors from SVG by ID pattern
     */
    extractColors(svgText) {
        const colors = {};

        // Match elements with id="Color-N-M" pattern (individual colors in groups)
        const colorRegex = /id="Color-(\d+)-(\d+)"[^>]*fill="([^"]+)"/g;
        let match;

        while ((match = colorRegex.exec(svgText)) !== null) {
            const groupNum = match[1];
            const colorNum = match[2];
            const fillColor = match[3];

            if (!colors[groupNum]) {
                colors[groupNum] = [];
            }

            colors[groupNum][colorNum - 1] = fillColor;
        }

        console.log("Extracted group colors structure:", colors);
        return colors;
    },

    /**
     * Extract group colors from SVG (rect/other elements with id="Color-N")
     */
    extractGroupColors(svgText) {
        const groupColors = {};

        // Match rect/circle/etc elements with id="Color-N" pattern
        const groupRegex = /<(rect|circle|ellipse)[^>]*id="Color-(\d+)"[^>]*fill="([^"]+)"/g;
        let match;

        while ((match = groupRegex.exec(svgText)) !== null) {
            const colorNumber = match[2];
            const fillColor = match[3];
            groupColors[`Color-${colorNumber}`] = fillColor;
        }

        console.log("Extracted group colors:", Object.keys(groupColors).length);
        return groupColors;
    },

    /**
     * Group colors and combine with main colors
     */
    groupColors(colorsByGroup, groupColors) {
        const organizedGroups = {};

        // Process each group
        Object.keys(colorsByGroup)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach((groupNum) => {
                const groupNumber = parseInt(groupNum);
                const groupKey = `Group ${groupNumber}`;
                const colorsArray = colorsByGroup[groupNum].filter((c) => c !== undefined); // Remove empty slots

                // Get main color from groupColors object
                const mainColor =
                    groupColors[`Color-${groupNumber}`] || colorsArray[0] || "#FFFFFF";

                // Create group entry with mainColor and colors array
                organizedGroups[groupKey] = {
                    mainColor: mainColor,
                    colors: colorsArray,
                };
            });

        return organizedGroups;
    },

    /**
     * Initialize and organize all colors
     */
    async initialize() {
        const svgText = await this.loadSVG();

        if (!svgText) {
            console.error("Failed to load SVG");
            return null;
        }

        const colors = this.extractColors(svgText);
        const groupColors = this.extractGroupColors(svgText);
        const organizedGroups = this.groupColors(colors, groupColors);

        this.colorData = organizedGroups;

        return this.colorData;
    },

    /**
     * Get all color groups
     */
    getColorGroups() {
        return this.colorData || null;
    },

    /**
     * Get a specific group by number
     * Example: getGroup(1) returns Group 1 with mainColor and colors array
     */
    getGroup(groupNumber) {
        if (!this.colorData) return null;
        const groupKey = `Group ${groupNumber}`;
        return this.colorData[groupKey] || null;
    },

    /**
     * Get main color of a group
     */
    getGroupMainColor(groupNumber) {
        const group = this.getGroup(groupNumber);
        return group?.mainColor || null;
    },

    /**
     * Get all colors in a group
     */
    getGroupColors(groupNumber) {
        const group = this.getGroup(groupNumber);
        return group?.colors || null;
    },

    /**
     * Get a specific color by group and index
     * Example: getColor(1, 1) returns the 1st color in Group 1
     */
    getColor(groupNumber, colorIndex) {
        if (!this.colorData) return null;
        const groupKey = `Group ${groupNumber}`;
        return this.colorData[groupKey]?.colors[colorIndex - 1] || null;
    },

    /**
     * Get all groups as flat array
     */
    getAllGroups() {
        if (!this.colorData) return null;
        return Object.values(this.colorData);
    },

    /**
     * Get metadata about colors
     */
    getMetadata() {
        if (!this.colorData) return null;
        return {
            totalGroups: Object.keys(this.colorData).length,
            totalColors: Object.values(this.colorData).reduce(
                (sum, group) => sum + group.colors.length,
                0,
            ),
        };
    },
};
