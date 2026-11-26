import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ControlSize = "md" | "lg";

export function Select({
  value,
  options,
  onChange,
  disabled = false,
  controlSize = "md",
  className = "",
  searchable,
  placeholder = "Select…",
  id,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  controlSize?: ControlSize;
  className?: string;
  searchable?: boolean;
  placeholder?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const listId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const enableSearch = searchable ?? options.length > 12;

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const syncMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxH = Math.min(288, window.innerHeight * 0.7);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const height = Math.min(maxH, openUp ? spaceAbove : spaceBelow);
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight: height,
      zIndex: 80,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const onReposition = () => syncMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const idx = Math.max(
      0,
      filtered.findIndex((o) => o.value === value),
    );
    setActiveIndex(idx === -1 ? 0 : idx);
    // preventScroll: focusing the filter must not jump the page
    if (enableSearch) searchRef.current?.focus({ preventScroll: true });
  }, [open, value, filtered, enableSearch]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    if (!list || !el) return;
    // Keep the active option visible inside the menu only (no page scroll)
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < listRect.top) {
      list.scrollTop -= listRect.top - elRect.top;
    } else if (elRect.bottom > listRect.bottom) {
      list.scrollTop += elRect.bottom - listRect.bottom;
    }
  }, [activeIndex, open]);

  const pick = (next: string) => {
    onChange(next);
    close();
    triggerRef.current?.focus({ preventScroll: true });
  };

  const moveActive = (delta: number) => {
    if (filtered.length === 0) return;
    setActiveIndex((i) => {
      let next = i;
      for (let n = 0; n < filtered.length; n++) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return i;
    });
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === " "
    ) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt && !opt.disabled) pick(opt.value);
    }
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className={cx("field-menu", !reducedMotion && "field-menu-enter")}
          style={menuStyle}
          onKeyDown={onListKeyDown}
        >
          {enableSearch ? (
            <div className="field-menu-search">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Filter…"
                className="field-menu-search-input"
                aria-label="Filter options"
              />
            </div>
          ) : null}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-activedescendant={
              filtered[activeIndex]
                ? `${listId}-opt-${activeIndex}`
                : undefined
            }
            className="field-menu-list"
          >
            {filtered.length === 0 ? (
              <li className="field-menu-empty">No matches</li>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled || undefined}
                    data-index={index}
                    className={cx(
                      "field-menu-option",
                      isSelected && "is-selected",
                      isActive && "is-active",
                      opt.disabled && "is-disabled",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (!opt.disabled) pick(opt.value);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-emerald"
                        aria-hidden
                      />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={cx("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        className={cx(
          "field-control field-select-trigger",
          controlSize === "lg" && "field-lg",
          open && "is-open",
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={cx("truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cx(
            "field-select-chevron",
            open && "rotate-180",
            !reducedMotion && "transition-transform duration-150",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}

export function FieldSelect({
  label,
  className = "",
  controlClassName = "",
  controlSize = "md",
  value,
  options,
  onChange,
  disabled,
  searchable,
  placeholder,
  id,
}: {
  label?: ReactNode;
  className?: string;
  controlClassName?: string;
  controlSize?: ControlSize;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const labelId = useId();
  const select = (
    <Select
      id={id}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      controlSize={controlSize}
      className={controlClassName}
      searchable={searchable}
      placeholder={placeholder}
      aria-labelledby={label ? labelId : undefined}
    />
  );

  if (!label) {
    return className ? <div className={className}>{select}</div> : select;
  }

  return (
    <div className={cx("field", className)}>
      <span id={labelId}>{label}</span>
      {select}
    </div>
  );
}
