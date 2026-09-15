import Image from "next/image";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=id.ialima.app";

// Site-wide sponsor CTA, rendered once from the root layout so it shows on
// every page. Lima Circle sponsors the site; this points visitors to their
// app on the Play Store. Static/server-only — no client state needed.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Image
          src="/lima-circle-logo.png"
          alt="Lima Circle"
          width={64}
          height={66}
          className="shrink-0"
        />
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <p className="text-sm text-gray-600">
            Website ini disponsori oleh{" "}
            <span className="font-semibold text-brand-green">Lima Circle</span>{" "}
            — Rumah Digital Alumni SMAN 5 Bandung.
            <br className="hidden sm:block" />
            Yuk, unduh aplikasinya!
          </p>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Unduh aplikasi Lima Circle di Google Play"
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
