/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/perfil',
        destination: '/profile',
        permanent: false,
      },
      {
        source: '/bancos',
        destination: '/banks',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
