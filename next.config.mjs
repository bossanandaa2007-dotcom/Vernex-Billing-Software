/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'openweathermap.org' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
    ],
  },
  env: {
    WEATHER_API: process.env.WEATHER_API,
  },
};

export default nextConfig;
