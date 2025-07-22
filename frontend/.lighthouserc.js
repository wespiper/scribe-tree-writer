module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'time-to-interactive': ['warn', { maxNumericValue: 3500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],

        // Bundle size
        'total-byte-weight': ['error', { maxNumericValue: 500000 }], // 500KB
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'warn',
        'uses-optimized-images': 'warn',

        // Best practices
        'errors-in-console': 'warn',
        'no-document-write': 'error',
        'js-libraries': 'warn',

        // Accessibility (important for education platform)
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-description': 'warn',

        // PWA
        'service-worker': 'off',
        'works-offline': 'off',

        // SEO
        'meta-viewport': 'error',
        'font-size': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
