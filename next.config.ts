import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Caché del navegador entre pestañas: volver a una pestaña vista hace poco es instantáneo.
    // Cualquier cambio (guardar, marcar, sincronizar) la invalida al momento, así que no se ven datos viejos.
    staleTimes: { dynamic: 30, static: 60 },
  },
};

export default nextConfig;
