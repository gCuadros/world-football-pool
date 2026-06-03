"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { joinLeague } from "@/app/(app)/mini-ligas/actions";

export function JoinLeagueButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function join() {
    start(async () => {
      const res = await joinLeague(code);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`¡Te has unido a ${res.code}!`);
      router.push(`/liga/${res.leagueId}`);
    });
  }

  return (
    <button
      onClick={join}
      disabled={pending}
      className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors disabled:opacity-50 sm:w-auto"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Unirme a la liga
      <ArrowRight className="size-4" />
    </button>
  );
}
