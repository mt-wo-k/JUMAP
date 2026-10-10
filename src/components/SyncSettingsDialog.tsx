import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SyncStatus } from "@/sync/syncClient";
import { Check, Cloud, Copy, KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  syncKey: string;
  status: SyncStatus;
  errorMessage: string;
  onClose: () => void;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
  onRetry: () => void;
};

function makeSyncKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function SyncSettingsDialog({
  open,
  syncKey,
  status,
  errorMessage,
  onClose,
  onSaveKey,
  onClearKey,
  onRetry,
}: Props) {
  const [draftKey, setDraftKey] = useState(syncKey);
  const [keyVisible, setKeyVisible] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [copied, setCopied] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = draftKey.trim();
    if (key.length < 24) {
      setValidationMessage("同期キーは24文字以上にしてください。");
      return;
    }
    setValidationMessage("");
    onSaveKey(key);
  }

  const statusContent = status === "syncing"
    ? "クラウドのデータを確認しています…"
    : status === "synced"
      ? "クラウドと同期済みです。"
      : status === "error"
        ? errorMessage
        : "同期キーを設定すると、この端末のデータをクラウドと同期します。";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Cloud size={20} aria-hidden="true" />
            端末間の同期
          </DialogTitle>
          <DialogDescription>
            同じ同期キーを各端末と Vercel の環境変数に設定します。
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="dialog-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <label className="grid gap-2 text-sm font-medium" htmlFor="sync-key">
              <span className="flex items-center gap-2">
                <KeyRound size={16} aria-hidden="true" />
                共有同期キー
              </span>
              <Input
                id="sync-key"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                type={keyVisible ? "text" : "password"}
                minLength={24}
                value={draftKey}
                onChange={(event) => {
                  setDraftKey(event.target.value);
                  setValidationMessage("");
                  setCopied(false);
                }}
                placeholder="24文字以上のキー"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraftKey(makeSyncKey());
                  setCopied(false);
                }}
              >
                安全なキーを生成
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!draftKey}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(draftKey);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "コピーしました" : "キーをコピー"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setKeyVisible((visible) => !visible)}
              >
                {keyVisible ? "キーを隠す" : "キーを表示"}
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              キーはこのブラウザーに保存され、Vercel の同期APIへ送信されます。地図データがすでにある端末で最初に設定してください。初回にクラウドへ登録し、他の端末はクラウドのデータを読み込みます。
            </p>

            <div
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-secondary/40 p-3 text-sm"
              role="status"
              aria-live="polite"
            >
              {status === "synced" ? (
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={17} aria-hidden="true" />
              ) : (
                <Cloud className="mt-0.5 shrink-0 text-muted-foreground" size={17} aria-hidden="true" />
              )}
              <span>{validationMessage || statusContent}</span>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            {syncKey && (
              <Button
                className="sm:mr-auto"
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraftKey("");
                  onClearKey();
                }}
              >
                <Trash2 aria-hidden="true" />
                キーを解除
              </Button>
            )}
            {status === "error" && syncKey && (
              <Button type="button" variant="outline" onClick={onRetry}>
                <RefreshCw aria-hidden="true" />
                再同期
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              閉じる
            </Button>
            <Button type="submit" disabled={status === "syncing"}>
              <Cloud aria-hidden="true" />
              キーを保存して同期
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
