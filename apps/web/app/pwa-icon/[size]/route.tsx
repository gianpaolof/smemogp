import { ImageResponse } from "next/og";

const SIZES = new Set(["180", "192", "512"]);

/** Icona app: numero enorme su accento, come le colonne giorno della lista. */
export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const px = Number(size);
  // Maschera Android: il disegno sta nel 60% centrale, il resto è margine
  const maskable = new URL(req.url).searchParams.has("maskable");
  const inner = Math.round(px * (maskable ? 0.5 : 0.72));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff3b14",
          color: "#111111",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${Math.max(4, Math.round(px * 0.03))}px solid #111111`,
            fontSize: Math.round(inner * 0.78),
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          TO
        </div>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
