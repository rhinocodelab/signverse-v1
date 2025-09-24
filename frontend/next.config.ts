import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests in development
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '0.0.0.0'
  ],
  // Set environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'https://localhost:5001/api/v1'
  },
  // Enable HTTPS in development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
