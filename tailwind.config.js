/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        border: "color-mix(in oklab, var(--border) calc(<alpha-value> * 100%), transparent)",
        input: "color-mix(in oklab, var(--input) calc(<alpha-value> * 100%), transparent)",
        ring: "color-mix(in oklab, var(--ring) calc(<alpha-value> * 100%), transparent)",
        background: "color-mix(in oklab, var(--background) calc(<alpha-value> * 100%), transparent)",
        foreground: "color-mix(in oklab, var(--foreground) calc(<alpha-value> * 100%), transparent)",

        primary: {
          DEFAULT: "color-mix(in oklab, var(--primary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--primary-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        secondary: {
          DEFAULT: "color-mix(in oklab, var(--secondary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--secondary-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        destructive: {
          DEFAULT: "color-mix(in oklab, var(--destructive) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--destructive-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        muted: {
          DEFAULT: "color-mix(in oklab, var(--muted) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--muted-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        accent: {
          DEFAULT: "color-mix(in oklab, var(--accent) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--accent-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        popover: {
          DEFAULT: "color-mix(in oklab, var(--popover) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--popover-foreground) calc(<alpha-value> * 100%), transparent)",
        },

        card: {
          DEFAULT: "color-mix(in oklab, var(--card) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklab, var(--card-foreground) calc(<alpha-value> * 100%), transparent)",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },

      keyframes: {
        enter: {
          from: {
            transform: "translate3d(0, 0.5rem, 0)",
          },
        },

        "accordion-down": {
          from: { height: "0" },
          to: {
            height:
              "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
          },
        },

        "accordion-up": {
          from: {
            height:
              "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
          },
          to: { height: "0" },
        },
      },

      animation: {
        in: "enter 0.2s ease",
        "accordion-down":
          "accordion-down 0.2s ease-out",
        "accordion-up":
          "accordion-up 0.2s ease-out",
      },
    },
  },

  plugins: [],
};
