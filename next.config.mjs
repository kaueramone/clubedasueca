/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/ensaios/blinkid/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                    { key: 'Referrer-Policy', value: 'no-referrer' },
                    { key: 'Cache-Control', value: 'no-store' },
                ],
            },
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
            {
                source: '/auth/confirm',
                headers: [
                    { key: 'Referrer-Policy', value: 'no-referrer' },
                    { key: 'Cache-Control', value: 'no-store' },
                ],
            },
        ];
    },
};

export default nextConfig;
