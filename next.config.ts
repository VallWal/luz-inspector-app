import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 blocks /_next/* requests from non-localhost origins in dev,
   * which breaks testing on a phone via LAN IP (page renders, JS blocked,
   * no touch interactivity). Allow common private-network origins.
   * If your Mac's IP isn't covered, add it here (e.g. "192.168.2.17").
   */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.2*.*.*",
    "172.30.*.*",
    "172.31.*.*",
    "*.local",
  ],
};

export default nextConfig;
