import type { ComponentProps } from "react";

// Звичайне посилання: у цьому середовищі клієнтська навігація next/link не спрацьовує (кліки нічого не роблять).
export default function Link({ href, children, ...rest }: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...rest}>{children}</a>;
}
