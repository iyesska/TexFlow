import { Wordmark } from "@/components/brand/wordmark";
import { site } from "@/config/site";
import { SampleSheet } from "@/features/account/components/sample-sheet";

/** Sign-in and sign-up: the form on one side, what TexFlow makes on the other. */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10 sm:py-8">
        <Wordmark className="text-[1.375rem]" />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[22rem]">{children}</div>
        </main>
        <p className="max-w-[42ch] text-xs text-pretty text-muted-foreground">
          {site.description}
        </p>
      </div>
      <div className="relative hidden items-center justify-center overflow-hidden border-l bg-surface lg:flex">
        <SampleSheet />
      </div>
    </div>
  );
}
