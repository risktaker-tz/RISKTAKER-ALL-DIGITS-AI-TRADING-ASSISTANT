import { LockKeyhole, MessageCircleMore, PhoneCall, VideoIcon } from "lucide-react";

export function TuchatiLock({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <div className="rounded-[32px] border border-cyan/30 bg-cyan/10 p-5">
        <div className="flex items-center gap-3 text-cyan">
          <MessageCircleMore className="h-5 w-5" />
          <PhoneCall className="h-5 w-5" />
          <VideoIcon className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm text-slate-100">
          TUCHATI is unlocked. Real-time messaging and WebRTC calls are now available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/15 bg-white/8 p-5">
      <div className="flex items-center gap-3 text-slate-100">
        <LockKeyhole className="h-5 w-5" />
        <p className="font-medium">TUCHATI stays hidden until both people follow each other.</p>
      </div>
    </div>
  );
}
