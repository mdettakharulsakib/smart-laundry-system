/**
 * Full-bleed photo background with a color-tint overlay, matching the
 * Figma prototype (folded-laundry photo + red/pink translucent tint).
 *
 * HOW TO USE YOUR OWN BACKGROUND IMAGE:
 * 1. Drop your image file into the `public/images/` folder of this project,
 *    e.g. `public/images/laundry-bg.jpg`.
 * 2. Either rename it to match the default below, or pass a `src` prop:
 *      <PhotoBackground src="/images/laundry-bg.jpg">...</PhotoBackground>
 *    (Anything in `public/` is served from the site root, so a file at
 *    `public/images/laundry-bg.jpg` is reachable at `/images/laundry-bg.jpg`.)
 * 3. Tint color/opacity is controlled by the `overlay` / `overlay-card`
 *    colors in `tailwind.config.ts` — change `overlay.DEFAULT` there to
 *    swap the red tint for something else.
 *
 * Until you add a real photo, this falls back to a plain gradient so the
 * layout still looks intentional rather than showing a broken image.
 */
export default function PhotoBackground({
  src = "/images/laundry-bg.jpg",
  children,
  className = "",
}: {
  src?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-screen w-full bg-cover bg-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, #2b2330 0%, #4a3d55 100%), url(${src})`,
        backgroundBlendMode: "overlay",
      }}
    >
      {/* Color tint pulled from tailwind.config.ts -> colors.overlay.DEFAULT */}
      <div className="absolute inset-0 bg-overlay" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
