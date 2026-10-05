import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a busy state; the control stays in place and is not clickable. */
  loading?: boolean;
  /** Text announced while loading. Defaults to "Loading". */
  loadingText?: string;
  /** Optional icon slot (from the icon library, supplied by the caller). */
  icon?: ReactNode;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

export type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    as?: "button";
    /** React 19 ref-as-prop, forwarded to the <button>. */
    ref?: Ref<HTMLButtonElement>;
  };

export type ButtonAsLinkProps = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps | "href"> & {
    as: "a";
    href: string;
    /** React 19 ref-as-prop, forwarded to the <a>. */
    ref?: Ref<HTMLAnchorElement>;
    /** A link cannot be disabled natively; when true a non-navigating span is rendered. */
    disabled?: boolean;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const OWN_KEYS = [
  "as",
  "variant",
  "size",
  "loading",
  "loadingText",
  "icon",
  "fullWidth",
  "children",
  "className",
  "disabled",
] as const;

function nativeRest<T>(props: ButtonProps): T {
  const rest: Record<string, unknown> = { ...props };
  for (const key of OWN_KEYS) delete rest[key];
  return rest as unknown as T;
}

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

export function Button(props: ButtonProps) {
  const {
    variant = "secondary",
    size = "md",
    loading = false,
    loadingText = "Loading",
    icon,
    fullWidth = false,
    children,
    className,
    disabled = false,
  } = props;

  const cls = classes(
    styles.button,
    styles[variant],
    size === "sm" ? styles.sm : styles.md,
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  );

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {!loading && icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {loading ? <span className="sr-only">{loadingText}</span> : null}
    </>
  );

  if (props.as === "a") {
    const { href, ...anchorRest } = nativeRest<
      AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    >(props);

    if (disabled || loading) {
      return (
        <span className={classes(cls, styles.disabled)} aria-disabled="true">
          {content}
        </span>
      );
    }

    return (
      <Link href={href} className={cls} {...anchorRest}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } =
    nativeRest<ButtonHTMLAttributes<HTMLButtonElement>>(props);

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
