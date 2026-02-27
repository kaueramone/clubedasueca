import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class', // Ativado suporte explícito para classes .dark
    theme: {
        extend: {
            colors: {
                // Extended generic values if needed
                clube: {
                    green: {
                        600: '#185C49',
                        700: '#123F33',
                        800: '#0F3D2E',
                        900: '#0B1F1A',
                    },
                    gold: {
                        500: '#D4AF37',
                        600: '#C9A227',
                        700: '#B8962E',
                    },
                    offwhite: '#F5F2E8',
                    red: '#8B1E1E',
                    graphite: '#1E1E1E',
                }
            },
            fontFamily: {
                sans: ["var(--font-inter)"],
                serif: ["var(--font-playfair)"],
            },
            borderRadius: {
                md: "12px",
                lg: "16px",
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
            }
        },
    },
    plugins: [],
};
export default config;
