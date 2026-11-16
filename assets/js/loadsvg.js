async function embedExternalSVG(url, containerId) {
    try {
        const response = await fetch(url);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        // Generate a unique prefix (e.g., 'svg-abc123')
        const prefix = `svg-${Math.random().toString(36).slice(2, 8)}`;

        // Step 1: Collect all elements with 'id' and create a map of old -> new IDs
        const idMap = new Map();
        const elementsWithId = svgElement.querySelectorAll("[id]");
        elementsWithId.forEach((el) => {
            const oldId = el.getAttribute("id");
            const newId = `${prefix}-${oldId}`;
            idMap.set(oldId, newId);
            el.setAttribute("id", newId);
        });

        // Step 2: Update all references to those IDs
        // Common attributes that reference IDs: fill, stroke, clip-path, mask, filter, xlink:href, href, etc.
        // We'll check all attributes on all elements for patterns like url(#oldId) or #oldId
        const allElements = svgElement.querySelectorAll("*");
        allElements.forEach((el) => {
            for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                let value = attr.value;

                // Handle url(#id) pattern
                value = value.replace(/url\(#([^)]+)\)/g, (match, oldId) => {
                    const newId = idMap.get(oldId);
                    return newId ? `url(#${newId})` : match;
                });

                // Handle plain #id (e.g., in xlink:href or href)
                value = value.replace(/#([^ ,;]+)/g, (match, oldId) => {
                    const newId = idMap.get(oldId);
                    return newId ? `#${newId}` : match;
                });

                if (value !== attr.value) {
                    el.setAttribute(attr.name, value);
                }
            }
        });

        // Append the modified SVG to the container
        const container = document.getElementById(containerId);
        container.appendChild(svgElement);
    } catch (error) {
        console.error("Error loading or modifying SVG:", error);
    }
}

// Usage: embedExternalSVG('path/to/yourfile.svg', 'svg-container');

embedExternalSVG("assets/images/icon_loading.svg", "loading-icon");

embedExternalSVG("assets/images/icon_grid.svg", "tool-grid");
embedExternalSVG("assets/images/icon_pick.svg", "tool-pick");
embedExternalSVG("assets/images/icon_teach.svg", "tool-teach");
embedExternalSVG("assets/images/icon_color.svg", "color-svg");

embedExternalSVG("assets/images/icon_btn_first_page.svg", "tut-first");
embedExternalSVG("assets/images/icon_btn_prev_page.svg", "tut-prev");
embedExternalSVG("assets/images/icon_btn_next_page.svg", "tut-next");
embedExternalSVG("assets/images/icon_btn_last_page.svg", "tut-last");
embedExternalSVG("assets/images/icon_color.svg", "tut-color");
