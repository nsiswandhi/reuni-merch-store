import Image from "next/image";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=id.ialima.app";

// Site-wide sponsor CTA, rendered once from the root layout so it shows on
// every page. Lima Circle sponsors the site; this points visitors to their
// app on the Play Store. Static/server-only — no client state needed.
//
// Rendered as a rounded card matching the header bar's brand-yellow
// background, width-matched to the catalog page's max-w-6xl container so it
// lines up with the main content above it.
export function SiteFooter() {
  return (
    <footer className="px-4 py-6">
      <div className="mx-auto max-w-6xl rounded-[20px] bg-brand-yellow p-5">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Image
            src="/lima-circle-logo.png"
            alt="Lima Circle"
            width={120}
            height={123}
            className="shrink-0"
          />
          <p className="flex-1 text-[22px] leading-snug text-brand-green">
            Website ini disponsori oleh{" "}
            <span className="font-semibold">Lima Circle</span> — Rumah
            Digital Alumni SMAN 5 Bandung.
            <br className="hidden sm:block" />
            Yuk, unduh aplikasinya!
          </p>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Unduh aplikasi Lima Circle di Google Play"
            className="shrink-0"
          >
            <Image
              src="/google-play-badge.webp"
              alt="Get it on Google Play"
              width={180}
              height={53}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
