import type { TopstarLocationDef, TopstarMapDef } from "@/lib/topstar/types";

type TopstarMapBoardProps = {
  map: TopstarMapDef;
  backgroundUrl: string;
  currentLocationId: string;
  pendingLocationId: string | null;
  unlockedLocationIds: ReadonlySet<string>;
  actionableLocationIds: ReadonlySet<string>;
  onSelectLocation: (locationId: string) => void;
};

function chapterNumber(chapterId: string): string {
  const match = chapterId.match(/\d+/);
  return match?.[0] ?? "1";
}

function locationArtwork(locationId: string): string {
  return `/topstar/maps/locations/${locationId}.png`;
}

function locationStateLabel(
  location: TopstarLocationDef,
  currentLocationId: string,
  pendingLocationId: string | null,
  unlocked: boolean
): string {
  if (!unlocked) return `${location.name}，尚未解锁`;
  if (location.id === currentLocationId) {
    return `${location.name}，当前位置，点击查看可进行事项`;
  }
  if (location.id === pendingLocationId) {
    return `${location.name}，已选择，等待确认前往`;
  }
  return `${location.name}，点击选择前往`;
}

export function TopstarMapBoard({
  map,
  backgroundUrl,
  currentLocationId,
  pendingLocationId,
  unlockedLocationIds,
  actionableLocationIds,
  onSelectLocation,
}: TopstarMapBoardProps) {
  const currentLocation = map.locations.find(
    (location) => location.id === currentLocationId
  );

  return (
    <section
      className="absolute inset-0 overflow-hidden bg-[#170A14]"
      aria-labelledby="topstar-map-title"
    >
      <div
        className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center opacity-40 blur-[5px] saturate-150"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(151,35,111,0.34),transparent_42%),linear-gradient(180deg,rgba(20,5,16,0.6),rgba(10,3,9,0.94))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(125deg,transparent_46%,rgba(214,166,95,0.22)_48%,transparent_50%)] [background-size:54px_54px]"
        aria-hidden
      />

      <header className="absolute inset-x-2 top-2 z-10 overflow-hidden rounded-[1.35rem] border border-[#D3A55D]/70 bg-[#210B1B]/90 px-3 py-2.5 text-[#F8E9D0] shadow-[0_10px_28px_rgba(0,0,0,0.34),inset_0_0_24px_rgba(122,15,92,0.22)] backdrop-blur-md">
        <span
          className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full border border-[#D3A55D]/15"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-2 -top-4 size-16 rotate-45 border border-[#D3A55D]/10"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <div className="relative flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-b-[1.25rem] rounded-t-xl border border-[#E1B96F] bg-[linear-gradient(145deg,#651044,#9C196D_58%,#4B0B35)] text-white shadow-[0_0_16px_rgba(221,177,100,0.3)] ring-1 ring-[#6D3A20]">
            <span className="absolute inset-1 rounded-b-[0.9rem] rounded-t-lg border border-white/15" aria-hidden />
            <span className="relative text-[8px] font-semibold tracking-[0.14em] text-[#F6DFAA]">
              CH
            </span>
            <span className="relative font-display text-2xl font-semibold leading-none">
              {chapterNumber(map.chapterId)}
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="topstar-map-title"
              className="truncate font-display text-base font-semibold tracking-wide text-[#F7DFC0]"
            >
              {map.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#D4BCC9]">
              {map.summary}
            </p>
          </div>
        </div>
        <div className="relative mt-2 flex items-center gap-2 border-t border-[#D3A55D]/25 pt-2 text-[10px]">
          <span className="text-[#DDB870]" aria-hidden>
            ◆
          </span>
          <span className="truncate text-[#E6D5DD]">
            当前位置：{currentLocation?.shortLabel ?? "未定位"}
          </span>
          <span className="ml-auto shrink-0 text-[#DDB870]">
            点击地点安排行程
          </span>
        </div>
      </header>

      <div className="absolute inset-x-2 bottom-2 top-[8.65rem] overflow-hidden rounded-[1.55rem] border border-[#D3A55D]/55 bg-[#2B1025] shadow-[0_16px_38px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 scale-[1.03] bg-cover bg-center opacity-75 saturate-125"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(48,12,38,0.25),rgba(19,6,16,0.58)),radial-gradient(circle_at_50%_42%,transparent_20%,rgba(37,8,29,0.38)_80%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#3B102F]/45 to-transparent"
          aria-hidden
        />

        <span className="pointer-events-none absolute left-[12%] top-[14%] size-1 rounded-full bg-[#F6CE78] shadow-[0_0_8px_2px_rgba(246,206,120,0.65)]" aria-hidden />
        <span className="pointer-events-none absolute right-[11%] top-[38%] size-1 rounded-full bg-[#E16BAE] shadow-[0_0_9px_2px_rgba(225,107,174,0.7)]" aria-hidden />
        <span className="pointer-events-none absolute bottom-[18%] left-[44%] size-1 rounded-full bg-[#F6CE78] shadow-[0_0_8px_2px_rgba(246,206,120,0.65)]" aria-hidden />

        {map.locations.map((location) => {
          const unlocked = unlockedLocationIds.has(location.id);
          const isCurrent = location.id === currentLocationId;
          const isPending = location.id === pendingLocationId;
          const hasAction = actionableLocationIds.has(location.id);
          const artwork = locationArtwork(location.id);

          return (
            <button
              key={location.id}
              type="button"
              disabled={!unlocked}
              aria-current={isCurrent ? "location" : undefined}
              aria-pressed={isPending}
              aria-label={locationStateLabel(
                location,
                currentLocationId,
                pendingLocationId,
                unlocked
              )}
              onClick={() => onSelectLocation(location.id)}
              className={`group pointer-events-auto absolute h-[5.7rem] w-[4.7rem] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-t-[1.65rem] rounded-b-[1.1rem] border-2 text-[11px] font-semibold leading-tight shadow-[0_10px_22px_rgba(0,0,0,0.36)] transition duration-150 active:scale-95 disabled:cursor-not-allowed ${
                isCurrent
                  ? "border-[#F0C66D] bg-[#710C50] text-white ring-2 ring-[#F0C66D]/35"
                  : isPending
                    ? "border-[#F0C66D] bg-[#FFF7EC] text-[#5C0F4A] ring-2 ring-[#E55AA6]/70"
                    : unlocked
                      ? "border-[#E3C48C] bg-[#FFF7EC] text-[#5C0F4A] hover:border-[#F0C66D]"
                      : "border-[#99858E] bg-[#C9BBC1] text-[#776771] opacity-60 shadow-none"
              }`}
              style={{
                left: `${location.position.x}%`,
                top: `${location.position.y}%`,
              }}
            >
              <span className="pointer-events-none absolute inset-1 overflow-hidden rounded-t-[1.25rem] rounded-b-[0.8rem] border border-white/30" aria-hidden>
                <span
                  className="absolute inset-x-0 top-0 h-[3.35rem] bg-cover bg-center transition duration-200 group-hover:scale-105"
                  style={{ backgroundImage: `url(${artwork})` }}
                />
                <span className="absolute inset-x-0 top-0 h-[3.35rem] bg-gradient-to-t from-[#2C0B22]/70 via-transparent to-white/5" />
              </span>

              <span
                className={`absolute inset-x-1 bottom-1 z-10 flex h-[1.7rem] items-center justify-center rounded-b-[0.72rem] px-1 ${
                  isCurrent
                    ? "bg-[#710C50] text-white"
                    : "bg-[#FFF8EE] text-[#5C0F4A]"
                }`}
              >
                <span className="whitespace-nowrap">{location.shortLabel}</span>
              </span>

              <span className="pointer-events-none absolute left-1 top-1 size-2 border-l border-t border-[#F4D795]/80" aria-hidden />
              <span className="pointer-events-none absolute right-1 top-1 size-2 border-r border-t border-[#F4D795]/80" aria-hidden />

              {hasAction && unlocked ? (
                <span
                  className={`absolute -right-1.5 -top-1.5 z-20 size-3.5 rounded-full border-[3px] shadow-[0_0_8px_rgba(220,54,143,0.65)] ${
                    isCurrent
                      ? "border-[#710C50] bg-[#F2CB70]"
                      : "border-[#FFF7EC] bg-[#D92E88]"
                  }`}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
