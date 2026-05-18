import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMicSettings, sensitivityToThreshold } from "@/lib/micSettings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Live mic settings modal: sensitivity, input gain, audio processing toggles, and a live meter. */
export function MicSettingsModal({ open, onOpenChange }: Props) {
  const { settings, update, reset } = useMicSettings();
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Live meter while the modal is open. Uses its own stream so it works even
  // when the global mic is muted.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
          },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        gain.gain.value = settings.gain;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(gain);
        gain.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const tick = () => {
          // Keep gain live with current settings.
          gain.gain.value = settings.gain;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(rms);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Ignore — user can still adjust settings without preview.
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setLevel(0);
    };
    // Re-open the stream only when constraint-changing settings toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings.noiseSuppression, settings.echoCancellation, settings.autoGainControl]);

  const threshold = sensitivityToThreshold(settings.sensitivity);
  const meterPct = Math.min(100, (level / 0.3) * 100);
  const thresholdPct = Math.min(100, (threshold / 0.3) * 100);
  const isOverThreshold = level > threshold;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajustes del micrófono</DialogTitle>
          <DialogDescription>
            Calibra la sensibilidad y el volumen para que tu voz se detecte mejor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Live meter */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Nivel de voz en vivo</span>
              <span>{isOverThreshold ? "Detectando" : "Silencio"}</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-75"
                style={{
                  width: `${meterPct}%`,
                  background: isOverThreshold ? "var(--gain, #4ade80)" : "var(--muted-foreground)",
                }}
              />
              {/* Threshold marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground/70"
                style={{ left: `${thresholdPct}%` }}
                aria-hidden
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              La línea vertical marca el umbral actual. Habla normal: tu nivel debería superarla.
            </p>
          </div>

          {/* Sensitivity */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label>Sensibilidad</label>
              <span className="text-muted-foreground">{Math.round(settings.sensitivity * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[settings.sensitivity]}
              onValueChange={(v) => update({ sensitivity: v[0] })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Más alto = capta voces más suaves (pero también más ruido de fondo).
            </p>
          </div>

          {/* Gain */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label>Volumen de entrada</label>
              <span className="text-muted-foreground">{settings.gain.toFixed(2)}×</span>
            </div>
            <Slider
              min={0}
              max={3}
              step={0.05}
              value={[settings.gain]}
              onValueChange={(v) => update({ gain: v[0] })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Amplifica la señal del micrófono antes de medir.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <ToggleRow
              label="Supresión de ruido"
              hint="Reduce ruido ambiental constante."
              checked={settings.noiseSuppression}
              onChange={(v) => update({ noiseSuppression: v })}
            />
            <ToggleRow
              label="Cancelación de eco"
              hint="Evita capturar el audio que sale de tus altavoces."
              checked={settings.echoCancellation}
              onChange={(v) => update({ echoCancellation: v })}
            />
            <ToggleRow
              label="Control automático de ganancia"
              hint="Si tu voz se oye irregular, prueba desactivarlo."
              checked={settings.autoGainControl}
              onChange={(v) => update({ autoGainControl: v })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={reset}>Restablecer</Button>
          <Button onClick={() => onOpenChange(false)}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
