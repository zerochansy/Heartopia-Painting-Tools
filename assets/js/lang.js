/**
 * Language Management System
 * Handles multi-language support for the application
 */

const i18n = {
    currentLang: 'zh-TW',
    translations: {},
    supportedLangs: ['zh-TW', 'zh-CN', 'en', 'th'],

    /**
     * Initialize language system
     */
    async init() {
        // Detect system language
        this.detectSystemLanguage();
        
        // Load translations
        await this.loadTranslations();
        
        // Update all elements
        this.updatePage();
        
        // Setup event listeners
        this.setupEventListeners();
    },

    /**
     * Detect system language
     */
    detectSystemLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        // Map browser language to supported languages
        const langMap = {
            'zh-TW': 'zh-TW',
            'zh-tw': 'zh-TW',
            'zh-HK': 'zh-TW',
            'zh-hk': 'zh-TW',
            'zh-CN': 'zh-CN',
            'zh-cn': 'zh-CN',
            'zh': 'zh-CN',
            'en': 'en',
            'en-US': 'en',
            'en-GB': 'en',
            'th': 'th',
            'th-th': 'th',
            'th-TH': 'th'
        };

        // Check localStorage first
        const savedLang = localStorage.getItem('language');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
            return;
        }

        // Use browser language or default to English
        for (const key in langMap) {
            if (browserLang.startsWith(key)) {
                this.currentLang = langMap[key];
                localStorage.setItem('language', this.currentLang);
                return;
            }
        }

        this.currentLang = 'en';
        localStorage.setItem('language', 'en');
    },

    /**
     * Load all translation files
     */
    async loadTranslations() {
        try {
            for (const lang of this.supportedLangs) {
                const response = await fetch(`./assets/lang/${lang}.json`);
                const data = await response.json();
                this.translations[lang] = data;
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    },

    /**
     * Get translated text
     */
    t(key, defaultText = key) {
        if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
            return this.translations[this.currentLang][key];
        }
        return defaultText;
    },

    /**
     * Change language
     */
    setLanguage(lang) {
        if (this.supportedLangs.includes(lang)) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updatePage();
        }
    },

    /**
     * Update all page elements with new language
     */
    updatePage() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);

            // Handle inputs/textareas (keep as placeholder/plain text)
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
                return;
            }

            // If translation contains newlines, render as HTML with <br />
            if (typeof text === 'string' && text.indexOf('\n') !== -1) {
                el.innerHTML = text.replace(/\n/g, '<br />');
            } else {
                el.textContent = text;
            }
        });

        // Trigger custom event for other scripts to listen
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLang }
        }));
        // Also update the document <html> lang attribute
        try {
            document.documentElement.setAttribute('lang', this.currentLang);
        } catch (err) {
            console.warn('Unable to set html[lang]:', err);
        }
    },

    /**
     * Setup event listeners for language buttons
     */
    setupEventListeners() {
        // Language button
        const langBtn = document.getElementById('lang-btn');
        const langPopup = document.getElementById('lang-popup');
        const langOptions = document.querySelectorAll('.lang-option');
        const popupOverlay = document.querySelector('.popup-overlay');

        if (langBtn) {
            langBtn.addEventListener('click', () => {
                langPopup.classList.toggle('hidden');
            });
        }

        langOptions.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.getAttribute('data-lang');
                this.setLanguage(lang);
                langPopup.classList.add('hidden');
            });
        });

        // Close popup when clicking overlay
        if (popupOverlay) {
            popupOverlay.addEventListener('click', () => {
                langPopup.classList.add('hidden');
            });
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        i18n.init();
    });
} else {
    i18n.init();
}
