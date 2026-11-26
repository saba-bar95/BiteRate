import type { InputHTMLAttributes, ReactNode } from "react";
export { FieldSelect, Select, type SelectOption } from "./Select";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("field", className)}>
      {label}
      {children}
    </label>
  );
}

type ControlSize = "md" | "lg";

export function FieldInput({
  label,
  className = "",
  controlClassName = "",
  controlSize = "md",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: ReactNode;
  controlClassName?: string;
  controlSize?: ControlSize;
}) {
  const input = (
    <input
      {...props}
      className={cx(
        "field-control",
        controlSize === "lg" && "field-lg",
        props.type === "number" || props.inputMode === "decimal"
          ? "tabular"
          : "",
        controlClassName,
        className && !label ? className : undefined,
      )}
    />
  );

  if (!label) return input;
  return (
    <Field label={label} className={className}>
      {input}
    </Field>
  );
}
