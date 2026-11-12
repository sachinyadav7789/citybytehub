/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'], // Cloudinary images allow karne ke liye
  },
  transpilePackages: ['@citybytehub/firebase'], // Monorepo package use karne ke liye
};

export default nextConfig;