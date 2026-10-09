"use client";

import { Search, Lightbulb, Hammer, FlaskConical, Users, Puzzle, LifeBuoy, Moon, CirclePause, RotateCcw } from "lucide-react";
import { ratingLabels, repeatLabels, type Rating } from "@/lib/micro-trials";

const icons = { search: Search, bulb: Lightbulb, hammer: Hammer, flask: FlaskConical, users: Users, puzzle: Puzzle, lifebuoy: LifeBuoy, moon: Moon, pause: CirclePause, repeat: RotateCcw };

export default function ReflectionSlider({ id, label, icon, value, onChange, repeat = false }: {
  id: string; label: string; icon: keyof typeof icons; value: Rating | undefined;
  onChange: (value: Rating | undefined) => void; repeat?: boolean;
}) {
  const Icon = icons[icon];
  const skipped = value === null;
  const untouched = value === undefined;
  const level = typeof value === "number" ? value : 2;
  const percent = level * 25;
  const labels = repeat ? repeatLabels : ratingLabels;
  const text = skipped ? "Не було в цій пробі" : untouched ? "Пересунь іконку, щоб оцінити" : labels[level];
  return <div className={`reflection-scale ${skipped ? "is-skipped" : ""} ${untouched ? "is-untouched" : ""}`}>
    <div className="scale-heading"><label id={`${id}-label`} htmlFor={id}>{label}</label><output id={`${id}-value`} htmlFor={id}>{text}</output></div>
    {!skipped && <>
      <div className={`scale-rail scale-${icon}`}>
        <div className="scale-track" aria-hidden="true"><span style={{ width: untouched ? "0%" : `${percent}%` }}/>{[0,1,2,3,4].map(tick => <i key={tick} style={{left: `${tick*25}%`}}/>)}</div>
        <span className="scale-icon" aria-hidden="true" style={{ left: `calc(${percent}% + ${21 - percent * .42}px)` }}><Icon size={21} strokeWidth={2}/></span>
        <input id={id} type="range" min={0} max={4} step={1} value={level} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} aria-valuetext={text}
          onChange={event => onChange(Number(event.target.value))}
          onPointerUp={event => onChange(Number(event.currentTarget.value))}
          onKeyDown={event => {if(event.key === "Enter" || event.key === " "){event.preventDefault(); onChange(level);}}}/>
      </div>
      <div className="scale-endpoints" id={`${id}-hint`}><span>{labels[0]}</span><span>{labels[4]}</span></div>
    </>}
    {!repeat && <button type="button" className="scale-skip" aria-pressed={skipped} onClick={() => onChange(skipped ? undefined : null)}>{skipped ? "Оцінити цей критерій" : "Не було в цій пробі"}</button>}
  </div>;
}
