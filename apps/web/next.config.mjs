import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // typedRoutes disabled until /agents/* and /audit pages exist
    typedRoutes: false,
    outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
