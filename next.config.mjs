// Supabase usa certificado autofirmado en la cadena — necesario para conexión directa
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), "canvas", "pdf-parse"];
    }
    return config;
  },
};

export default nextConfig;
