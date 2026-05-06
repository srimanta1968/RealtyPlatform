/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@kiana/contracts',
    '@kiana/design-system',
    '@kiana/sdk',
    '@kiana/ui-kit',
  ],
  async rewrites() {
    const bff = process.env.WEB_BFF_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${bff}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
